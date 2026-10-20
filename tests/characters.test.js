import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Quaternion, Vector3, Euler } from "three";
import { loadRiggedCharacter } from "../src/characters/gltf.js";
import { ADAM_BASE } from "../src/characters/adam.js";
import {
  validateCharacterEntry,
  readCharacterEntry,
} from "../src/characters/registry.js";
import { createPose, JOINTS } from "../src/animations/humanoid.js";
import { sampleShot } from "../src/animations/timeline.js";
import { buildHumanoidGlb, HEAD_REST } from "./fixtures/humanoid-glb.js";

const config = { adamX: 0, adamZ: 0 };

async function serve(t, body) {
  if (typeof globalThis.ProgressEvent === "undefined") {
    globalThis.ProgressEvent = class extends Event {
      constructor(type, init = {}) {
        super(type);
        Object.assign(this, init);
      }
    };
    t.after(() => delete globalThis.ProgressEvent);
  }
  const server = createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "model/gltf-binary" });
    res.end(body);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}/fixture.glb`;
}

const headOf = (model) => model.root.getObjectByName("head");
const worldQuat = (object) => {
  object.updateWorldMatrix(true, false);
  return object.getWorldQuaternion(new Quaternion());
};

test("un squelette GLB reçoit la pose normalisée malgré des axes d’os différents", async (t) => {
  const model = await loadRiggedCharacter(
    await serve(t, buildHumanoidGlb({ clips: false })),
  );
  assert.equal(model.report.mode, "joints");
  assert.deepEqual(
    model.report.joints.sort(),
    ["chest", "head", "hips", "neck", "spine", "upperArmL", "upperArmR"].sort(),
  );
  const pose = createPose();
  pose.joints.head = [0, 0.5, 0];
  model.applyPose(pose, config, 0);
  const expected = new Quaternion()
    .setFromEuler(new Euler(0, 0.5, 0))
    .multiply(HEAD_REST);
  assert.ok(worldQuat(headOf(model)).angleTo(expected) < 1e-5);
  const hips = model.root
    .getObjectByName("hips")
    .getWorldPosition(new Vector3());
  assert.ok(hips.distanceTo(new Vector3(...ADAM_BASE)) < 1e-6);
  model.dispose();
});

test("les expressions pilotent les morph targets aux noms ARKit", async (t) => {
  const model = await loadRiggedCharacter(
    await serve(t, buildHumanoidGlb({ clips: false })),
  );
  assert.deepEqual(model.report.morphs, ["eyeBlinkLeft"]);
  const pose = createPose();
  pose.face.eyeBlinkLeft = 0.7;
  model.applyPose(pose, config, 0);
  const mesh = model.root.getObjectByName("Corps");
  const skinned = mesh.isMesh ? mesh : mesh.children.find((c) => c.isMesh);
  assert.equal(skinned.morphTargetInfluences[0], 0.7);
  model.dispose();
});

test("les clips GLB se mélangent selon le temps absolu, sans accumulation", async (t) => {
  const model = await loadRiggedCharacter(await serve(t, buildHumanoidGlb()), {
    clips: { sleep: "Fixture_Sleep", look_window: "Fixture_Look" },
  });
  assert.equal(model.report.mode, "clips");
  assert.deepEqual(model.report.animations, ["Fixture_Sleep", "Fixture_Look"]);
  model.applyPose(sampleShot(0.4), config, 0.4);
  const expected = worldQuat(headOf(model)).clone();
  for (const time of [5.2, 7.9, 1.3, 0])
    model.applyPose(sampleShot(time), config, time);
  model.applyPose(sampleShot(0.4), config, 0.4);
  assert.ok(worldQuat(headOf(model)).angleTo(expected) < 1e-6);
  model.applyPose(sampleShot(5.6), config, 5.6);
  assert.ok(worldQuat(headOf(model)).angleTo(expected) > 0.05);
  model.dispose();
});

test("les poses A01 couvrent toutes les articulations du vocabulaire", () => {
  for (const time of [0, 1, 2.2, 4.8, 7.5]) {
    const pose = sampleShot(time);
    for (const joint of JOINTS)
      assert.ok(
        pose.joints[joint].every(Number.isFinite),
        `${joint} à ${time}`,
      );
    const weights = pose.clips.reduce((sum, clip) => sum + clip.weight, 0);
    assert.ok(Math.abs(weights - 1) < 1e-9);
  }
});

test("un modèle n’est accepté qu’avec sa provenance et sa licence commerciale", async () => {
  const entry = {
    url: "assets/models/adam_v1.glb",
    profile: "projet-zero",
    source: "Création Projet Zéro (MPFB 2, ressources CC0)",
    author: "Projet Zéro",
    license: "CC0 1.0",
    commercialUse: true,
  };
  assert.deepEqual(validateCharacterEntry(entry), []);
  assert.equal(validateCharacterEntry({ ...entry, license: "" }).length, 1);
  assert.equal(
    validateCharacterEntry({ ...entry, commercialUse: false }).length,
    1,
  );
  assert.equal(
    validateCharacterEntry({ ...entry, url: "https://exemple.fr/a.glb" })
      .length,
    1,
  );
  assert.equal(
    validateCharacterEntry({ ...entry, profile: "inconnu" }).length,
    1,
  );
  const manifest = (characters) => async () => ({
    ok: true,
    json: async () => ({ version: 1, characters }),
  });
  assert.equal(
    await readCharacterEntry("adam", manifest({ adam: null })),
    null,
  );
  assert.deepEqual(
    await readCharacterEntry("adam", manifest({ adam: entry })),
    entry,
  );
  await assert.rejects(
    readCharacterEntry("adam", manifest({ adam: { ...entry, license: "" } })),
    /refusé/,
  );
});

test("un export Blender au squelette MPFB en pose A est redressé et piloté", async (t) => {
  // tests/fixtures/mannequin-mpfb.glb : produit par tools/blender/mannequin_test.py
  // (mannequin créé par le projet, pas un asset tiers).
  const { readFile } = await import("node:fs/promises");
  const body = await readFile(
    new URL("./fixtures/mannequin-mpfb.glb", import.meta.url),
  );
  const model = await loadRiggedCharacter(await serve(t, body), {
    profile: "mpfb",
  });
  assert.equal(model.report.joints.length, JOINTS.length);
  model.applyPose(createPose(), config, 0);
  model.root.updateMatrixWorld(true);
  const at = (name) =>
    model.root.getObjectByName(name).getWorldPosition(new Vector3());
  for (const side of ["l", "r"]) {
    const shoulder = at(`upperarm_${side}`);
    const elbow = at(`lowerarm_${side}`);
    const wrist = at(`hand_${side}`);
    // Bras le long du corps : coude et poignet sous l'épaule.
    assert.ok(Math.abs(elbow.x - shoulder.x) < 0.01, `coude ${side}`);
    assert.ok(Math.abs(wrist.x - shoulder.x) < 0.01, `poignet ${side}`);
    assert.ok(elbow.y < shoulder.y && wrist.y < elbow.y);
  }
  assert.ok(at("pelvis").distanceTo(new Vector3(...ADAM_BASE)) < 1e-6);
  for (const time of [0, 1.5, 2.3, 5, 7.5]) {
    model.applyPose(sampleShot(time), config, time);
    model.root.updateMatrixWorld(true);
    assert.ok(Number.isFinite(at("head").y), `tête à ${time}`);
  }
  model.dispose();
});

test("le rapport d’évaluation détecte le squelette MPFB et signale les manques", async (t) => {
  const { readFile } = await import("node:fs/promises");
  const { inspectModel } = await import("../src/characters/inspect.js");
  const body = await readFile(
    new URL("./fixtures/mannequin-mpfb.glb", import.meta.url),
  );
  const model = await loadRiggedCharacter(await serve(t, body), {
    profile: "mpfb",
  });
  const report = inspectModel(model.root, []);
  assert.equal(report.bestProfile, "mpfb");
  assert.equal(report.profiles.mpfb.found, JOINTS.length);
  assert.equal(report.bones, 19);
  assert.ok(
    report.height > 1.6 && report.height < 1.95,
    `hauteur ${report.height}`,
  );
  assert.ok(report.warnings.some((w) => w.includes("ARKit")));
  model.dispose();
});
