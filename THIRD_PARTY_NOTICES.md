# Dépendances et ressources

Le prototype ne télécharge aucun modèle, animation, texture, son ou police tiers.
L’appartement, le rig provisoire v2, toutes les textures (murs, parquet, tissus, peau,
cheveux, barbe, façade, ciel), le portrait CSS illustratif de la bibliothèque et le son
synthétique sont produits par le code du projet. L’environnement de reflets est généré
par `RoomEnvironment` de three.js, sans image HDR externe. Le mannequin GLB des tests
(`tests/fixtures/humanoid-glb.js`) est écrit octet par octet par le projet, et
`tests/fixtures/mannequin-mpfb.glb` est produit par `tools/blender/mannequin_test.py`
(création du projet ; seuls les noms d'os suivent la convention MPFB).
Aucun service payant ni clé API n’est nécessaire. Les références créatives du brief ne
sont pas des assets inclus et ne confèrent aucun droit sur des contenus tiers.

Dépendances libres (versions exactes dans package-lock.json) :

| Paquet           | Rôle                      | Licence    |
| ---------------- | ------------------------- | ---------- |
| three            | Rendu 3D, chargeur GLTF, post-traitement et environnement (addons) | MIT |
| vite             | Serveur et compilation    | MIT        |
| @playwright/test | Tests navigateur          | Apache-2.0 |
| bpy (Blender, hors dépôt) | Exécution des scripts `tools/blender` | GPL-3.0 ; les fichiers produits appartiennent à leur auteur |

Les avis complets des dépendances et dépendances transitives restent dans leurs
paquets npm. Conserver les avis applicables lors d’une redistribution. Une future
ressource doit avoir sa propre ligne de provenance, licence et attribution ici.

## Ressources prévues pour le lot 2 (non incluses)

Rien n’est téléchargé tant que la licence n’a pas été revérifiée à la source.

- Blender (GPL) : les fichiers produits appartiennent à leur auteur.
- MPFB 2 (extension GPL) et ressources officielles MakeHuman (base humaine, peaux,
  yeux, sourcils) annoncées en CC0 ; chaque ressource communautaire doit être vérifiée.
- Mixamo (compte Adobe gratuit) : usage commercial autorisé dans un projet, mais les
  fichiers bruts ne doivent pas être redistribués. Aucun fichier Mixamo brut ne sera
  publié dans ce dépôt public ; seules des animations intégrées et retravaillées.

## Lot 3 · Adam Morel avec MPFB (outils, hors studio)

Les scripts `tools/mpfb` utilisent MPFB 2 et des ressources MakeHuman, lues depuis
leur installation, sans copie dans ce dépôt :

| Élément | Source | Licence |
| --- | --- | --- |
| MPFB 2.0.18 (code) | github.com/makehumancommunity/mpfb2 | GPL-3.0 |
| Maillage de base, cibles, squelettes, unités d'expression | github.com/makehumancommunity/mpfb2 | CC0 1.0 |
| Yeux « high-poly » et texture d'iris brune | github.com/makehumancommunity/makehuman | CC0 1.0 |

L'équipe MakeHuman ne revendique aucun droit sur les sorties de MPFB (modèles,
rendus, exports). Cheveux, sourcils, cils, barbe et leurs textures sont générés par
`tools/mpfb/pilosite.py` (création du projet).

### `public/assets/models/Adam_Morel.glb` (publié avec le studio)

Modèle généré par `tools/mpfb/construire_adam.py` à partir de la recette
`tools/mpfb/adam_recette.json`. Il contient uniquement :

| Élément du fichier | Origine | Licence |
| --- | --- | --- |
| Maillage du corps, dents, langue (géométrie d'aide), formes d'expression | MPFB 2, ressources de `mpfb2` | CC0 1.0 |
| Squelette « game engine » (53 os) | MPFB 2, ressources de `mpfb2` | CC0 1.0 |
| Globes oculaires « high-poly » | `makehuman` (`data/eyes`) | CC0 1.0 |
| Os `eye_l` / `eye_r`, textures de peau et d'yeux cuites, barbe, cuir chevelu et sourcils peints, cartes de cheveux, sourcils et cils | scripts du projet | création du projet |
| Sweat à capuche, jean, capuche, poche, cordons | `tools/blender/habiller_adam.py` (lot 2) | création du projet |

Aucun code MPFB (GPL-3.0) n'est inclus dans le fichier ni dans le studio. Aucun
fichier Mixamo ni autre ressource tierce. Usage commercial autorisé.
