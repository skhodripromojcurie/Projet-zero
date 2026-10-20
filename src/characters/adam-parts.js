import * as THREE from "three";
import { canvasTexture } from "../environments/objects.js";

/** Rounded tapered limb hanging from its joint along -y (lathe profile). */
export function segmentGeometry(r0, r1, length, depth = 1, cap = 0.7) {
  const points = [];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    points.push(new THREE.Vector2(Math.sin(a) * r0, Math.cos(a) * r0 * 0.7));
  }
  for (let i = 1; i < 8; i++) {
    const s = i / 8;
    const bulge = Math.sin(Math.PI * s) * 0.06 * (r0 + r1);
    points.push(new THREE.Vector2(r0 + (r1 - r0) * s + bulge, -length * s));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    points.push(
      new THREE.Vector2(Math.cos(a) * r1, -length - Math.sin(a) * r1 * cap),
    );
  }
  const geometry = new THREE.LatheGeometry(points, 28);
  geometry.scale(1, 1, depth);
  return geometry;
}

export function mesh(parent, name, geometry, mat, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, mat);
  object.name = name;
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function joint(parent, name, position = [0, 0, 0]) {
  const object = new THREE.Group();
  object.name = name;
  object.position.set(...position);
  parent.add(object);
  return object;
}

// Deterministic pseudo-random sequence for generated textures.
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Fabric: base colour with fine knit noise, generated once. */
export function fabricTexture(base, light, dark, seed, repeat = 3) {
  const random = seeded(seed);
  const texture = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = random() > 0.5 ? light : dark;
      ctx.globalAlpha = 0.18 + random() * 0.2;
      ctx.fillRect(random() * w, random() * h, 1, 1 + random() * 2);
    }
    ctx.globalAlpha = 1;
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  return texture;
}

export function createAdamMaterials() {
  const skinMap = canvasTexture(512, 256, (ctx, w, h) => {
    const random = seeded(29);
    ctx.fillStyle = "#b38b77";
    ctx.fillRect(0, 0, w, h);
    // Sphere UVs: the face is centred on u = 0.25.
    const blush = (u, v, r, color) => {
      const g = ctx.createRadialGradient(u * w, v * h, 0, u * w, v * h, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "#c0927600");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    };
    blush(0.21, 0.55, 26, "#b9786466");
    blush(0.29, 0.55, 26, "#b9786466");
    blush(0.25, 0.53, 14, "#b0705f55");
    blush(0.226, 0.47, 9, "#7d5a5066");
    blush(0.274, 0.47, 9, "#7d5a5066");
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = random() > 0.5 ? "#ad7f66" : "#cfa38a";
      ctx.globalAlpha = 0.25;
      ctx.fillRect(random() * w, random() * h, 2, 2);
    }
    ctx.globalAlpha = 1;
  });
  const skin = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    map: skinMap,
    roughness: 0.62,
    sheen: 0.2,
    sheenColor: new THREE.Color("#d99a88"),
    sheenRoughness: 0.6,
  });
  const handSkin = new THREE.MeshPhysicalMaterial({
    color: "#ad8670",
    roughness: 0.65,
    sheen: 0.3,
    sheenColor: new THREE.Color("#ff8c6e"),
  });
  const hoodie = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: fabricTexture("#383f44", "#4a5257", "#262c30", 7, 4),
    roughness: 0.95,
  });
  const denim = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    map: fabricTexture("#1f2a36", "#2f3d4c", "#141b23", 11, 5),
    roughness: 0.9,
  });
  return {
    skin,
    handSkin,
    hoodie,
    denim,
    sock: new THREE.MeshStandardMaterial({ color: "#2a2b2d", roughness: 1 }),
    cord: new THREE.MeshStandardMaterial({ color: "#8e918c", roughness: 0.8 }),
    lip: new THREE.MeshStandardMaterial({ color: "#9c6c60", roughness: 0.55 }),
    mouth: new THREE.MeshBasicMaterial({ color: "#1d1210" }),
  };
}
