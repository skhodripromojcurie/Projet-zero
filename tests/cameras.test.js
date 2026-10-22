import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  CAMERA_PRESETS,
  createCamera,
  setCamera,
} from "../src/cameras/presets.js";

const forward = (camera) =>
  camera.getWorldDirection(new THREE.Vector3()).toArray();

test("les plans rapprochés suivent la tête d’Adam, les autres non", () => {
  const head = new THREE.Vector3(0.5, 0.95, -2.1);
  for (const [key, preset] of Object.entries(CAMERA_PRESETS)) {
    const fixed = createCamera();
    setCamera(fixed, key);
    const following = createCamera();
    setCamera(following, key, head);
    if (preset.follow)
      assert.notDeepEqual(forward(following), forward(fixed), key);
    else assert.deepEqual(forward(following), forward(fixed), key);
  }
});

test("le cadrage suivi est une fonction pure de la position de la tête", () => {
  const head = new THREE.Vector3(0.5, 1.3, -1.45);
  const a = createCamera();
  const b = createCamera();
  setCamera(a, "portrait", head);
  setCamera(b, "window", head);
  setCamera(b, "portrait", head.clone());
  assert.deepEqual(forward(a), forward(b));
});
