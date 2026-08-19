const NOTE_FREQ = {
  G1: 49.0,
  A1: 55.0,
  C2: 65.41,
  D2: 73.42,
  E2: 82.41,
  G2: 98.0,
  A2: 110.0,
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  G3: 196.0,
  A3: 220.0,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
};

export const LEAD_NOTES = ["C5", "A4", "G4", "E4", "D4", "C4", "A3", "G3"];
export const BASS_NOTES = ["C3", "A2", "G2", "E2", "D2", "C2", "A1", "G1"];

export const DEFAULT_VOLUMES = { lead: 0.22, bass: 0.28, kick: 0.7, snare: 0.35, hat: 0.18 };
export const DEFAULT_MUTED = { lead: false, bass: false, kick: false, snare: false, hat: false };

function nesPulseWave(ctx, duty) {
  const size = 32;
  const real = new Float32Array(size);
  const imag = new Float32Array(size);
  for (let k = 1; k < size; k++) {
    imag[k] = (2 / (k * Math.PI)) * Math.sin(Math.PI * k * duty);
  }
  return ctx.createPeriodicWave(real, imag);
}

export class ChipSynth {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.filter = null;
    this.pulse25 = null;
    this.masterVolume = 0.85;
    this.volumes = { ...DEFAULT_VOLUMES };
    this.muted = { ...DEFAULT_MUTED };
    this.solo = null;
  }

  ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 3800;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterVolume;
      this.filter.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.pulse25 = nesPulseWave(this.ctx, 0.25);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  setMaster(volume) {
    this.masterVolume = Math.min(1, Math.max(0, Number(volume) || 0));
    if (this.master) this.master.gain.value = this.masterVolume;
  }

  now() {
    return this.ensure().currentTime;
  }

  vol(track) {
    if (this.solo && this.solo !== track) return 0;
    return this.muted[track] ? 0 : this.volumes[track];
  }

  pulse(time, freq, duration, volume, type = "square") {
    if (volume <= 0) return;
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (type === "pulse" && this.pulse25) osc.setPeriodicWave(this.pulse25);
    else osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain).connect(this.filter);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  noise(time, duration, volume, hpFreq, crunch = 8) {
    if (volume <= 0) return;
    const ctx = this.ensure();
    const length = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      if (i % crunch === 0) last = Math.random() * 2 - 1;
      data[i] = last;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = hpFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    src.connect(hp).connect(gain).connect(this.filter);
    src.start(time);
    src.stop(time + duration + 0.02);
  }

  kick(time) {
    const volume = this.vol("kick");
    if (volume <= 0) return;
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.12);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.17);
    osc.connect(gain).connect(this.filter);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  snare(time) {
    this.noise(time, 0.13, this.vol("snare"), 1400, 12);
    this.pulse(time, 190, 0.07, this.vol("snare") * 0.32, "triangle");
  }

  hat(time) {
    this.noise(time, 0.04, this.vol("hat"), 6500, 6);
  }

  note(track, noteName, time, duration) {
    const freq = NOTE_FREQ[noteName];
    if (!freq) return;
    if (track === "bass") {
      this.pulse(time, freq, duration * 0.92, this.vol(track), "triangle");
      return;
    }
    this.pulse(time, freq, duration * 0.52, this.vol(track), "pulse");
  }
}

export { NOTE_FREQ };
