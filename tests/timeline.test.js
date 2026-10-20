import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleShot, advance } from "../src/animations/timeline.js";
import { JOINTS, FACE_KEYS } from "../src/animations/humanoid.js";
import { sanitizeConfig, DEFAULT_CONFIG } from "../src/scenes/config.js";

// Eyelids blink in a few hundredths of a second: excluded from the smoothness check.
const SMOOTH_FACE = FACE_KEYS.filter((key) => !/^eye(Blink|Wide)/.test(key));
const channels = (pose, face = SMOOTH_FACE) => [
  ...JOINTS.flatMap((joint) => pose.joints[joint]),
  ...face.map((key) => pose.face[key]),
  pose.gaze.yaw,
  pose.gaze.pitch,
  pose.hologram,
];

test("le plan A01 suit les quatre temps prévus", () => {
  assert.equal(sampleShot(1).phase, "Le réveil");
  assert.equal(sampleShot(3).phase, "Un cri au loin");
  assert.equal(sampleShot(5).phase, "Vers la fenêtre");
  assert.equal(sampleShot(7).phase, "Le système");
  // Allongé au départ, redressé à 2 s.
  assert.ok(sampleShot(0).joints.hips[0] < -1.2);
  assert.ok(sampleShot(2.4).joints.hips[0] > -0.2);
  // Yeux fermés au départ, ouverts ensuite.
  assert.equal(sampleShot(0).face.eyeBlinkLeft, 1);
  assert.ok(sampleShot(1.3).face.eyeBlinkLeft < 0.3);
  // Sursaut au cri.
  assert.ok(sampleShot(2.3).face.eyeWideLeft > 0.5);
  // Les yeux mènent, la tête suit vers la fenêtre.
  assert.ok(sampleShot(4.3).gaze.yaw < -0.3);
  assert.ok(Math.abs(sampleShot(4.3).joints.head[1]) < 0.15);
  assert.ok(sampleShot(6).joints.head[1] < -0.6);
  assert.equal(sampleShot(6).hologram, 0);
  assert.equal(sampleShot(6.6).hologram, 1);
});

test("les jambes restent immobiles sous la couette pendant le redressement", () => {
  for (const time of [0, 0.9, 1.4, 2]) {
    const pose = sampleShot(time);
    const legPitch = pose.joints.hips[0] + pose.joints.thighL[0];
    assert.ok(Math.abs(legPitch + Math.PI / 2) < 0.2, `à ${time}`);
  }
});

test("une recherche temporelle reproduit exactement la même pose", () => {
  const expected = sampleShot(5.39);
  for (const t of [0, 8, 3, 1, 7]) sampleShot(t);
  assert.deepEqual(sampleShot(5.39), expected);
});

test("la fin du plan reste immobile, à la respiration près", () => {
  const a = channels(sampleShot(7.6), FACE_KEYS);
  const b = channels(sampleShot(8), FACE_KEYS);
  for (let i = 0; i < a.length; i++)
    assert.ok(Math.abs(a[i] - b[i]) < 0.06, `canal ${i}`);
});

test("les poses restent continues et finies, sans geste brusque", () => {
  const step = 1 / 120;
  let previous = channels(sampleShot(0));
  for (let time = step; time <= 8; time += step) {
    const current = channels(sampleShot(time));
    for (let i = 0; i < current.length; i++) {
      assert.ok(Number.isFinite(current[i]));
      // Below ~0.12 rad per 1/120 s for bodies; blinks are fast by nature.
      assert.ok(
        Math.abs(current[i] - previous[i]) < 0.12,
        `canal ${i} à ${time.toFixed(3)}`,
      );
    }
    previous = current;
  }
});

test("modifier la durée conserve les temps relatifs du jeu", () => {
  const long = sampleShot(10, 16);
  const short = sampleShot(5, 8);
  assert.equal(long.phase, short.phase);
  assert.ok(Math.abs(long.joints.hips[0] - short.joints.hips[0]) < 1e-9);
  assert.ok(Math.abs(long.gaze.yaw - short.gaze.yaw) < 1e-9);
  assert.equal(sampleShot(2.5, 4).phase, short.phase);
});

test("l’amplitude règle le jeu sans toucher au redressement ni à la notification", () => {
  const still = sampleShot(7, 8, 0);
  const full = sampleShot(7, 8, 1);
  assert.equal(still.hologram, 1);
  assert.ok(Math.abs(still.joints.head[1]) < 0.02);
  assert.ok(full.joints.head[1] < -0.6);
  assert.equal(still.joints.hips[0], full.joints.hips[0]);
});

test("la lecture s’arrête précisément à la fin sans retour à zéro", () => {
  assert.equal(advance(7.98, 0.1, 8), 8);
  assert.equal(advance(0, -1, 8), 0);
});

test("les réglages sauvegardés sont bornés et filtrés", () => {
  const value = sanitizeConfig({
    duration: -50,
    exposure: 100,
    reward: NaN,
    unknown: "x",
    title: "x".repeat(500),
    quality: "ultra",
  });
  assert.equal(value.duration, 4);
  assert.equal(value.exposure, 2);
  assert.equal(value.reward, DEFAULT_CONFIG.reward);
  assert.equal(value.title.length, 100);
  assert.equal(value.quality, "standard");
  assert.equal(sanitizeConfig({ quality: "haute" }).quality, "haute");
  assert.equal(Object.hasOwn(value, "unknown"), false);
});
