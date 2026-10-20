import * as THREE from "three";
import { box, sphere, group, material } from "../environments/objects.js";

// Provisional primitive rig. Every character adapter exposes root + applyPose.
export function createAdam() {
  const root = new THREE.Group();
  root.name = "Adam Morel — rig provisoire";
  root.position.set(-0.3, 0, -1.08);
  const hoodie = material("#303a40");
  const skin = material("#b58f79", 0.92);
  const hair = material("#2b2523");
  const denim = material("#202c38");
  const sole = material("#292c2c");
  const torso = group(root, "Buste", [0, 0.92, 0]);
  sphere(torso, "Sweat anthracite", [0.27, 0.34, 0.17], [0, 0.16, 0], hoodie);
  sphere(torso, "Capuche", [0.23, 0.13, 0.12], [0, 0.41, -0.09], hoodie);
  box(torso, "Poche du sweat", [0.32, 0.11, 0.025], [0, 0.02, 0.16], hoodie);
  for (const side of [-1, 1]) {
    box(
      torso,
      "Cordon",
      [0.012, 0.15, 0.015],
      [side * 0.06, 0.28, 0.17],
      material("#9b9c96"),
    );
    const arm = group(torso, side < 0 ? "Bras gauche" : "Bras droit", [
      side * 0.27,
      0.29,
      0,
    ]);
    arm.rotation.z = side * 0.08;
    sphere(arm, "Manche", [0.095, 0.24, 0.1], [0, -0.16, 0.045], hoodie);
    const forearm = sphere(
      arm,
      "Avant-bras",
      [0.085, 0.2, 0.09],
      [0, -0.39, 0.16],
      hoodie,
    );
    forearm.rotation.x = -0.55;
    sphere(arm, "Main", [0.075, 0.06, 0.105], [0, -0.53, 0.27], skin);
    sphere(
      root,
      "Cuisse",
      [0.12, 0.115, 0.29],
      [side * 0.145, 0.74, 0.22],
      denim,
    );
    sphere(root, "Genou", [0.12, 0.13, 0.12], [side * 0.145, 0.7, 0.46], denim);
    sphere(root, "Jambe", [0.095, 0.29, 0.1], [side * 0.145, 0.4, 0.49], denim);
    sphere(
      root,
      "Chaussure",
      [0.115, 0.09, 0.2],
      [side * 0.145, 0.1, 0.57],
      sole,
    );
    box(
      root,
      "Semelle",
      [0.21, 0.035, 0.36],
      [side * 0.145, 0.035, 0.57],
      material("#777b78"),
    );
  }
  const head = group(torso, "Tête", [0, 0.53, 0]);
  sphere(head, "Cou", [0.07, 0.11, 0.07], [0, -0.06, 0], skin);
  sphere(head, "Visage", [0.145, 0.195, 0.13], [0, 0.13, 0.013], skin);
  sphere(
    head,
    "Mâchoire et barbe",
    [0.12, 0.08, 0.108],
    [0, 0.035, 0.03],
    material("#65554a"),
  );
  sphere(
    head,
    "Menton",
    [0.072, 0.032, 0.024],
    [0, 0.008, 0.115],
    material("#987a66"),
  );
  sphere(head, "Cheveux", [0.15, 0.09, 0.135], [0, 0.275, -0.007], hair);
  for (let i = 0; i < 6; i++)
    sphere(
      head,
      "Mèche",
      [0.045, 0.04, 0.055],
      [-0.1 + i * 0.04, 0.285 + (i % 3) * 0.012, 0.067],
      hair,
    );
  for (const side of [-1, 1]) {
    sphere(
      head,
      "Oreille",
      [0.029, 0.05, 0.035],
      [side * 0.145, 0.13, 0],
      skin,
    );
    sphere(
      head,
      "Œil",
      [0.031, 0.017, 0.013],
      [side * 0.058, 0.16, 0.129],
      material("#c5c2b1"),
    );
    sphere(
      head,
      "Iris",
      [0.011, 0.013, 0.006],
      [side * 0.058, 0.16, 0.141],
      material("#323d3a"),
    );
    const brow = box(
      head,
      "Sourcil",
      [0.064, 0.012, 0.013],
      [side * 0.06, 0.2, 0.128],
      hair,
    );
    brow.rotation.z = side * -0.1;
    sphere(
      head,
      "Cerne",
      [0.032, 0.008, 0.007],
      [side * 0.058, 0.133, 0.132],
      material("#967d70"),
    );
  }
  sphere(head, "Nez", [0.023, 0.044, 0.036], [0, 0.122, 0.14], skin);
  box(
    head,
    "Bouche",
    [0.058, 0.008, 0.007],
    [0, 0.065, 0.136],
    material("#644d45"),
  );
  return {
    root,
    applyPose(pose, config) {
      root.position.set(-0.3 + config.adamX, 0, -1.08 + config.adamZ);
      torso.rotation.x = pose.torsoX;
      torso.position.y = 0.92 + pose.shoulderLift;
      head.rotation.set(pose.headX, pose.headY, 0);
    },
  };
}
