import { Matrix4, Quaternion, Vector3 } from "three";

// Original technical fixture: a tiny rigged "humanoid" written byte by byte.
// No third-party asset. Bones follow the "projet-zero" profile; the head bone
// has a non-identity rest rotation, like a Blender export, to test axes.
export const HEAD_REST = new Quaternion().setFromAxisAngle(
  new Vector3(1, 0, 0),
  Math.PI / 2,
);

const BONES = [
  ["hips", null, [0, 1, 0]],
  ["spine", "hips", [0, 0.1, 0]],
  ["chest", "spine", [0, 0.2, 0]],
  ["neck", "chest", [0, 0.22, 0]],
  ["head", "neck", [0, 0.1, 0], HEAD_REST],
  ["upperArmL", "chest", [0.17, 0.19, 0]],
  ["upperArmR", "chest", [-0.17, 0.19, 0]],
];

export function buildHumanoidGlb({ clips = true, morph = true } = {}) {
  const chunks = [];
  let byteLength = 0;
  const bufferViews = [];
  const accessors = [];
  const add = (typed, accessor, target) => {
    const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    const padding = (4 - (byteLength % 4)) % 4;
    if (padding) chunks.push(Buffer.alloc(padding));
    byteLength += padding;
    bufferViews.push({
      buffer: 0,
      byteOffset: byteLength,
      byteLength: bytes.length,
      ...(target ? { target } : {}),
    });
    chunks.push(bytes);
    byteLength += bytes.length;
    accessors.push({ bufferView: bufferViews.length - 1, ...accessor });
    return accessors.length - 1;
  };

  const nodes = BONES.map(([name, , translation, rotation]) => ({
    name,
    translation,
    ...(rotation ? { rotation: rotation.toArray() } : {}),
  }));
  BONES.forEach(([, parent], i) => {
    if (!parent) return;
    const p = BONES.findIndex(([name]) => name === parent);
    (nodes[p].children ||= []).push(i);
  });
  // Bind matrices from the node hierarchy.
  const world = [];
  BONES.forEach(([, parent, t, r], i) => {
    const localMatrix = new Matrix4().compose(
      new Vector3(...t),
      r || new Quaternion(),
      new Vector3(1, 1, 1),
    );
    const p = BONES.findIndex(([name]) => name === parent);
    world[i] = p < 0 ? localMatrix : world[p].clone().multiply(localMatrix);
  });
  const ibm = new Float32Array(BONES.length * 16);
  world.forEach((m, i) => ibm.set(m.clone().invert().elements, i * 16));

  // A small box around the head, skinned to the head bone.
  const s = 0.1;
  const positions = new Float32Array([
    -s,
    1.55,
    -s,
    s,
    1.55,
    -s,
    s,
    1.75,
    -s,
    -s,
    1.75,
    -s,
    -s,
    1.55,
    s,
    s,
    1.55,
    s,
    s,
    1.75,
    s,
    -s,
    1.75,
    s,
  ]);
  const indices = new Uint16Array([
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0,
    4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5,
  ]);
  const head = BONES.findIndex(([name]) => name === "head");
  const joints = new Uint16Array(8 * 4).map((_, i) => (i % 4 === 0 ? head : 0));
  const weights = new Float32Array(8 * 4).map((_, i) => (i % 4 === 0 ? 1 : 0));
  const primitive = {
    attributes: {
      POSITION: add(
        positions,
        {
          componentType: 5126,
          count: 8,
          type: "VEC3",
          min: [-s, 1.55, -s],
          max: [s, 1.75, s],
        },
        34962,
      ),
      JOINTS_0: add(
        joints,
        { componentType: 5123, count: 8, type: "VEC4" },
        34962,
      ),
      WEIGHTS_0: add(
        weights,
        { componentType: 5126, count: 8, type: "VEC4" },
        34962,
      ),
    },
    indices: add(
      indices,
      { componentType: 5123, count: indices.length, type: "SCALAR" },
      34963,
    ),
  };
  const mesh = { name: "Mannequin de test", primitives: [primitive] };
  if (morph) {
    const blink = new Float32Array(8 * 3).map((_, i) =>
      i % 3 === 1 ? -0.02 : 0,
    );
    primitive.targets = [
      {
        POSITION: add(
          blink,
          {
            componentType: 5126,
            count: 8,
            type: "VEC3",
            min: [0, -0.02, 0],
            max: [0, -0.02, 0],
          },
          34962,
        ),
      },
    ];
    mesh.extras = { targetNames: ["eyeBlinkLeft"] };
  }
  const meshNode = nodes.length;
  nodes.push({ name: "Corps", mesh: 0, skin: 0 });
  const json = {
    asset: { version: "2.0", generator: "Projet Zéro · fixture de test" },
    scene: 0,
    scenes: [{ nodes: [0, meshNode] }],
    nodes,
    meshes: [mesh],
    skins: [
      {
        joints: BONES.map((_, i) => i),
        inverseBindMatrices: add(ibm, {
          componentType: 5126,
          count: BONES.length,
          type: "MAT4",
        }),
      },
    ],
  };
  if (clips) {
    const times = new Float32Array([0, 1]);
    const input = add(times, {
      componentType: 5126,
      count: 2,
      type: "SCALAR",
      min: [0],
      max: [1],
    });
    const nod = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.6);
    const key = (q) =>
      new Float32Array([
        ...HEAD_REST.toArray(),
        ...HEAD_REST.clone().multiply(q).toArray(),
      ]);
    json.animations = [
      ["Fixture_Sleep", nod],
      [
        "Fixture_Look",
        new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -0.8),
      ],
    ].map(([name, q]) => ({
      name,
      samplers: [
        {
          input,
          output: add(key(q), { componentType: 5126, count: 2, type: "VEC4" }),
          interpolation: "LINEAR",
        },
      ],
      channels: [{ sampler: 0, target: { node: head, path: "rotation" } }],
    }));
  }
  json.buffers = [{ byteLength }];
  json.bufferViews = bufferViews;
  json.accessors = accessors;

  const bin = Buffer.concat(chunks, byteLength);
  const text = JSON.stringify(json);
  const jsonChunk = Buffer.from(
    text.padEnd(Math.ceil(Buffer.byteLength(text) / 4) * 4, " "),
  );
  const binChunk = Buffer.concat([
    bin,
    Buffer.alloc((4 - (bin.length % 4)) % 4),
  ]);
  const glb = Buffer.alloc(12 + 8 + jsonChunk.length + 8 + binChunk.length);
  let o = 0;
  o = glb.writeUInt32LE(0x46546c67, o);
  o = glb.writeUInt32LE(2, o);
  o = glb.writeUInt32LE(glb.length, o);
  o = glb.writeUInt32LE(jsonChunk.length, o);
  o = glb.writeUInt32LE(0x4e4f534a, o);
  jsonChunk.copy(glb, o);
  o += jsonChunk.length;
  o = glb.writeUInt32LE(binChunk.length, o);
  o = glb.writeUInt32LE(0x004e4942, o);
  binChunk.copy(glb, o);
  return glb;
}
