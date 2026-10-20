// Bone-name maps from the normalised humanoid joints to rigged GLB skeletons.
// Limbs bound in T-pose or A-pose are straightened automatically by the
// loader (`alignLimbs`, on by default). `rest` adds explicit corrections:
// Euler angles in the character frame, applied before the alignment.
const sides = (pattern) =>
  Object.fromEntries(
    [
      "clavicle",
      "upperArm",
      "forearm",
      "hand",
      "thigh",
      "shin",
      "foot",
    ].flatMap((joint) => [
      [`${joint}L`, pattern(joint, "L")],
      [`${joint}R`, pattern(joint, "R")],
    ]),
  );

export const RIG_PROFILES = {
  // Bones named exactly like the joints: target of the Lot 2 Blender export.
  "projet-zero": {
    label: "Projet Zéro (noms normalisés)",
    bones: {
      hips: "hips",
      spine: "spine",
      chest: "chest",
      neck: "neck",
      head: "head",
      ...sides((joint, side) => `${joint}${side}`),
    },
    eyes: ["eyeL", "eyeR"],
    rest: {},
  },
  // Mixamo auto-rig; GLTFLoader strips the ":" from "mixamorig:Hips".
  mixamo: {
    label: "Mixamo",
    bones: {
      hips: "mixamorigHips",
      spine: "mixamorigSpine",
      chest: "mixamorigSpine2",
      neck: "mixamorigNeck",
      head: "mixamorigHead",
      ...sides((joint, side) => {
        const name = {
          clavicle: "Shoulder",
          upperArm: "Arm",
          forearm: "ForeArm",
          hand: "Hand",
          thigh: "UpLeg",
          shin: "Leg",
          foot: "Foot",
        }[joint];
        return `mixamorig${side === "L" ? "Left" : "Right"}${name}`;
      }),
    },
    eyes: ["mixamorigLeftEye", "mixamorigRightEye"],
    // T-pose bind: the arms are straightened by alignLimbs.
    rest: {},
  },
  // MPFB 2 "game engine" skeleton (A-pose bind). Checked on a Blender export
  // of the test mannequin; to confirm on Adam's real MPFB export.
  mpfb: {
    label: "MPFB 2 · game engine",
    bones: {
      hips: "pelvis",
      spine: "spine_01",
      chest: "spine_03",
      neck: "neck_01",
      head: "head",
      ...sides((joint, side) => {
        const name = {
          clavicle: "clavicle",
          upperArm: "upperarm",
          forearm: "lowerarm",
          hand: "hand",
          thigh: "thigh",
          shin: "calf",
          foot: "foot",
        }[joint];
        return `${name}_${side.toLowerCase()}`;
      }),
    },
    eyes: ["eye_l", "eye_r"],
    rest: {},
  },
};
