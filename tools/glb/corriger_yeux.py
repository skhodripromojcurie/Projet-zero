"""Corrige les yeux d'Adam_Morel_candidat.glb, sans toucher au reste du modèle.

    python tools/glb/corriger_yeux.py original.glb corrige.glb [apercu.png]

Défaut constaté dans Three.js : regard pâle, « de zombie ». Causes, dans le fichier :
- les deux cornées (pièces du maillage des yeux dont les UV tombent dans le disque
  bleuté, presque transparent, en bas à droite de brown_eye.png) deviennent opaques
  dans le studio et voilent l'iris d'un blanc bleuté ;
- l'iris de la texture est rouge sombre plutôt que brun ;
- le blanc de l'œil est un peu trop lumineux pour la lumière d'aube du plan.

Corrections, limitées aux yeux :
- les triangles des cornées sont retirés de la primitive des yeux ;
- brown_eye.png est recoloré : iris brun naturel (motif d'origine conservé),
  pupille sombre et nette, anneau limbique, blanc de l'œil assombri et réchauffé ;
- le matériau des yeux devient opaque, légèrement brillant (rugosité 0,25).
Maillages, UV, squelette, autres matériaux et textures sont recopiés à l'octet près.
Python 3 avec numpy et Pillow ; aucune ressource externe.
"""

import io
import json
import struct
import sys

import numpy as np
from PIL import Image

MATERIAU_YEUX = "Adam_Morel.high-poly"
IMAGE_YEUX = "brown_eye"
# Brun naturel (sRVB) : sombre au bord de l'iris, plus clair autour de la pupille.
IRIS_SOMBRE = np.array([46, 31, 21], np.float32)
IRIS_CLAIR = np.array([102, 68, 42], np.float32)
PUPILLE = np.array([10, 8, 7], np.float32)
# Facteurs du blanc de l'œil : moins lumineux, un peu chaud (l'aube du plan est froide).
BLANC = np.array([0.82, 0.77, 0.70], np.float32)


def lire_glb(chemin):
    donnees = open(chemin, "rb").read()
    magie, version, _ = struct.unpack("<4sII", donnees[:12])
    if magie != b"glTF" or version != 2:
        raise SystemExit(f"{chemin} n'est pas un GLB 2.0")
    taille_json = struct.unpack("<I", donnees[12:16])[0]
    gltf = json.loads(donnees[20 : 20 + taille_json])
    debut_bin = 20 + taille_json
    taille_bin = struct.unpack("<I", donnees[debut_bin : debut_bin + 4])[0]
    binaire = donnees[debut_bin + 8 : debut_bin + 8 + taille_bin]
    vues = [binaire[v.get("byteOffset", 0) : v.get("byteOffset", 0) + v["byteLength"]] for v in gltf["bufferViews"]]
    return gltf, vues


def ecrire_glb(chemin, gltf, vues):
    """Reconstruit le tampon binaire à partir des vues (alignées sur 4 octets)."""
    binaire = bytearray()
    for vue, octets in zip(gltf["bufferViews"], vues):
        binaire += b"\0" * (-len(binaire) % 4)
        vue["byteOffset"] = len(binaire)
        vue["byteLength"] = len(octets)
        binaire += octets
    binaire += b"\0" * (-len(binaire) % 4)
    gltf["buffers"] = [{"byteLength": len(binaire)}]
    texte = json.dumps(gltf, ensure_ascii=False, separators=(",", ":")).encode()
    texte += b" " * (-len(texte) % 4)
    total = 12 + 8 + len(texte) + 8 + len(binaire)
    with open(chemin, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(texte), b"JSON") + texte)
        f.write(struct.pack("<I4s", len(binaire), b"BIN\0") + binaire)


def accesseur(gltf, vues, index):
    a = gltf["accessors"][index]
    composantes = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[a["type"]]
    type_ = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}[a["componentType"]]
    vue = gltf["bufferViews"][a["bufferView"]]
    if vue.get("byteStride"):
        raise SystemExit("Accesseur entrelacé non pris en charge")
    valeurs = np.frombuffer(vues[a["bufferView"]], type_, a["count"] * composantes, a.get("byteOffset", 0))
    return valeurs.reshape(-1, composantes) if composantes > 1 else valeurs


def sans_cornees(gltf, vues, primitive):
    """Retire les pièces dont les UV restent dans le disque de cornée (u, v > 0,85)."""
    uv = accesseur(gltf, vues, primitive["attributes"]["TEXCOORD_0"])
    triangles = accesseur(gltf, vues, primitive["indices"]).reshape(-1, 3)
    cornee = (uv[:, 0] > 0.85) & (uv[:, 1] > 0.85)
    garder = ~cornee[triangles].all(axis=1)
    a = gltf["accessors"][primitive["indices"]]
    utilisateurs = [x for x in gltf["accessors"] if x.get("bufferView") == a["bufferView"]]
    if len(utilisateurs) != 1:
        raise SystemExit("Indices des yeux partagés : correction impossible sans risque")
    nouveaux = np.ascontiguousarray(triangles[garder].ravel())
    vues[a["bufferView"]] = nouveaux.tobytes()
    a["byteOffset"] = 0
    a["count"] = int(nouveaux.size)
    return int((~garder).sum()), int(garder.sum())


def centres_pupilles(rgb):
    """Centres des deux iris : barycentres des pixels très sombres, à gauche et à droite."""
    lum = rgb.mean(-1)
    hauteur, largeur = lum.shape
    yy, xx = np.mgrid[0:hauteur, 0:largeur]
    sombre = lum < 40
    centres = []
    for moitie in (xx < largeur / 2, xx >= largeur / 2):
        ys, xs = np.nonzero(sombre & moitie & (xx < largeur * 0.85))
        centres.append((xs.mean(), ys.mean(), np.sqrt(len(xs) / np.pi)))
    return centres


def lisse(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def recolorer(png):
    image = Image.open(io.BytesIO(png)).convert("RGBA")
    pixels = np.asarray(image).astype(np.float32)
    rgb, alpha = pixels[..., :3], pixels[..., 3:]
    hauteur, largeur = rgb.shape[:2]
    yy, xx = np.mgrid[0:hauteur, 0:largeur]
    resultat = rgb.copy()
    for cx, cy, rayon_iris in centres_pupilles(rgb):
        r = np.hypot(xx - cx, yy - cy)
        rayon_pupille = rayon_iris * 0.32
        rayon_oeil = rayon_iris * 2.55
        # Motif d'origine : le canal rouge porte les fibres de l'iris.
        motif = np.clip(rgb[..., 0] / max(1.0, rgb[..., 0][r < rayon_iris].mean()), 0.4, 1.6)
        position = np.clip((r - rayon_pupille) / (rayon_iris - rayon_pupille), 0, 1)
        clarte = np.clip((0.75 - 0.55 * position) * motif, 0, 1)[..., None]
        iris = IRIS_SOMBRE + (IRIS_CLAIR - IRIS_SOMBRE) * clarte
        # Anneau limbique : bord de l'iris plus sombre.
        iris *= 1 - 0.45 * lisse(r / rayon_iris, 0.82, 1.05)[..., None]
        blanc = rgb * BLANC
        dans_iris = 1 - lisse(r, rayon_iris * 1.0, rayon_iris * 1.1)
        dans_pupille = 1 - lisse(r, rayon_pupille * 0.92, rayon_pupille * 1.08)
        oeil = blanc * (1 - dans_iris[..., None]) + iris * dans_iris[..., None]
        oeil = oeil * (1 - dans_pupille[..., None]) + PUPILLE * dans_pupille[..., None]
        zone = (r < rayon_oeil)[..., None]
        resultat = np.where(zone, oeil, resultat)
    sortie = np.concatenate([np.clip(resultat, 0, 255), alpha], -1).astype(np.uint8)
    tampon = io.BytesIO()
    Image.fromarray(sortie, "RGBA").save(tampon, "PNG", optimize=True)
    return tampon.getvalue(), sortie


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    gltf, vues = lire_glb(sys.argv[1])
    materiau = next(i for i, m in enumerate(gltf["materials"]) if m["name"] == MATERIAU_YEUX)
    primitives = [p for m in gltf["meshes"] for p in m["primitives"] if p.get("material") == materiau]
    for primitive in primitives:
        retires, gardes = sans_cornees(gltf, vues, primitive)
        print(f"Cornées retirées : {retires} triangles ; yeux : {gardes} triangles")
    image = next(i for i in gltf["images"] if i.get("name") == IMAGE_YEUX)
    png, apercu = recolorer(vues[image["bufferView"]])
    vues[image["bufferView"]] = png
    m = gltf["materials"][materiau]
    m.pop("alphaMode", None)  # opaque
    m["pbrMetallicRoughness"]["roughnessFactor"] = 0.25
    ecrire_glb(sys.argv[2], gltf, vues)
    if len(sys.argv) > 3:
        Image.fromarray(apercu).save(sys.argv[3])
    print(f"Écrit : {sys.argv[2]}")


if __name__ == "__main__":
    main()
