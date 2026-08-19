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
import { BASS_NOTES, LEAD_NOTES } from "../js/synth.js";

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
    assert.equal(decoded.bpm, 90);
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
});
