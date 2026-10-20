# PROJET ZÉRO STUDIO

## Objectif

Un atelier web gratuit pour la série originale « PROJET ZÉRO — L’ÉVEIL ».
Direction : France contemporaine, tension, bleu froid, gris désaturés, lumière orange.
Adam Morel a 29 ans, cheveux bruns, barbe légère, sweat anthracite, jean sombre.
Le prototype 001 est un animatique en primitives articulées, pas un modèle semi-réaliste.
Ne pas qualifier le rendu de photoréaliste ni cacher ses limites.

## Travail et conventions

- Utiliser le checkout existant ; chaque tâche cloud est déjà isolée. Pas de worktree sans demande explicite.
- Travailler sur une branche dédiée, proposer une PR ; ne pas pousser directement sur main.
- Pas de modification concurrente du même fichier par plusieurs assistants.
- JavaScript ESM, modules courts ; interface et documentation en français.
- Scènes dans src/scenes, décor dans src/environments, personnages dans src/characters,
  poses dans src/animations, caméras dans src/cameras, interface dans src/ui.
- Aucune API payante, clé obligatoire, abonnement ni service distant à l’exécution.
- Vérifier et documenter la licence commerciale de tout asset externe avant téléchargement.
- L’animation doit être une fonction absolue du temps, déterministe et interpolée.
- Les personnages exposent root et applyPose(pose, config, time) ; garder la scène indépendante
  du rig interne. Le remplacement GLB demande un adaptateur et un contrôle de licence.
- Pas de boutons factices. Toute action visible doit fonctionner ou être explicitement indisponible.
- Utiliser textContent pour les textes éditables, jamais innerHTML avec les données utilisateur.
- Ne pas stocker de secrets. Les réglages sont locaux et ne sont pas une sauvegarde Git.

## Lancer et vérifier

Node 24 recommandé. `npm ci`, puis `npm run dev`.
Dans le cloud, le cache npm peut être dirigé vers /workspace/.npm-cache.
`npm test` : tests des poses, de la temporalité et de la validation des réglages.
`npm run build` : compilation Vite.
`npx playwright install chromium`, puis `npm run test:e2e` : tests fonctionnels réels.
Si Chromium système existe : `CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e`.
Les captures sont dans artifacts/ (ignoré). Vérifier aussi visuellement cadrage, lumière,
notification, affichage téléphone et absence de changements d’apparence entre images.
Conserver le package-lock.json et préférer npm ci aux installations non verrouillées.

## Déploiement Pages

- `vite.config.js` fixe la base `/Projet-zero/` en développement et production.
- Les assets publics passent par `publicAssetUrl` dans `src/assets/paths.js` ;
  conserver les ressources GLTF relatives au modèle.
- `.github/workflows/pages.yml` publie uniquement depuis `main`, après les tests.
- Vérifier la version compilée avec `STUDIO_PREVIEW=1 npm run test:e2e` ;
  les navigations Playwright doivent rester relatives à la base du studio (`./`).
