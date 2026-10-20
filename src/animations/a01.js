import { createPose } from "./humanoid.js";
import {
  clamp,
  mix,
  smooth,
  smoother,
  pulse,
  track,
  noise,
  blinks,
} from "./curves.js";

// Plan A01 · Le réveil. Beats are written on an 8-beat grid scaled to the
// shot duration; breathing, blinks and micro-motion run on absolute seconds.
// The sit-up is staging and always happens; `intensity` scales the acting.
const BLINKS = [1.55, 2.8, 3.95, 4.3, 5.95, 7.15];
export const A01_CLIPS = [
  { id: "sleep", start: 0, end: 1.1 },
  { id: "wake_sit_up", start: 0.7, end: 2.35 },
  { id: "startle", start: 2.05, end: 4.1 },
  { id: "look_window", start: 3.9, end: 6.1 },
  { id: "worried_idle", start: 5.7, end: 8 },
];
const FADE = 0.35;

export function phaseAt(t) {
  if (t < 2) return "Le réveil";
  if (t < 4) return "Un cri au loin";
  if (t < 6) return "Vers la fenêtre";
  return "Le système";
}

function clipWeights(t, seconds) {
  const clips = A01_CLIPS.map(({ id, start, end }) => ({
    id,
    weight:
      (start <= 0 ? 1 : smooth(start, start + FADE, t)) *
      (end >= 8 ? 1 : 1 - smooth(end - FADE, end, t)),
    time: Math.max(0, (t - start) * seconds),
  }));
  const total = clips.reduce((sum, clip) => sum + clip.weight, 0) || 1;
  for (const clip of clips) clip.weight /= total;
  return clips.filter((clip) => clip.weight > 0);
}

export function sampleA01(time, duration = 8, intensity = 1) {
  const t = clamp(time / duration, 0, 1) * 8;
  const abs = clamp(time, 0, duration);
  const seconds = duration / 8;
  const k = intensity;
  const pose = createPose();
  const j = pose.joints;
  const f = pose.face;

  // 0–2 · waking up and sitting up against the pillow.
  const rise = smoother(0.75, 2.05, t);
  const curl = Math.sin(Math.PI * rise);
  const settle = pulse(t, 1.9, 0.25, 0.6);
  j.hips[0] = mix(-1.34, -0.1, rise) + 0.05 * settle;
  j.spine[0] = 0.16 * curl;
  j.chest[0] = 0.12 * curl + 0.04 * rise;
  j.neck[0] = mix(0.32, 0.06, rise) + 0.12 * curl;
  j.head[1] = -0.32 * (1 - smoother(0.4, 1.4, t));
  j.head[2] = 0.08 * (1 - smoother(0.4, 1.4, t));
  // Legs stay put under the duvet: thighs cancel the hips rotation.
  const legPitch = -Math.PI / 2 + 0.06 + 0.1 * rise;
  for (const side of ["L", "R"]) {
    j[`thigh${side}`][0] = legPitch - j.hips[0];
    j[`shin${side}`][0] = 0.12 * rise;
    j[`foot${side}`][0] = -0.25;
  }
  // Arms push on the mattress, then hands come to rest on the duvet.
  const push = pulse(t, 0.8, 0.6, 0.8);
  for (const [side, sign] of [
    ["L", 1],
    ["R", -1],
  ]) {
    j[`upperArm${side}`][0] = 0.4 * push - 0.32 * smoother(1.7, 2.6, t);
    j[`upperArm${side}`][2] = sign * (0.12 + 0.18 * push);
    const rest = smoother(1.6, 2.6, t);
    j[`forearm${side}`][0] = -0.3 - 0.38 * rest + 0.25 * push;
    j[`forearm${side}`][2] = -sign * 0.32 * rest;
    j[`hand${side}`][0] = 0.15 * push + 0.2 * rest;
    j[`hand${side}`][1] = sign * 1.35 * rest;
  }

  // 2–4 · a scream outside: startle, then listening.
  const startle = pulse(t, 2.1, 0.16, 1.6) * k;
  const tension = smoother(2.2, 3.1, t) * k;
  j.chest[0] -= 0.09 * startle;
  j.head[0] -= 0.11 * startle;
  j.clavicleL[2] += 0.13 * startle + 0.04 * tension;
  j.clavicleR[2] -= 0.13 * startle + 0.04 * tension;
  j.forearmL[0] -= 0.22 * startle;
  j.forearmR[0] -= 0.22 * startle;
  const listen = tension * (1 - smoother(4.0, 4.6, t));
  j.head[2] += 0.07 * listen;
  j.head[0] += 0.04 * listen;

  // 4–6 · eyes lead, the head follows, the chest follows the head.
  const turnHead = smoother(4.15, 5.7, t) * k;
  const turnChest = smoother(4.4, 5.95, t) * k;
  j.head[1] += -0.72 * turnHead;
  j.head[0] -= 0.05 * turnHead;
  j.neck[1] += -0.12 * turnHead;
  j.chest[1] += -0.17 * turnChest;
  j.spine[1] += -0.08 * turnChest;
  j.clavicleR[2] -= 0.03 * turnChest;
  pose.gaze.yaw =
    track(
      [
        [2.6, 0],
        [2.85, 0.12],
        [3.3, 0.12],
        [3.45, -0.08],
        [3.9, 0],
      ],
      t,
    ) *
      k +
    (-0.45 * smoother(4.0, 4.32, t) + 0.25 * smoother(4.6, 5.8, t)) * k;
  pose.gaze.pitch = 0.05 * startle + 0.04 * turnHead;

  // 6–8 · still and worried; the system appears.
  const hologram = smooth(6, 6.6, t);
  const notice = pulse(t, 6.15, 0.2, 1.2) * k;

  // Breathing: calm sleep, then short breaths after the scream.
  const panic = clamp(
    smoother(2.1, 2.5, t) - 0.45 * smoother(3.2, 5.5, t),
    0,
    1,
  );
  const breath =
    mix(
      Math.sin((abs * 2 * Math.PI) / 4.4),
      Math.sin((abs * 2 * Math.PI) / 2.3 + 1.1),
      panic,
    ) *
    (0.6 + 0.6 * panic);
  pose.breath = breath;
  j.clavicleL[2] += 0.012 * breath;
  j.clavicleR[2] -= 0.012 * breath;

  // Micro-motion, seeded: never random from one frame to the next.
  // Breathing and micro-motion also form the overlay added on top of GLB clips.
  const awake = smoother(0.6, 1.5, t) * k;
  pose.overlay = {
    chest: [-0.018 * breath, 0, 0.008 * noise(abs * 0.5, 3) * awake],
    head: [
      0.008 * breath + 0.014 * noise(abs * 0.8, 1) * awake,
      0.018 * noise(abs * 0.6, 2) * awake,
      0,
    ],
  };
  for (const [name, [x, y, z]] of Object.entries(pose.overlay)) {
    j[name][0] += x;
    j[name][1] += y;
    j[name][2] += z;
  }

  // Face, on ARKit-named channels.
  const asleep = 1 - smoother(0.35, 1.05, t);
  const flutter = 0.7 * pulse(t, 0.72, 0.08, 0.25);
  const heavy = 0.22 * (1 - smoother(1.2, 3, t)) * (1 - asleep);
  const blink = blinks(
    abs,
    BLINKS.map((b) => b * seconds),
  );
  const lids = clamp(Math.max(asleep, flutter, blink) + heavy, 0, 1);
  const wide = clamp(startle + 0.35 * notice, 0, 1) * (1 - lids);
  f.eyeBlinkLeft = f.eyeBlinkRight = lids;
  f.eyeWideLeft = f.eyeWideRight = wide;
  f.browInnerUp = clamp(0.9 * startle + 0.45 * tension + 0.2 * notice, 0, 1);
  f.browDownLeft = f.browDownRight = clamp(
    0.25 * tension * (1 - startle),
    0,
    1,
  );
  f.jawOpen = clamp(0.28 * startle + 0.06 * panic * k, 0, 1);
  f.mouthFrownLeft = f.mouthFrownRight = clamp(0.35 * tension, 0, 1);

  pose.clips = clipWeights(t, seconds);
  pose.hologram = hologram;
  pose.phase = phaseAt(t);
  return pose;
}
