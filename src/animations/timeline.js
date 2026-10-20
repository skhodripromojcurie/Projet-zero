export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
export const smooth = (start, end, time) => {
  const x = clamp((time - start) / (end - start), 0, 1);
  return x * x * (3 - 2 * x);
};

// All poses are absolute functions of time. Seeking never integrates prior frames.
export function sampleShot(time, duration = 8, intensity = 1) {
  const t = clamp(time / duration, 0, 1) * 8;
  const wake = smooth(0, 2, t);
  const alarm = smooth(2, 2.35, t) * (1 - smooth(2.6, 4, t));
  const turn = smooth(4, 6, t);
  return {
    headX: (0.22 * (1 - wake) - 0.09 * alarm) * intensity,
    headY: -0.88 * turn * intensity,
    torsoX: (0.1 * (1 - wake) - 0.035 * alarm) * intensity,
    shoulderLift: 0.035 * alarm * intensity,
    hologram: smooth(6, 6.6, t),
    phase:
      t < 2
        ? "Le réveil"
        : t < 4
          ? "Un cri au loin"
          : t < 6
            ? "Vers la fenêtre"
            : "Le système",
  };
}

export function advance(time, delta, duration) {
  return clamp(time + Math.max(0, delta), 0, duration);
}
