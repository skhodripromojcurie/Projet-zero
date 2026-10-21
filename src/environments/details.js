import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { box, sphere, group, material, canvasTexture } from "./objects.js";
import { seeded, fabricTexture } from "../characters/adam-parts.js";
import { createDuvet } from "./duvet.js";

export function parquetTexture() {
  const random = seeded(23);
  const texture = canvasTexture(1024, 1024, (ctx, w, h) => {
    const plank = 64;
    for (let x = 0; x < w; x += plank) {
      let y = -random() * 300;
      while (y < h) {
        const length = 220 + random() * 260;
        const tone = 58 + random() * 22;
        ctx.fillStyle = `rgb(${tone + 20},${tone + 8},${tone - 6})`;
        ctx.fillRect(x, y, plank, length);
        for (let g = 0; g < 14; g++) {
          ctx.fillStyle = `rgba(30,20,12,${0.05 + random() * 0.08})`;
          ctx.fillRect(x + random() * plank, y, 1 + random() * 2, length);
        }
        ctx.fillStyle = "#1d1813";
        ctx.fillRect(x, y, plank, 2);
        y += length;
      }
      ctx.fillStyle = "#1a1510";
      ctx.fillRect(x, 0, 2, h);
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.4, 2.4);
  return texture;
}

export function dressBed(bed) {
  const sheet = material("#b9bab2", 0.95, {
    map: fabricTexture("#bdbdb4", "#c9c9c1", "#a9aaa2", 13, 6),
  });
  box(bed, "Drap-housse", [1.63, 0.025, 2.22], [0, 0.69, 0], sheet);
  const duvetMat = material("#ffffff", 0.97, {
    map: fabricTexture("#4a565b", "#56626a", "#3a4448", 19, 5),
    side: THREE.DoubleSide,
  });
  const duvet = createDuvet(bed, duvetMat);
  const pillowMat = material("#c3c3bb", 0.95, {
    map: fabricTexture("#c6c6be", "#d2d2ca", "#b0b1a9", 31, 3),
  });
  const pillow = sphere(
    bed,
    "Oreiller",
    [0.36, 0.1, 0.22],
    [-0.15, 0.79, -0.79],
    pillowMat,
  );
  pillow.rotation.x = -0.12;
  sphere(
    bed,
    "Second oreiller",
    [0.33, 0.08, 0.2],
    [0.42, 0.77, -0.86],
    pillowMat,
  ).rotation.y = 0.15;
  return duvet;
}

export function dressNightstand(nightstand) {
  const phone = box(
    nightstand,
    "Téléphone",
    [0.075, 0.009, 0.15],
    [0.19, 0.605, 0.12],
    material("#111417", 0.3),
  );
  phone.rotation.y = 0.3;
  box(
    phone,
    "Écran éteint",
    [0.068, 0.002, 0.14],
    [0, 0.005, 0],
    material("#0b1015", 0.15),
  );
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.03, 0.11, 20, 1, true),
    new THREE.MeshStandardMaterial({
      color: "#9fb4bd",
      roughness: 0.05,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    }),
  );
  glass.name = "Verre d’eau";
  glass.position.set(0.2, 0.655, -0.12);
  nightstand.add(glass);
  box(
    nightstand,
    "Livre de poche",
    [0.13, 0.025, 0.19],
    [-0.02, 0.612, -0.16],
    material("#5d4b3a"),
  ).rotation.y = -0.2;
}

export function furnishRoom(room) {
  // Radiator under the window.
  const radiator = group(room, "Radiateur", [-2.9, 0, 0]);
  const enamel = material("#a9aca5", 0.5);
  for (let i = 0; i < 16; i++)
    box(
      radiator,
      "Élément",
      [0.08, 0.55, 0.05],
      [0, 0.42, -0.6 + i * 0.08],
      enamel,
    );
  box(radiator, "Collecteur", [0.06, 0.04, 1.3], [0, 0.17, 0], enamel);
  // Chair with yesterday's clothes.
  const chair = group(room, "Chaise", [2.05, 0, 0.55]);
  chair.rotation.y = -0.5;
  const oak = material("#3a2d24", 0.7);
  box(chair, "Assise", [0.44, 0.04, 0.42], [0, 0.46, 0], oak);
  for (const [x, z] of [
    [-0.19, -0.18],
    [0.19, -0.18],
    [-0.19, 0.18],
    [0.19, 0.18],
  ])
    box(chair, "Pied", [0.035, 0.46, 0.035], [x, 0.23, z], oak);
  box(chair, "Dossier", [0.44, 0.42, 0.03], [0, 0.7, -0.2], oak);
  const jacket = material("#3a4136", 0.9);
  sphere(chair, "Veste posée", [0.25, 0.22, 0.07], [0, 0.72, -0.24], jacket);
  sphere(
    chair,
    "Manche de veste",
    [0.06, 0.2, 0.05],
    [0.2, 0.52, -0.17],
    jacket,
  ).rotation.z = 0.25;
  sphere(
    chair,
    "Jean plié",
    [0.18, 0.04, 0.15],
    [0.02, 0.5, 0.04],
    material("#26313d"),
  );
  // Backpack and shoes, ready to leave.
  const bag = group(room, "Sac à dos", [0.35, 0, 2.6]);
  bag.rotation.set(-0.12, 0.4, 0);
  const canvas = material("#2b3230", 0.85);
  const body = new THREE.Mesh(
    new RoundedBoxGeometry(0.3, 0.44, 0.18, 4, 0.06),
    canvas,
  );
  body.name = "Sac";
  body.position.y = 0.22;
  body.castShadow = body.receiveShadow = true;
  bag.add(body);
  const pocket = new THREE.Mesh(
    new RoundedBoxGeometry(0.22, 0.16, 0.07, 3, 0.03),
    material("#232927", 0.85),
  );
  pocket.name = "Poche avant";
  pocket.position.set(0, 0.14, 0.11);
  bag.add(pocket);
  for (const side of [-1, 1]) {
    const shoe = sphere(
      room,
      "Basket",
      [0.055, 0.045, 0.14],
      [1.15 + side * 0.09, 0.045, 0.55],
      material("#5a5d5c"),
    );
    shoe.rotation.y = side * 0.25 + 0.3;
  }
  // Frames above the bed with quiet, unreadable photographs.
  for (const [x, y, w, h, seed] of [
    [0.25, 1.85, 0.5, 0.68, 3],
    [0.95, 1.72, 0.34, 0.44, 9],
  ]) {
    const frame = group(room, "Cadre", [x, y, -2.99]);
    box(frame, "Baguette", [w, h, 0.03], [0, 0, 0], material("#1a1b1a", 0.6));
    const rnd = seeded(seed);
    const art = canvasTexture(128, 160, (ctx, cw, ch) => {
      const g = ctx.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, "#56656e");
      g.addColorStop(1, "#262c2e");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = "#1b2124";
      ctx.beginPath();
      ctx.moveTo(0, ch);
      for (let i = 0; i <= 8; i++)
        ctx.lineTo((i / 8) * cw, ch * (0.5 + rnd() * 0.25));
      ctx.lineTo(cw, ch);
      ctx.fill();
    });
    box(
      frame,
      "Photographie",
      [w - 0.06, h - 0.06, 0.005],
      [0, 0, 0.017],
      material("#ffffff", 0.4, { map: art }),
    );
  }
  // Switch and socket by the door, ceiling light (off).
  box(
    room,
    "Interrupteur",
    [0.08, 0.12, 0.015],
    [1.75, 1.1, 3.01],
    material("#cfcfc8", 0.5),
  );
  box(
    room,
    "Prise",
    [0.08, 0.08, 0.015],
    [-0.25, 0.3, -3.0],
    material("#cfcfc8", 0.5),
  );
  const ceiling = sphere(
    room,
    "Plafonnier éteint",
    [0.2, 0.05, 0.2],
    [0.4, 3.19, 0.2],
    material("#d8d6cc", 0.6),
  );
  ceiling.castShadow = false;
}

/** Wavy curtain panel hanging along z (window wall is at -x). */
export function curtain(parent, name, zStart, zEnd, mat) {
  const width = Math.abs(zEnd - zStart);
  const geometry = new THREE.PlaneGeometry(width, 2.4, 48, 1);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i);
    p.setZ(i, Math.sin(u * 52) * 0.028 + Math.sin(u * 17) * 0.012);
  }
  geometry.computeVertexNormals();
  const panel = new THREE.Mesh(geometry, mat);
  panel.name = name;
  panel.rotation.y = Math.PI / 2;
  panel.position.set(-2.84, 1.72, (zStart + zEnd) / 2);
  panel.castShadow = panel.receiveShadow = true;
  parent.add(panel);
  return panel;
}
