// Vérifie qu'un GLB produit par tools/blender/preparer_adam.py est utilisable
// par le studio : squelette reconnu, membres redressés, expressions ARKit.
// Usage : node tests/blender-pipeline.mjs chemin/adam_v1.glb
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

globalThis.ProgressEvent ??= class extends Event {
  constructor(type, init = {}) {
    super(type);
    Object.assign(this, init);
  }
};
const { loadRiggedCharacter } = await import("../src/characters/gltf.js");
const { inspectModel } = await import("../src/characters/inspect.js");
const { sampleShot } = await import("../src/animations/timeline.js");
const { JOINTS } = await import("../src/animations/humanoid.js");

const body = readFileSync(process.argv[2]);
const server = createServer((request, response) => response.end(body));
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const url = `http://127.0.0.1:${server.address().port}/adam_v1.glb`;
  const model = await loadRiggedCharacter(url, { profile: "mpfb" });
  const report = inspectModel(model.root, []);
  assert.equal(report.bestProfile, "mpfb");
  assert.equal(report.profiles.mpfb.found, JOINTS.length);
  assert.equal(report.arkit.length, 10);
  assert.ok(report.height > 1.6 && report.height < 1.95);
  for (const name of ["Sweat", "Jean", "Capuche"])
    assert.ok(
      report.meshes.some((mesh) => mesh.name.startsWith(name)),
      `${name} présent`,
    );
  model.applyPose(sampleShot(0.2), { adamX: 0, adamZ: 0 }, 0.2);
  console.log(
    `GLB valide : ${report.triangles} triangles, ${report.arkit.length} expressions, ${report.meshes.length} maillages.`,
  );
} finally {
  server.close();
}
