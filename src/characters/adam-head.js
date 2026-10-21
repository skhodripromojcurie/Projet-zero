import * as THREE from "three";
import { canvasTexture } from "../environments/objects.js";
import { mesh, joint, seeded } from "./adam-parts.js";

// Unit-sphere head deformed toward adult male proportions (metres).
function shapeHead(x, y, z) {
  let X = x,
    Y = y,
    Z = z;
  if (Y < 0) {
    X *= 1 - 0.24 * Math.pow(-Y, 2.2);
    if (Z < 0) Z *= 1 - 0.5 * -Y;
  }
  if (Z < 0 && Y > -0.2) Z *= 1.06;
  if (Z > 0 && Y > 0.2) Z *= 1 - 0.12 * (Y - 0.2);
  X *= 1 + 0.06 * Math.exp(-(((Y + 0.05) / 0.25) ** 2)) * (Z > 0 ? 1 : 0.4);
  if (Z > 0) {
    for (const side of [-1, 1]) {
      const d = ((X - side * 0.4) / 0.2) ** 2 + ((Y - 0.1) / 0.14) ** 2;
      Z -= 0.075 * Math.exp(-d);
    }
    Z += 0.035 * Math.exp(-(((Y - 0.27) / 0.07) ** 2)) * Math.max(0, Z - 0.5);
    Z +=
      0.05 *
      Math.exp(-(((Y + 0.78) / 0.14) ** 2)) *
      Math.exp(-((X / 0.3) ** 2));
  }
  return [X * 0.074, Y * 0.109, Z * 0.097];
}

function headGeometry(scale = 1, bump = null) {
  const geometry = new THREE.SphereGeometry(1, 56, 40);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const s = scale + (bump ? bump(x, y, z) : 0);
    const [X, Y, Z] = shapeHead(x, y, z);
    p.setXYZ(i, X * s, Y * s, Z * s);
  }
  geometry.computeVertexNormals();
  return geometry;
}

// Paint a sphere-UV alpha mask from a predicate on the unit direction.
function maskTexture(width, height, seed, paint) {
  const random = seeded(seed);
  return canvasTexture(width, height, (ctx, w, h) => {
    const image = ctx.createImageData(w, h);
    for (let py = 0; py < h; py++)
      for (let px = 0; px < w; px++) {
        const phi = (px / w) * Math.PI * 2;
        const theta = (py / h) * Math.PI;
        const dir = [
          -Math.cos(phi) * Math.sin(theta),
          Math.cos(theta),
          Math.sin(phi) * Math.sin(theta),
        ];
        const [r, g, b, a] = paint(dir, random, px, py);
        const o = (py * w + px) * 4;
        image.data.set([r, g, b, a], o);
      }
    ctx.putImageData(image, 0, 0);
  });
}

const smoothEdge = (value, width) => Math.min(1, Math.max(0, value / width));

function hairTexture() {
  return maskTexture(512, 256, 5, ([x, y, z], random, px) => {
    const front = Math.max(0, z);
    const back = Math.max(0, -z);
    const jag = 0.04 * Math.sin(px * 0.9) + 0.03 * (random() - 0.5);
    let line = z > 0 ? 0.27 + 0.33 * front ** 1.5 : 0.27 - 0.75 * back;
    // Short sideburns in front of the ears.
    if (Math.abs(x) > 0.8 && z > 0.02 && z < 0.3) line = Math.min(line, -0.1);
    const inside = y - line + jag > 0;
    const streak = 30 + random() * 26;
    return [streak + 12, streak, streak - 6, inside ? 255 : 0];
  });
}

function beardTexture() {
  return maskTexture(512, 256, 9, ([x, y, z], random) => {
    if (z < -0.15) return [0, 0, 0, 0];
    const side = Math.min(1, Math.abs(x) / 0.85);
    const line = -0.36 + 0.3 * side ** 2.5;
    let a = smoothEdge(line - y, 0.16);
    if (z > 0.5)
      a *= 1 - 0.85 * Math.exp(-((x / 0.3) ** 2) - ((y + 0.455) / 0.07) ** 2);
    a *= 1 - 0.6 * smoothEdge(-0.8 - y, 0.15);
    a *= 0.55 + 0.45 * random();
    const tone = 40 + random() * 18;
    return [tone + 10, tone, tone - 6, Math.round(a * 165)];
  });
}

function eyeTexture() {
  return canvasTexture(256, 128, (ctx, w, h) => {
    ctx.fillStyle = "#e6ddd2";
    ctx.fillRect(0, 0, w, h);
    const cx = w * 0.25,
      cy = h * 0.5;
    const iris = ctx.createRadialGradient(cx, cy, 2, cx, cy, w * 0.075);
    iris.addColorStop(0, "#2d2a1e");
    iris.addColorStop(0.45, "#4b4630");
    iris.addColorStop(1, "#2b3027");
    ctx.fillStyle = iris;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.075, h * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#070606";
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.028, h * 0.056, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

const EYE_RADIUS = 0.0118;
const LID_OPEN = 0.14,
  LID_CLOSED = 0.7,
  LID_WIDE = -0.06;

/** Head with eyelids, brows, gaze and a small jaw; returns setFace(face, gaze). */
export function createHead(parent, materials) {
  const head = joint(parent, "Tête", [0, 0.085, 0]);
  const skull = joint(head, "Crâne", [0, 0.095, 0.014]);
  mesh(skull, "Visage", headGeometry(), materials.skin);
  const hairMat = new THREE.MeshStandardMaterial({
    map: hairTexture(),
    alphaTest: 0.5,
    roughness: 0.75,
    side: THREE.DoubleSide,
  });
  const messy = (x, y, z) =>
    y > 0.1
      ? 0.05 + 0.01 * Math.sin(x * 23 + z * 17) * Math.sin(y * 19)
      : 0.042;
  mesh(skull, "Cheveux courts", headGeometry(1, messy), hairMat);
  mesh(
    skull,
    "Barbe légère",
    headGeometry(1.012),
    new THREE.MeshStandardMaterial({
      map: beardTexture(),
      transparent: true,
      depthWrite: false,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  ).castShadow = false;

  // Soft volume under the jaw joining the chin to the neck.
  const throat = mesh(
    skull,
    "Dessous de la mâchoire",
    new THREE.SphereGeometry(1, 24, 16),
    materials.skin,
    [0, -0.074, 0.0],
  );
  throat.scale.set(0.046, 0.028, 0.05);
  const nose = joint(skull, "Nez", [0, -0.008, 0.093]);
  const bridge = mesh(
    nose,
    "Arête du nez",
    new THREE.SphereGeometry(1, 20, 14),
    materials.skin,
  );
  bridge.scale.set(0.0085, 0.026, 0.012);
  bridge.rotation.x = -0.3;
  const tip = mesh(
    nose,
    "Bout du nez",
    new THREE.SphereGeometry(1, 20, 14),
    materials.skin,
    [0, -0.021, 0.01],
  );
  tip.scale.set(0.011, 0.0085, 0.0095);
  for (const side of [-1, 1]) {
    const wing = mesh(
      nose,
      "Aile du nez",
      new THREE.SphereGeometry(1, 14, 10),
      materials.skin,
      [side * 0.0095, -0.024, 0.001],
    );
    wing.scale.set(0.0065, 0.0055, 0.007);
    const ear = mesh(
      skull,
      "Oreille",
      new THREE.SphereGeometry(1, 16, 12),
      materials.skin,
      [side * 0.073, 0.002, -0.006],
    );
    ear.scale.set(0.009, 0.029, 0.018);
    ear.rotation.y = side * 0.35;
  }

  const eyeMat = new THREE.MeshStandardMaterial({
    map: eyeTexture(),
    roughness: 0.12,
  });
  const eyes = [],
    upperLids = [],
    brows = [];
  for (const side of [-1, 1]) {
    const socket = joint(skull, side < 0 ? "Œil droit" : "Œil gauche", [
      side * 0.0296,
      0.0115,
      0.0745,
    ]);
    const eye = mesh(
      socket,
      "Globe oculaire",
      new THREE.SphereGeometry(EYE_RADIUS, 24, 16),
      eyeMat,
    );
    eye.castShadow = false;
    eyes.push(eye);
    const upper = joint(socket, "Paupière supérieure");
    mesh(
      upper,
      "Paupière",
      new THREE.SphereGeometry(
        EYE_RADIUS * 1.09,
        28,
        10,
        0,
        Math.PI * 2,
        0,
        1.25,
      ),
      materials.skin,
    ).castShadow = false;
    upperLids.push(upper);
    const lower = joint(socket, "Paupière inférieure");
    mesh(
      lower,
      "Paupière",
      new THREE.SphereGeometry(
        EYE_RADIUS * 1.07,
        28,
        8,
        0,
        Math.PI * 2,
        Math.PI - 0.95,
        0.95,
      ),
      materials.skin,
    ).castShadow = false;
    lower.rotation.x = -0.25;
    const brow = joint(skull, "Sourcil", [side * 0.031, 0.034, 0.0875]);
    const hairBrow = mesh(
      brow,
      "Poils du sourcil",
      new THREE.CapsuleGeometry(0.0034, 0.026, 4, 8),
      hairMat.clone(),
    );
    hairBrow.material.map = null;
    hairBrow.material.alphaTest = 0;
    hairBrow.material.color.set("#3a2c22");
    hairBrow.rotation.z = Math.PI / 2 - side * 0.1;
    hairBrow.scale.set(1, 1, 0.55);
    brow.userData.side = side;
    brows.push(brow);
  }

  const upperLip = mesh(
    skull,
    "Lèvre supérieure",
    new THREE.CapsuleGeometry(0.0038, 0.03, 4, 10),
    materials.lip,
    [0, -0.045, 0.085],
  );
  upperLip.rotation.z = Math.PI / 2;
  upperLip.scale.set(1, 1, 0.6);
  const mouth = mesh(
    skull,
    "Bouche",
    new THREE.SphereGeometry(1, 16, 8),
    materials.mouth,
    [0, -0.0495, 0.082],
  );
  mouth.scale.set(0.016, 0.0012, 0.005);
  const jaw = joint(skull, "Mâchoire", [0, -0.01, 0.02]);
  const lowerLip = mesh(
    jaw,
    "Lèvre inférieure",
    new THREE.CapsuleGeometry(0.0042, 0.026, 4, 10),
    materials.lip,
    [0, -0.044, 0.063],
  );
  lowerLip.rotation.z = Math.PI / 2;
  lowerLip.scale.set(1, 1, 0.6);

  return {
    head,
    setFace(face, gaze) {
      const lid = (blink, wide) =>
        LID_OPEN +
        (LID_CLOSED - LID_OPEN) * blink +
        (LID_WIDE - LID_OPEN) * wide * 0.5;
      upperLids[0].rotation.x = lid(face.eyeBlinkRight, face.eyeWideRight);
      upperLids[1].rotation.x = lid(face.eyeBlinkLeft, face.eyeWideLeft);
      for (const eye of eyes) eye.rotation.set(-gaze.pitch, gaze.yaw, 0);
      for (const brow of brows) {
        const side = brow.userData.side;
        const down = side < 0 ? face.browDownRight : face.browDownLeft;
        brow.position.y = 0.034 + 0.005 * face.browInnerUp - 0.004 * down;
        brow.rotation.z = side * (-0.2 * face.browInnerUp + 0.16 * down);
      }
      const frown = (face.mouthFrownLeft + face.mouthFrownRight) / 2;
      upperLip.rotation.x = 0;
      upperLip.scale.x = 1 - 0.15 * frown;
      jaw.rotation.x = 0.16 * face.jawOpen;
      mouth.scale.y = 0.0012 + 0.008 * face.jawOpen;
      mouth.position.y = -0.0495 - 0.003 * face.jawOpen - 0.002 * frown;
    },
  };
}
