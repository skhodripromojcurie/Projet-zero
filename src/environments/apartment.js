import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { box, sphere, group, material, canvasTexture } from "./objects.js";
import { createExterior } from "./exterior.js";
import { createLightShaft } from "./atmosphere.js";
import {
  parquetTexture,
  dressBed,
  dressNightstand,
  furnishRoom,
  curtain,
} from "./details.js";

export function createApartment(scene) {
  RectAreaLightUniformsLib.init();
  const room = group(scene, "Appartement d’Adam");
  const plasterTexture = canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#bbbcb7";
    ctx.fillRect(0, 0, w, h);
    // Seeded surface variation, generated once; never affects animation.
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = i % 2 ? "#b4b7b3" : "#c0c2bd";
      ctx.fillRect((i * 71) % w, (i * 137) % h, 1 + (i % 3), 2);
    }
    ctx.strokeStyle = "#a6aaa5";
    ctx.beginPath();
    ctx.moveTo(184, 0);
    ctx.lineTo(178, 36);
    ctx.lineTo(186, 51);
    ctx.stroke();
  });
  plasterTexture.wrapS = plasterTexture.wrapT = THREE.RepeatWrapping;
  plasterTexture.repeat.set(2, 2);
  const plaster = material("#c5c7c2", 0.95, { map: plasterTexture });
  const wood = material("#40352d");
  const trim = material("#868d8a");
  const dark = material("#20282b");

  box(
    room,
    "Sol",
    [6.4, 0.15, 6.4],
    [0, -0.09, 0],
    material("#ffffff", 0.72, { map: parquetTexture() }),
  );
  box(room, "Plafond", [6.4, 0.12, 6.4], [0, 3.26, 0], plaster);
  box(room, "Mur du lit", [6.4, 3.2, 0.18], [0, 1.6, -3.1], plaster);
  // Window opening is actual geometry, not a bright rectangle over a wall.
  box(room, "Mur fenêtre — bas", [0.18, 0.9, 6.4], [-3.1, 0.45, 0], plaster);
  box(room, "Mur fenêtre — haut", [0.18, 0.65, 6.4], [-3.1, 2.875, 0], plaster);
  box(
    room,
    "Mur fenêtre — gauche",
    [0.18, 1.65, 2.1],
    [-3.1, 1.725, -2.15],
    plaster,
  );
  box(
    room,
    "Mur fenêtre — droite",
    [0.18, 1.65, 2.1],
    [-3.1, 1.725, 2.15],
    plaster,
  );
  box(room, "Mur porte — gauche", [1.5, 3.2, 0.16], [2.4, 1.6, 3.1], plaster);
  box(
    room,
    "Mur porte — droite",
    [3.55, 3.2, 0.16],
    [-1.425, 1.6, 3.1],
    plaster,
  );
  box(room, "Linteau porte", [1.35, 0.9, 0.16], [0.975, 2.75, 3.1], plaster);
  box(room, "Plinthe fond", [6.3, 0.1, 0.035], [0, 0.05, -2.99], trim);
  box(room, "Plinthe fenêtre", [0.035, 0.1, 6.2], [-2.99, 0.05, 0], trim);
  const windowGroup = group(room, "Fenêtre", [-3.04, 1.72, 0]);
  for (const z of [-1.11, 0, 1.11])
    box(windowGroup, "Montant", [0.16, 1.72, 0.065], [0, 0, z], trim);
  for (const y of [-0.85, 0, 0.85])
    box(windowGroup, "Traverse", [0.16, 0.06, 2.3], [0, y, 0], trim);
  box(
    windowGroup,
    "Appui de fenêtre",
    [0.45, 0.08, 2.5],
    [0.1, -0.88, 0],
    material("#a4a69b"),
  );
  const exterior = createExterior(room);
  const curtainMat = material("#4d5a61", 0.95, { side: THREE.DoubleSide });
  curtain(room, "Rideau gauche", -1.08, -1.62, curtainMat);
  curtain(room, "Rideau droit", 1.08, 1.55, curtainMat);
  const bed = group(room, "Lit", [0.65, 0, -1.4]);
  box(bed, "Sommier", [1.65, 0.28, 2.25], [0, 0.32, 0], wood);
  box(bed, "Matelas", [1.61, 0.22, 2.2], [0, 0.57, 0], material("#b2b2a2"));
  box(bed, "Tête de lit", [1.75, 1.1, 0.12], [0, 0.6, -1.15], wood);
  dressBed(bed);
  const nightstand = group(room, "Table de chevet", [-0.72, 0, -2.12]);
  box(nightstand, "Caisson", [0.65, 0.6, 0.56], [0, 0.3, 0], wood);
  box(
    nightstand,
    "Tiroir",
    [0.56, 0.22, 0.03],
    [0, 0.42, 0.295],
    material("#61503f"),
  );
  box(nightstand, "Poignée", [0.15, 0.025, 0.04], [0, 0.42, 0.325], trim);
  const digits = canvasTexture(512, 192, (ctx) => {
    ctx.fillStyle = "#101a1a";
    ctx.fillRect(0, 0, 512, 192);
    ctx.fillStyle = "#eda66d";
    ctx.font = "120px monospace";
    ctx.textAlign = "center";
    ctx.fillText("06:42", 256, 138);
  });
  box(nightstand, "Réveil", [0.36, 0.17, 0.16], [0, 0.71, 0.09], dark);
  box(
    nightstand,
    "Affichage 06:42",
    [0.33, 0.125, 0.004],
    [0, 0.72, 0.173],
    new THREE.MeshBasicMaterial({ map: digits }),
  );
  box(
    nightstand,
    "Pied de lampe",
    [0.09, 0.4, 0.09],
    [-0.2, 0.82, -0.13],
    material("#45463c"),
  );
  dressNightstand(nightstand);
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.27, 32, 1, true),
    material("#d9b986", 0.9, {
      side: THREE.DoubleSide,
      emissive: "#ffb169",
      emissiveIntensity: 0.6,
    }),
  );
  shade.position.set(-0.2, 1.04, -0.13);
  nightstand.add(shade);
  const lamp = new THREE.PointLight("#ffc58a", 5, 4, 2);
  lamp.position.set(-0.92, 0.97, -2.25);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(512, 512);
  room.add(lamp);
  const door = group(room, "Porte", [0.97, 0, 3.03]);
  box(
    door,
    "Porte fermée",
    [1.18, 2.3, 0.07],
    [0, 1.15, 0],
    material("#657170"),
  );
  for (const x of [-0.65, 0.65])
    box(door, "Chambranle", [0.08, 2.43, 0.15], [x, 1.2, 0], trim);
  box(door, "Haut du cadre", [1.37, 0.08, 0.15], [0, 2.42, 0], trim);
  box(
    door,
    "Poignée",
    [0.17, 0.04, 0.07],
    [-0.38, 1.04, -0.08],
    material("#b4ada0", 0.3),
  );
  box(room, "Commode", [1.3, 0.9, 0.52], [2.35, 0.45, -2.52], wood);
  for (let i = 0; i < 3; i++) {
    box(
      room,
      "Façade de tiroir",
      [1.2, 0.24, 0.025],
      [2.35, 0.18 + i * 0.28, -2.24],
      material("#635344"),
    );
    box(
      room,
      "Bouton tiroir",
      [0.12, 0.035, 0.06],
      [2.35, 0.18 + i * 0.28, -2.21],
      trim,
    );
  }
  box(
    room,
    "Tapis",
    [2.1, 0.012, 1.7],
    [-0.1, 0.004, 0.4],
    material("#48565a"),
  );
  box(
    room,
    "Livre",
    [0.28, 0.045, 0.2],
    [2.05, 0.94, -2.5],
    material("#9d8c74"),
  );
  // Dawn key light through the window: hard shadows from a spot, soft
  // wrap from a rect light the size of the opening.
  furnishRoom(room);
  const cold = new THREE.SpotLight("#7fb0e0", 3, 14, Math.PI / 3.2, 0.9, 1);
  cold.position.set(-3.6, 2.6, 0.2);
  cold.target.position.set(0.5, 0.4, -1.1);
  cold.castShadow = true;
  cold.shadow.mapSize.set(1024, 1024);
  cold.shadow.bias = -0.0008;
  cold.shadow.normalBias = 0.02;
  cold.shadow.radius = 4;
  scene.add(cold, cold.target);
  const windowGlow = new THREE.RectAreaLight("#8fb4d6", 1.1, 2.2, 1.6);
  windowGlow.position.set(-2.97, 1.72, 0);
  windowGlow.lookAt(0, 1.4, 0);
  scene.add(windowGlow);
  const bulb = sphere(
    nightstand,
    "Ampoule",
    [0.035, 0.035, 0.035],
    [-0.2, 0.98, -0.13],
    new THREE.MeshBasicMaterial({ color: "#ffd7a8" }),
  );
  bulb.castShadow = false;
  const clockGlow = new THREE.PointLight("#ff9a55", 0.12, 0.8, 2);
  clockGlow.position.set(0, 0.75, 0.3);
  nightstand.add(clockGlow);
  const fill = new THREE.DirectionalLight("#7d97ad", 0.12);
  fill.position.set(1, 2.5, 3);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight("#6f8799", "#2a2620", 0.28));
  const shaft = createLightShaft(scene, {
    from: [-3.0, 1.72, 0],
    size: [2.1, 1.6],
    direction: [3.3, -1.95, -1.1],
    length: 4.2,
  });
  return {
    room,
    lamp,
    cold,
    windowGlow,
    shaft,
    sodium: exterior.sodium,
    objects: { bed, nightstand, door, window: windowGroup },
  };
}
