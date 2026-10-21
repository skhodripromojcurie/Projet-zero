import { Box3 } from "three";
import { JOINTS, FACE_KEYS } from "../animations/humanoid.js";
import { RIG_PROFILES } from "./rig-profiles.js";

/** Technical report on a loaded GLB scene, used to evaluate a candidate character. */
export function inspectModel(root, animations = []) {
  let bones = 0,
    triangles = 0;
  const boneNames = [];
  const meshes = [];
  const textures = new Map();
  const morphs = new Set();
  root.traverse((object) => {
    if (object.isBone) {
      bones += 1;
      boneNames.push(object.name);
    }
    if (!object.isMesh) return;
    const geometry = object.geometry;
    const count = geometry.index
      ? geometry.index.count
      : geometry.attributes.position.count;
    triangles += count / 3;
    meshes.push({
      name: object.name,
      vertices: geometry.attributes.position.count,
      skinned: Boolean(object.isSkinnedMesh),
    });
    for (const key of Object.keys(object.morphTargetDictionary || {}))
      morphs.add(key);
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const material of materials)
      for (const value of Object.values(material || {}))
        if (value?.isTexture && value.image?.width)
          textures.set(value.uuid, {
            name: value.name || material.name || "texture",
            width: value.image.width,
            height: value.image.height,
          });
  });
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root, true);
  const profiles = Object.fromEntries(
    Object.entries(RIG_PROFILES).map(([id, profile]) => {
      const missing = JOINTS.filter(
        (joint) => !root.getObjectByName(profile.bones[joint]),
      );
      return [
        id,
        {
          label: profile.label,
          found: JOINTS.length - missing.length,
          missing,
        },
      ];
    }),
  );
  const bestProfile = Object.entries(profiles).sort(
    (a, b) => b[1].found - a[1].found,
  )[0][0];
  const report = {
    bones,
    boneNames,
    meshes,
    triangles: Math.round(triangles),
    textures: [...textures.values()],
    morphs: [...morphs],
    arkit: FACE_KEYS.filter((key) => morphs.has(key)),
    animations: animations.map((clip) => clip.name),
    height: box.isEmpty() ? 0 : box.max.y - box.min.y,
    floor: box.isEmpty() ? 0 : box.min.y,
    profiles,
    bestProfile,
  };
  report.warnings = warnings(report);
  return report;
}

function warnings(report) {
  const list = [];
  const best = report.profiles[report.bestProfile];
  if (best.found < JOINTS.length)
    list.push(
      `Articulations non reconnues (${best.label}) : ${best.missing.join(", ")}.`,
    );
  if (report.height < 1.6 || report.height > 1.95)
    list.push(
      `Hauteur ${report.height.toFixed(2)} m : vérifier l’échelle (Adam ≈ 1,78 m).`,
    );
  if (Math.abs(report.floor) > 0.03)
    list.push(
      `Pieds à ${report.floor.toFixed(2)} m du sol : remettre l’origine au sol.`,
    );
  if (report.triangles > 60000)
    list.push(
      `${report.triangles} triangles : alléger pour le navigateur (20 000 à 40 000).`,
    );
  for (const texture of report.textures)
    if (Math.max(texture.width, texture.height) > 2048)
      list.push(
        `Texture ${texture.name} en ${texture.width}×${texture.height} : réduire à 2048 px.`,
      );
  if (!report.arkit.length)
    list.push(
      "Aucune expression aux noms ARKit : clignements et expressions inactifs.",
    );
  return list;
}
