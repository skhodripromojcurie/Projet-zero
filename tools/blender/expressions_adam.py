"""Ajoute des expressions faciales (shape keys aux noms ARKit) à un visage riggé.

    blender --background --python tools/blender/expressions_adam.py -- entree.blend|.glb sortie.blend [planche_dossier]

Expressions créées : eyeBlinkLeft/Right, eyeWideLeft/Right, browInnerUp,
browDownLeft/Right, jawOpen, mouthFrownLeft/Right. Le studio les pilote
directement (clignements, sursaut, inquiétude).

EXPÉRIMENTAL : les zones du visage sont déduites de la position des yeux
(os ou maillages « eye »). Les rendus de contrôle (planche_dossier) doivent être
regardés avant validation ; les amplitudes se règlent dans AMPLITUDES.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import commun  # noqa: E402

AMPLITUDES = {
    "paupiere": 1.45,  # rotation de fermeture de la paupière supérieure (rad)
    "ecarquille": 0.16,
    "sourcil_haut": 0.006,  # m
    "sourcil_bas": 0.004,
    "machoire": 0.2,  # rad
    "commissure": 0.0035,  # m
}


def lisse(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def est_oeil(objet):
    nom = objet.name.lower()
    return any(mot in nom for mot in ("eye", "oeil", "œil", "yeux")) and not any(
        mot in nom for mot in ("lash", "brow", "cil", "sourcil")
    )


def trouver_yeux(armature):
    """Centres et rayon des yeux : maillages « eye », sinon os des yeux."""
    for objet in bpy.context.scene.objects:
        if objet.type != "MESH" or not est_oeil(objet):
            continue
        points = [objet.matrix_world @ v.co for v in objet.data.vertices]
        if len(points) < 8:
            continue
        cx = sum(p.x for p in points) / len(points)
        cotes = []
        for signe in (1, -1):
            moitie = [p for p in points if (p.x - cx) * signe > 0]
            if not moitie:
                break
            centre = sum(moitie, Vector()) / len(moitie)
            rayon = max((p - centre).length for p in moitie)
            cotes.append((centre, rayon))
        if len(cotes) == 2:
            return cotes[0], cotes[1]
    if armature:
        os_yeux = [b for b in armature.data.bones if b.name.lower() in ("eye_l", "eye_r", "eye.l", "eye.r", "lefteye", "righteye")]
        if len(os_yeux) == 2:
            centres = sorted((commun.position_os(armature, b) for b in os_yeux), key=lambda p: -p.x)
            return (centres[0], 0.012), (centres[1], 0.012)
    return None


def rotation_autour(point, centre, angle):
    return centre + Matrix.Rotation(angle, 3, "X") @ (point - centre)


def champs(oeil_g, oeil_d):
    """Déformations par expression : fonction (position monde) -> nouvelle position."""
    (eg, rg), (ed, rd) = oeil_g, oeil_d
    ecart = (eg - ed).length
    milieu = (eg + ed) / 2
    bouche = milieu + Vector((0, -0.25 * ecart, -1.12 * ecart))
    pivot = milieu + Vector((0, 1.35 * ecart, -0.55 * ecart))
    A = AMPLITUDES

    def paupiere(centre, rayon, angle_haut, angle_bas):
        def f(p):
            d = (p - centre).length
            w = 1 - lisse(1.25 * rayon, 2.1 * rayon, d)
            if w <= 0 or p.y > centre.y + 0.35 * rayon:
                return p
            if p.z >= centre.z - 0.05 * rayon:
                haut = lisse(-0.05 * rayon, 0.55 * rayon, p.z - centre.z)
                return rotation_autour(p, centre, angle_haut * w * haut)
            return rotation_autour(p, centre, angle_bas * w)

        return f

    def deplacement(cible, sigma, vecteur, devant=True):
        def f(p):
            if devant and p.y > cible.y + 0.6 * ecart:
                return p
            w = math.exp(-((p - cible).length / sigma) ** 2)
            return p + vecteur * w

        return f

    def machoire(p):
        if p.y > pivot.y or abs(p.x - milieu.x) > 1.25 * ecart:
            return p
        # Sous la lèvre inférieure jusqu'au menton ; le cou ne bouge pas.
        w = 1 - lisse(bouche.z - 0.25 * ecart, bouche.z + 0.02 * ecart, p.z)
        w *= lisse(bouche.z - 1.9 * ecart, bouche.z - 1.3 * ecart, p.z)
        return rotation_autour(p, pivot, A["machoire"] * w) if w > 0 else p

    resultat = {}
    for nom, (centre, rayon) in (("Left", (eg, rg)), ("Right", (ed, rd))):
        resultat[f"eyeBlink{nom}"] = paupiere(centre, rayon, A["paupiere"], -0.18)
        resultat[f"eyeWide{nom}"] = paupiere(centre, rayon, -A["ecarquille"], 0.05)
        sourcil = centre + Vector((0, -0.3 * rayon, 2.3 * rayon))
        vers_centre = Vector((milieu.x - centre.x, 0, 0)).normalized()
        resultat[f"browDown{nom}"] = deplacement(sourcil, 1.6 * rayon, Vector((0, 0, -A["sourcil_bas"])) + vers_centre * 0.002)
        coin = bouche + Vector(((centre.x - milieu.x) * 0.75, 0.12 * ecart, 0))
        resultat[f"mouthFrown{nom}"] = deplacement(coin, 0.22 * ecart, Vector((0, 0, -A["commissure"])))
    interieur = milieu + Vector((0, -0.25 * ecart, 2.3 * (rg + rd) / 2))
    resultat["browInnerUp"] = deplacement(interieur, 0.55 * ecart, Vector((0, 0, A["sourcil_haut"])))
    resultat["jawOpen"] = machoire
    return resultat, milieu, ecart


def ajouter_expressions(armature):
    yeux = trouver_yeux(armature)
    if not yeux:
        raise SystemExit("Yeux introuvables (maillage « eye » ou os eye_l/eye_r) : expressions non créées.")
    expressions, milieu, ecart = champs(*yeux)
    def proche_du_visage(objet):
        sommets = objet.data.vertices
        pas = max(1, len(sommets) // 4000)
        return any((objet.matrix_world @ sommets[i].co - milieu).length < 2.6 * ecart for i in range(0, len(sommets), pas))

    visage = [o for o in commun.maillages_visibles() if not est_oeil(o) and proche_du_visage(o)]
    for objet in visage:
        if objet.data.shape_keys is None:
            objet.shape_key_add(name="Basis", from_mix=False)
        inverse = objet.matrix_world.inverted()
        base = [objet.matrix_world @ v.co for v in objet.data.vertices]
        for nom, champ in expressions.items():
            cle = objet.data.shape_keys.key_blocks.get(nom) or objet.shape_key_add(name=nom, from_mix=False)
            for i, p in enumerate(base):
                cle.data[i].co = inverse @ champ(p)
    return [o.name for o in visage], list(expressions)


def planche(dossier, yeux):
    """Un gros plan par expression, pour validation visuelle."""
    (eg, _), (ed, _) = yeux
    milieu = (eg + ed) / 2
    commun.regler_rendu((540, 540), 24)
    commun.eclairage_studio(tuple(milieu), 0.5)
    cam = commun.camera("Visage", (milieu.x - 0.12, milieu.y - 0.42, milieu.z + 0.02), tuple(milieu - Vector((0, 0, 0.04))), 85)
    cles = [o.data.shape_keys for o in bpy.context.scene.objects if o.type == "MESH" and o.data.shape_keys]
    noms = ["neutre"] + [k.name for k in cles[0].key_blocks[1:]] if cles else ["neutre"]
    for nom in noms:
        for jeu in cles:
            for k in jeu.key_blocks[1:]:
                k.value = 1.0 if k.name == nom else 0.0
        commun.rendre(cam, os.path.join(dossier, f"expression-{nom}.png"))
    for jeu in cles:
        for k in jeu.key_blocks[1:]:
            k.value = 0.0


def expressions(entree, sortie, dossier_planche=None):
    commun.vider_scene()
    if entree.endswith(".blend"):
        bpy.ops.wm.open_mainfile(filepath=os.path.abspath(entree))
    else:
        commun.importer_glb(os.path.abspath(entree))
    armature = commun.armature_principale()
    maillages, noms = ajouter_expressions(armature)
    print(f"Expressions {', '.join(noms)} ajoutées à : {', '.join(maillages)}")
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(sortie))
    if dossier_planche and os.environ.get("PZ_SANS_RENDU") != "1":
        os.makedirs(dossier_planche, exist_ok=True)
        planche(dossier_planche, trouver_yeux(armature))
    return noms


if __name__ == "__main__":
    args = commun.arguments()
    if len(args) < 2:
        raise SystemExit(__doc__)
    expressions(args[0], args[1], args[2] if len(args) > 2 else None)
