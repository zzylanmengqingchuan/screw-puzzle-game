/**
 * AudioManager — programmatic sound effects using Web Audio API.
 * No external audio files; all sounds are synthesized on the fly.
 */
export class AudioManager {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._muted = localStorage.getItem('screw_game_muted') === '1';
  }

  /* Call on first user interaction to unlock AudioContext */
  unlock() {
    if (this._ctx) return;
    this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._master = this._ctx.createGain();
    this._master.gain.value = this._muted ? 0 : 1;
    this._master.connect(this._ctx.destination);
    if (this._ctx.state === 'suspended') this._ctx.resume();
  }

  toggleMute() {
    this._muted = !this._muted;
    localStorage.setItem('screw_game_muted', this._muted ? '1' : '0');
    if (this._master) this._master.gain.value = this._muted ? 0 : 1;
    return this._muted;
  }

  isMuted() { return this._muted; }

  /* ---- helpers ---- */

  _ensureCtx() {
    if (!this._ctx) this.unlock();
    return this._ctx;
  }

  _tone(freq, duration, type = 'sine', startTime) {
    const ctx = this._ensureCtx();
    const t = startTime ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.25;
    osc.connect(gain);
    gain.connect(this._master);
    osc.start(t);
    osc.stop(t + duration);
    return { osc, gain, t };
  }

  _sweep(f0, f1, duration, type = 'sine') {
    const ctx = this._ensureCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.linearRampToValueAtTime(f1, t + duration);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    osc.connect(gain);
    gain.connect(this._master);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  /* ---- sound effects ---- */

  /** Rising pitch chirp, mechanical feel: 400→800Hz over 200ms */
  playScrewOut() {
    this._sweep(400, 800, 0.2, 'sawtooth');
  }

  /** Soft click: short 600Hz blip, 80ms */
  playBoxPlace() {
    const ctx = this._ensureCtx();
    const t = ctx.currentTime;
    const { gain } = this._tone(600, 0.08);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.08);
  }

  /** Satisfying ding-ding: two quick tones 800Hz + 1000Hz */
  playBoxComplete() {
    const ctx = this._ensureCtx();
    const t = ctx.currentTime;
    const { gain: g1 } = this._tone(800, 0.15, 'sine', t);
    g1.gain.setValueAtTime(0.25, t);
    g1.gain.linearRampToValueAtTime(0, t + 0.15);
    const { gain: g2 } = this._tone(1000, 0.15, 'sine', t + 0.12);
    g2.gain.setValueAtTime(0.25, t + 0.12);
    g2.gain.linearRampToValueAtTime(0, t + 0.27);
  }

  /** Gentle sweep: 500→700Hz over 300ms */
  playColorChange() {
    this._sweep(500, 700, 0.3);
  }

  /** Descending whoosh: 300→100Hz over 500ms with noise */
  playPlateFall() {
    const ctx = this._ensureCtx();
    const t = ctx.currentTime;
    // tonal component
    this._sweep(300, 100, 0.5);
    // noise burst
    const bufSize = ctx.sampleRate * 0.5;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.08, t);
    ng.gain.linearRampToValueAtTime(0, t + 0.5);
    noise.connect(ng);
    ng.connect(this._master);
    noise.start(t);
    noise.stop(t + 0.5);
  }

  /** Dull thud: low 200Hz, 100ms, quick decay */
  playBufferPlace() {
    const ctx = this._ensureCtx();
    const t = ctx.currentTime;
    const { gain } = this._tone(200, 0.1, 'sine');
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  }

  /** Cheerful pop: 600→900Hz quick bounce, 150ms */
  playAutoReturn() {
    this._sweep(600, 900, 0.15);
  }

  /** Sad descending: 400→200Hz over 400ms */
  playFail() {
    this._sweep(400, 200, 0.4);
  }

  /** Celebratory melody: C5-E5-G5-C6 arpeggio over 800ms */
  playVictory() {
    const ctx = this._ensureCtx();
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
    const step = 0.2;
    notes.forEach((freq, i) => {
      const { gain } = this._tone(freq, 0.25, 'sine', t + i * step);
      gain.gain.setValueAtTime(0.25, t + i * step);
      gain.gain.linearRampToValueAtTime(0, t + i * step + 0.25);
    });
  }
}
