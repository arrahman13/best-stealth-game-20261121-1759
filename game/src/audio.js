// Sound effects for Silent Corridors: every sound is a WebAudio oscillator shaped in
// code — no audio files, no network. Created lazily on the first user gesture.
export class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  /** Open the audio context (must run inside a user gesture the first time). */
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /** One short tone: frequency, seconds, wave shape, volume. */
  blip(freq, dur, type, vol, slideTo) {
    if (this.muted || !this.ctx) return;
    try {
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      // Silence is fine: sound never blocks play.
    }
  }

  /** Soft carpet step; pitch alternates so footsteps read as walking. */
  footstep(alt) {
    this.blip(alt ? 150 : 130, 0.07, 'triangle', 0.05);
  }

  /** A guard's heavier boot, heard when one passes close by. */
  guardStep() {
    this.blip(95, 0.09, 'sine', 0.07);
  }

  /** The bright clink of a thrown coin landing on stone. */
  coinLand() {
    this.blip(2400, 0.09, 'square', 0.05);
    setTimeout(() => this.blip(1800, 0.12, 'square', 0.04), 60);
  }

  /** Artifact pocketed: a rising two-note chime. */
  pickup() {
    this.blip(660, 0.1, 'sine', 0.09);
    setTimeout(() => this.blip(990, 0.16, 'sine', 0.09), 90);
  }

  /** The alarm sting when the detection meter fills: spotted. */
  alarm() {
    this.blip(520, 0.22, 'sawtooth', 0.08, 780);
    setTimeout(() => this.blip(780, 0.22, 'sawtooth', 0.08, 520), 200);
  }

  /** Caught: a low falling buzz. */
  caught() {
    this.blip(220, 0.5, 'sawtooth', 0.09, 70);
  }

  /** Level clear: a small major arpeggio. */
  win() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.18, 'sine', 0.09), i * 110));
  }
}
