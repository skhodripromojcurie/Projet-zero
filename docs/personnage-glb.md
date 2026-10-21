# Contrat d’un personnage GLB · Projet Zéro Studio

Ce document fixe ce qu’un modèle riggé doit fournir pour remplacer le rig procédural
d’Adam sans modifier les scènes. Il sert de cahier des charges au lot 2 (`adam_v1.glb`).
Aucun modèle humain n’est inclus à ce stade : le chargeur est validé avec un mannequin
technique généré par les tests (`tests/fixtures/humanoid-glb.js`), qui n’est pas Adam.

## Déclaration et licence

Un GLB n’est chargé que s’il est déclaré dans `public/assets/models/manifest.json` :

```json
{
  "version": 1,
  "characters": {
    "adam": {
      "url": "assets/models/adam_v1.glb",
      "profile": "projet-zero",
      "source": "Création Projet Zéro · Blender + MPFB 2 (ressources CC0)",
      "author": "Projet Zéro",
      "license": "CC0 1.0 (base MakeHuman) · création originale",
      "commercialUse": true,
      "clips": { "wake_sit_up": "A01_Reveil" },
      "morphAliases": {}
    }
  }
}
```

`source`, `author`, `license` et `commercialUse: true` sont obligatoires. Sans eux, le
studio refuse le modèle, l’indique dans la bibliothèque et conserve le rig procédural.
Ajouter aussi une ligne dans `THIRD_PARTY_NOTICES.md`. **Aucun fichier Mixamo brut**
(FBX ou GLB téléchargé tel quel) ne doit être publié dans ce dépôt public.

## Squelette

Les poses sont décrites dans un vocabulaire commun (`src/animations/humanoid.js`) :
`hips, spine, chest, neck, head`, puis `clavicle, upperArm, forearm, hand, thigh, shin,
foot` côtés `L` et `R`. Repère de référence : debout, bras le long du corps, regard
vers +Z, Y vers le haut, mètres. Le profil (`src/characters/rig-profiles.js`) associe
ces articulations aux noms d’os du modèle :

| Profil        | Origine                         | État                                      |
| ------------- | ------------------------------- | ----------------------------------------- |
| `projet-zero` | export Blender du lot 2         | cible ; testé avec le mannequin technique |
| `mixamo`      | auto-rig Mixamo (`mixamorig:*`) | correction de T-pose prévue, à valider    |
| `mpfb`        | MPFB 2, squelette « game engine » | validé avec `Adam_Morel.glb` (lot 3)    |

Les axes propres à chaque os sont gérés par le chargeur : une rotation exprimée dans le
repère du personnage est transposée dans le repère de repos de l’os.

## Animation : deux modes

- **Clips** : le plan déclare des clips sémantiques (`sleep`, `wake_sit_up`, `startle`,
  `look_window`, `worried_idle`) avec poids et temps locaux calculés depuis le temps du
  plan (`src/animations/a01.js`). Le manifeste les associe aux noms de clips du GLB.
  La respiration et les micro-mouvements s’ajoutent par-dessus.
- **Pose** : sans clip associé, la pose normalisée pilote directement les os.

Dans les deux cas l’image ne dépend que du temps : revenir à une seconde redonne la
même image. Aucune transition n’intègre le temps écoulé entre deux images.

## Visage

Expressions en morph targets, noms ARKit (alias possibles via `morphAliases`) :
`eyeBlinkLeft`, `eyeBlinkRight`, `eyeWideLeft`, `eyeWideRight`, `browInnerUp`,
`browDownLeft`, `browDownRight`, `jawOpen`, `mouthFrownLeft`, `mouthFrownRight`.
Regard : os `eyeL`/`eyeR` (profil `projet-zero`), `eye_l`/`eye_r` (profil `mpfb`,
ajoutés par `tools/mpfb/finaliser.py`). Un canal absent est ignoré.

## Cheveux en cartes

`"alphaHash": ["Cheveux", "Sourcils", "Cils"]` dans le manifeste (ou `true` pour toutes
les textures transparentes) dessine ces matériaux en transparence tramée : des milliers
de mèches superposées sans tri ni scintillement d'une image à l'autre. L'évaluateur
local l'applique d'office. Les maillages riggés ne sont jamais écartés par le cadrage
(`frustumCulled = false`) : leurs bornes sont calculées dans la pose de liaison.

## Budget conseillé pour le navigateur

- 20 000 à 40 000 triangles pour Adam, cheveux compris.
- Textures 2048 px maximum (peau, vêtements), 1024 px pour les accessoires.
- Échelle métrique, pieds au sol, regard vers +Z, pas de lumière ni caméra exportée.
- Fichier GLB unique, idéalement sous 15 Mo.
