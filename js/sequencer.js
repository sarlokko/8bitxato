import {
  ChipSynth,
  LEAD_NOTES,
  BASS_NOTES,
  DEFAULT_KIT,
  DEFAULT_MUTED,
  DEFAULT_VOLUMES,
  resolveKit,
} from "./synth.js";

const BAR_STEPS = 16;
const STEPS = 32;
const STORAGE_KEY = "8bitxato-pattern";
const NOTE_TRACKS = ["lead", "bass"];
const DRUM_TRACKS = ["kick", "snare", "hat", "tom"];
const UNDO_LIMIT = 40;

function emptyPattern() {
  return {
    bpm: 120,
    swing: 0,
    lead: Array(STEPS).fill(null),
    bass: Array(STEPS).fill(null),
    kick: Array(STEPS).fill(false),
    snare: Array(STEPS).fill(false),
    hat: Array(STEPS).fill(false),
    tom: Array(STEPS).fill(false),
    volumes: { ...DEFAULT_VOLUMES },
    muted: { ...DEFAULT_MUTED },
    kit: DEFAULT_KIT,
  };
}

function stretchNotes(arr) {
  const next = Array(STEPS).fill(null);
  if (!Array.isArray(arr) || arr.length === 0) return next;
  const src = arr.map((n) => n || null);
  if (src.length <= BAR_STEPS) {
    for (let i = 0; i < BAR_STEPS; i++) {
      next[i] = src[i] || null;
      next[i + BAR_STEPS] = src[i] || null;
    }
    return next;
  }
  for (let i = 0; i < STEPS; i++) next[i] = src[i] || null;
  return next;
}

function stretchDrums(arr) {
  const next = Array(STEPS).fill(false);
  if (!Array.isArray(arr) || arr.length === 0) return next;
  const src = arr.map(Boolean);
  if (src.length <= BAR_STEPS) {
    for (let i = 0; i < BAR_STEPS; i++) {
      next[i] = Boolean(src[i]);
      next[i + BAR_STEPS] = Boolean(src[i]);
    }
    return next;
  }
  for (let i = 0; i < STEPS; i++) next[i] = Boolean(src[i]);
  return next;
}

function twoBars(first, second) {
  return [...first, ...second];
}

function normalizePattern(raw) {
  const base = emptyPattern();
  if (!raw || typeof raw !== "object") return base;
  return {
    bpm: Math.min(200, Math.max(60, Number(raw.bpm) || 120)),
    swing: Math.min(50, Math.max(0, Number(raw.swing) || 0)),
    lead: stretchNotes(raw.lead),
    bass: stretchNotes(raw.bass),
    kick: stretchDrums(raw.kick),
    snare: stretchDrums(raw.snare),
    hat: stretchDrums(raw.hat),
    tom: stretchDrums(raw.tom),
    volumes: { ...DEFAULT_VOLUMES, ...(raw.volumes || {}) },
    muted: { ...DEFAULT_MUTED, ...(raw.muted || {}) },
    kit: resolveKit(raw.kit),
  };
}

function packNotes(arr) {
  return arr.map((n) => n || "").join(".");
}

function unpackNotes(str) {
  return stretchNotes(String(str || "").split("."));
}

function packDrums(arr) {
  return arr.map((v) => (v ? "1" : "0")).join("");
}

function unpackDrums(str) {
  return stretchDrums([...(String(str || ""))].map((c) => c === "1"));
}

export function encodePattern(pattern) {
  const p = normalizePattern(pattern);
  return [
    "1",
    p.bpm,
    p.swing,
    packNotes(p.lead),
    packNotes(p.bass),
    packDrums(p.kick),
    packDrums(p.snare),
    packDrums(p.hat),
    p.kit,
    packDrums(p.tom),
  ].join("|");
}

export function decodePattern(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("pattern vuoto");
  if (raw.startsWith("{")) return normalizePattern(JSON.parse(raw));
  const parts = raw.replace(/^#?p=/, "").split("|");
  if (parts[0] !== "1" || parts.length < 8) throw new Error("pattern sconosciuto");
  return normalizePattern({
    bpm: parts[1],
    swing: parts[2],
    lead: unpackNotes(parts[3]),
    bass: unpackNotes(parts[4]),
    kick: unpackDrums(parts[5]).map(Boolean),
    snare: unpackDrums(parts[6]).map(Boolean),
    hat: unpackDrums(parts[7]).map(Boolean),
    kit: parts[8],
    tom: unpackDrums(parts[9] || ""),
  });
}

function readHash() {
  if (typeof location === "undefined") return "";
  const hash = location.hash || "";
  if (!hash.startsWith("#p=")) return "";
  return decodeURIComponent(hash.slice(3));
}

function writeHash(pattern) {
  if (typeof history === "undefined" || typeof location === "undefined") return;
  const next = `#p=${encodeURIComponent(encodePattern(pattern))}`;
  if (location.hash !== next) history.replaceState(null, "", next);
}

function storageGet() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storageSet(value) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore quota / private mode */
  }
}

export const PRESETS = {
  boing: {
    bpm: 118,
    swing: 8,
    lead: twoBars(
      ["C5", null, "E4", null, "G4", null, "A4", "G4", "C5", null, "E4", null, "D4", "E4", "G4", null],
      ["E4", null, "G4", "A4", "C5", null, "A4", "G4", "E4", null, "D4", "E4", "G4", "A4", "C5", null]
    ),
    bass: twoBars(
      ["C2", null, null, "C2", "G2", null, null, "G2", "A2", null, null, "A2", "G2", null, "E2", null],
      ["C2", null, "C2", null, "A2", null, null, "A2", "G2", null, "G2", "E2", "C2", null, "G2", null]
    ),
    kick: twoBars(
      [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
      [1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1]
    ).map(Boolean),
    snare: twoBars(
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1]
    ).map(Boolean),
    hat: twoBars(
      [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0],
      [1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0]
    ).map(Boolean),
    tom: twoBars(
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0]
    ).map(Boolean),
  },
  boss: {
    bpm: 140,
    swing: 0,
    lead: twoBars(
      ["G4", "G4", null, "A4", "C5", null, "A4", null, "G4", "E4", null, "D4", "E4", "G4", "A4", null],
      ["C5", "C5", "A4", "G4", null, "A4", "C5", null, "D4", "E4", "G4", "A4", "G4", "E4", "D4", "E4"]
    ),
    bass: twoBars(
      ["E2", null, "E2", "E2", "G2", null, "G2", null, "A2", null, "A2", "A2", "C3", null, "G2", null],
      ["E2", "E2", null, "G2", "A2", null, "A2", "A2", "C3", null, "C3", "G2", "E2", "E2", "G2", "A2"]
    ),
    kick: twoBars(
      [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1],
      [1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1]
    ).map(Boolean),
    snare: twoBars(
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      [0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0]
    ).map(Boolean),
    hat: Array(STEPS).fill(true),
    tom: twoBars(
      [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1]
    ).map(Boolean),
  },
  nanna: {
    bpm: 88,
    swing: 18,
    lead: twoBars(
      ["C4", null, "E4", null, "G4", null, "A4", null, "G4", null, "E4", null, "D4", "C4", null, null],
      ["E4", null, "G4", null, "A4", null, "C5", null, "A4", null, "G4", "E4", "D4", "C4", null, null]
    ),
    bass: twoBars(
      ["C2", null, null, null, "G2", null, null, null, "A2", null, null, null, "G2", null, null, null],
      ["A1", null, null, null, "E2", null, null, null, "G2", null, null, null, "C2", null, null, null]
    ),
    kick: twoBars(
      [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]
    ).map(Boolean),
    snare: Array(STEPS).fill(false),
    hat: twoBars(
      [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0]
    ).map(Boolean),
    tom: twoBars(
      Array(BAR_STEPS).fill(0),
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
    ).map(Boolean),
  },
  miao: {
    bpm: 104,
    swing: 14,
    lead: twoBars(
      ["E4", null, "G4", "A4", null, "G4", "E4", null, "C5", null, "A4", "G4", null, "E4", "C4", null],
      ["G4", "A4", "C5", null, "A4", "G4", "E4", null, "D4", "E4", "G4", "A4", "G4", "E4", "C4", "E4"]
    ),
    bass: twoBars(
      ["A1", null, null, "A1", "E2", null, null, "E2", "A2", null, "G2", null, "E2", null, "A1", null],
      ["A1", null, "A1", null, "G2", null, null, "E2", "A2", "A2", null, "G2", "E2", null, "A1", "E2"]
    ),
    kick: twoBars(
      [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0],
      [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0]
    ).map(Boolean),
    snare: twoBars(
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
      [0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 1]
    ).map(Boolean),
    hat: twoBars(
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
      [1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1]
    ).map(Boolean),
    tom: twoBars(
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
      [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1]
    ).map(Boolean),
  },
  rincorsa: {
    bpm: 168,
    swing: 0,
    lead: twoBars(
      ["E4", "G4", "A4", "C5", "A4", "G4", "E4", "D4", "E4", "G4", "A4", "C5", "D4", "E4", "G4", "A4"],
      ["C5", "A4", "G4", "E4", "G4", "A4", "C5", "D4", "C5", "A4", "G4", "E4", "D4", "E4", "G4", "C5"]
    ),
    bass: twoBars(
      ["E2", "E2", null, "E2", "G2", "G2", null, "G2", "A2", "A2", null, "A2", "C3", null, "G2", null],
      ["E2", null, "E2", "G2", "A2", "A2", null, "C3", "A2", null, "G2", "E2", "G2", "A2", "C3", "E2"]
    ),
    kick: twoBars(
      [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1]
    ).map(Boolean),
    snare: twoBars(
      [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1],
      [0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1]
    ).map(Boolean),
    hat: Array(STEPS).fill(true),
    tom: twoBars(
      [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1]
    ).map(Boolean),
  },
};

export class Sequencer {
  constructor(onStep) {
    this.synth = new ChipSynth();
    this.pattern = emptyPattern();
    this.playing = false;
    this.currentStep = 0;
    this.heardStep = 0;
    this.nextNoteTime = 0;
    this.timer = null;
    this.history = [];
    this.onStep = onStep;
    this.load();
    this.applyMix();
  }

  applyMix() {
    this.synth.volumes = { ...DEFAULT_VOLUMES, ...this.pattern.volumes };
    this.synth.muted = { ...DEFAULT_MUTED, ...this.pattern.muted };
    this.synth.setKit(this.pattern.kit);
  }

  snapshot() {
    return structuredClone(this.pattern);
  }

  pushUndo() {
    this.history.push(this.snapshot());
    if (this.history.length > UNDO_LIMIT) this.history.shift();
  }

  canUndo() {
    return this.history.length > 0;
  }

  undo() {
    const prev = this.history.pop();
    if (!prev) return false;
    this.pattern = normalizePattern(prev);
    this.applyMix();
    this.save();
    return true;
  }

  setSolo(track) {
    this.synth.solo = this.synth.solo === track ? null : track || null;
  }

  stepDuration(step = this.currentStep) {
    const sixteenth = 60 / this.pattern.bpm / 4;
    const swing = (this.pattern.swing || 0) / 100;
    if (step % 2 === 0) return sixteenth * (1 + swing);
    return sixteenth * (1 - swing);
  }

  holdLength(track, step) {
    const note = this.pattern[track][step];
    if (!note) return 0;
    if (step > 0 && this.pattern[track][step - 1] === note) return 0;
    let n = 1;
    while (step + n < STEPS && this.pattern[track][step + n] === note) n++;
    return n;
  }

  holdDuration(step, count) {
    let dur = 0;
    for (let i = 0; i < count; i++) dur += this.stepDuration(step + i);
    return dur;
  }

  setDrum(track, step, on) {
    this.pattern[track][step] = Boolean(on);
    this.save();
  }

  toggleDrum(track, step) {
    this.setDrum(track, step, !this.pattern[track][step]);
  }

  setNote(track, step, note, mode = "toggle") {
    const current = this.pattern[track][step];
    if (mode === "on") this.pattern[track][step] = note;
    else if (mode === "off") this.pattern[track][step] = current === note ? null : current;
    else this.pattern[track][step] = current === note ? null : note;
    this.save();
  }

  setBpm(bpm) {
    this.pattern.bpm = Math.min(200, Math.max(60, Number(bpm) || 120));
    this.save();
  }

  setSwing(swing) {
    this.pattern.swing = Math.min(50, Math.max(0, Number(swing) || 0));
    this.save();
  }

  setVolume(track, value) {
    this.synth.volumes[track] = value;
    this.pattern.volumes[track] = value;
    this.save();
  }

  setMuted(track, muted) {
    this.synth.muted[track] = Boolean(muted);
    this.pattern.muted[track] = Boolean(muted);
    this.save();
  }

  setKit(id) {
    const kit = resolveKit(id);
    if (kit === this.pattern.kit) {
      this.synth.setKit(kit);
      return kit;
    }
    this.pushUndo();
    this.pattern.kit = kit;
    this.synth.setKit(kit);
    this.save();
    if (typeof AudioContext === "function") {
      try {
        this.audition("lead", "C5");
      } catch {
        /* no audio graph in tests */
      }
    }
    return kit;
  }

  clear() {
    this.pushUndo();
    const bpm = this.pattern.bpm;
    const swing = this.pattern.swing;
    const volumes = { ...this.pattern.volumes };
    const muted = { ...this.pattern.muted };
    const kit = this.pattern.kit;
    this.pattern = emptyPattern();
    this.pattern.bpm = bpm;
    this.pattern.swing = swing;
    this.pattern.volumes = volumes;
    this.pattern.muted = muted;
    this.pattern.kit = kit;
    this.save();
  }

  duplicate8(bar = 0) {
    this.pushUndo();
    const start = bar * BAR_STEPS;
    for (const key of [...NOTE_TRACKS, ...DRUM_TRACKS]) {
      for (let i = 0; i < 8; i++) this.pattern[key][start + i + 8] = this.pattern[key][start + i];
    }
    this.save();
  }

  duplicate16() {
    this.pushUndo();
    for (const key of [...NOTE_TRACKS, ...DRUM_TRACKS]) {
      for (let i = 0; i < BAR_STEPS; i++) this.pattern[key][i + BAR_STEPS] = this.pattern[key][i];
    }
    this.save();
  }

  randomize() {
    this.pushUndo();
    const pick = (notes) => (Math.random() < 0.45 ? notes[Math.floor(Math.random() * notes.length)] : null);
    this.pattern.lead = Array.from({ length: STEPS }, () => pick(LEAD_NOTES));
    this.pattern.bass = Array.from({ length: STEPS }, (_, i) => (i % 4 === 0 ? pick(BASS_NOTES) : null));
    this.pattern.kick = Array.from({ length: STEPS }, (_, i) => i % 4 === 0);
    this.pattern.snare = Array.from({ length: STEPS }, (_, i) => i % 8 === 4);
    this.pattern.hat = Array.from({ length: STEPS }, (_, i) => i % 2 === 0);
    this.pattern.tom = Array.from({ length: STEPS }, (_, i) => i % 16 === 10);
    this.save();
  }

  loadPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;
    this.pushUndo();
    const volumes = { ...this.pattern.volumes };
    const muted = { ...this.pattern.muted };
    const kit = this.pattern.kit;
    this.pattern = normalizePattern(structuredClone(preset));
    this.pattern.volumes = volumes;
    this.pattern.muted = muted;
    this.pattern.kit = kit;
    this.save();
  }

  audition(track, note) {
    const time = this.synth.now();
    const muted = this.synth.muted[track];
    const solo = this.synth.solo;
    this.synth.muted[track] = false;
    this.synth.solo = null;
    const dur = Math.max(0.12, this.stepDuration(0) * 0.85);
    if (note) this.synth.note(track, note, time, dur);
    else if (track === "kick") this.synth.kick(time);
    else if (track === "snare") this.synth.snare(time);
    else if (track === "hat") this.synth.hat(time);
    else if (track === "tom") this.synth.tom(time);
    this.synth.muted[track] = muted;
    this.synth.solo = solo;
  }

  play() {
    this.synth.ensure();
    if (this.playing) return;
    this.playing = true;
    this.currentStep = 0;
    this.heardStep = 0;
    this.nextNoteTime = this.synth.now() + 0.06;
    this.scheduler();
    this.timer = setInterval(() => this.scheduler(), 25);
  }

  stop() {
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
    this.currentStep = 0;
    this.heardStep = 0;
    this.onStep(-1);
  }

  scheduler() {
    if (!this.playing) return;
    const ctx = this.synth.ensure();
    while (this.nextNoteTime < ctx.currentTime + 0.12) {
      const step = this.currentStep;
      this.schedule(step, this.nextNoteTime);
      this.nextNoteTime += this.stepDuration(step);
      this.currentStep = (step + 1) % STEPS;
    }
  }

  schedule(step, time) {
    const delay = Math.max(0, (time - this.synth.now()) * 1000);
    setTimeout(() => {
      this.heardStep = step;
      this.onStep(step);
    }, delay);

    const p = this.pattern;
    if (p.kick[step]) this.synth.kick(time);
    if (p.snare[step]) this.synth.snare(time);
    if (p.hat[step]) this.synth.hat(time);
    if (p.tom[step]) this.synth.tom(time);

    const leadHold = this.holdLength("lead", step);
    if (leadHold) this.synth.note("lead", p.lead[step], time, this.holdDuration(step, leadHold));
    const bassHold = this.holdLength("bass", step);
    if (bassHold) this.synth.note("bass", p.bass[step], time, this.holdDuration(step, bassHold));
  }

  save() {
    storageSet(JSON.stringify(this.pattern));
    writeHash(this.pattern);
  }

  load() {
    try {
      const hashed = readHash();
      if (hashed) {
        this.pattern = decodePattern(hashed);
        storageSet(JSON.stringify(this.pattern));
        return;
      }
      const raw = storageGet();
      if (!raw) {
        this.pattern = normalizePattern(structuredClone(PRESETS.boing));
        return;
      }
      this.pattern = normalizePattern(JSON.parse(raw));
    } catch {
      this.pattern = emptyPattern();
    }
  }

  exportJson() {
    return JSON.stringify(this.pattern, null, 2);
  }

  shareUrl() {
    if (typeof location === "undefined") return encodePattern(this.pattern);
    writeHash(this.pattern);
    return location.href;
  }

  importJson(text) {
    this.pushUndo();
    this.pattern = decodePattern(text);
    this.applyMix();
    this.save();
  }
}

export { STEPS, BAR_STEPS, emptyPattern, normalizePattern, NOTE_TRACKS, DRUM_TRACKS };
