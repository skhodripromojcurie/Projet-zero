import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

// Basse: direct render. Standard: bloom + grade. Haute: adds ambient occlusion
// and larger shadow maps. Pick Basse on integrated GPUs or phones.
export const QUALITY_PRESETS = {
  basse: { post: false, ao: false, shadow: 512, pixelRatio: 1 },
  standard: { post: true, ao: false, shadow: 1024, pixelRatio: 1.5 },
  haute: { post: true, ao: true, shadow: 2048, pixelRatio: 1.75 },
};

// Display-referred grade: split toning (cold shadows, warm highlights),
// soft contrast, vignette and a film grain seeded by the shot time.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.045 },
    uVignette: { value: 0.42 },
  },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uGrain; uniform float uVignette;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadows = vec3(0.86, 0.97, 1.1);
      vec3 highlights = vec3(1.06, 1.0, 0.92);
      c *= mix(shadows, highlights, smoothstep(0.15, 0.75, l));
      c = mix(c, vec3(l), 0.12);
      c = c * c * (3.0 - 2.0 * c) * 0.35 + c * 0.65;
      vec2 d = vUv - 0.5;
      d.x *= 0.62;
      c *= 1.0 - uVignette * smoothstep(0.18, 0.62, length(d));
      float n = hash(floor(gl_FragCoord.xy) + floor(uTime * 24.0) * 1.37) - 0.5;
      c += n * uGrain * (1.0 - l * 0.6);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  return renderer;
}

export function createPipeline(renderer, scene, camera) {
  let quality = null,
    composer = null,
    grade = null,
    width = 1,
    height = 1;
  const build = () => {
    composer?.dispose();
    composer = null;
    const preset = QUALITY_PRESETS[quality];
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, preset.pixelRatio),
    );
    renderer.setSize(width, height, false);
    scene.traverse((object) => {
      if (object.isLight && object.castShadow) {
        object.shadow.mapSize.set(preset.shadow, preset.shadow);
        object.shadow.map?.dispose();
        object.shadow.map = null;
      }
    });
    if (!preset.post) return;
    const target = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    composer = new EffectComposer(renderer, target);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(width, height);
    composer.addPass(new RenderPass(scene, camera));
    if (preset.ao) {
      const ao = new GTAOPass(scene, camera, width, height);
      ao.blendIntensity = 0.75;
      composer.addPass(ao);
    }
    composer.addPass(
      new UnrealBloomPass(new THREE.Vector2(width, height), 0.32, 0.55, 0.82),
    );
    composer.addPass(new OutputPass());
    grade = new ShaderPass(GradeShader);
    composer.addPass(grade);
  };
  return {
    setQuality(next) {
      if (next === quality) return;
      quality = QUALITY_PRESETS[next] ? next : "standard";
      build();
    },
    setSize(w, h) {
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      composer?.setSize(w, h);
    },
    render(time) {
      if (!composer) return renderer.render(scene, camera);
      grade.uniforms.uTime.value = time;
      composer.render();
    },
    dispose() {
      composer?.dispose();
    },
  };
}
