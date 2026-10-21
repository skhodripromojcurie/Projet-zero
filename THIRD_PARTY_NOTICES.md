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
