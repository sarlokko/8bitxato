import { Sequencer, STEPS } from "./sequencer.js";
import { LEAD_NOTES, BASS_NOTES } from "./synth.js";

const seq = new Sequencer(highlightStep);
const tracks = [
  { id: "lead", label: "LEAD", kind: "notes", notes: LEAD_NOTES },
  { id: "bass", label: "BASS", kind: "notes", notes: BASS_NOTES },
  { id: "kick", label: "KICK", kind: "drum" },
  { id: "snare", label: "SNARE", kind: "drum" },
  { id: "hat", label: "HAT", kind: "drum" },
];

const DRUM_KEYS = { KeyZ: "kick", KeyX: "snare", KeyC: "hat" };
const LEAD_KEYS = {
  Digit1: "C5",
  Digit2: "A4",
  Digit3: "G4",
  Digit4: "E4",
  Digit5: "D4",
  Digit6: "C4",
  Digit7: "A3",
  Digit8: "G3",
};

let paint = null;
let sayTimer = null;

function el(id) {
  return document.getElementById(id);
}

function cellClass(track, step, on) {
  const beat = step % 4 === 0 ? "beat" : "";
  const bar = step % 8 === 0 ? "bar" : "";
  return `cell ${on ? "on" : ""} ${beat} ${bar}`.trim();
}

function renderGrid() {
  const root = el("grid");
  root.innerHTML = tracks
    .map((track) => {
      const mute = seq.synth.muted[track.id] ? "muted" : "";
      const solo = seq.synth.solo === track.id ? "soloing" : "";
      const dim = seq.synth.solo && seq.synth.solo !== track.id ? "solo-dim" : "";
      const vol = Math.round(seq.synth.volumes[track.id] * 100);
      const body =
        track.kind === "notes"
          ? track.notes
              .map(
                (note) => `
            <div class="note-row">
              <button type="button" class="note-name" data-preview-track="${track.id}" data-preview-note="${note}">${note}</button>
              <div class="steps">
                ${Array.from({ length: STEPS }, (_, i) => {
                  const on = seq.pattern[track.id][i] === note;
                  return `<button type="button" class="${cellClass(track.id, i, on)}" data-track="${track.id}" data-step="${i}" data-note="${note}"></button>`;
                }).join("")}
              </div>
            </div>`
              )
              .join("")
          : `<div class="note-row drum-row">
              <button type="button" class="note-name" data-preview-track="${track.id}">●</button>
              <div class="steps">
                ${Array.from({ length: STEPS }, (_, i) => {
                  const on = seq.pattern[track.id][i];
                  return `<button type="button" class="${cellClass(track.id, i, on)} drum" data-track="${track.id}" data-step="${i}"></button>`;
                }).join("")}
              </div>
            </div>`;

      return `
        <section class="track ${mute} ${solo} ${dim}" data-track-panel="${track.id}">
          <header class="track-head">
            <h2>${track.label}</h2>
            <label class="mute">
              <input type="checkbox" data-mute="${track.id}" ${seq.synth.muted[track.id] ? "checked" : ""}>
              mute
            </label>
            <button type="button" class="solo-btn ${seq.synth.solo === track.id ? "on" : ""}" data-solo="${track.id}">solo</button>
            <label class="vol">
              vol
              <input type="range" min="0" max="100" value="${vol}" data-vol="${track.id}">
            </label>
          </header>
          ${body}
        </section>`;
    })
    .join("");

  renderStepNumbers();
  highlightStep(seq.playing ? seq.heardStep : -1);
  syncUndo();
}

function renderStepNumbers() {
  el("step-numbers").innerHTML = `
    <span class="note-name"></span>
    <div class="steps">
      ${Array.from({ length: STEPS }, (_, i) => `<span class="step-num ${i % 4 === 0 ? "beat" : ""}">${i + 1}</span>`).join("")}
    </div>
  `;
}

function syncNoteCells(track, step) {
  const current = seq.pattern[track][step];
  document.querySelectorAll(`.cell[data-track="${track}"][data-step="${step}"]`).forEach((cell) => {
    cell.classList.toggle("on", cell.dataset.note ? cell.dataset.note === current : Boolean(current));
  });
}

function xatoSay(text) {
  const bubble = el("xato-say");
  if (!bubble) return;
  bubble.textContent = text;
  bubble.classList.add("show");
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => bubble.classList.remove("show"), 180);
}

function pulseEq(step) {
  const eq = el("eq");
  if (!eq) return;
  if (step < 0) {
    [...eq.children].forEach((bar) => {
      bar.style.height = "5px";
    });
    return;
  }
  const p = seq.pattern;
  const levels = [
    p.kick[step] ? 18 : 6,
    p.snare[step] ? 16 : 5,
    p.hat[step] ? 12 : 4,
    p.bass[step] ? 20 : 7,
    p.lead[step] ? 22 : 8,
  ];
  [...eq.children].forEach((bar, i) => {
    bar.style.height = `${levels[i] || 4}px`;
  });
}

function highlightStep(step) {
  document.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.toggle("current", Number(cell.dataset.step) === step);
  });
  document.querySelectorAll(".step-num").forEach((n, i) => {
    n.classList.toggle("current", i === step);
  });

  const cat = el("xato");
  if (!cat) return;
  const playing = seq.playing && step >= 0;
  cat.classList.toggle("playing", seq.playing);
  cat.classList.toggle("kick", playing && Boolean(seq.pattern.kick[step]));
  cat.classList.toggle("sing", playing && Boolean(seq.pattern.lead[step]));
  if (playing && seq.pattern.snare[step]) xatoSay("MIAU");
  else if (playing && seq.pattern.kick[step]) xatoSay("PUM");
  else if (playing && seq.pattern.lead[step]) xatoSay("♪");
  if (playing) pulseEq(step);
  else pulseEq(-1);
}

function syncTransport() {
  el("bpm").value = seq.pattern.bpm;
  el("bpm-value").textContent = seq.pattern.bpm;
  el("swing").value = seq.pattern.swing;
  el("swing-value").textContent = seq.pattern.swing;
  el("master").value = Math.round(seq.synth.masterVolume * 100);
  el("play").textContent = seq.playing ? "STOP" : "PLAY";
  el("play").classList.toggle("playing", seq.playing);
  el("xato").classList.toggle("playing", seq.playing);
  syncKits();
  syncUndo();
}

function syncKits() {
  document.querySelectorAll("[data-kit]").forEach((btn) => {
    btn.classList.toggle("on", btn.dataset.kit === seq.pattern.kit);
  });
}

function syncUndo() {
  const btn = el("undo");
  if (btn) btn.disabled = !seq.canUndo();
}

function downloadPattern() {
  const blob = new Blob([seq.exportJson()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "8bitxato-pattern.json";
  a.click();
  URL.revokeObjectURL(url);
}

function applyPaint(cell) {
  if (!paint || !cell) return;
  const track = cell.dataset.track;
  const step = Number(cell.dataset.step);
  const note = cell.dataset.note;
  if (paint.kind === "note") {
    if (!note || track !== paint.track) return;
    seq.setNote(track, step, note, paint.on ? "on" : "off");
    syncNoteCells(track, step);
  } else {
    if (cell.dataset.note || track !== paint.track) return;
    seq.setDrum(track, step, paint.on);
    syncNoteCells(track, step);
  }
  if (paint.on) {
    const key = `${track}:${step}:${note || ""}`;
    if (paint.last !== key) {
      seq.audition(track, note);
      paint.last = key;
    }
  }
}

function cellFromPoint(x, y) {
  const node = document.elementFromPoint(x, y);
  return node?.closest?.(".cell") || null;
}

async function copyShareLink() {
  const url = seq.shareUrl();
  const btn = el("copy-link");
  try {
    await navigator.clipboard.writeText(url);
    btn.textContent = "COPIATO";
  } catch {
    window.prompt("Copia il link:", url);
    btn.textContent = "LINK";
  }
  setTimeout(() => {
    btn.textContent = "COPIA LINK";
  }, 1200);
}

function doUndo() {
  if (!seq.undo()) return;
  renderGrid();
  syncTransport();
}

function bind() {
  el("grid").addEventListener("pointerdown", (e) => {
    const preview = e.target.closest("[data-preview-track]");
    if (preview) {
      e.preventDefault();
      seq.audition(preview.dataset.previewTrack, preview.dataset.previewNote);
      return;
    }
    const soloBtn = e.target.closest("[data-solo]");
    if (soloBtn) {
      seq.setSolo(soloBtn.dataset.solo);
      renderGrid();
      return;
    }
    const cell = e.target.closest(".cell");
    if (!cell) return;
    e.preventDefault();
    seq.pushUndo();
    const track = cell.dataset.track;
    const step = Number(cell.dataset.step);
    const note = cell.dataset.note;
    if (note) {
      paint = { kind: "note", track, on: seq.pattern[track][step] !== note };
    } else {
      paint = { kind: "drum", track, on: !seq.pattern[track][step] };
    }
    applyPaint(cell);
  });

  window.addEventListener("pointermove", (e) => {
    if (!paint) return;
    applyPaint(cellFromPoint(e.clientX, e.clientY));
  });

  window.addEventListener("pointerup", () => {
    paint = null;
  });

  el("grid").addEventListener("input", (e) => {
    if (e.target.dataset.vol) {
      seq.setVolume(e.target.dataset.vol, Number(e.target.value) / 100);
    }
  });

  el("grid").addEventListener("change", (e) => {
    if (e.target.dataset.mute) {
      seq.setMuted(e.target.dataset.mute, e.target.checked);
      e.target.closest(".track").classList.toggle("muted", e.target.checked);
    }
  });

  el("play").addEventListener("click", () => {
    if (seq.playing) seq.stop();
    else seq.play();
    syncTransport();
  });

  el("bpm").addEventListener("input", (e) => {
    seq.setBpm(e.target.value);
    syncTransport();
  });

  el("swing").addEventListener("input", (e) => {
    seq.setSwing(e.target.value);
    syncTransport();
  });

  el("master").addEventListener("input", (e) => {
    seq.synth.setMaster(Number(e.target.value) / 100);
  });

  el("clear").addEventListener("click", () => {
    seq.clear();
    renderGrid();
  });

  el("random").addEventListener("click", () => {
    seq.randomize();
    renderGrid();
    syncTransport();
  });

  el("duplicate").addEventListener("click", () => {
    seq.duplicate8();
    renderGrid();
  });

  el("undo").addEventListener("click", doUndo);

  document.querySelectorAll("[data-kit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      seq.setKit(btn.dataset.kit);
      syncKits();
      syncUndo();
    });
  });

  document.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      seq.loadPreset(btn.dataset.preset);
      renderGrid();
      syncTransport();
    });
  });

  el("copy-link").addEventListener("click", copyShareLink);
  el("export").addEventListener("click", downloadPattern);

  el("import").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    seq.importJson(await file.text());
    renderGrid();
    syncTransport();
    e.target.value = "";
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") {
      e.preventDefault();
      doUndo();
      return;
    }
    if (e.target.closest("input, textarea, button, label")) return;
    if (e.code === "Space") {
      e.preventDefault();
      el("play").click();
      return;
    }
    const drum = DRUM_KEYS[e.code];
    if (drum) {
      e.preventDefault();
      seq.audition(drum);
      if (seq.playing) {
        seq.pushUndo();
        seq.setDrum(drum, seq.heardStep, true);
        syncNoteCells(drum, seq.heardStep);
      }
      return;
    }
    const lead = LEAD_KEYS[e.code];
    if (lead) {
      e.preventDefault();
      seq.audition("lead", lead);
      if (seq.playing) {
        seq.pushUndo();
        seq.setNote("lead", seq.heardStep, lead, "on");
        syncNoteCells("lead", seq.heardStep);
      }
    }
  });
}

renderGrid();
syncTransport();
bind();
