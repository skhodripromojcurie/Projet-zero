import "./style.css";
import { mountLayout } from "./ui/layout.js";
import { renderLibrary } from "./ui/library.js";
import { icon } from "./ui/icons.js";
import { createAudio } from "./ui/audio.js";
import { createShot } from "./scenes/a01.js";
import { DEFAULT_CONFIG, sanitizeConfig } from "./scenes/config.js";
import { advance } from "./animations/timeline.js";
import { readCharacterEntry } from "./characters/registry.js";
import { loadRiggedCharacter } from "./characters/gltf.js";

mountLayout(document.querySelector("#app"));
const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = "projet-zero-studio:a01:v1";
let config = { ...DEFAULT_CONFIG };
let time = 0,
  playing = false,
  lastFrame = performance.now(),
  shot;
let toastTimer;
let characterStatus = "Rig procédural v2 actif · aucun modèle GLB déclaré.";
const audio = createAudio();
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3500);
}
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) config = sanitizeConfig(JSON.parse(saved));
} catch {
  notify("Réglages locaux indisponibles. Le plan d’origine est chargé.");
}
const format = (t) => `00:${t.toFixed(2).padStart(5, "0")}`;
function syncSettings() {
  for (const [key, value] of Object.entries(config)) {
    const input = $(`[name="${key}"]`);
    if (input) input.value = value;
    const output = $(`#${key}-value`);
    if (output)
      output.value =
        key === "intensity"
          ? `${Math.round(value * 100)} %`
          : Number(value).toFixed(key === "exposure" ? 2 : 1);
  }
  syncObjectFields();
  $("#timeline").max = config.duration;
  $("#duration-display").textContent = format(config.duration);
  $("#timeline-duration").textContent = config.duration;
  for (let i = 1; i <= 4; i++)
    $(`#tick-${i}`).textContent =
      `00:${((config.duration * i) / 4).toFixed(1).replace(".0", "").padStart(2, "0")}`;
  $("#rpg-title").textContent = config.title;
  $("#rpg-message").textContent = config.message;
  $("#rpg-quest").textContent = config.quest;
  $("#rpg-reward").textContent = `Récompense : ${config.reward} XP`;
}
function update() {
  if (!shot) return;
  const pose = shot.render(time, config);
  $("#timeline").value = time;
  $("#timeline").setAttribute(
    "aria-valuetext",
    `${time.toFixed(2)} secondes sur ${config.duration}`,
  );
  $("#playhead").style.left = `${(time / config.duration) * 100}%`;
  $("#time-display").textContent = format(time);
  $("#frame-time").textContent = `${format(time).replace(".", ":")}`;
  $("#phase").textContent = pose.phase;
  $("#rpg").style.opacity = pose.hologram;
  $("#rpg").style.transform = `translateY(${(1 - pose.hologram) * 12}px)`;
  $("#rpg").setAttribute("aria-hidden", String(pose.hologram === 0));
}
function setPlaying(value) {
  if (!shot) return;
  playing = value;
  $("#play").innerHTML = icon(playing ? "pause" : "play");
  $("#play").setAttribute("aria-label", playing ? "Pause" : "Lire");
  $("#playback-state").textContent = playing
    ? "LECTURE"
    : time === config.duration
      ? "FIN DU PLAN"
      : "EN PAUSE";
  $(".scene-state").classList.toggle("playing", playing);
  if (!playing) audio.stop();
  lastFrame = performance.now();
}
function togglePlay() {
  if (!playing && time >= config.duration) time = 0;
  setPlaying(!playing);
  update();
}
function selectCamera(key) {
  $("#camera").value = key;
  shot?.setCamera(key);
  update();
  const num = Object.keys($("#camera").options).find(
    (i) => $("#camera").options[i].value === key,
  );
  $(".stage-caption-top").firstChild.textContent =
    `CAMÉRA ${String(Number(num) + 1).padStart(2, "0")} `;
}
$("#play").addEventListener("click", togglePlay);
$("#restart").addEventListener("click", () => {
  setPlaying(false);
  time = 0;
  update();
});
$("#timeline").addEventListener("input", (event) => {
  setPlaying(false);
  time = Number(event.target.value);
  update();
});
$("#camera").addEventListener("change", (event) =>
  selectCamera(event.target.value),
);
$("#show-rpg").addEventListener("click", () => {
  setPlaying(false);
  time = config.duration * 0.86;
  update();
});
function syncObjectFields() {
  const object = $("#object-selector").value;
  $("#object-x").value = config[`${object}X`];
  $("#object-z").value = config[`${object}Z`];
}
$("#object-selector").addEventListener("change", syncObjectFields);
for (const axis of ["x", "z"]) {
  $(`#object-${axis}`).addEventListener("input", (event) => {
    if (event.target.value === "" || !event.target.validity.valid) return;
    const key = `${$("#object-selector").value}${axis.toUpperCase()}`;
    config = sanitizeConfig({ ...config, [key]: Number(event.target.value) });
    update();
    $("#status").textContent = "Réglages modifiés · non enregistrés";
  });
}
$("#settings").addEventListener("submit", (event) => event.preventDefault());
$("#settings").addEventListener("input", (event) => {
  const input = event.target;
  if (!Object.hasOwn(config, input.name) || input.value === "") return;
  if (input.type === "number" && !input.validity.valid) return;
  const value = ["range", "number"].includes(input.type)
    ? Number(input.value)
    : input.value;
  config = sanitizeConfig({ ...config, [input.name]: value });
  time = Math.min(time, config.duration);
  syncSettings();
  update();
  $("#status").textContent = "Réglages modifiés · non enregistrés";
});
$("#save").addEventListener("click", () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    $("#status").textContent = "Réglages enregistrés localement";
    notify("Réglages enregistrés dans ce navigateur.");
  } catch {
    notify("Enregistrement impossible : stockage du navigateur indisponible.");
  }
});
$("#restore").addEventListener("click", () => {
  config = { ...DEFAULT_CONFIG };
  time = 0;
  setPlaying(false);
  syncSettings();
  update();
  $("#status").textContent = "Plan d’origine rétabli · non enregistré";
  notify("Plan rétabli. Enregistrez pour conserver ce choix.");
});
$("#sound").addEventListener("click", async () => {
  try {
    const enabled = await audio.toggle();
    $("#sound").innerHTML = icon(enabled ? "sound" : "mute");
    $("#sound").setAttribute("aria-pressed", String(enabled));
    $("#sound").setAttribute(
      "aria-label",
      enabled ? "Couper le son" : "Activer le son synthétique",
    );
    notify(
      enabled
        ? "Son activé : cri synthétique provisoire au deuxième temps."
        : "Son coupé.",
    );
  } catch {
    notify("Audio indisponible dans ce navigateur.");
  }
});
$("#fullscreen").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if ($(".viewport-stage").requestFullscreen)
      await $(".viewport-stage").requestFullscreen();
    else notify("Le plein écran n’est pas disponible sur ce navigateur.");
  } catch {
    notify("Le navigateur a refusé le plein écran.");
  }
});
document.addEventListener("keydown", (event) => {
  if (
    ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(
      document.activeElement.tagName,
    )
  )
    return;
  if (event.code === "Space") {
    event.preventDefault();
    togglePlay();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) setPlaying(false);
});
$("#scene").addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  setPlaying(false);
  $("#webgl-error").hidden = false;
  $("#engine-status").textContent = "ERREUR";
  $("#status").textContent = "Contexte graphique perdu · rechargez la page";
});
$(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
function toggleLibrary(open) {
  document.body.classList.toggle("library-open", open);
  $("#library-toggle").setAttribute("aria-expanded", String(open));
  $("#library-backdrop").hidden = !open;
}
$("#library-toggle").addEventListener("click", () =>
  toggleLibrary(!document.body.classList.contains("library-open")),
);
$("#library-backdrop").addEventListener("click", () => toggleLibrary(false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") toggleLibrary(false);
});
function switchLibrary(tab) {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    const selected = button.dataset.tab === tab;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  renderLibrary(tab, $("#library-content"), selectCamera, characterStatus);
}
document
  .querySelectorAll("[data-tab]")
  .forEach((button) =>
    button.addEventListener("click", () => switchLibrary(button.dataset.tab)),
  );
syncSettings();
switchLibrary("characters");
try {
  shot = createShot($("#scene"), config);
  update();
  $("#engine-status").textContent = "ACTIF";
  document.body.dataset.ready = "true";
} catch (error) {
  console.error("Initialisation 3D impossible", error);
  $("#webgl-error").hidden = false;
  $("#engine-status").textContent = "ERREUR";
  $("#status").textContent = "Rendu 3D indisponible";
  $("#play").disabled = true;
}
// Replace the procedural rig only with a declared, licensed GLB.
async function loadDeclaredCharacter() {
  try {
    const entry = await readCharacterEntry("adam");
    if (!entry) return;
    characterStatus = "Chargement du modèle GLB…";
    const model = await loadRiggedCharacter(entry.url, entry);
    shot.setCharacter(model);
    update();
    const { mode, joints, morphs } = model.report;
    characterStatus = `Modèle GLB chargé · ${entry.license} · ${mode === "clips" ? "clips" : "pose"} · ${joints.length} os · ${morphs.length} expressions.`;
    $("#status").textContent = "Modèle GLB d’Adam chargé";
  } catch (error) {
    console.error(error);
    characterStatus = `Modèle GLB non chargé · rig procédural conservé. ${error.message}`;
    notify("Modèle GLB non chargé : le rig procédural est conservé.");
  }
  if (document.querySelector('[data-tab="characters"].active'))
    switchLibrary("characters");
}
if (shot) loadDeclaredCharacter();
function frame(now) {
  if (playing) {
    const previous = time;
    time = advance(time, (now - lastFrame) / 1000, config.duration);
    const cue = config.duration / 4;
    if (previous < cue && time >= cue) audio.scream();
    if (time >= config.duration) setPlaying(false);
    update();
  }
  lastFrame = now;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.addEventListener("pagehide", () => {
  setPlaying(false);
});
