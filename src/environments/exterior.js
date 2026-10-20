import * as THREE from "three";
import { group, canvasTexture } from "./objects.js";
import { seeded } from "../characters/adam-parts.js";

// View from a third-floor window: Paris-style facade across the street,
// dawn sky, sodium street light rising from below. Painted once, offline.
function facadeTexture() {
  const random = seeded(17);
  return canvasTexture(1024, 1024, (ctx, w, h) => {
    const stone = ctx.createLinearGradient(0, 0, 0, h);
    stone.addColorStop(0, "#5f6b72");
    stone.addColorStop(0.7, "#4c565c");
    stone.addColorStop(1, "#6b5340");
    ctx.fillStyle = stone;
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) {
      ctx.fillStyle = "#00000014";
      ctx.fillRect(0, y, w, 1);
    }
    const cols = 6,
      rows = 6;
    for (let r = 0; r < rows; r++) {
      const top = 70 + r * 155;
      ctx.fillStyle = "#2a3034";
      ctx.fillRect(0, top + 118, w, 9);
      for (let c = 0; c < cols; c++) {
        const left = 40 + c * 165;
        const lit = random() < 0.12;
        ctx.fillStyle = lit
          ? "#d9955a"
          : random() < 0.5
            ? "#1b2328"
            : "#222c33";
        ctx.fillRect(left, top, 70, 110);
        if (lit) {
          ctx.fillStyle = "#f2c287aa";
          ctx.fillRect(left + 8, top + 8, 54, 40);
        }
        ctx.fillStyle = "#3a4348";
        ctx.fillRect(left + 33, top, 4, 110);
        ctx.fillRect(left, top + 48, 70, 3);
        for (let i = 0; i < 9; i++)
          ctx.fillRect(left - 6 + i * 10, top + 98, 2, 20);
      }
    }
    const glow = ctx.createLinearGradient(0, h, 0, h * 0.55);
    glow.addColorStop(0, "#ff9a4a88");
    glow.addColorStop(1, "#ff9a4a00");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  });
}

function skyTexture() {
  return canvasTexture(64, 512, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#0d1824");
    sky.addColorStop(0.45, "#26425a");
    sky.addColorStop(0.75, "#5d7a8e");
    sky.addColorStop(0.9, "#b08f74");
    sky.addColorStop(1, "#d79a62");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
  });
}

export function createExterior(room) {
  const street = group(room, "Rue extérieure");
  const painted = facadeTexture();
  const facade = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 18),
    new THREE.MeshStandardMaterial({
      map: painted,
      emissiveMap: painted,
      emissive: "#ffffff",
      emissiveIntensity: 0.32,
      roughness: 1,
    }),
  );
  facade.name = "Immeuble d’en face";
  facade.position.set(-12, 0.5, 0);
  facade.rotation.y = Math.PI / 2;
  street.add(facade);
  const roofs = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 2.4),
    new THREE.MeshBasicMaterial({ color: "#121a21", fog: false }),
  );
  roofs.name = "Toits";
  roofs.position.set(-11.9, 10.4, 0);
  roofs.rotation.y = Math.PI / 2;
  street.add(roofs);
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 40),
    new THREE.MeshBasicMaterial({ map: skyTexture(), fog: false }),
  );
  sky.name = "Ciel d’aube";
  sky.position.set(-30, 6, 0);
  sky.rotation.y = Math.PI / 2;
  street.add(sky);
  const sodium = new THREE.PointLight("#ff9548", 18, 14, 1.6);
  sodium.name = "Réverbère";
  sodium.position.set(-6.5, -3.5, 1.8);
  street.add(sodium);
  return { street, sodium };
}
