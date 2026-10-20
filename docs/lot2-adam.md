# Lot 2 · Un Adam crédible

Objectif : remplacer l'Adam procédural par un personnage humain crédible, à partir
du modèle MPFB 2 (ressources déclarées CC0) déjà créé dans Blender, **sans
modélisation manuelle**. Le modèle doit être validé visuellement, en pied et en gros
plan, avant toute intégration dans le plan A01.

## État au moment de cette PR

| Élément | État |
| --- | --- |
| Évaluation d'un GLB dans le studio (en pied, gros plan, rapport) | ✅ fonctionne, testé dans Chromium |
| Scripts Blender : évaluation, habillage, expressions, export | ✅ testés dans le cloud sur un mannequin de test, et à chaque push en CI |
| Pilotage d'un squelette MPFB en pose A par le studio | ✅ testé sur un export Blender réel |
| Essai sur `Adam_Morel.glb` | ⏳ à faire sur votre PC (le fichier n'est pas dans le dépôt) |
| Qualité du visage, des plis et des expressions sur le vrai Adam | ⏳ à juger sur les rendus produits |
| Intégration d'Adam dans le plan A01 | ⛔ volontairement non faite avant votre validation |

Les scripts ont été mis au point sur un mannequin sans visage. Ils sont robustes sur
ce mannequin, mais **le résultat sur Adam reste à voir** : les plis, la capuche et
surtout les expressions faciales (expérimentales) devront être regardés de près.

## 1. Voir votre Adam actuel dans le studio (2 minutes, sans Blender)

1. Ouvrir le studio (en ligne ou `npm run dev`).
2. **Bibliothèque › Personnages › Évaluer un GLB local…**, choisir `Adam_Morel.glb`.
3. Le studio l'affiche en pied et en gros plan, avec un rapport : hauteur, os
   reconnus (le squelette MPFB « game engine » est détecté automatiquement),
   triangles, textures, expressions. On peut le tourner, changer la lumière
   (studio ou ambiance A01) et le poser à n'importe quel instant du plan.

Le fichier est lu par le navigateur uniquement : il n'est ni envoyé, ni enregistré.

## 2. Habiller Adam et lui donner des expressions (Windows, 10 à 30 minutes)

Prérequis : Blender 4.2 LTS ou plus récent, installé normalement.

1. Récupérer le dépôt sur la branche `claude/projet-zero-lot2-adam` (GitHub Desktop :
   *Current branch* › cette branche ; ou bouton *Code › Download ZIP* sur GitHub).
2. Dans l'explorateur Windows, ouvrir le dossier `tools\blender`.
3. **Glisser `Adam_Morel.glb` sur `preparer_adam.bat`.** Une fenêtre noire s'ouvre et
   affiche les étapes ; ne pas la fermer.
4. À la fin, le dossier `Adam_Morel_projet_zero` s'ouvre à côté de votre fichier :

| Dossier ou fichier | Contenu |
| --- | --- |
| `1-avant/` | rapport et rendus du modèle d'origine |
| `3-expressions/` | un gros plan par expression faciale créée |
| `4-apres/` | rendus en pied (face, trois-quarts, profil, dos), plan taille, gros plans |
| `5-ambiance/` | mêmes rendus sous la lumière froide et chaude du plan A01 |
| `adam_v1.glb` | le modèle prêt pour le studio |
| `adam_v1.blend` | le fichier Blender correspondant, modifiable |
| `bilan.txt` | résumé et alertes |

5. Ouvrir `adam_v1.glb` dans le studio avec **Évaluer un GLB local…** pour le voir
   bouger avec les poses du plan A01.

Si Blender n'est pas trouvé, ouvrir une invite de commandes et taper :

```bat
set BLENDER_EXE=C:\Program Files\Blender Foundation\Blender 4.2\blender.exe
"C:\...\tools\blender\preparer_adam.bat" "C:\Users\skhod\Documents\ChatGPT\Écriture\Adam-Morel\Adam_Morel.glb"
```

## Ce que fait chaque script

| Script | Rôle |
| --- | --- |
| `preparer_adam.py` / `.bat` | enchaîne tout, ne modifie jamais le fichier d'origine |
| `evaluer_adam.py` | rapport technique et rendus Cycles en pied et en gros plan |
| `habiller_adam.py` | sweat à capuche anthracite et jean sombre : découpe d'après le squelette, tissu posé au-dessus de la peau, simulation de tissu (tombé, volume), plis guidés aux poignets, coudes, ourlet, chevilles et genoux, capuche rabattue, poche kangourou, cordons ; poids du squelette transférés ; peau couverte retirée |
| `expressions_adam.py` | expressions aux noms ARKit (clignements, yeux écarquillés, sourcils, mâchoire, commissures), déduites de la position des yeux — **expérimental** |
| `mannequin_test.py` | mannequin de test créé par le projet, pour éprouver les scripts |

Si `Adam_Morel.glb` porte déjà des vêtements MPFB, ils sont **retirés et remplacés**
par le sweat et le jean (la liste s'affiche) ; cheveux, sourcils, cils, yeux, dents et
chaussures sont conservés. Pour garder les vêtements d'origine :
`set PZ_GARDER_VETEMENTS=1`.

Réglages possibles avant de lancer, dans l'invite de commandes :
`set PZ_EXCEDENT_TISSU=0.2` (plus de plis), `set PZ_RENDU_RAPIDE=1` (aperçu rapide),
`set PZ_RENDU_FIN=1` (rendus en pleine résolution).

## Après votre validation visuelle

1. Vous déposez `adam_v1.glb` (et vous confirmez la licence de chaque ressource MPFB
   utilisée : base, peau, yeux, cheveux, sourcils).
2. Je le déclare dans `public/assets/models/manifest.json` avec le profil `mpfb`,
   je l'ajoute à `THIRD_PARTY_NOTICES.md`, je règle sa position dans le lit et les
   cadrages, et je vérifie le plan A01 complet dans Chromium.
3. L'Adam procédural reste disponible en secours tant que le GLB n'est pas validé.

## Limites connues

- Les plis sont en partie simulés et en partie guidés par des règles : ils ne
  s'animent pas (ce sont des plis « figés » qui suivent le squelette).
- La simulation est faite en pose A : les plis de coude seront moins marqués qu'en
  pose assise.
- Les expressions sont des déformations calculées, pas un rig facial sculpté ; elles
  peuvent demander un réglage des amplitudes (`AMPLITUDES` dans `expressions_adam.py`).
- Les cheveux, la barbe et la qualité de la peau dépendent des ressources MPFB
  choisies lors de la création du modèle ; les scripts ne les modifient pas encore.
- Mixamo n'est pas utilisé à ce stade : le studio anime Adam avec ses propres poses.
