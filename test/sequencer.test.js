import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRESETS,
  STEPS,
  Sequencer,
  decodePattern,
  emptyPattern,
  encodePattern,
  normalizePattern,
} from "../js/sequencer.js";
import { BASS_NOTES, ChipSynth, DEFAULT_KIT, LEAD_NOTES } from "../js/synth.js";

describe("pattern codec", () => {
  it("round-trips presets", () => {
    for (const [name, preset] of Object.entries(PRESETS)) {
      const encoded = encodePattern(preset);
      const decoded = decodePattern(encoded);
      assert.equal(decoded.bpm, preset.bpm, name);
      assert.deepEqual(decoded.lead, preset.lead, name);
      assert.deepEqual(decoded.bass, preset.bass, name);
      assert.deepEqual(decoded.kick, preset.kick, name);
      assert.deepEqual(decoded.snare, preset.snare, name);
      assert.deepEqual(decoded.hat, preset.hat, name);
      assert.deepEqual(decoded.tom, preset.tom, name);
    }
  });

  it("parses JSON export", () => {
    const json = JSON.stringify(PRESETS.boing);
    const decoded = decodePattern(json);
    assert.deepEqual(decoded.lead, PRESETS.boing.lead);
    assert.equal(decoded.swing, 8);
  });

  it("fills missing steps", () => {
    const decoded = normalizePattern({ bpm: 90, lead: ["C5"] });
    assert.equal(decoded.lead.length, STEPS);
    assert.equal(decoded.lead[0], "C5");
    assert.equal(decoded.lead[1], null);
    assert.equal(decoded.lead[16], "C5");
    assert.equal(decoded.bpm, 90);
    assert.equal(decoded.kit, DEFAULT_KIT);
  });

  it("keeps kit in the share string and defaults old links to classico", () => {
    const withKit = encodePattern({ ...PRESETS.boing, kit: "nes" });
    assert.equal(decodePattern(withKit).kit, "nes");
    const legacy = encodePattern(PRESETS.boing).split("|").slice(0, 8).join("|");
    assert.equal(decodePattern(legacy).kit, "classico");
    assert.equal(normalizePattern({ kit: "nope" }).kit, "classico");
  });
});

describe("sequencer edits", () => {
  it("toggles notes and drums", () => {
    const seq = new Sequencer(() => {});
    seq.pattern = emptyPattern();
    seq.setNote("lead", 0, "C5");
    assert.equal(seq.pattern.lead[0], "C5");
    seq.setNote("lead", 0, "C5");
    assert.equal(seq.pattern.lead[0], null);
    seq.setNote("lead", 2, "E4", "on");
    seq.setNote("lead", 2, "G4", "on");
    assert.equal(seq.pattern.lead[2], "G4");
    seq.setDrum("kick", 4, true);
    assert.equal(seq.pattern.kick[4], true);
    seq.toggleDrum("kick", 4);
    assert.equal(seq.pattern.kick[4], false);
  });

  it("duplicates the first 8 steps", () => {
    const seq = new Sequencer(() => {});
    seq.pattern = emptyPattern();
    seq.pattern.lead[0] = "C5";
    seq.pattern.kick[1] = true;
    seq.duplicate8();
    assert.equal(seq.pattern.lead[8], "C5");
    assert.equal(seq.pattern.kick[9], true);
  });

  it("duplicates bar 1 into bar 2", () => {
    const seq = new Sequencer(() => {});
    seq.pattern = emptyPattern();
    seq.pattern.lead[3] = "G4";
    seq.pattern.tom[5] = true;
    seq.duplicate16();
    assert.equal(seq.pattern.lead[19], "G4");
    assert.equal(seq.pattern.tom[21], true);
  });

  it("keeps preset notes on the piano roll", () => {
    for (const preset of Object.values(PRESETS)) {
      for (const note of preset.lead.filter(Boolean)) {
        assert.ok(LEAD_NOTES.includes(note), note);
      }
      for (const note of preset.bass.filter(Boolean)) {
        assert.ok(BASS_NOTES.includes(note), note);
      }
    }
  });

  it("undoes a destructive edit", () => {
    const seq = new Sequencer(() => {});
    seq.pattern = emptyPattern();
    seq.setNote("lead", 0, "C5");
    seq.clear();
    assert.equal(seq.pattern.lead[0], null);
    assert.equal(seq.undo(), true);
    assert.equal(seq.pattern.lead[0], "C5");
  });

  it("switches chip kit", () => {
    const seq = new Sequencer(() => {});
    seq.pattern = emptyPattern();
    assert.equal(seq.pattern.kit, "classico");
    seq.setKit("boy");
    assert.equal(seq.pattern.kit, "boy");
    assert.equal(seq.synth.kitId, "boy");
    seq.setKit("inventato");
    assert.equal(seq.pattern.kit, "classico");
  });

  it("picks a chip wave for Xato click fx", () => {
    const synth = new ChipSynth();
    synth.kitId = "classico";
    assert.equal(synth.fxWave(), "square");
    synth.kitId = "nes";
    assert.equal(synth.fxWave(), "pulse25");
    synth.kitId = "boy";
    assert.equal(synth.fxWave(), "pulse12");
    synth.kitId = "notte";
    assert.equal(synth.fxWave(), "triangle");
    assert.equal(typeof synth.meow, "function");
    assert.equal(typeof synth.purr, "function");
    assert.equal(typeof synth.catSolo, "function");
  });
});
