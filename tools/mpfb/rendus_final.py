"""Rendus Cycles de validation d'Adam_Morel.glb, à partir du fichier exporté lui-même.

    blender --background --python tools/mpfb/rendus_final.py -- Adam_Morel.glb dossier_sortie

Produit : en pied (repos), portrait trois-quarts, une vue par expression,
gros plan de la bouche ouverte (dents, langue) et une pose de squelette
(tête tournée, bras levé, genou plié) pour contrôler les déformations.
PZ_ECHANTILLONS (défaut 24).
"""

import math
import os
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
sys.path.insert(0, os.path.join(ICI, "..", "blender"))

import bpy  # noqa: E402
from mathutils import Euler  # noqa: E402

import commun  # noqa: E402
import rendus_visage  # noqa: E402

EXPRESSIONS = {
    "neutre": {},
    "fatigue": {"eyeBlinkLeft": 0.42, "eyeBlinkRight": 0.42, "browDownLeft": 0.25, "browDownRight": 0.25,
                "mouthFrownLeft": 0.3, "mouthFrownRight": 0.3},
    "inquietude": {"browInnerUp": 0.7, "browDownLeft": 0.25, "browDownRight": 0.25,
                   "mouthFrownLeft": 0.5, "mouthFrownRight": 0.5},
    "surprise": {"eyeWideLeft": 1, "eyeWideRight": 1, "browInnerUp": 1, "jawOpen": 0.45},
    "peur": {"eyeWideLeft": 0.8, "eyeWideRight": 0.8, "browInnerUp": 1, "jawOpen": 0.25,
             "mouthFrownLeft": 0.6, "mouthFrownRight": 0.6},
}

# Pose de contrôle : (os, rotation XYZ en degrés dans le repère de l'os).
POSE = {
    "neck_01": (0, 0, 0), "head": (0, 25, 0),
    "upperarm_l": (0, 0, -60), "lowerarm_l": (0, 0, -70),
    "thigh_r": (-50, 0, 0), "calf_r": (80, 0, 0),
}


def regler_expression(valeurs):
    for objet in bpy.data.objects:
        if objet.type == "MESH" and objet.data.shape_keys:
            for cle in objet.data.shape_keys.key_blocks[1:]:
                cle.value = valeurs.get(cle.name, 0.0)


def reperes(armature):
    """Centres des yeux, d'après les os eye_l / eye_r ajoutés à l'export."""
    return {
        f"joint-{c}-eye": commun.position_os(armature, armature.data.bones[f"eye_{c}"]) for c in "lr"
    }


def main():
    args = commun.arguments()
    if len(args) < 2:
        raise SystemExit(__doc__)
    glb, sortie = os.path.abspath(args[0]), os.path.abspath(args[1])
    echantillons = int(os.environ.get("PZ_ECHANTILLONS", "24"))
    commun.vider_scene()
    commun.importer_glb(glb)
    armature = commun.armature_principale()
    points = reperes(armature)
    pied = commun.boite_englobante(commun.maillages_visibles())
    rendus_visage.rendre_visage(points, sortie, "repos-", echantillons, vues=("trois-quarts",), pied=pied)
    for nom, valeurs in EXPRESSIONS.items():
        regler_expression(valeurs)
        vues = ("face", "bouche") if nom == "surprise" else ("face",)
        rendus_visage.rendre_visage(points, sortie, f"{nom}-", echantillons, vues=vues)
    regler_expression({})
    for nom, angles in POSE.items():
        os_ = armature.pose.bones[nom]
        os_.rotation_mode = "XYZ"
        os_.rotation_euler = Euler([math.radians(a) for a in angles])
    bpy.context.view_layer.update()
    rendus_visage.rendre_visage(points, sortie, "pose-", echantillons, vues=(), pied=commun.boite_englobante(commun.maillages_visibles()))


if __name__ == "__main__":
    main()
