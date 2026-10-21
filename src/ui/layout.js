import { icon } from "./icons.js";
import { CAMERA_PRESETS } from "../cameras/presets.js";

export function mountLayout(app) {
  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" aria-label="Projet Zéro Studio, accueil"><span class="brand-mark">Ø</span><span>PROJET ZÉRO <b>STUDIO</b></span></a>
      <div class="project-path"><span>PROJET ZÉRO — L’ÉVEIL</span><i>/</i> Épisode 01 <i>/</i> <strong>Le réveil</strong></div>
      <span class="prototype-badge">PROTOTYPE 001</span>
    </header>
    <button id="library-backdrop" class="library-backdrop" aria-label="Fermer la bibliothèque" hidden></button><main class="studio">
      <aside class="library panel" id="library-panel">
        <div class="panel-heading"><span class="eyebrow">EXPLORATEUR</span><span class="tiny">01 / 01</span></div>
        <div class="project-card"><span class="project-symbol">Z<span>01</span></span><div><strong>L’ÉVEIL</strong><span>Épisode 01 · Le réveil</span></div><span class="status-dot"></span></div>
        <div class="section-label">BIBLIOTHÈQUE <span>5 collections</span></div>
        <nav class="collections" aria-label="Bibliothèque">
          <button class="collection active" data-tab="characters">${icon("person")} Personnages <span>01</span></button>
          <button class="collection" data-tab="environments">${icon("room")} Décors <span>01</span></button>
          <button class="collection" data-tab="cameras">${icon("camera")} Caméras <span>04</span></button>
          <button class="collection" data-tab="animations">${icon("motion")} Animations <span>01</span></button>
          <button class="collection" data-tab="rpg">${icon("layers")} Interfaces RPG <span>01</span></button>
        </nav>
        <div class="library-content" id="library-content"></div>
        <div class="library-footer"><span class="status-dot"></span> MOTEUR THREE.JS <span id="engine-status">INITIALISATION</span></div>
      </aside>
      <section class="workspace" aria-label="Aperçu et timeline">
        <div class="workspace-heading"><div><span class="eyebrow">SÉQUENCE 01</span><h1>Le réveil <span>/ A01</span></h1></div><button id="library-toggle" class="library-menu" aria-expanded="false" aria-controls="library-panel">${icon("layers")} Bibliothèque</button><span class="scene-state"><span class="status-dot"></span> <span id="playback-state">EN PAUSE</span></span></div>
        <div class="viewport-toolbar"><div class="toolbar-title">${icon("camera")}<label class="sr-only" for="camera">Caméra</label><select id="camera">${Object.entries(
          CAMERA_PRESETS,
        )
          .map(([key, p]) => `<option value="${key}">${p.label}</option>`)
          .join(
            "",
          )}</select></div><div class="toolbar-actions"><span class="tiny">9:16</span><button id="sound" class="icon-button" aria-label="Activer le son synthétique" aria-pressed="false">${icon("mute")}</button><button id="fullscreen" class="icon-button" aria-label="Plein écran">${icon("expand")}</button></div></div>
        <div class="viewport-stage">
          <div class="stage-grid"></div>
          <div class="stage-caption stage-caption-top">CAMÉRA 01 <span>FORMAT VERTICAL</span></div>
          <div id="frame" class="film-frame">
            <canvas id="scene" aria-label="Scène 3D : Adam se réveille dans son lit, dans son appartement"></canvas>
            <div class="film-grade" aria-hidden="true"></div>
            <div class="frame-top"><span>ÉP. 01 — L’ÉVEIL</span><span>17.11.2027</span></div>
            <div class="rpg" id="rpg" aria-hidden="true">
              <div class="rpg-system"><span>◈ SYSTÈME</span><span>CONNEXION ÉTABLIE</span></div>
              <h2 id="rpg-title"></h2><p id="rpg-message"></p>
              <div class="rpg-person"><strong>ADAM MOREL</strong><span>NIVEAU <b>1</b></span></div>
              <div class="xp-bar"><i></i></div><div class="rpg-xp">EXPÉRIENCE <span>0 / 100 XP</span></div>
              <div class="quest"><span>NOUVELLE QUÊTE</span><strong id="rpg-quest"></strong><small id="rpg-reward"></small></div>
            </div>
            <div class="frame-bottom"><span>FRANCE · 06:42</span><span id="frame-time">00:00:00</span></div>
            <div id="webgl-error" class="webgl-error" hidden><strong>Le rendu 3D n’a pas pu démarrer.</strong><p>Activez l’accélération matérielle de votre navigateur, puis rechargez la page. Chromium, Chrome, Edge ou Firefox récent recommandé.</p></div>
          </div>
          <div class="stage-caption stage-caption-bottom"><span>ADAM MOREL · APPARTEMENT</span><span>APERÇU 3D EN TEMPS RÉEL</span></div>
        </div>
        <div class="transport"><div class="transport-left"><button id="restart" class="icon-button" aria-label="Recommencer">${icon("reset")}</button><button id="play" class="play-button" aria-label="Lire">${icon("play")}</button><span class="timecode"><strong id="time-display">00:00.00</strong><span>/ <span id="duration-display">00:08.00</span></span></span></div><span id="phase" class="phase">Le réveil</span><span class="keyboard-hint"><kbd>ESPACE</kbd> lecture / pause</span></div>
        <div class="timeline-panel"><div class="timeline-label"><span>${icon("film")} TIMELINE</span><span class="tiny">PLAN A01 · <span id="timeline-duration">8</span> SECONDES</span></div><div class="ruler" aria-hidden="true"><span>00:00</span><span id="tick-1">00:02</span><span id="tick-2">00:04</span><span id="tick-3">00:06</span><span id="tick-4">00:08</span></div><div class="timeline-tracks"><div class="shot-track"><div><b>01</b> RÉVEIL</div><div><b>02</b> RÉACTION</div><div><b>03</b> REGARD</div><div><b>04</b> SYSTÈME</div></div><div class="system-track"><span>ADAM · ANIMATION</span><span>◈ NOTIFICATION RPG</span></div><div id="playhead" class="playhead"></div><label class="sr-only" for="timeline">Position temporelle en secondes</label><input id="timeline" type="range" min="0" max="8" step="0.01" value="0" aria-valuetext="0 seconde sur 8" /></div></div>
      </section>
      <aside class="inspector panel">
        <div class="panel-heading"><span class="eyebrow">INSPECTEUR</span>${icon("layers")}</div>
        <div class="inspector-title"><span class="selection-icon">${icon("film")}</span><div><strong>Plan A01</strong><span>Le réveil · Épisode 01</span></div><span class="active-badge">ACTIF</span></div>
        <form id="settings" autocomplete="off">
          <details open><summary>PLAN & ANIMATION <span>01</span></summary><div class="field-body">
            <label class="field">Durée du plan <span class="input-unit"><input name="duration" type="number" min="4" max="16" step="0.5" value="8" /> s</span></label>
            <label class="range-field">Amplitude du mouvement <output id="intensity-value">100 %</output><input name="intensity" type="range" min="0" max="1.5" step="0.05" value="1" /></label>
            <p class="field-note">Les quatre temps s’adaptent à la durée. L’amplitude règle le jeu d’Adam ; le redressement est toujours joué.</p>
          </div></details>
          <details open><summary>ADAM · POSITION <span>02</span></summary><div class="field-body"><div class="axes"><label><b class="axis-x">X</b><input aria-label="Position X d’Adam" name="adamX" type="number" min="-0.45" max="0.45" step="0.05" value="0" /></label><label><b class="axis-z">Z</b><input aria-label="Position Z d’Adam" name="adamZ" type="number" min="-0.4" max="0.4" step="0.05" value="0" /></label><span>m</span></div><p class="field-note">Rig provisoire v2 · dans le lit, relatif au lit</p></div></details>
          <details><summary>DÉCOR · POSITION <span>OBJ</span></summary><div class="field-body">
            <label class="text-field">Composant<select id="object-selector"><option value="bed">Lit (avec Adam)</option><option value="nightstand">Table de chevet</option></select></label>
            <div class="axes"><label><b class="axis-x">X</b><input id="object-x" aria-label="Décalage X de l’objet" type="number" min="-0.3" max="0.3" step="0.05" value="0" /></label><label><b class="axis-z">Z</b><input id="object-z" aria-label="Décalage Z de l’objet" type="number" min="-0.3" max="0.3" step="0.05" value="0" /></label><span>m</span></div>
            <p class="field-note">Décalage relatif à la position d’origine.</p>
          </div></details>
          <details open><summary>ÉCLAIRAGE <span>03</span></summary><div class="field-body">
            <label class="text-field">Qualité du rendu<select name="quality"><option value="basse">Basse · ordinateur modeste</option><option value="standard">Standard · halo et étalonnage</option><option value="haute">Haute · occlusion ambiante</option></select></label>
            <label class="range-field">Exposition <output id="exposure-value">1.15</output><input name="exposure" type="range" min="0.5" max="2" step="0.05" value="1.15" /></label>
            <label class="range-field"><span><i class="light-dot cold"></i> Aube · lumière froide</span><output id="coldLight-value">3.0</output><input name="coldLight" type="range" min="0" max="8" step="0.1" value="3" /></label>
            <label class="range-field"><span><i class="light-dot warm"></i> Lampe · lumière chaude</span><output id="lampLight-value">5.0</output><input name="lampLight" type="range" min="0" max="12" step="0.1" value="5" /></label>
          </div></details>
          <details open><summary>NOTIFICATION RPG <span>04</span></summary><div class="field-body">
            <label class="text-field">Titre<input name="title" maxlength="100" value="INITIALISATION TERMINÉE" /></label>
            <label class="text-field">Message<input name="message" maxlength="100" value="Bienvenue, survivant." /></label>
            <label class="text-field">Quête<textarea name="quest" maxlength="100" rows="2">Survivre à la première heure.</textarea></label>
            <label class="field">Récompense <span class="input-unit"><input name="reward" type="number" min="0" max="10000" step="1" value="100" /> XP</span></label>
            <button id="show-rpg" class="text-button" type="button">Voir à l’apparition <span>↗</span></button>
          </div></details>
        </form>
        <div class="project-actions"><button id="save" class="save-button">${icon("save")} Enregistrer les réglages</button><button id="restore" class="text-button">Rétablir le plan d’origine ${icon("reset")}</button><p>Enregistrement local dans ce navigateur.</p></div>
      </aside>
    </main>
    <footer class="statusbar"><span><span class="status-dot"></span> <span id="status">Prêt à créer</span></span><span>RIG PROVISOIRE · SANS ASSET EXTERNE</span><span>PROJET ZÉRO STUDIO <b>v0.1.0</b></span></footer>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
  `;
}
