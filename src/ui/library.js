import { icon } from "./icons.js";
import { CHARACTER_LIBRARY } from "../scenes/config.js";
import { CAMERA_PRESETS } from "../cameras/presets.js";
const stats = [
  ["Santé", "100 / 100"],
  ["Endurance", "80 / 80"],
  ["Force", "5"],
  ["Agilité", "5"],
  ["Perception", "7"],
  ["Compétences", "Aucune"],
  ["Menace infectés", "Inconnue"],
];
export function renderLibrary(
  tab,
  container,
  onCamera,
  characterStatus = "",
  onEvaluate = null,
) {
  if (tab === "characters") {
    container.innerHTML = `<div class="section-label">DANS CE PROJET</div><div class="character-card"><div class="avatar-art"><span class="avatar-halo"></span><span class="avatar-body"></span><span class="avatar-head"></span><span class="avatar-neck"></span><span class="avatar-label">RIG 002</span><span class="avatar-type">3D</span></div><div class="asset-description"><strong>Adam Morel</strong><span>Personnage principal</span><small><i class="status-dot"></i> Articulé · version provisoire</small></div></div><p class="model-status" id="character-model-status"></p><label class="evaluate-button">Évaluer un GLB local… <input id="evaluate-glb" type="file" accept=".glb,model/gltf-binary" /></label><p class="model-status">Aperçu en pied et en gros plan, lu sur cet appareil uniquement.</p><div class="section-label upcoming-label">PERSONNAGES PRÉVUS</div>${CHARACTER_LIBRARY.filter(
      (c) => !c.available,
    )
      .map(
        (c) =>
          `<div class="future-character">${icon("person")}<div><strong>${c.name}</strong><span>${c.role}</span></div><span class="tiny">À VENIR</span></div>`,
      )
      .join(
        "",
      )}<div class="library-note">Le modèle provisoire pourra être remplacé par un personnage GLB riggé, déclaré avec sa licence dans assets/models/manifest.json.</div>`;
    container.querySelector("#character-model-status").textContent =
      characterStatus;
    container
      .querySelector("#evaluate-glb")
      .addEventListener("change", (event) => {
        onEvaluate?.(event.target.files[0]);
        event.target.value = "";
      });
  } else if (tab === "environments") {
    container.innerHTML = `<div class="section-label">DÉCOR ACTIF</div><div class="asset-tile">${icon("room")}<h3>Appartement d’Adam</h3><p>France · petit matin</p><span class="asset-tag">GÉOMÉTRIE PROCÉDURALE</span></div><ul class="object-list"><li>Lit, couette drapée & oreillers</li><li>Chevet, réveil 06:42, téléphone & verre</li><li>Fenêtre, rideaux, radiateur & rue à l’aube</li><li>Porte, commode, chaise & sac à dos</li><li>Aube froide, lampe chaude & réverbère orange</li><li>Faisceau de lumière & poussière</li></ul><div class="library-note">Chaque objet est un composant indépendant du décor.</div>`;
  } else if (tab === "cameras") {
    container.innerHTML = `<div class="section-label">CADRAGES DISPONIBLES</div>${Object.entries(
      CAMERA_PRESETS,
    )
      .map(
        ([key, p]) =>
          `<button class="camera-card" data-camera="${key}">${icon("camera")}<span>${p.label}</span>${icon("arrow")}</button>`,
      )
      .join(
        "",
      )}<div class="library-note">Cadrages fixes · 9:16<br>Le plan A01 est le cadrage de référence.</div>`;
    container
      .querySelectorAll("[data-camera]")
      .forEach((btn) =>
        btn.addEventListener("click", () => onCamera(btn.dataset.camera)),
      );
  } else if (tab === "animations") {
    container.innerHTML = `<div class="section-label">ANIMATION ACTIVE</div><div class="asset-tile">${icon("motion")}<h3>Le réveil</h3><p>A01 · 4 temps · couches</p><span class="asset-tag">DÉTERMINISTE</span></div><ol class="beat-list"><li><b>00 — 02</b> Allongé, il ouvre les yeux et se redresse</li><li><b>02 — 04</b> Sursaut au cri, puis il écoute</li><li><b>04 — 06</b> Les yeux, la tête puis le buste vers la fenêtre</li><li><b>06 — 08</b> Immobile, inquiet · le système apparaît</li></ol><div class="library-note">Respiration, clignements et micro-mouvements dépendent du temps absolu : une même seconde donne toujours la même image. L’amplitude règle le jeu d’Adam, pas le redressement.</div>`;
  } else {
    container.innerHTML = `<div class="section-label">PROFIL RPG · ADAM MOREL</div><div class="rpg-library"><span>◈ SURVIVANT</span><h3>Niveau 1</h3><p>0 / 100 XP</p></div><dl class="stats-list">${stats.map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join("")}</dl><div class="library-note">Valeurs narratives initiales. La notification apparaît au dernier quart du plan.</div>`;
  }
}
