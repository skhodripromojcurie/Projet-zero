// Original synthesized placeholder sound; no sample, external download or API.
export function createAudio() {
  let context,
    enabled = false;
  const active = new Set();
  return {
    async toggle() {
      if (!context) context = new AudioContext();
      await context.resume();
      enabled = !enabled;
      if (!enabled) this.stop();
      return enabled;
    },
    scream() {
      if (!enabled || !context) return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const t = context.currentTime;
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(370, t);
      oscillator.frequency.linearRampToValueAtTime(630, t + 0.22);
      oscillator.frequency.exponentialRampToValueAtTime(220, t + 1.3);
      filter.type = "lowpass";
      filter.frequency.value = 1300;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.035, t + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(t + 1.35);
      active.add(oscillator);
      oscillator.onended = () => {
        active.delete(oscillator);
        oscillator.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    },
    stop() {
      for (const oscillator of active) {
        try {
          oscillator.stop();
        } catch {
          /* already ended */
        }
      }
      active.clear();
    },
  };
}
