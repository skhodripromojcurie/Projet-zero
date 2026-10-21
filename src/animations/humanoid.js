// Normalised humanoid pose shared by the procedural rig and GLB adapters.
// Joint values are local Euler angles [x, y, z] in radians, relative to a
// standing rest pose: +y up the spine, arms hanging, the character facing +z.
export const JOINTS = [
  "hips",
  "spine",
  "chest",
  "neck",
  "head",
  "clavicleL",
  "clavicleR",
  "upperArmL",
  "upperArmR",
  "forearmL",
  "forearmR",
  "handL",
  "handR",
  "thighL",
  "thighR",
  "shinL",
  "shinR",
  "footL",
  "footR",
];

// Facial channels use the ARKit blendshape names, a common export target
// for Blender shape keys. Values range from 0 to 1.
export const FACE_KEYS = [
  "eyeBlinkLeft",
  "eyeBlinkRight",
  "eyeWideLeft",
  "eyeWideRight",
  "browInnerUp",
  "browDownLeft",
  "browDownRight",
  "jawOpen",
  "mouthFrownLeft",
  "mouthFrownRight",
];

export function createPose() {
  return {
    joints: Object.fromEntries(JOINTS.map((name) => [name, [0, 0, 0]])),
    face: Object.fromEntries(FACE_KEYS.map((name) => [name, 0])),
    gaze: { yaw: 0, pitch: 0 },
    breath: 0,
    overlay: {},
    clips: [],
  };
}
