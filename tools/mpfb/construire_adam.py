"""Construit Adam Morel définitif (variante retenue de la recette) et exporte Adam_Morel.glb.

    blender --background --python tools/mpfb/construire_adam.py -- dossier_sortie

Étapes, chacune enregistrée dans dossier_sortie :
  1-tete.blend      MPFB : corps, visage figé, expressions, pilosité, dents, langue,
                    os des yeux, squelette « game engine », peau et yeux cuits en textures
  2-habille.blend   sweat à capuche et jean du lot 2 (simulation de tissu)
  Adam_Morel.glb    export optimisé pour Projet Zéro Studio (textures WebP)
PZ_REPRENDRE=1 réutilise les fichiers .blend déjà produits.
"""

import os
import sys
import time

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
sys.path.insert(0, os.path.join(ICI, "..", "blender"))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import commun  # noqa: E402
import expressions_mpfb  # noqa: E402
import finaliser  # noqa: E402
import mpfb_outils  # noqa: E402
import peinture  # noqa: E402
import pilosite  # noqa: E402
from generer_variantes import RECETTE, vider_scene  # noqa: E402
from habiller_adam import exporter_glb, habiller  # noqa: E402

POILS_SUIVANT_LE_VISAGE = ("Sourcils", "Cils")
# Couches remplacées par une peinture sur la peau (meilleur rendu dans le navigateur).
COUCHES_PEINTES = ("Barbe", "Cheveux sous-couche")


def tete(recette, chemin):
    vider_scene()
    humain, yeux = mpfb_outils.creer_adam(recette, recette["variante_retenue"])
    humain.name = "Corps"  # reconnu comme corps par les scripts du lot 2
    poils = pilosite.ajouter_pilosite(humain, recette)
    for objet in [o for o in poils if o.name in COUCHES_PEINTES]:
        poils.remove(objet)
        bpy.data.objects.remove(objet)
    canaux = expressions_mpfb.ajouter_expressions(humain)
    expressions_mpfb.suivre_expressions([o for o in poils if o.name in POILS_SUIVANT_LE_VISAGE], humain)
    HumanService, _, _ = mpfb_outils.services()
    squelette = HumanService.add_builtin_rig(humain, recette["squelette"])
    squelette.name = "Adam_Morel"
    reperes = mpfb_outils.reperes(humain)
    finaliser.figer_formes(humain, canaux)
    bouche = finaliser.bouche(humain, recette["bouche"])
    finaliser.retirer_aides(humain, squelette, bouche)
    finaliser.os_des_yeux(squelette, yeux, reperes)
    finaliser.lier_pilosite(poils, humain, squelette)
    for objet in bouche:
        finaliser.lier(objet, squelette)
    export = recette["export"]
    peau = finaliser.cuire([humain], export["peau_px"], "Peau Adam")
    peinture.teinter(peau, export["teinte_peau"])
    taille, graine = export["peau_px"], recette["cheveux"]["graine"]
    # Sur la peau, les poils paraissent plus sombres que leur couleur propre (ombre entre les mèches).
    fonce = [c * 0.45 for c in recette["cheveux"]["couleur"]]
    cheveux = pilosite.zone_cheveux(reperes)
    # Cuir chevelu peint un peu sous la ligne des mèches : lisière douce, sans peau entre les cartes.
    peinture.peindre(
        humain, peau, lambda p: cheveux(p + Vector((0, 0, 0.008))), fonce, 0.95,
        peinture.motif_cheveux(taille, graine), anneaux=2,
    )
    sourcils = bpy.data.objects["Sourcils"]
    # Racines des cartes de sourcils : les deux premiers sommets de chaque ruban de 6.
    sommets = [sourcils.matrix_world @ v.co for v in sourcils.data.vertices]
    racines = [(sommets[i] + sommets[i + 1]) / 2 for i in range(0, len(sommets), 6)]
    zone, champ = peinture.champ_racines(racines)
    peinture.peindre(humain, peau, zone, [c * 0.7 for c in fonce], 0.9, peinture.motif_cheveux(taille, graine + 7), champ=champ)
    barbe = recette["barbe"]
    peinture.peindre(
        humain, peau, pilosite.zone_barbe(reperes), barbe["couleur"], barbe["opacite_peinte"],
        peinture.motif_barbe(taille, barbe["densite"], graine + 13),
    )
    finaliser.remplacer_materiau(humain, finaliser.materiau_simple("Peau", (1, 1, 1), export["rugosite_peau"], peau))
    finaliser.retirer_cornees(yeux)
    iris = finaliser.cuire([yeux], export["yeux_px"], "Yeux Adam")
    finaliser.remplacer_materiau(yeux, finaliser.materiau_simple("Yeux", (1, 1, 1), 0.06, iris))
    bpy.ops.wm.save_as_mainfile(filepath=chemin)


def alleger(objet, ratio):
    """Décimation des vêtements (sans formes) : moins de triangles, mêmes plis et poids."""
    reduction = objet.modifiers.new("Allègement", "DECIMATE")
    reduction.ratio = ratio
    with bpy.context.temp_override(object=objet, active_object=objet):
        bpy.ops.object.modifier_move_to_index(modifier=reduction.name, index=0)
        bpy.ops.object.modifier_apply(modifier=reduction.name)


def exporter(recette, habille, glb):
    bpy.ops.wm.open_mainfile(filepath=habille)
    for nom, ratio in recette["export"]["allegement"].items():
        if nom in bpy.data.objects:
            alleger(bpy.data.objects[nom], ratio)
    for objet in bpy.data.objects:
        if objet.type == "MESH":
            objet.data.name = objet.name  # noms lisibles dans le studio
    exporter_glb(
        glb,
        export_image_format="WEBP",
        export_image_quality=recette["export"]["qualite_images"],
        export_morph_normal=False,
        export_vertex_color="MATERIAL",
        export_all_vertex_colors=False,  # pas de COLOR_0 blanc factice
    )


def main():
    args = commun.arguments()
    if not args:
        raise SystemExit(__doc__)
    sortie = os.path.abspath(args[0])
    os.makedirs(sortie, exist_ok=True)
    recette = mpfb_outils.lire_recette(RECETTE)
    reprendre = os.environ.get("PZ_REPRENDRE") == "1"
    chemins = {n: os.path.join(sortie, n) for n in ("1-tete.blend", "2-habille.blend", "Adam_Morel.glb")}
    debut = time.time()
    if not (reprendre and os.path.isfile(chemins["1-tete.blend"])):
        tete(recette, chemins["1-tete.blend"])
        print(f"Tête et peau : {time.time() - debut:.0f} s", flush=True)
    if not (reprendre and os.path.isfile(chemins["2-habille.blend"])):
        habiller(chemins["1-tete.blend"], chemins["2-habille.blend"])
        print(f"Habillage : {time.time() - debut:.0f} s", flush=True)
    exporter(recette, chemins["2-habille.blend"], chemins["Adam_Morel.glb"])
    taille = os.path.getsize(chemins["Adam_Morel.glb"]) / 1048576
    print(f"Adam_Morel.glb : {taille:.1f} Mo, {time.time() - debut:.0f} s au total")


if __name__ == "__main__":
    main()
