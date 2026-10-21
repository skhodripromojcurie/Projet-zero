import { sampleA01 } from "./a01.js";
export { clamp, smooth } from "./curves.js";
import { clamp } from "./curves.js";

// All poses are absolute functions of time. Seeking never integrates prior frames.
export function sampleShot(time, duration = 8, intensity = 1) {
  return sampleA01(time, duration, intensity);
}

export function advance(time, delta, duration) {
  return clamp(time + Math.max(0, delta), 0, duration);
}
