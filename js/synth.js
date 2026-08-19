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

export class ChipSynth {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.filter = null;
    this.masterVolume = 0.85;
    this.volumes = { ...DEFAULT_VOLUMES };
    this.muted = { ...DEFAULT_MUTED };
  }

  ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 4200;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterVolume;
      this.filter.connect(this.master);
      this.master.connect(this.ctx.destination);
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
    return this.muted[track] ? 0 : this.volumes[track];
  }

  pulse(time, freq, duration, volume, type = "square") {
    if (volume <= 0) return;
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain).connect(this.filter);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  noise(time, duration, volume, hpFreq) {
    if (volume <= 0) return;
    const ctx = this.ensure();
    const length = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

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
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.11);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
    osc.connect(gain).connect(this.filter);
    osc.start(time);
    osc.stop(time + 0.18);
  }

  snare(time) {
    this.noise(time, 0.12, this.vol("snare"), 1200);
    this.pulse(time, 180, 0.08, this.vol("snare") * 0.35, "triangle");
  }

  hat(time) {
    this.noise(time, 0.045, this.vol("hat"), 6000);
  }

  note(track, noteName, time, duration) {
    const freq = NOTE_FREQ[noteName];
    if (!freq) return;
    const type = track === "bass" ? "triangle" : "square";
    const dur = track === "bass" ? duration * 0.9 : duration * 0.55;
    this.pulse(time, freq, dur, this.vol(track), type);
  }
}

export { NOTE_FREQ };
