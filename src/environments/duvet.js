import * as THREE from "three";
import { noise } from "../animations/curves.js";

// Duvet draped over Adam (bed-local metres). Each frame its surface is the
// smooth envelope of the body volumes under it (pelvis, legs, torso while
// lying), pressed down under the arms, and never below the body itself.
// A pure function of the pose: same time, same folds.
const WIDTH = 2.1;
const COLS = 72;
const ROWS = 60;
const EDGE_X = 0.83; // mattress side edges
const EDGE_Z = 1.12; // mattress foot edge
const FOOT = 1.38; // far end of the duvet once it has fallen over the foot
const SHEET = 0.705; // top of the fitted sheet
const REST = 0.748; // duvet lying flat on the mattress
const LOFT = 0.03; // filling between body and duvet top
const SOFTNESS = 70; // smooth-max sharpness (higher: tighter drape)
const HEM_LYING = -0.36;
const OVER_X = 1.9; // drop per metre of fabric past the side edges
const OVER_Z = 1.6;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Horizontal distance from (x, z) to segment AB and its height there. For a
 * steep segment (a foot pointing up) the projection hides the top: the
 * highest end is then the better answer when it is about as close.
 */
function nearest(x, z, a, b) {
  const near = alongSegment(x, z, a, b);
  const high = a[1] > b[1] ? a : b;
  const d = Math.hypot(high[0] - x, high[2] - z);
  return high[1] > near.y && d <= near.d + 0.03 ? { d, y: high[1] } : near;
}

function alongSegment(x, z, a, b) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const length = dx * dx + dz * dz;
  const t =
    length > 1e-9
      ? Math.min(1, Math.max(0, ((x - a[0]) * dx + (z - a[2]) * dz) / length))
      : 0;
  const px = a[0] + dx * t - x;
  const pz = a[2] + dz * t - z;
  return { d: Math.hypot(px, pz), y: a[1] + (b[1] - a[1]) * t };
}

/** Highest point of the body volumes at (x, z): the duvet may never go below. */
export function bodySurface(x, z, body) {
  let top = -Infinity;
  for (const c of body.capsules) {
    const { d, y } = nearest(x, z, c.a, c.b);
    if (d < c.r) top = Math.max(top, y + Math.sqrt(c.r * c.r - d * d));
  }
  return top;
}

/** Duvet height at (x, z), bed-local. `body`: capsules under, pressers on top. */
export function duvetHeight(x, z, body) {
  const hem = body.hem ?? HEM_LYING;
  const pulled = body.pulled ?? 0;
  let h =
    REST + 0.012 * noise(x * 7 + z * 3, 4) + 0.008 * noise(z * 9 - x * 2, 8);
  // Long soft folds, plus compression ripples once the duvet is pushed down.
  h += 0.006 * Math.sin(x * 9 + z * 5.5 + 1.3 * noise(z * 2, 3));
  const fromHem = Math.max(0, z - hem);
  h +=
    0.016 *
    pulled *
    Math.sin((fromHem / 0.11) * Math.PI * 2 + 1.4 * noise(x * 3, 6)) *
    Math.exp(-fromHem / 0.35);
  // Smooth maximum with a soft drape over each body volume.
  let sum = Math.exp(SOFTNESS * h);
  for (const c of body.capsules) {
    const { d, y } = nearest(x, z, c.a, c.b);
    // Falls back onto the sheet away from the body: only nearby volumes count.
    const drape =
      SHEET + (y + c.r + LOFT - SHEET) * Math.exp(-((d / (c.r * 1.6)) ** 2));
    sum += Math.exp(SOFTNESS * drape);
  }
  h = Math.log(sum) / SOFTNESS;
  // Rolled hem: a little thickness along the top edge.
  h += 0.022 * Math.exp(-(((z - hem - 0.035) / 0.035) ** 2));
  // Arms and hands resting on the duvet press it down.
  for (const p of body.pressers) {
    const { d, y } = nearest(x, z, p.a, p.b);
    const cap = y - p.r - 0.008 + 2.5 * d * d;
    if (cap < h) {
      const k = Math.exp(-((d / (p.r * 2.2)) ** 2));
      h = h + (cap - h) * k;
    }
  }
  // Pressed under a hand, the filling flattens almost onto the sheet.
  return Math.max(h, bodySurface(x, z, body) + 0.008, SHEET + 0.004);
}

/** Body volumes in bed-local space, from the character's joint positions. */
export function bodyFromJoints(p) {
  const v = (name) => p[name];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b, k = 1) => [
    a[0] + b[0] * k,
    a[1] + b[1] * k,
    a[2] + b[2] * k,
  ];
  const unit = (a) => {
    const n = Math.hypot(...a) || 1;
    return [a[0] / n, a[1] / n, a[2] / n];
  };
  const torso = sub(v("chest"), v("hips"));
  const upright = torso[1] / Math.max(1e-6, Math.hypot(...torso));
  const pulled = smoothstep(0.35, 0.85, upright);
  const capsules = [
    { a: v("thighL"), b: v("thighR"), r: 0.12 },
    { a: v("hips"), b: v("spine"), r: 0.12 },
  ];
  // The torso lies under the duvet only while Adam is lying down; it slips
  // out progressively as he sits up (no jump in the drape).
  const under = Math.max(0, 1 - 2 * pulled);
  if (under > 0)
    capsules.push({ a: v("spine"), b: v("chest"), r: 0.14 * under });
  const pressers = [];
  for (const s of ["L", "R"]) {
    const knee = v(`shin${s}`);
    const ankle = v(`foot${s}`);
    capsules.push(
      { a: v(`thigh${s}`), b: knee, r: 0.085 },
      { a: knee, b: ankle, r: 0.065 },
      // The foot, whatever the rig's foot orientation: a ball around the
      // raised toes (lying on the back) and the foot stretched along the leg.
      { a: add(ankle, [0, 0.12, 0]), b: add(ankle, [0, 0.12, 0]), r: 0.12 },
      { a: ankle, b: add(ankle, unit(sub(ankle, knee)), 0.2), r: 0.06 },
    );
    const elbow = v(`forearm${s}`);
    const wrist = v(`hand${s}`);
    pressers.push(
      { a: v(`upperArm${s}`), b: elbow, r: 0.05 },
      { a: elbow, b: wrist, r: 0.045 },
      { a: wrist, b: add(wrist, sub(wrist, elbow), 0.6), r: 0.04 },
    );
  }
  const hem = HEM_LYING + (v("hips")[2] + 0.17 - HEM_LYING) * pulled;
  return { capsules, pressers, hem, pulled };
}

const REST_BODY = { capsules: [], pressers: [], hem: HEM_LYING, pulled: 0 };

export function createDuvet(bed, material) {
  const geometry = new THREE.PlaneGeometry(WIDTH, 1, COLS, ROWS);
  const position = geometry.attributes.position;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "Couette";
  mesh.castShadow = mesh.receiveShadow = true;
  // Draping changes the bounds every frame.
  mesh.frustumCulled = false;
  bed.add(mesh);
  const local = new THREE.Vector3();
  const joints = {};
  const NAMES = [
    "hips",
    "spine",
    "chest",
    ...["thigh", "shin", "foot", "upperArm", "forearm", "hand"].flatMap((n) => [
      `${n}L`,
      `${n}R`,
    ]),
  ];

  function drape(body) {
    const length = FOOT - body.hem;
    for (let row = 0; row <= ROWS; row++) {
      const along = body.hem + (row / ROWS) * length;
      const overZ = Math.max(0, along - EDGE_Z);
      const z = overZ > 0 ? EDGE_Z + 0.025 : along;
      for (let col = 0; col <= COLS; col++) {
        const s = (col / COLS - 0.5) * WIDTH;
        const overX = Math.max(0, Math.abs(s) - EDGE_X);
        const x = overX > 0 ? Math.sign(s) * (EDGE_X + 0.025) : s;
        let y = duvetHeight(
          Math.max(-EDGE_X, Math.min(EDGE_X, s)),
          Math.min(z, EDGE_Z),
          body,
        );
        if (overX > 0) y = Math.min(y, REST + 0.015) - overX * OVER_X;
        if (overZ > 0) y = Math.min(y, REST + 0.015) - overZ * OVER_Z;
        position.setXYZ(row * (COLS + 1) + col, x, y, z);
      }
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  }
  drape(REST_BODY);

  return {
    mesh,
    /** Re-drape over a character exposing jointPosition(name, target). */
    update(character) {
      if (!character?.jointPosition) {
        drape(REST_BODY);
        return;
      }
      bed.updateWorldMatrix(true, false);
      for (const name of NAMES) {
        character.jointPosition(name, local);
        bed.worldToLocal(local);
        joints[name] = [local.x, local.y, local.z];
      }
      drape(bodyFromJoints(joints));
    },
  };
}
