import * as THREE from "three";
import { box, sphere, group, material, canvasTexture } from "./objects.js";

export function createApartment(scene) {
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
  const fabric = material("#888c88");
  const dark = material("#20282b");

  box(room, "Sol", [6.4, 0.15, 6.4], [0, -0.09, 0], material("#554c41"));
  for (let i = 0; i <= 20; i++)
    box(
      room,
      `Joint de parquet ${i}`,
      [0.012, 0.003, 6.4],
      [-3.2 + i * 0.32, -0.011, 0],
      material("#2f302b"),
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
  box(
    windowGroup,
    "Ciel matinal",
    [0.02, 6, 12],
    [-4, 0.4, 0],
    new THREE.MeshBasicMaterial({ color: "#647f91" }),
  );
  const street = group(room, "Rue extérieure");
  box(street, "Chaussée", [5, 0.15, 14], [-5.8, -0.4, 0], material("#26313a"));
  for (let i = 0; i < 4; i++) {
    const facade = group(street, `Immeuble ${i}`, [-7, 0, -5 + i * 3.5]);
    box(
      facade,
      "Façade",
      [0.3, 7, 3.2],
      [0, 2, 0],
      material(i % 2 ? "#646e73" : "#7a807c"),
    );
    for (let y = 0; y < 3; y++)
      for (const z of [-0.85, 0.85]) {
        box(
          facade,
          "Fenêtre voisine",
          [0.32, 0.9, 0.58],
          [0.04, 0.7 + y * 1.7, z],
          material("#263841", 0.4),
        );
      }
  }
  const curtains = group(room, "Rideaux");
  for (const side of [-1, 1])
    for (let i = 0; i < 7; i++) {
      box(
        curtains,
        "Pli de rideau",
        [0.06 + (i % 2) * 0.04, 2.35, 0.085],
        [-2.82 + (i % 2) * 0.035, 1.72, side * (1.11 + i * 0.065)],
        material("#56636a"),
      );
    }
  const bed = group(room, "Lit", [0.65, 0, -1.4]);
  box(bed, "Sommier", [1.65, 0.28, 2.25], [0, 0.32, 0], wood);
  box(bed, "Matelas", [1.61, 0.22, 2.2], [0, 0.57, 0], material("#b2b2a2"));
  box(bed, "Tête de lit", [1.75, 1.1, 0.12], [0, 0.6, -1.15], wood);
  const blanket = box(
    bed,
    "Couette",
    [1.64, 0.14, 1.42],
    [0, 0.74, 0.37],
    material("#4e626a"),
  );
  for (let i = 0; i < 8; i++)
    box(
      blanket,
      "Pli de couette",
      [0.012, 0.012, 1.4],
      [-0.7 + i * 0.2, 0.075, 0],
      material("#586d74"),
    );
  sphere(bed, "Oreiller", [0.64, 0.12, 0.32], [0, 0.77, -0.74], fabric);
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
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.27, 32, 1, true),
    material("#d9b986", 0.9, { side: THREE.DoubleSide }),
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
  const cold = new THREE.SpotLight("#a6d9ff", 3, 14, Math.PI / 3, 0.85, 1);
  cold.position.set(-2.8, 2.25, 0);
  cold.target.position.set(0.5, 0.3, -0.9);
  cold.castShadow = true;
  cold.shadow.mapSize.set(1024, 1024);
  cold.shadow.bias = -0.001;
  scene.add(cold, cold.target);
  const fill = new THREE.DirectionalLight("#b2c8d5", 0.65);
  fill.position.set(1, 2.5, 3);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight("#8caab9", "#34352e", 1.3));
  return {
    room,
    lamp,
    cold,
    objects: { bed, nightstand, door, window: windowGroup },
  };
}
