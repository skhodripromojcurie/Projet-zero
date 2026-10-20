import * as THREE from "three";
import { createApartment } from "../environments/apartment.js";
import { createAdam } from "../characters/adam.js";
import { createCamera, setCamera } from "../cameras/presets.js";
import { sampleShot } from "../animations/timeline.js";

export function createShot(canvas, config) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#576c7b");
  scene.fog = new THREE.FogExp2("#647989", 0.018);
  const camera = createCamera();
  setCamera(camera, "cinematic");
  const apartment = createApartment(scene);
  const adam = createAdam();
  scene.add(adam.root);
  let lastTime = 0,
    lastSettings = config;
  const draw = (time, settings) => {
    lastTime = time;
    lastSettings = settings;
    const pose = sampleShot(time, settings.duration, settings.intensity);
    adam.applyPose(
      pose,
      {
        ...settings,
        adamX: settings.adamX + settings.bedX,
        adamZ: settings.adamZ + settings.bedZ,
      },
      time,
    );
    renderer.toneMappingExposure = settings.exposure;
    apartment.cold.intensity = settings.coldLight;
    apartment.lamp.intensity = settings.lampLight;
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
      0.97,
      -2.25 + settings.nightstandZ,
    );
    renderer.render(scene, camera);
    return pose;
  };
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    if (width && height) {
      renderer.setSize(width, height, false);
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
      setCamera(camera, key);
    },
    dispose() {
      observer.disconnect();
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
