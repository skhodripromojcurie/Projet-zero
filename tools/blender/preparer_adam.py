"""Prépare Adam pour le studio, en une commande, sans modélisation manuelle.

    blender --background --python tools/blender/preparer_adam.py -- Adam_Morel.glb dossier_sortie

Sous Windows : glisser Adam_Morel.glb sur tools/blender/preparer_adam.bat.

Étapes (le fichier d'origine n'est jamais modifié) :
  1-avant/        rapport et rendus du modèle d'origine
  adam_habille.blend   sweat à capuche et jean avec plis (simulation de tissu)
  3-expressions/  un gros plan par expression faciale créée (à vérifier)
  adam_v1.blend   fichier Blender final, modifiable
  adam_v1.glb     export pour le studio
  4-apres/        rapport et rendus du résultat, en pied et en gros plan
  5-ambiance/     mêmes rendus sous la lumière du plan A01

Durée indicative sur un ordinateur portable : 10 à 30 minutes (rendus Cycles).
PZ_RENDU_RAPIDE=1 pour des rendus d'aperçu, PZ_RENDU_FIN=1 pour la pleine résolution,
PZ_SANS_RENDU=1 pour ne produire que le GLB et les rapports (vérification automatique).
"""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

import commun  # noqa: E402
from evaluer_adam import evaluer  # noqa: E402
from expressions_adam import expressions  # noqa: E402
from habiller_adam import exporter_glb, habiller  # noqa: E402


def etape(numero, texte):
    print(f"\n=== Étape {numero} · {texte} ===", flush=True)


def main():
    args = commun.arguments()
    if len(args) < 2:
        raise SystemExit(__doc__)
    entree, sortie = os.path.abspath(args[0]), os.path.abspath(args[1])
    os.makedirs(sortie, exist_ok=True)
    rapide = os.environ.get("PZ_RENDU_RAPIDE") == "1"
    debut = time.time()
    bilan = []

    etape(1, "évaluation du modèle d'origine")
    avant = evaluer(entree, os.path.join(sortie, "1-avant"), "neutre", rapide)
    if avant["os"] == 0:
        raise SystemExit("Le modèle n'a pas de squelette : impossible de l'habiller.")

    etape(2, "habillage : sweat à capuche, jean, plis")
    habille = os.path.join(sortie, "adam_habille.blend")
    habiller(entree, habille)

    etape(3, "expressions faciales (expérimental)")
    final = os.path.join(sortie, "adam_v1.blend")
    try:
        noms = expressions(habille, final, os.path.join(sortie, "3-expressions"))
        bilan.append(f"Expressions créées : {', '.join(noms)} (à vérifier dans 3-expressions).")
    except SystemExit as erreur:
        bilan.append(f"Expressions non créées : {erreur}")
        bpy.ops.wm.open_mainfile(filepath=habille)
        bpy.ops.wm.save_as_mainfile(filepath=final)

    etape(4, "export GLB pour le studio")
    bpy.ops.wm.open_mainfile(filepath=final)
    glb = os.path.join(sortie, "adam_v1.glb")
    exporter_glb(glb)

    etape(5, "évaluation du résultat")
    apres = evaluer(glb, os.path.join(sortie, "4-apres"), "neutre", rapide)
    evaluer(glb, os.path.join(sortie, "5-ambiance"), "scene", rapide)

    minutes = (time.time() - debut) / 60
    bilan = [
        f"Terminé en {minutes:.0f} min. Résultats : {sortie}",
        f"Avant : {avant['triangles']} triangles · après : {apres['triangles']} triangles.",
        f"Taille de adam_v1.glb : {os.path.getsize(glb) / 1048576:.1f} Mo.",
        *bilan,
        "Alertes restantes :",
        *[f"  - {a}" for a in apres["alertes"] or ["aucune"]],
        "Ouvrir adam_v1.glb dans le studio : Bibliothèque › Personnages › Évaluer un GLB local…",
    ]
    with open(os.path.join(sortie, "bilan.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(bilan) + "\n")
    print("\n" + "\n".join(bilan))


if __name__ == "__main__":
    main()
