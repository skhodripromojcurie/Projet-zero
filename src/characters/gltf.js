import { AnimationMixer, Euler, LoopRepeat, Quaternion, Vector3 } from "three";
import { publicAssetUrl } from "../assets/paths.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { JOINTS, FACE_KEYS } from "../animations/humanoid.js";
import { RIG_PROFILES } from "./rig-profiles.js";
import { ADAM_BASE } from "./adam.js";

const euler = new Euler();
const delta = new Quaternion();
const local = new Quaternion();

/** Rest data so a character-frame rotation can be replayed on any bone axes. */
function bindBone(bone, rootInverse) {
  const world = new Quaternion();
  bone.updateWorldMatrix(true, false);
  bone.getWorldQuaternion(world);
  world.premultiply(rootInverse);
  return {
    bone,
    restLocal: bone.quaternion.clone(),
    world,
    worldInverse: world.clone().invert(),
  };
}

// Express `rotation` (character frame) in the bone's own rest frame.
function toBoneFrame(binding, rotation, out) {
  return out
    .copy(binding.worldInverse)
    .multiply(rotation)
    .multiply(binding.world);
}

function setFromEuler(target, [x, y, z]) {
  return target.setFromEuler(euler.set(x, y, z, "XYZ"));
}

/**
 * Adapter for licensed rigged GLB characters. Same contract as the procedural
 * rig: root + applyPose(pose, config, time). Two driving modes:
 * - "clips": the shot's semantic clips (pose.clips) mapped to GLB clip names,
 *   sampled at absolute times and blended by weight, plus breathing overlay;
 * - "joints": no mapped clip, the normalised pose drives the mapped bones.
 * Facial channels drive morph targets with ARKit names when present.
 */
export async function loadRiggedCharacter(
  url,
  { scale = 1, profile = "projet-zero", clips = {}, morphAliases = {} } = {},
) {
  const gltf = await new GLTFLoader().loadAsync(publicAssetUrl(url));
  const root = gltf.scene;
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  const rig = RIG_PROFILES[profile];
  if (!rig) throw new Error(`Profil de squelette inconnu : ${profile}`);
  const rootInverse = root.getWorldQuaternion(new Quaternion()).invert();
  const find = (name) => (name ? root.getObjectByName(name) : null);

  // Bring the bind pose to the reference rest pose, parents first.
  for (const joint of JOINTS) {
    const bone = find(rig.bones[joint]);
    const rest = rig.rest?.[joint];
    if (!bone || !rest) continue;
    const binding = bindBone(bone, rootInverse);
    setFromEuler(delta, rest).invert();
    bone.quaternion.multiply(toBoneFrame(binding, delta, local));
  }
  root.updateMatrixWorld(true);
  const bones = {};
  for (const joint of JOINTS) {
    const bone = find(rig.bones[joint]);
    if (bone) bones[joint] = bindBone(bone, rootInverse);
  }
  const eyes = (rig.eyes || [])
    .map(find)
    .filter(Boolean)
    .map((eye) => bindBone(eye, rootInverse));
  const hips =
    bones.hips?.bone.getWorldPosition(new Vector3()) ?? new Vector3();
  hips.sub(root.position);

  const faces = [];
  root.traverse((object) => {
    if (object.morphTargetDictionary && object.morphTargetInfluences)
      faces.push(object);
  });
  const morphs = new Set(
    faces.flatMap((mesh) => Object.keys(mesh.morphTargetDictionary)),
  );

  const mixer = new AnimationMixer(root);
  const actions = new Map();
  for (const [id, name] of Object.entries(clips)) {
    const clip = gltf.animations.find((item) => item.name === name);
    if (!clip) continue;
    const action = mixer.clipAction(clip);
    action.setLoop(LoopRepeat, Infinity);
    action.play();
    action.setEffectiveWeight(0);
    actions.set(id, action);
  }
  const mode = actions.size ? "clips" : "joints";

  return {
    root,
    report: {
      mode,
      profile: rig.label,
      joints: Object.keys(bones),
      clips: [...actions.keys()],
      morphs: FACE_KEYS.filter((key) => morphs.has(morphAliases[key] ?? key)),
      animations: gltf.animations.map((clip) => clip.name),
    },
    applyPose(pose, config) {
      root.position.set(
        ADAM_BASE[0] + config.adamX - hips.x,
        ADAM_BASE[1] - hips.y,
        ADAM_BASE[2] + config.adamZ - hips.z,
      );
      // Start every frame from the rest pose so nothing carries over.
      for (const binding of Object.values(bones))
        binding.bone.quaternion.copy(binding.restLocal);
      if (mode === "clips") {
        for (const action of actions.values()) action.setEffectiveWeight(0);
        for (const { id, weight, time } of pose.clips) {
          const action = actions.get(id);
          if (!action) continue;
          action.setEffectiveWeight(weight);
          action.time = time % action.getClip().duration;
        }
        // Zero delta: applies the times set above; nothing accumulates.
        mixer.update(0);
        for (const [joint, rotation] of Object.entries(pose.overlay || {})) {
          const binding = bones[joint];
          if (!binding) continue;
          binding.bone.quaternion.multiply(
            toBoneFrame(binding, setFromEuler(delta, rotation), local),
          );
        }
      } else {
        for (const [joint, binding] of Object.entries(bones)) {
          setFromEuler(delta, pose.joints[joint]);
          binding.bone.quaternion
            .copy(binding.restLocal)
            .multiply(toBoneFrame(binding, delta, local));
        }
      }
      setFromEuler(delta, [-pose.gaze.pitch, pose.gaze.yaw, 0]);
      for (const eye of eyes)
        eye.bone.quaternion
          .copy(eye.restLocal)
          .multiply(toBoneFrame(eye, delta, local));
      for (const mesh of faces)
        for (const key of FACE_KEYS) {
          const index = mesh.morphTargetDictionary[morphAliases[key] ?? key];
          if (index !== undefined)
            mesh.morphTargetInfluences[index] = pose.face[key];
        }
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
}
