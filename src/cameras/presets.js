import * as THREE from "three";
export const CAMERA_PRESETS = {
  cinematic: {
    label: "A01 · Plan principal",
    position: [2.5, 1.9, 2.8],
    target: [-1.05, 1.25, -1.05],
    fov: 48,
  },
  portrait: {
    label: "A02 · Visage d’Adam",
    position: [0.65, 1.72, 0.65],
    target: [-0.3, 1.52, -1.03],
    fov: 37,
  },
  window: {
    label: "A03 · La fenêtre",
    position: [1.8, 1.9, 1.8],
    target: [-2.35, 1.62, -0.15],
    fov: 49,
  },
  door: {
    label: "A04 · La porte",
    position: [-1.7, 1.65, -1.9],
    target: [0.9, 1.3, 3],
    fov: 46,
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
