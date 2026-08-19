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
  B4: 493.88,
  C5: 523.25,
};

export const LEAD_NOTES = ["C5", "A4", "G4", "E4", "D4", "C4", "A3", "G3"];
export const BASS_NOTES = ["C3", "A2", "G2", "E2", "D2", "C2", "A1", "G1"];

export const DEFAULT_VOLUMES = { lead: 0.22, bass: 0.28, kick: 0.7, snare: 0.35, hat: 0.18, tom: 0.42 };
export const DEFAULT_MUTED = { lead: false, bass: false, kick: false, snare: false, hat: false, tom: false };
export const DEFAULT_KIT = "classico";

export const KITS = {
  classico: {
    label: "CLASSICO",
    hint: "quadra originale",
    filter: 4200,
    attack: 0.008,
    lead: "square",
    bass: "triangle",
    leadDur: 0.55,
    bassDur: 0.9,
    crunch: 1,
    kickStart: 140,
    kickEnd: 38,
    kickDrop: 0.11,
    kickDecay: 0.16,
    snareDur: 0.12,
    snareHp: 1200,
    snareClick: 180,
    hatDur: 0.045,
    hatHp: 6000,
  },
  nes: {
    label: "NES",
    hint: "pulse 25%",
    filter: 3800,
    attack: 0.006,
    lead: "pulse25",
    bass: "triangle",
    leadDur: 0.52,
    bassDur: 0.92,
    crunch: 8,
    kickStart: 150,
    kickEnd: 36,
    kickDrop: 0.12,
    kickDecay: 0.17,
    snareDur: 0.13,
    snareHp: 1400,
    snareClick: 190,
    hatDur: 0.04,
    hatHp: 6500,
  },
  boy: {
    label: "BOY",
    hint: "sottile 12%",
    filter: 3000,
    attack: 0.004,
    lead: "pulse12",
    bass: "pulse25",
    leadDur: 0.42,
    bassDur: 0.78,
    crunch: 10,
    kickStart: 120,
    kickEnd: 42,
    kickDrop: 0.09,
    kickDecay: 0.12,
    snareDur: 0.09,
    snareHp: 1800,
    snareClick: 220,
    hatDur: 0.03,
    hatHp: 7000,
  },
  sala: {
    label: "SALA",
    hint: "arcade",
    filter: 5200,
    attack: 0.005,
    lead: "pulse12",
    bass: "square",
    leadDur: 0.6,
    bassDur: 0.85,
    crunch: 16,
    kickStart: 170,
    kickEnd: 32,
    kickDrop: 0.1,
    kickDecay: 0.14,
    snareDur: 0.15,
    snareHp: 900,
    snareClick: 160,
    hatDur: 0.05,
    hatHp: 5000,
  },
  notte: {
    label: "NOTTE",
    hint: "morbido",
    filter: 2100,
    attack: 0.012,
    lead: "triangle",
    bass: "triangle",
    leadDur: 0.85,
    bassDur: 0.98,
    crunch: 1,
    kickStart: 110,
    kickEnd: 48,
    kickDrop: 0.14,
    kickDecay: 0.2,
    snareDur: 0.1,
    snareHp: 1600,
    snareClick: 140,
    hatDur: 0.06,
    hatHp: 4200,
  },
};

export function resolveKit(id) {
  return KITS[id] ? id : DEFAULT_KIT;
}

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
    this.pulse12 = null;
    this.pulse25 = null;
    this.masterVolume = 0.85;
    this.volumes = { ...DEFAULT_VOLUMES };
    this.muted = { ...DEFAULT_MUTED };
    this.solo = null;
    this.kitId = DEFAULT_KIT;
  }

  kit() {
    return KITS[this.kitId] || KITS[DEFAULT_KIT];
  }

  setKit(id) {
    this.kitId = resolveKit(id);
    if (this.filter) this.filter.frequency.value = this.kit().filter;
  }

  ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.filter = this.ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = this.kit().filter;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterVolume;
      this.filter.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.pulse12 = nesPulseWave(this.ctx, 0.125);
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

  applyWave(osc, type) {
    if (type === "pulse12" && this.pulse12) osc.setPeriodicWave(this.pulse12);
    else if (type === "pulse25" && this.pulse25) osc.setPeriodicWave(this.pulse25);
    else osc.type = type === "pulse" ? "square" : type;
  }

  pulse(time, freq, duration, volume, type = "square") {
    if (volume <= 0) return;
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    this.applyWave(osc, type);
    osc.frequency.setValueAtTime(freq, time);
    const attack = this.kit().attack;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain).connect(this.filter);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  noise(time, duration, volume, hpFreq, crunch) {
    if (volume <= 0) return;
    const ctx = this.ensure();
    const hold = Math.max(1, crunch ?? this.kit().crunch);
    const length = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      if (i % hold === 0) last = Math.random() * 2 - 1;
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
    const kit = this.kit();
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(kit.kickStart, time);
    osc.frequency.exponentialRampToValueAtTime(kit.kickEnd, time + kit.kickDrop);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + kit.kickDecay);
    osc.connect(gain).connect(this.filter);
    osc.start(time);
    osc.stop(time + kit.kickDecay + 0.03);
  }

  snare(time) {
    const kit = this.kit();
    this.noise(time, kit.snareDur, this.vol("snare"), kit.snareHp);
    this.pulse(time, kit.snareClick, kit.snareDur * 0.65, this.vol("snare") * 0.35, "triangle");
  }

  hat(time) {
    const kit = this.kit();
    this.noise(time, kit.hatDur, this.vol("hat"), kit.hatHp);
  }

  tom(time) {
    const volume = this.vol("tom");
    if (volume <= 0) return;
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(82, time + 0.13);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    osc.connect(gain).connect(this.filter);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  note(track, noteName, time, duration) {
    const freq = NOTE_FREQ[noteName];
    if (!freq) return;
    const kit = this.kit();
    if (track === "bass") {
      this.pulse(time, freq, duration * kit.bassDur, this.vol(track), kit.bass);
      return;
    }
    this.pulse(time, freq, duration * kit.leadDur, this.vol(track), kit.lead);
  }

  fxWave() {
    const lead = this.kit().lead;
    if (lead === "pulse12" || lead === "pulse25") return lead;
    if (lead === "triangle") return "triangle";
    return "square";
  }

  meow(time, kind = "miao") {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    this.applyWave(osc, this.fxWave());
    const volume = 0.28;
    if (kind === "ask") {
      osc.frequency.setValueAtTime(480, time);
      osc.frequency.exponentialRampToValueAtTime(920, time + 0.16);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
      osc.connect(gain).connect(this.filter);
      osc.start(time);
      osc.stop(time + 0.22);
      return;
    }
    if (kind === "nya") {
      osc.frequency.setValueAtTime(1100, time);
      osc.frequency.exponentialRampToValueAtTime(640, time + 0.07);
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
      osc.connect(gain).connect(this.filter);
      osc.start(time);
      osc.stop(time + 0.12);
      return;
    }
    osc.frequency.setValueAtTime(880, time);
    osc.frequency.exponentialRampToValueAtTime(390, time + 0.1);
    osc.frequency.exponentialRampToValueAtTime(540, time + 0.2);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
    osc.connect(gain).connect(this.filter);
    osc.start(time);
    osc.stop(time + 0.26);
  }

  purr(time) {
    for (let i = 0; i < 14; i++) {
      this.pulse(time + i * 0.03, 150 + (i % 2) * 22, 0.026, 0.11, "triangle");
    }
  }

  catSolo(time, stepDur) {
    const run = ["C5", "E4", "G4", "A4", "C5", "A4", "G4", "E4"];
    const dt = Math.max(0.07, stepDur * 0.5);
    run.forEach((note, i) => {
      const freq = NOTE_FREQ[note];
      if (freq) this.pulse(time + i * dt, freq, dt * 0.7, 0.2, this.fxWave());
    });
    this.pulse(time, 220, 0.18, 0.32, "triangle");
    this.pulse(time + dt * 4, 180, 0.18, 0.28, "triangle");
  }
}

export { NOTE_FREQ };
