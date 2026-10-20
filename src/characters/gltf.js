import { AnimationMixer } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/** Adapter for future licensed rigged assets. Not wired to the provisional UI.
 * Map shot phases to clips supplied by the model. Facial retargeting stays asset-specific.
 * Model scale/orientation and licences must be checked before library registration.
 */
export async function loadRiggedCharacter(url, { scale = 1, clips = {} } = {}) {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  root.scale.setScalar(scale);
  const mixer = new AnimationMixer(root);
  return {
    root,
    applyPose(pose, config, time) {
      root.position.set(-0.3 + config.adamX, 0, -1.08 + config.adamZ);
      const name = clips[pose.phase];
      mixer.stopAllAction();
      const clip = gltf.animations.find((item) => item.name === name);
      if (clip) {
        mixer.clipAction(clip).play();
        mixer.setTime(time);
      }
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
}
