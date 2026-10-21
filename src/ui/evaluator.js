import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { loadRiggedCharacter } from "../characters/gltf.js";
import { inspectModel } from "../characters/inspect.js";
import { RIG_PROFILES } from "../characters/rig-profiles.js";
import { createPose, JOINTS } from "../animations/humanoid.js";
import { sampleShot } from "../animations/timeline.js";

// Local evaluation of a candidate character: the file is read by this browser
// only, never uploaded or stored, and never replaces Adam in the shot.
const MARKUP = `
  <div class="evaluator-panel" role="dialog" aria-modal="true" aria-labelledby="evaluator-title">
    <header class="evaluator-head">
      <div><span class="eyebrow">ÉVALUATION LOCALE</span><h2 id="evaluator-title">Personnage GLB</h2>
      <p class="evaluator-file" id="evaluator-file"></p></div>
      <button type="button" class="icon-button evaluator-close" id="evaluator-close" aria-label="Fermer l’évaluation">✕</button>
    </header>
    <p class="evaluator-note">Fichier lu dans ce navigateur uniquement : il n’est ni envoyé, ni enregistré, et ne remplace pas Adam dans le plan.</p>
    <div class="evaluator-body">
      <div class="evaluator-views">
        <canvas id="evaluator-canvas" aria-label="Personnage évalué, en pied et en gros plan"></canvas>
        <div class="evaluator-labels"><span>EN PIED</span><span>GROS PLAN</span></div>
      </div>
      <form class="evaluator-controls" id="evaluator-controls" autocomplete="off">
        <label class="text-field">Squelette<select id="evaluator-profile"></select></label>
        <label class="text-field">Pose<select id="evaluator-pose"><option value="rest">Repos (bras le long du corps)</option><option value="shot">Plan A01</option></select></label>
        <label class="range-field">Instant du plan <output id="evaluator-time-value">2.4 s</output><input id="evaluator-time" type="range" min="0" max="8" step="0.1" value="2.4" /></label>
        <label class="range-field">Rotation <output id="evaluator-turn-value">20°</output><input id="evaluator-turn" type="range" min="-180" max="180" step="5" value="20" /></label>
        <label class="text-field">Éclairage<select id="evaluator-light"><option value="studio">Studio neutre</option><option value="scene">Ambiance A01 (aube froide, lampe chaude)</option></select></label>
      </form>
      <div class="evaluator-report"><h3>Rapport</h3><dl id="evaluator-facts"></dl><h3>Alertes</h3><ul id="evaluator-warnings"></ul></div>
    </div>
  </div>`;

export function mountEvaluator(host, notify) {
  host.innerHTML = MARKUP;
  host.hidden = true;
  const $ = (id) => host.querySelector(`#${id}`);
  const canvas = $("evaluator-canvas");
  for (const [id, profile] of Object.entries(RIG_PROFILES)) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = profile.label;
    $("evaluator-profile").append(option);
  }
  let renderer = null,
    scene,
    holder,
    lights,
    model = null,
    url = null,
    file = null,
    report = null,
    frame = 0;

  function setupScene() {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#14191c");
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.4, 48),
      new THREE.MeshStandardMaterial({ color: "#22282b", roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    holder = new THREE.Group();
    scene.add(holder);
    const key = new THREE.DirectionalLight("#fff4ea", 2.4);
    key.position.set(-1.5, 2.6, 2.2);
    key.castShadow = true;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.mapSize.set(1024, 1024);
    const fill = new THREE.DirectionalLight("#c9d8ff", 0.7);
    fill.position.set(2, 1.4, 1.5);
    const rim = new THREE.DirectionalLight("#dfe9ff", 1.6);
    rim.position.set(0.5, 2.4, -2.5);
    const hemi = new THREE.HemisphereLight("#9aa9b4", "#2b2622", 0.5);
    scene.add(key, fill, rim, hemi);
    lights = { key, fill, rim, hemi };
  }

  function applyLighting() {
    const scene_ = $("evaluator-light").value === "scene";
    lights.key.color.set(scene_ ? "#86b6e6" : "#fff4ea");
    lights.key.intensity = scene_ ? 2.0 : 2.4;
    lights.fill.color.set(scene_ ? "#ffb06a" : "#c9d8ff");
    lights.fill.intensity = scene_ ? 0.9 : 0.7;
    lights.hemi.intensity = scene_ ? 0.25 : 0.5;
    scene.environmentIntensity = scene_ ? 0.15 : 0.6;
  }

  function pose() {
    const time = Number($("evaluator-time").value);
    $("evaluator-time-value").value = `${time.toFixed(1)} s`;
    return $("evaluator-pose").value === "shot"
      ? sampleShot(time)
      : createPose();
  }

  function render() {
    frame = 0;
    if (!renderer || host.hidden) return;
    const width = canvas.clientWidth,
      height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height, false);
    applyLighting();
    if (model) {
      model.applyPose(pose(), { adamX: 0, adamZ: 0 }, 0);
      holder.rotation.y = THREE.MathUtils.degToRad(
        Number($("evaluator-turn").value),
      );
      holder.position.set(0, 0, 0);
      holder.updateMatrixWorld(true);
      // Recentre the character on the floor whatever its pose.
      const box = new THREE.Box3().setFromObject(model.root, true);
      const center = box.getCenter(new THREE.Vector3());
      holder.position.set(-center.x, -box.min.y, -center.z);
      holder.updateMatrixWorld(true);
    }
    $("evaluator-turn-value").value = `${$("evaluator-turn").value}°`;
    const box = model
      ? new THREE.Box3().setFromObject(model.root, true)
      : new THREE.Box3(
          new THREE.Vector3(-0.3, 0, -0.3),
          new THREE.Vector3(0.3, 1.8, 0.3),
        );
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const half = width / 2;
    const views = [
      {
        x: 0,
        frameHeight: Math.max(size.y, size.x * 1.7) * 1.12,
        target: center,
      },
      { x: half, frameHeight: 0.42, target: headTarget(box) },
    ];
    renderer.setScissorTest(true);
    for (const view of views) {
      const camera = new THREE.PerspectiveCamera(30, half / height, 0.02, 30);
      const distance =
        view.frameHeight / 2 / Math.tan(THREE.MathUtils.degToRad(15));
      camera.position.set(
        view.target.x,
        view.target.y,
        view.target.z + distance,
      );
      camera.lookAt(view.target);
      renderer.setViewport(view.x, 0, half, height);
      renderer.setScissor(view.x, 0, half, height);
      renderer.render(scene, camera);
    }
    renderer.setScissorTest(false);
  }

  function headTarget(box) {
    const head =
      model && report
        ? model.root.getObjectByName(
            RIG_PROFILES[$("evaluator-profile").value].bones.head,
          )
        : null;
    if (head) {
      const position = head.getWorldPosition(new THREE.Vector3());
      return position.add(new THREE.Vector3(0, 0.07, 0));
    }
    return new THREE.Vector3(
      (box.min.x + box.max.x) / 2,
      box.max.y - 0.12,
      (box.min.z + box.max.z) / 2,
    );
  }

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  function fact(list, label, value) {
    const term = document.createElement("dt");
    term.textContent = label;
    const detail = document.createElement("dd");
    detail.textContent = value;
    list.append(term, detail);
  }

  function showReport() {
    const facts = $("evaluator-facts");
    const list = $("evaluator-warnings");
    facts.replaceChildren();
    list.replaceChildren();
    const profile = report.profiles[$("evaluator-profile").value];
    fact(
      facts,
      "Fichier",
      `${file.name} · ${(file.size / 1048576).toFixed(1)} Mo`,
    );
    fact(facts, "Hauteur", `${report.height.toFixed(2)} m`);
    fact(facts, "Os", String(report.bones));
    fact(
      facts,
      "Articulations reconnues",
      `${profile.found} / ${JOINTS.length} (${profile.label})`,
    );
    fact(facts, "Triangles", report.triangles.toLocaleString("fr-FR"));
    fact(
      facts,
      "Maillages",
      report.meshes.map((m) => m.name || "sans nom").join(", "),
    );
    fact(
      facts,
      "Textures",
      report.textures.map((t) => `${t.width}×${t.height}`).join(", ") ||
        "aucune",
    );
    fact(
      facts,
      "Expressions",
      `${report.morphs.length} (ARKit : ${report.arkit.join(", ") || "aucune"})`,
    );
    fact(facts, "Animations", report.animations.join(", ") || "aucune");
    for (const warning of report.warnings.length
      ? report.warnings
      : ["Aucune."]) {
      const item = document.createElement("li");
      item.textContent = warning;
      list.append(item);
    }
  }

  async function load(profile) {
    model?.dispose();
    if (model) holder.remove(model.root);
    model = await loadRiggedCharacter(url, { profile });
    holder.add(model.root);
    model.root.traverse((object) => {
      if (object.isMesh) object.castShadow = object.receiveShadow = true;
    });
  }

  async function open(selected) {
    if (!selected) return;
    close();
    file = selected;
    url = URL.createObjectURL(file);
    host.hidden = false;
    document.body.classList.add("evaluator-open");
    $("evaluator-file").textContent = "Lecture du fichier…";
    if (!renderer) setupScene();
    try {
      await load("projet-zero");
      report = inspectModel(
        model.root,
        model.report.animations.map((name) => ({ name })),
      );
      $("evaluator-profile").value = report.bestProfile;
      if (report.bestProfile !== "projet-zero") await load(report.bestProfile);
      $("evaluator-file").textContent = file.name;
      showReport();
      $("evaluator-close").focus();
      host.dataset.ready = "true";
      schedule();
    } catch (error) {
      console.error(error);
      $("evaluator-file").textContent = `Lecture impossible : ${error.message}`;
      notify("Ce fichier n’a pas pu être lu comme un GLB.");
    }
  }

  function close() {
    model?.dispose();
    if (model) holder.remove(model.root);
    model = null;
    report = null;
    if (url) URL.revokeObjectURL(url);
    url = null;
    host.hidden = true;
    delete host.dataset.ready;
    document.body.classList.remove("evaluator-open");
  }

  $("evaluator-close").addEventListener("click", close);
  host.addEventListener("click", (event) => {
    if (event.target === host) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !host.hidden) close();
  });
  $("evaluator-controls").addEventListener("submit", (event) =>
    event.preventDefault(),
  );
  $("evaluator-controls").addEventListener("input", schedule);
  $("evaluator-profile").addEventListener("change", async () => {
    if (!url) return;
    await load($("evaluator-profile").value);
    showReport();
    schedule();
  });
  new ResizeObserver(schedule).observe(canvas);
  return { open, close };
}
