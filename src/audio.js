// Fish Tankfully (缸好有鱼) — Procedural WebAudio Soundscape & Foley Synthesizer

export class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lofiPlaying = false;
    this.lofiInterval = null;
  }

  ensureContext() {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  playPop(freq = 540, duration = 0.08) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.65, now + duration);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playScrub() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(920 + Math.random() * 280, now);
    osc.frequency.linearRampToValueAtTime(1280 + Math.random() * 200, now + 0.05);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  playSplash() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.22;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.07));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(950, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.22);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
  }

  playShutter() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.playPop(1400, 0.035);
    setTimeout(() => this.playPop(900, 0.04), 45);
  }

  playCoinChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const notes = [659.25, 880, 1174.66];
    notes.forEach((n, i) => {
      setTimeout(() => this.playPop(n, 0.12), i * 55);
    });
  }

  toggleLofiMusic() {
    this.lofiPlaying = !this.lofiPlaying;
    if (this.lofiInterval) {
      clearInterval(this.lofiInterval);
      this.lofiInterval = null;
    }
    if (this.lofiPlaying) {
      const chords = [
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
        [220.0, 261.63, 329.63, 392.0],  // Am7
        [174.61, 220.0, 261.63, 349.23], // Fmaj7
        [196.0, 246.94, 293.66, 392.0]   // G6
      ];
      let step = 0;
      const playChord = () => {
        if (!this.lofiPlaying || this.muted) return;
        const ctx = this.ensureContext();
        if (!ctx) return;
        const chord = chords[step % chords.length];
        step += 1;
        const now = ctx.currentTime;
        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.06);
          gain.gain.setValueAtTime(0.001, now + i * 0.06);
          gain.gain.linearRampToValueAtTime(0.025, now + i * 0.06 + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.2);
          osc.connect(gain).connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + 2.3);
        });
      };
      playChord();
      this.lofiInterval = setInterval(playChord, 2400);
    }
    return this.lofiPlaying;
  }
}
