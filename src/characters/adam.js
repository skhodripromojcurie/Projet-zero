import * as THREE from "three";
import { JOINTS } from "../animations/humanoid.js";
import {
  createAdamMaterials,
  segmentGeometry,
  mesh,
  joint,
} from "./adam-parts.js";
import { createHead } from "./adam-head.js";

// Pelvis position in the room when Adam lies in the bed at its origin.
export const ADAM_BASE = [0.5, 0.76, -1.42];

const up = (object) => {
  object.rotation.z = Math.PI;
  return object;
};
const blob = (parent, name, mat, position, scale) => {
  const object = mesh(
    parent,
    name,
    new THREE.SphereGeometry(1, 24, 18),
    mat,
    position,
  );
  object.scale.set(...scale);
  return object;
};

// Provisional procedural rig, v2. Every character adapter exposes root + applyPose.
export function createAdam() {
  const m = createAdamMaterials();
  const root = new THREE.Group();
  root.name = "Adam Morel — rig provisoire v2";
  const j = {};
  j.hips = joint(root, "Bassin");
  blob(j.hips, "Jean · bassin", m.denim, [0, -0.04, -0.01], [0.16, 0.1, 0.098]);
  j.spine = joint(j.hips, "Colonne", [0, 0.1, 0]);
  up(
    mesh(
      j.spine,
      "Sweat · ventre",
      segmentGeometry(0.158, 0.162, 0.26, 0.68),
      m.hoodie,
      [0, -0.1, 0],
    ),
  );
  mesh(
    j.spine,
    "Poche ventrale",
    new THREE.BoxGeometry(0.2, 0.09, 0.02),
    m.hoodie,
    [0, 0.03, 0.105],
  ).rotation.x = -0.12;
  j.chest = joint(j.spine, "Poitrine", [0, 0.2, 0]);
  // Flat shoulder line: a domed top would show through the neck.
  up(
    mesh(
      j.chest,
      "Sweat · poitrine",
      segmentGeometry(0.166, 0.125, 0.2, 0.66, 0.25),
      m.hoodie,
      [0, -0.02, 0],
    ),
  );
  // Hood collar: an open ring, the gap facing forward where the cords hang.
  const collar = new THREE.TorusGeometry(0.066, 0.022, 10, 28, Math.PI * 1.6);
  collar.rotateZ(Math.PI / 2 - Math.PI * 1.8);
  const hood = mesh(
    j.chest,
    "Col de capuche",
    collar,
    m.hoodie,
    [0, 0.205, -0.004],
  );
  hood.rotation.x = Math.PI / 2 - 0.35;
  hood.scale.set(1, 1.15, 1);
  blob(
    j.chest,
    "Capuche · dos",
    m.hoodie,
    [0, 0.18, -0.095],
    [0.1, 0.07, 0.045],
  );
  for (const side of [-1, 1]) {
    const cord = mesh(
      j.chest,
      "Cordon",
      new THREE.CylinderGeometry(0.0035, 0.0035, 0.13, 6),
      m.cord,
      [side * 0.03, 0.15, 0.106],
    );
    cord.rotation.x = -0.18;
    mesh(
      cord,
      "Embout",
      new THREE.CylinderGeometry(0.0045, 0.0045, 0.018, 6),
      m.cord,
      [0, -0.07, 0],
    );
  }
  j.neck = joint(j.chest, "Cou", [0, 0.215, 0.005]);
  // The neck skips received shadows: a hard chin shadow read as a cut.
  up(
    mesh(
      j.neck,
      "Cou",
      segmentGeometry(0.045, 0.043, 0.13, 0.95),
      m.skin,
      [0, -0.045, -0.004],
    ),
  ).receiveShadow = false;
  const face = createHead(j.neck, m);
  j.head = face.head;

  for (const [side, sign] of [
    ["L", 1],
    ["R", -1],
  ]) {
    const name = sign > 0 ? "gauche" : "droit";
    j[`clavicle${side}`] = joint(j.chest, `Clavicule ${name}`, [
      sign * 0.02,
      0.19,
      -0.005,
    ]);
    blob(
      j[`clavicle${side}`],
      "Épaule",
      m.hoodie,
      [sign * 0.13, -0.015, 0],
      [0.062, 0.056, 0.064],
    );
    j[`upperArm${side}`] = joint(j[`clavicle${side}`], `Bras ${name}`, [
      sign * 0.15,
      -0.01,
      0,
    ]);
    mesh(
      j[`upperArm${side}`],
      "Manche",
      segmentGeometry(0.058, 0.046, 0.29, 0.95),
      m.hoodie,
    );
    j[`forearm${side}`] = joint(
      j[`upperArm${side}`],
      `Avant-bras ${name}`,
      [0, -0.29, 0],
    );
    mesh(
      j[`forearm${side}`],
      "Manche",
      segmentGeometry(0.046, 0.04, 0.235, 0.95),
      m.hoodie,
    );
    const cuff = mesh(
      j[`forearm${side}`],
      "Bord-côte",
      new THREE.TorusGeometry(0.033, 0.009, 8, 20),
      m.hoodie,
      [0, -0.235, 0],
    );
    cuff.rotation.x = Math.PI / 2;
    j[`hand${side}`] = joint(
      j[`forearm${side}`],
      `Main ${name}`,
      [0, -0.255, 0],
    );
    blob(
      j[`hand${side}`],
      "Paume",
      m.handSkin,
      [0, -0.06, 0.004],
      [0.04, 0.07, 0.019],
    );
    const fingers = blob(
      j[`hand${side}`],
      "Doigts",
      m.handSkin,
      [0, -0.125, 0.012],
      [0.036, 0.045, 0.015],
    );
    fingers.rotation.x = 0.35;
    const thumb = blob(
      j[`hand${side}`],
      "Pouce",
      m.handSkin,
      [sign * 0.035, -0.05, 0.018],
      [0.011, 0.032, 0.012],
    );
    thumb.rotation.z = sign * 0.45;

    j[`thigh${side}`] = joint(j.hips, `Cuisse ${name}`, [
      sign * 0.093,
      -0.06,
      0,
    ]);
    mesh(
      j[`thigh${side}`],
      "Jean · cuisse",
      segmentGeometry(0.083, 0.058, 0.44, 0.95),
      m.denim,
    );
    j[`shin${side}`] = joint(j[`thigh${side}`], `Jambe ${name}`, [0, -0.44, 0]);
    mesh(
      j[`shin${side}`],
      "Jean · jambe",
      segmentGeometry(0.057, 0.043, 0.41, 0.95),
      m.denim,
    );
    j[`foot${side}`] = joint(j[`shin${side}`], `Pied ${name}`, [0, -0.42, 0]);
    blob(
      j[`foot${side}`],
      "Chaussette",
      m.sock,
      [0, -0.035, 0.065],
      [0.042, 0.038, 0.115],
    );
  }
  for (const name of JOINTS)
    if (!j[name]) throw new Error(`Articulation manquante : ${name}`);

  return {
    root,
    joints: j,
    applyPose(pose, config) {
      root.position.set(
        ADAM_BASE[0] + config.adamX,
        ADAM_BASE[1],
        ADAM_BASE[2] + config.adamZ,
      );
      for (const name of JOINTS) j[name].rotation.set(...pose.joints[name]);
      face.setFace(pose.face, pose.gaze);
    },
  };
}
