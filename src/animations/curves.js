// Pure interpolation helpers. Every value depends only on its arguments.
export const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
export const mix = (a, b, x) => a + (b - a) * x;

export const smooth = (start, end, time) => {
  const x = clamp((time - start) / (end - start), 0, 1);
  return x * x * (3 - 2 * x);
};

// Zero velocity and acceleration at both ends: no visible jolt at a key.
export const smoother = (start, end, time) => {
  const x = clamp((time - start) / (end - start), 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/** Rises then falls back to zero: fast attack, slow release. */
export function pulse(time, start, attack, release) {
  return (
    smoother(start, start + attack, time) *
    (1 - smoother(start + attack, start + attack + release, time))
  );
}

/** Keyframes [[time, value], …] interpolated with smootherstep between keys. */
export function track(keys, time) {
  if (time <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (time <= t1) {
      const [t0, v0] = keys[i - 1];
      return mix(v0, v1, smoother(t0, t1, time));
    }
  }
  return keys[keys.length - 1][1];
}

const hash = (n, seed) => {
  const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
};

/** Smooth seeded value noise in [-1, 1]. Same time and seed, same value. */
export function noise(time, seed = 0) {
  const i = Math.floor(time);
  const f = time - i;
  const u = f * f * (3 - 2 * f);
  return mix(hash(i, seed), hash(i + 1, seed), u);
}

/** Eyelid closure 0–1 for blinks at absolute times (seconds). */
export function blinks(time, moments, close = 0.07, open = 0.16) {
  let value = 0;
  for (const at of moments)
    value = Math.max(value, pulse(time, at, close, open));
  return value;
}
