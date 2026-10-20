import * as THREE from "three";
export const CAMERA_PRESETS = {
  cinematic: {
    label: "A01 · Plan principal",
    position: [-1.1, 1.8, 1.6],
    target: [0.02, 1.1, -1.72],
    fov: 52,
  },
  portrait: {
    label: "A02 · Visage d’Adam",
    position: [-0.32, 1.42, -0.42],
    target: [0.5, 1.2, -1.75],
    fov: 36,
  },
  window: {
    label: "A03 · La fenêtre",
    position: [1.15, 1.7, -2.3],
    target: [-1.0, 1.4, -0.21],
    fov: 50,
  },
  door: {
    label: "A04 · La porte",
    position: [-0.25, 1.65, -2.6],
    target: [1.25, 1.0, 1.1],
    fov: 54,
  },
};
export function createCamera() {
  return new THREE.PerspectiveCamera(42, 9 / 16, 0.05, 45);
}
export function setCamera(camera, key) {
  const preset = CAMERA_PRESETS[key] || CAMERA_PRESETS.cinematic;
  camera.position.set(...preset.position);
  camera.lookAt(...preset.target);
  camera.fov = preset.fov;
  camera.updateProjectionMatrix();
}
