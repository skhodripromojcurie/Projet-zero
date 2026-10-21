# Assets

`models/Adam_Morel.glb` : Adam Morel définitif (lot 3), généré par
`tools/mpfb/construire_adam.py` (MPFB 2, ressources CC0, création du projet ; détail
dans THIRD_PARTY_NOTICES.md). Il remplace le rig procédural dans le plan A01. Le rig
procédural reste le secours si le fichier manque ou est refusé.
Aucune autre ressource externe n’est requise. Le cri est un son synthétique provisoire.

Avant d’ajouter un GLB/GLTF, une texture ou un bruitage : consigner sa source, son auteur,
sa licence et les obligations d’attribution dans THIRD_PARTY_NOTICES.md. Vérifier
l’usage commercial, l’orientation, l’échelle métrique et les clips disponibles.
Les grandes ressources devront être optimisées avant intégration.

## Chemins GitHub Pages

Pour `public/assets/models/adam.glb`, appeler le chargeur avec
`loadRiggedCharacter("assets/models/adam.glb")`. Il applique la base Vite
`/Projet-zero/` automatiquement. Pour un autre chargeur, utiliser `publicAssetUrl`
depuis `src/assets/paths.js`. Ne pas coder `/assets/...` directement dans un `fetch`.
Garder les ressources externes d’un GLTF (.bin, textures) à leurs chemins relatifs
et respecter la casse des fichiers. Aucun modèle n’est ajouté par la configuration Pages.

## Manifeste des modèles

`models/manifest.json` déclare les personnages GLB. `"adam": null` signifie que le rig
procédural est utilisé. Une entrée doit indiquer `url`, `profile`, `source`, `author`,
`license` et `commercialUse: true` ; sinon le studio refuse le modèle. Contrat complet :
`docs/personnage-glb.md`.
