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
export function renderLibrary(tab, container, onCamera) {
  if (tab === "characters") {
    container.innerHTML = `<div class="section-label">DANS CE PROJET</div><div class="character-card"><div class="avatar-art"><span class="avatar-halo"></span><span class="avatar-body"></span><span class="avatar-head"></span><span class="avatar-neck"></span><span class="avatar-label">RIG 001</span><span class="avatar-type">3D</span></div><div class="asset-description"><strong>Adam Morel</strong><span>Personnage principal</span><small><i class="status-dot"></i> Articulé · version provisoire</small></div></div><div class="section-label upcoming-label">PERSONNAGES PRÉVUS</div>${CHARACTER_LIBRARY.filter(
      (c) => !c.available,
    )
      .map(
        (c) =>
          `<div class="future-character">${icon("person")}<div><strong>${c.name}</strong><span>${c.role}</span></div><span class="tiny">À VENIR</span></div>`,
      )
      .join(
        "",
      )}<div class="library-note">Le modèle provisoire pourra être remplacé par un personnage GLB riggé.</div>`;
  } else if (tab === "environments") {
    container.innerHTML = `<div class="section-label">DÉCOR ACTIF</div><div class="asset-tile">${icon("room")}<h3>Appartement d’Adam</h3><p>France · petit matin</p><span class="asset-tag">GÉOMÉTRIE PROCÉDURALE</span></div><ul class="object-list"><li>Lit & linge de lit</li><li>Chevet & réveil 06:42</li><li>Fenêtre & rue</li><li>Porte & commode</li><li>Aube froide & lampe chaude</li></ul><div class="library-note">Chaque objet est un composant indépendant du décor.</div>`;
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
    container.innerHTML = `<div class="section-label">ANIMATION ACTIVE</div><div class="asset-tile">${icon("motion")}<h3>Le réveil</h3><p>A01 · 4 temps</p><span class="asset-tag">DÉTERMINISTE</span></div><ol class="beat-list"><li><b>00 — 02</b> Redressement de la tête</li><li><b>02 — 04</b> Réaction au cri</li><li><b>04 — 06</b> Regard vers la fenêtre</li><li><b>06 — 08</b> Apparition du système</li></ol><div class="library-note">Repères à la durée initiale de 8 secondes. L’amplitude et la durée sont ajustables dans l’inspecteur.</div>`;
  } else {
    container.innerHTML = `<div class="section-label">PROFIL RPG · ADAM MOREL</div><div class="rpg-library"><span>◈ SURVIVANT</span><h3>Niveau 1</h3><p>0 / 100 XP</p></div><dl class="stats-list">${stats.map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join("")}</dl><div class="library-note">Valeurs narratives initiales. La notification apparaît au dernier quart du plan.</div>`;
  }
}
