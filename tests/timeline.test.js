import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleShot, advance } from "../src/animations/timeline.js";
import { sanitizeConfig, DEFAULT_CONFIG } from "../src/scenes/config.js";

test("le plan A01 suit les quatre temps prévus", () => {
  assert.equal(sampleShot(1).phase, "Le réveil");
  assert.equal(sampleShot(3).phase, "Un cri au loin");
  assert.equal(sampleShot(5).phase, "Vers la fenêtre");
  assert.equal(sampleShot(7).phase, "Le système");
  assert.ok(sampleShot(0).headX > sampleShot(2).headX);
  assert.ok(sampleShot(2.4).headX < sampleShot(2).headX);
  assert.equal(Math.abs(sampleShot(4).headY), 0);
  assert.equal(sampleShot(6).headY, -0.88);
  assert.equal(sampleShot(6).hologram, 0);
  assert.equal(sampleShot(6.6).hologram, 1);
});
test("une recherche temporelle reproduit exactement la même pose", () => {
  const expected = sampleShot(5.39);
  for (const t of [0, 8, 3, 1, 7]) sampleShot(t);
  assert.deepEqual(sampleShot(5.39), expected);
});
test("la fin du plan reste immobile", () => {
  assert.deepEqual(sampleShot(6.7), sampleShot(8));
});
test("les poses restent continues et finies aux frontières", () => {
  for (const boundary of [0, 2, 2.35, 2.6, 4, 6, 6.6, 8]) {
    const before = sampleShot(boundary - 1e-5);
    const after = sampleShot(boundary + 1e-5);
    for (const key of [
      "headX",
      "headY",
      "torsoX",
      "shoulderLift",
      "hologram",
    ]) {
      assert.ok(Number.isFinite(before[key]));
      assert.ok(
        Math.abs(before[key] - after[key]) < 0.001,
        `${key} à ${boundary}`,
      );
    }
  }
});
test("modifier la durée conserve les temps relatifs", () => {
  assert.deepEqual(sampleShot(10, 16), sampleShot(5, 8));
  assert.deepEqual(sampleShot(2.5, 4), sampleShot(5, 8));
});
test("l’amplitude ne modifie pas l’apparition de la notification", () => {
  const still = sampleShot(7, 8, 0);
  assert.equal(Math.abs(still.headY), 0);
  assert.equal(still.hologram, 1);
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
  });
  assert.equal(value.duration, 4);
  assert.equal(value.exposure, 2);
  assert.equal(value.reward, DEFAULT_CONFIG.reward);
  assert.equal(value.title.length, 100);
  assert.equal(Object.hasOwn(value, "unknown"), false);
});
