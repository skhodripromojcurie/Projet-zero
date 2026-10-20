import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import viteConfig from "../vite.config.js";
import { publicAssetUrl } from "../src/assets/paths.js";
import { loadRiggedCharacter } from "../src/characters/gltf.js";

test("les chemins publics conservent la base Pages sans préfixe en double", () => {
  assert.equal(viteConfig.base, "/Projet-zero/");
  for (const path of [
    "assets/models/adam.glb",
    "/assets/models/adam.glb",
    "/Projet-zero/assets/models/adam.glb",
  ]) {
    assert.equal(
      publicAssetUrl(path, viteConfig.base),
      "/Projet-zero/assets/models/adam.glb",
    );
  }
  assert.equal(
    publicAssetUrl("assets/models/adam.glb", "/"),
    "/assets/models/adam.glb",
  );
  assert.equal(
    publicAssetUrl("https://example.com/model.glb", viteConfig.base),
    "https://example.com/model.glb",
  );
});

test("le chargeur GLB lit un fichier servi sous le chemin de déploiement", async (t) => {
  // GLTFLoader uses the browser ProgressEvent API; provide it only in this Node test.
  if (typeof globalThis.ProgressEvent === "undefined") {
    globalThis.ProgressEvent = class extends Event {
      constructor(type, init = {}) {
        super(type);
        Object.assign(this, init);
      }
    };
    t.after(() => {
      delete globalThis.ProgressEvent;
    });
  }
  // Minimal original GLB fixture: an empty scene/node, no character or downloaded model.
  const json = JSON.stringify({
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: "PathCheck" }],
  });
  const padded = json.padEnd(Math.ceil(Buffer.byteLength(json) / 4) * 4, " ");
  const body = Buffer.from(padded);
  const glb = Buffer.alloc(20 + body.length);
  glb.writeUInt32LE(0x46546c67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(body.length, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  body.copy(glb, 20);
  const path = publicAssetUrl("assets/models/path-check.glb", viteConfig.base);
  let requested;
  const server = createServer((req, res) => {
    requested = req.url;
    if (req.url !== path) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Type": "model/gltf-binary" });
    res.end(glb);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const model = await loadRiggedCharacter(
    `http://127.0.0.1:${server.address().port}${path}`,
  );
  assert.equal(requested, "/Projet-zero/assets/models/path-check.glb");
  assert.equal(model.root.children[0].name, "PathCheck");
  model.dispose();
});
