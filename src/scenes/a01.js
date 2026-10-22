import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createApartment } from "../environments/apartment.js";
import { createAdam } from "../characters/adam.js";
import { CAMERA_PRESETS, createCamera, setCamera } from "../cameras/presets.js";
import { sampleShot } from "../animations/timeline.js";
import { createRenderer, createPipeline } from "./rendering.js";

// Fill light placement: towards the window (-x) and slightly above the eyes.
const FILL_OFFSET = new THREE.Vector3(-0.15, 0.18, 0);

export function createShot(canvas, config) {
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0e151b");
  scene.fog = new THREE.FogExp2("#16212a", 0.03);
  // Generated studio environment for subtle reflections; no external HDR.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.12;
  pmrem.dispose();
  const camera = createCamera();
  let cameraKey = "cinematic";
  const head = new THREE.Vector3();
  setCamera(camera, cameraKey);
  const apartment = createApartment(scene);
  let character = createAdam();
  scene.add(character.root);
  // Blue spill from the system interface floating in front of Adam.
  const hologramLight = new THREE.PointLight("#5fd2ff", 0, 1.6, 2);
  hologramLight.name = "Lumière de l’interface";
  scene.add(hologramLight);
  // Close shots only: a soft fill near the camera, on the window side.
  const faceLight = new THREE.PointLight("#9fc3e6", 0, 1.4, 2);
  faceLight.name = "Lumière de visage";
  scene.add(faceLight);
  const pipeline = createPipeline(renderer, scene, camera);
  pipeline.setQuality(config.quality);
  let lastTime = 0,
    lastSettings = config;
  const draw = (time, settings) => {
    lastTime = time;
    lastSettings = settings;
    pipeline.setQuality(settings.quality);
    const pose = sampleShot(time, settings.duration, settings.intensity);
    character.applyPose(
      pose,
      {
        ...settings,
        adamX: settings.adamX + settings.bedX,
        adamZ: settings.adamZ + settings.bedZ,
      },
      time,
    );
    const root = character.root.position;
    hologramLight.position.set(root.x - 0.4, root.y + 0.62, root.z + 0.55);
    hologramLight.intensity = 0.45 * pose.hologram;
    renderer.toneMappingExposure = settings.exposure;
    apartment.cold.intensity = settings.coldLight * 2.4;
    apartment.windowGlow.intensity = settings.coldLight * 0.45;
    apartment.shaft.update(time, settings.coldLight);
    apartment.lamp.intensity = settings.lampLight * 0.5;
    apartment.objects.bed.position.set(
      0.65 + settings.bedX,
      0,
      -1.4 + settings.bedZ,
    );
    apartment.objects.nightstand.position.set(
      -0.72 + settings.nightstandX,
      0,
      -2.12 + settings.nightstandZ,
    );
    apartment.lamp.position.set(
      -0.92 + settings.nightstandX,
      0.98,
      -2.25 + settings.nightstandZ,
    );
    // The duvet drapes over Adam's current pose (after the bed has moved).
    apartment.duvet.update(character);
    // Close shots follow the head: a function of the pose, hence of time.
    if (character.jointPosition)
      setCamera(camera, cameraKey, character.jointPosition("head", head));
    const fill = CAMERA_PRESETS[cameraKey]?.faceFill ?? 0;
    faceLight.intensity = fill * settings.coldLight;
    if (fill && character.jointPosition)
      faceLight.position
        .lerpVectors(head, camera.position, 0.55)
        .add(FILL_OFFSET);
    pipeline.render(time);
    return pose;
  };
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (width && height) {
      pipeline.setSize(width, height);
      draw(lastTime, lastSettings);
    }
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  return {
    camera,
    render: draw,
    setCamera(key) {
      cameraKey = key;
      setCamera(camera, key);
      draw(lastTime, lastSettings);
    },
    /** Swap the character adapter (procedural rig or loaded GLB). */
    setCharacter(next) {
      scene.remove(character.root);
      character.dispose?.();
      character = next;
      scene.add(character.root);
      draw(lastTime, lastSettings);
    },
    dispose() {
      observer.disconnect();
      pipeline.dispose();
      scene.traverse((obj) => {
        obj.geometry?.dispose();
        const materials = Array.isArray(obj.material)
          ? obj.material
          : [obj.material];
        for (const mat of materials)
          if (mat) {
            mat.map?.dispose();
            mat.dispose();
          }
      });
      renderer.dispose();
    },
  };
}
