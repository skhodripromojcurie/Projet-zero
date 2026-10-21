"""Génère les variantes de visage d'Adam (MPFB 2) et leurs rendus de comparaison.

    blender --background --python tools/mpfb/generer_variantes.py -- dossier_sortie [A,B,…]

Pour chaque variante : adam_<X>.blend, recette_<X>.json (valeurs finales) et
cinq rendus Cycles : face, trois-quarts, profil, yeux, bouche.
À la fin : comparaison.html, à ouvrir dans un navigateur (sans Blender).
Variables : PZ_ECHANTILLONS (défaut 24), PZ_RESSOURCES_MH (dossier des
ressources MakeHuman si elles ne sont pas installées avec MPFB).
"""

import html
import json
import os
import sys
import time

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)
sys.path.insert(0, os.path.join(ICI, "..", "blender"))

import bpy  # noqa: E402

import commun  # noqa: E402
import mpfb_outils  # noqa: E402
import pilosite  # noqa: E402
import rendus_visage  # noqa: E402

RECETTE = os.path.join(ICI, "adam_recette.json")


def vider_scene():
    """Scène vide sans toucher aux préférences (MPFB reste installé et activé)."""
    bpy.ops.wm.read_homefile(use_empty=True)
    for donnees in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.node_groups):
        for bloc in list(donnees):
            if bloc.users == 0:
                donnees.remove(bloc)


def generer(recette, variante, dossier, echantillons):
    vider_scene()
    humain, yeux = mpfb_outils.creer_adam(recette, variante)
    humain.name = f"Adam_{variante}"
    pilosite.ajouter_pilosite(humain, recette)
    os.makedirs(dossier, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(dossier, f"adam_{variante}.blend"))
    finale = dict(recette["visage"])
    for nom, valeur in recette["variantes"][variante]["visage"].items():
        finale[nom] = round(finale.get(nom, 0.0) + valeur, 4)
    commun.ecrire_json(
        os.path.join(dossier, f"recette_{variante}.json"),
        {"variante": variante, "nom": recette["variantes"][variante]["nom"], "macros": recette["macros"],
         "visage": finale, "taille_m": recette["taille_m"]},
    )
    return rendus_visage.rendre_visage(mpfb_outils.reperes(humain), dossier, f"{variante}-", echantillons)


def page(sortie, recette, variantes):
    lignes = []
    for v in variantes:
        cellules = "".join(
            f'<figure><img src="{v}/{v}-{vue}.png" alt="Variante {v}, {vue}"><figcaption>{vue}</figcaption></figure>'
            for vue in rendus_visage.VUES
        )
        nom = html.escape(recette["variantes"][v]["nom"])
        lignes.append(f'<section><h2>Variante {v} · {nom}</h2><div class="vues">{cellules}</div></section>')
    contenu = f"""<!doctype html><html lang="fr"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Adam Morel · variantes de visage</title>
<style>body{{margin:0;padding:16px;background:#101314;color:#d6dad7;font:14px system-ui,sans-serif}}
h1{{font-weight:500}}h2{{font-size:15px;color:#cfb58b;margin:28px 0 8px}}
.vues{{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}}
figure{{margin:0}}img{{width:100%;display:block;background:#000}}figcaption{{font-size:12px;color:#8a9592;padding:4px 0}}</style>
<h1>Adam Morel · {len(variantes)} variantes de visage (MPFB 2, rendus Cycles)</h1>
<p>Rendus réels du modèle 3D généré. Choisissez une variante : ses valeurs sont dans recette_X.json.</p>
{''.join(lignes)}</html>"""
    with open(os.path.join(sortie, "comparaison.html"), "w", encoding="utf-8") as f:
        f.write(contenu)


def main():
    args = commun.arguments()
    if not args:
        raise SystemExit(__doc__)
    sortie = os.path.abspath(args[0])
    recette = mpfb_outils.lire_recette(RECETTE)
    variantes = args[1].split(",") if len(args) > 1 else list(recette["variantes"])
    echantillons = int(os.environ.get("PZ_ECHANTILLONS", "24"))
    for v in variantes:
        debut = time.time()
        generer(recette, v, os.path.join(sortie, v), echantillons)
        print(f"Variante {v} : {time.time() - debut:.0f} s", flush=True)
    page(sortie, recette, variantes)
    print(f"Comparaison : {os.path.join(sortie, 'comparaison.html')}")


if __name__ == "__main__":
    main()
