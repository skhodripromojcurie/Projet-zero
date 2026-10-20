"""Évalue un personnage GLB : rapport technique et rendus en pied et en gros plan.

    blender --background --python tools/blender/evaluer_adam.py -- Adam_Morel.glb dossier_sortie [neutre|scene]

Produit dans dossier_sortie : rapport.json, rapport.txt, pied-face.png,
pied-trois-quarts.png, pied-profil.png, pied-dos.png, plan-taille.png, gros-plan-face.png, gros-plan-trois-quarts.png.
Rien n'est envoyé sur Internet. Le fichier d'origine n'est pas modifié.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import commun  # noqa: E402

ARKIT = [
    "eyeBlinkLeft", "eyeBlinkRight", "eyeWideLeft", "eyeWideRight", "browInnerUp",
    "browDownLeft", "browDownRight", "jawOpen", "mouthFrownLeft", "mouthFrownRight",
]


def textures():
    resultat = []
    for image in bpy.data.images:
        if image.size[0] == 0:
            continue
        resultat.append({"nom": image.name, "largeur": image.size[0], "hauteur": image.size[1]})
    return resultat


def rapport(chemin):
    armature = commun.armature_principale()
    maillages = commun.maillages_visibles()
    mini, maxi = commun.boite_englobante(maillages)
    triangles = 0
    for o in maillages:
        o.data.calc_loop_triangles()
        triangles += len(o.data.loop_triangles)
    cles = sorted({k.name for o in maillages if o.data.shape_keys for k in o.data.shape_keys.key_blocks[1:]})
    correspondance = {}
    if armature:
        for articulation in commun.MPFB_GAME_ENGINE:
            bone = commun.trouver_os(armature, articulation)
            correspondance[articulation] = bone.name if bone else None
    orientation = "inconnue"
    pied = commun.trouver_os(armature, "footL") if armature else None
    if pied:
        # Les orteils pointent vers l'avant du personnage.
        avant = commun.position_os(armature, pied, "tail") - commun.position_os(armature, pied, "head")
        orientation = "-Y (correct pour l'export glTF)" if avant.y < 0 else "+Y (à pivoter de 180°)"
    classes = commun.classer_maillages(armature) if armature else {}
    composition = {
        cle: ([o.name for o in valeur] if isinstance(valeur, list) else (valeur.name if valeur else None))
        for cle, valeur in classes.items()
    }
    manquants = [a for a, b in correspondance.items() if b is None]
    alertes = []
    hauteur = maxi.z - mini.z
    if not 1.6 <= hauteur <= 1.95:
        alertes.append(f"Hauteur {hauteur:.2f} m : vérifier l'échelle (Adam ≈ 1,78 m).")
    if abs(mini.z) > 0.03:
        alertes.append(f"Les pieds sont à {mini.z:.2f} m du sol : remettre l'origine au sol.")
    if manquants:
        alertes.append("Articulations sans os reconnu : " + ", ".join(manquants))
    if triangles > 60000:
        alertes.append(f"{triangles} triangles : alléger pour le navigateur (cible 20 000 à 40 000).")
    for t in textures():
        if max(t["largeur"], t["hauteur"]) > 2048:
            alertes.append(f"Texture {t['nom']} en {t['largeur']}×{t['hauteur']} : réduire à 2048 px.")
    if not any(k in cles for k in ARKIT):
        alertes.append("Aucune expression faciale aux noms ARKit : clignements et expressions inactifs.")
    return {
        "fichier": os.path.basename(chemin),
        "hauteur_m": round(hauteur, 3),
        "pieds_z_m": round(mini.z, 3),
        "orientation": orientation,
        "os": len(armature.data.bones) if armature else 0,
        "noms_os": [b.name for b in armature.data.bones] if armature else [],
        "correspondance_studio": correspondance,
        "composition": composition,
        "maillages": [{"nom": o.name, "sommets": len(o.data.vertices), "materiaux": [m.name for m in o.data.materials if m]} for o in maillages],
        "triangles": triangles,
        "textures": textures(),
        "expressions": cles,
        "expressions_arkit": [k for k in ARKIT if k in cles],
        "animations": [a.name for a in bpy.data.actions],
        "alertes": alertes,
    }


def texte(r):
    lignes = [
        f"Évaluation de {r['fichier']}",
        f"Hauteur : {r['hauteur_m']} m · pieds à {r['pieds_z_m']} m · regard {r['orientation']}",
        f"Os : {r['os']} · triangles : {r['triangles']} · animations : {len(r['animations'])}",
        f"Expressions : {len(r['expressions'])} (dont ARKit : {', '.join(r['expressions_arkit']) or 'aucune'})",
        "Textures : " + (", ".join(f"{t['nom']} {t['largeur']}×{t['hauteur']}" for t in r["textures"]) or "aucune"),
        "Composition : " + " · ".join(
            f"{cle} : {', '.join(v) if isinstance(v, list) else v}"
            for cle, v in r.get("composition", {}).items() if v
        ),
        "Correspondance avec le studio :",
    ]
    lignes += [f"  {a:<10} → {b or 'MANQUANT'}" for a, b in r["correspondance_studio"].items()]
    lignes += ["Alertes :"] + [f"  - {a}" for a in r["alertes"] or ["aucune"]]
    return "\n".join(lignes)


def rendus(dossier, ambiance, resolution, echantillons):
    armature = commun.armature_principale()
    maillages = commun.maillages_visibles()
    mini, maxi = commun.boite_englobante(maillages)
    hauteur = maxi.z - mini.z
    centre = Vector(((mini.x + maxi.x) / 2, (mini.y + maxi.y) / 2, mini.z + hauteur / 2))
    tete = commun.trouver_os(armature, "head") if armature else None
    if tete:
        visage = (commun.position_os(armature, tete, "head") + commun.position_os(armature, tete, "tail")) / 2
    else:
        visage = Vector((centre.x, centre.y, maxi.z - hauteur * 0.07))
    commun.sol(mini.z)
    commun.regler_rendu(resolution, echantillons)
    commun.eclairage_studio(tuple(centre), hauteur, ambiance)
    largeur = max(maxi.x - mini.x, maxi.y - mini.y)
    distance = max(hauteur, largeur * 1.6) * 1.55
    vues = {
        "pied-face": ((centre.x, centre.y - distance, centre.z), centre, 50),
        "pied-trois-quarts": ((centre.x - distance * 0.7, centre.y - distance * 0.7, centre.z), centre, 50),
        "pied-profil": ((centre.x - distance, centre.y, centre.z), centre, 50),
        "pied-dos": ((centre.x + distance * 0.5, centre.y + distance * 0.87, centre.z), centre, 50),
        "plan-taille": ((centre.x - 0.55, centre.y - 1.25, centre.z + hauteur * 0.2), Vector((centre.x, centre.y, centre.z + hauteur * 0.17)), 50),
        "gros-plan-face": ((visage.x, visage.y - 0.95, visage.z + 0.02), visage - Vector((0, 0, 0.05)), 85),
        "gros-plan-trois-quarts": ((visage.x - 0.68, visage.y - 0.68, visage.z + 0.03), visage - Vector((0, 0, 0.05)), 85),
    }
    fichiers = []
    for nom, (position, cible, focale) in vues.items():
        cam = commun.camera(nom, position, tuple(cible), focale)
        chemin = os.path.join(dossier, f"{nom}.png")
        commun.rendre(cam, chemin)
        fichiers.append(chemin)
    return fichiers


def evaluer(entree, dossier, ambiance="neutre", rapide=False):
    """Rapport et rendus d'un fichier .glb ou .blend ; renvoie le rapport."""
    entree, dossier = os.path.abspath(entree), os.path.abspath(dossier)
    os.makedirs(dossier, exist_ok=True)
    commun.vider_scene()
    if entree.endswith(".blend"):
        bpy.ops.wm.open_mainfile(filepath=entree)
    else:
        commun.importer_glb(entree)
    r = rapport(entree)
    commun.ecrire_json(os.path.join(dossier, "rapport.json"), r)
    with open(os.path.join(dossier, "rapport.txt"), "w", encoding="utf-8") as f:
        f.write(texte(r) + "\n")
    print(texte(r))
    if os.environ.get("PZ_SANS_RENDU") == "1":
        return r
    rendus(dossier, ambiance, (540, 960) if rapide else (1080, 1920), 16 if rapide else 64)
    print(f"Rendus écrits dans {dossier}")
    return r


if __name__ == "__main__":
    args = commun.arguments()
    if len(args) < 2:
        raise SystemExit(__doc__)
    evaluer(args[0], args[1], args[2] if len(args) > 2 else "neutre", os.environ.get("PZ_RENDU_RAPIDE") == "1")
