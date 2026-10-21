import * as THREE from "three";
import { seeded } from "../characters/adam-parts.js";

// Cheap volumetric look: an additive light shaft from the window and dust
// motes drifting inside it. Both are driven by the shot time only.
export function createLightShaft(scene, { from, size, direction, length }) {
  const dir = new THREE.Vector3(...direction).normalize();
  const geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  const p = geometry.attributes.position;
  const along = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const a = p.getX(i) + 0.5;
    along[i] = a;
    const v = new THREE.Vector3(...from)
      .add(new THREE.Vector3(0, p.getY(i) * size[1], p.getZ(i) * size[0]))
      .addScaledVector(dir, a * length);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.setAttribute("along", new THREE.BufferAttribute(along, 1));
  geometry.computeVertexNormals();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color("#9cc8ee") },
      uStrength: { value: 0.07 },
    },
    vertexShader: `attribute float along; varying float vAlong; varying vec3 vN; varying vec3 vView;
      void main() {
        vAlong = along;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor; uniform float uStrength; varying float vAlong; varying vec3 vN; varying vec3 vView;
      void main() {
        float facing = pow(abs(dot(normalize(vN), vView)), 2.0);
        float fade = pow(1.0 - vAlong, 1.6) * smoothstep(0.0, 0.08, vAlong);
        gl_FragColor = vec4(uColor * uStrength * facing * fade, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const shaft = new THREE.Mesh(geometry, material);
  shaft.name = "Faisceau de l’aube";
  shaft.renderOrder = 2;
  scene.add(shaft);

  const random = seeded(41);
  const count = 420;
  const seeds = new Float32Array(count * 4);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = random() * 0.85;
    const v = new THREE.Vector3(...from)
      .add(
        new THREE.Vector3(
          0,
          (random() - 0.5) * size[1],
          (random() - 0.5) * size[0],
        ),
      )
      .addScaledVector(dir, a * length);
    positions.set([v.x, v.y, v.z], i * 3);
    seeds.set([random(), random(), random(), a], i * 4);
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );
  dustGeometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 4));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uStrength: { value: 1 } },
      vertexShader: `attribute vec4 seed; uniform float uTime; varying float vFade;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * (0.11 + seed.x * 0.1) + seed.y * 6.28) * 0.06;
          p.y += sin(uTime * (0.07 + seed.z * 0.08) + seed.x * 6.28) * 0.09 - 0.012 * uTime * seed.z;
          p.z += cos(uTime * (0.09 + seed.y * 0.1) + seed.z * 6.28) * 0.06;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = min(3.0, (1.2 + seed.x * 2.2) * (2.2 / -mv.z));
          vFade = (1.0 - seed.w) * (0.4 + 0.6 * seed.y);
        }`,
      fragmentShader: `uniform float uStrength; varying float vFade;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vec3(0.85, 0.92, 1.0) * vFade * uStrength * smoothstep(0.5, 0.0, d), 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  dust.name = "Poussière en suspension";
  scene.add(dust);
  return {
    update(time, coldLight) {
      const k = coldLight / 3;
      material.uniforms.uStrength.value = 0.07 * k;
      dust.material.uniforms.uTime.value = time;
      dust.material.uniforms.uStrength.value = 0.55 * k;
    },
  };
}
