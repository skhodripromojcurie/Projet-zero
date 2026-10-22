import * as THREE from "three";
export const CAMERA_PRESETS = {
  cinematic: {
    label: "A01 · Plan principal",
    position: [-1.1, 1.8, 1.6],
    target: [0.02, 1.1, -1.72],
    fov: 52,
  },
  // `follow`: the aim leans towards Adam's head (weight 0 to 1), so a close
  // shot keeps his face in frame from lying down to sitting up.
  portrait: {
    label: "A02 · Visage d’Adam",
    position: [-0.4, 1.45, -0.36],
    target: [0.56, 1.17, -1.74],
    fov: 43,
    follow: 0.8,
    // Soft cold fill on the face, motivated by the dawn at the window.
    faceFill: 0.16,
  },
  window: {
    label: "A03 · La fenêtre",
    position: [1.5, 1.9, -2.75],
    target: [-1.0, 1.35, -0.21],
    fov: 48,
    follow: 0.45,
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
const aim = new THREE.Vector3();
// Look slightly above the head joint: the eyes, not the neck.
const FACE_OFFSET = 0.08;

export function setCamera(camera, key, head = null) {
  const preset = CAMERA_PRESETS[key] || CAMERA_PRESETS.cinematic;
  camera.position.set(...preset.position);
  aim.set(...preset.target);
  if (head && preset.follow)
    aim.lerp(
      new THREE.Vector3(head.x, head.y + FACE_OFFSET, head.z),
      preset.follow,
    );
  camera.lookAt(aim);
  camera.fov = preset.fov;
  camera.updateProjectionMatrix();
}
