# Lot 3 · Création automatisée d'Adam Morel avec MPFB

## Ce qui a changé

L'environnement cloud accède désormais aux **dépôts Git officiels** de MakeHuman :
`makehumancommunity/mpfb2` (extension MPFB 2.0.18, maillage de base, 1 477 cibles,
squelettes, expressions) et `makehumancommunity/makehuman` (yeux haute définition et
texture d'iris). Les sites `extensions.blender.org` et `static.makehumancommunity.org`
restent bloqués, ainsi que le dépôt des autres ressources (`makehuman-assets`).

MPFB 2.0.18 tourne donc **réellement** dans le Blender (5.0.1) du cloud : les visages
présentés ici sont de vrais modèles 3D MPFB, rendus avec Cycles. Le Blender de votre
PC n'a pas été utilisé.

## Licences vérifiées

| Élément | Source | Licence |
| --- | --- | --- |
| Maillage de base, cibles, squelettes, unités d'expression, masques de peau | `mpfb2` (`LICENSE.ASSETS.md`) | CC0 1.0, usage commercial libre |
| Code de MPFB | `mpfb2` (`LICENSE.CODE.md`) | GPLv3 (outil ; le code n'est pas intégré au studio) |
| Yeux `high-poly` et iris `brown_eye.png` | `makehuman` (`data/eyes`) | CC0 1.0 (en-tête des fichiers) |
| Sorties de MPFB (modèles, rendus, exports) | `mpfb2/LICENSE.md`, section D | aucune revendication de l'équipe MakeHuman |
| Cheveux, sourcils, cils, barbe et leurs textures | `tools/mpfb/pilosite.py` | création du projet |

Aucune ressource MakeHuman n'est copiée dans le dépôt : les scripts les lisent depuis
l'installation de MPFB (ou `PZ_RESSOURCES_MH`).

## La recette

`tools/mpfb/adam_recette.json` décrit Adam entièrement : macros MPFB (homme, 29 ans,
européen, mince), taille exacte (1,78 m), cibles du visage, couleurs de peau, d'iris,
de cheveux et de barbe, et six variantes proches (A à F). Rejouée, elle redonne le même
modèle au sommet près : c'est la garantie d'un Adam identique dans tous les épisodes.
Une fois la variante choisie, ses valeurs sont figées dans la recette.

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `mpfb_outils.py` | active MPFB (cloud ou PC), crée Adam depuis la recette, peau, yeux, repères |
| `pilosite.py` | cheveux courts (cartes de mèches et sous-couche), sourcils, cils, barbe |
| `expressions_mpfb.py` | 10 expressions du studio (noms ARKit) depuis les unités MPFB ; les poils suivent |
| `rendus_visage.py` | rendus face, trois-quarts, profil, yeux, bouche, cadrés sur les repères |
| `generer_variantes.py` / `.bat` | les six variantes, leurs rendus et `comparaison.html` |

## Consulter les variantes sans Blender

- Dans la pull request : planches `docs/lot3/variante-*.jpg`.
- Sur votre PC (facultatif) : double-cliquer `tools\mpfb\generer_variantes.bat`. Il
  régénère les six visages avec votre MPFB et ouvre `comparaison.html` dans le
  navigateur (20 à 60 minutes).

## Après votre choix

1. La variante retenue est figée dans la recette.
2. Expressions, squelette « game engine » (53 os, vérifié), habillage du lot 2,
   cuisson de la peau en textures, export GLB compressé, chargement dans le studio.
3. Rendus de validation : expressions, animation du squelette, plan A01.

## Limites actuelles

- Les cheveux sont des cartes générées par script : une coupe courte crédible de loin,
  mais moins fine qu'une coiffure sculptée ; la ligne de cheveux reste un peu nette.
- La peau procédurale MPFB doit être **cuite en textures** pour le GLB : le rendu dans
  le navigateur sera moins riche que dans Cycles (pas de vraie diffusion sous la peau).
- Les variantes s'écartent volontairement peu : ce sont six réglages fins d'une même
  identité, pas six personnes différentes.
