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

let paint = null;

function el(id) {
  return document.getElementById(id);
}

function renderGrid() {
  const root = el("grid");
  root.innerHTML = tracks
    .map((track) => {
      const mute = seq.synth.muted[track.id] ? "muted" : "";
      const vol = Math.round(seq.synth.volumes[track.id] * 100);
      const body =
        track.kind === "notes"
          ? track.notes
              .map(
                (note) => `
            <div class="note-row">
              <span class="note-name">${note}</span>
              <div class="steps">
                ${Array.from({ length: STEPS }, (_, i) => {
                  const on = seq.pattern[track.id][i] === note;
                  return `<button type="button" class="cell ${on ? "on" : ""}" data-track="${track.id}" data-step="${i}" data-note="${note}"></button>`;
                }).join("")}
              </div>
            </div>`
              )
              .join("")
          : `<div class="note-row drum-row">
              <span class="note-name">●</span>
              <div class="steps">
                ${Array.from({ length: STEPS }, (_, i) => {
                  const on = seq.pattern[track.id][i];
                  return `<button type="button" class="cell drum ${on ? "on" : ""}" data-track="${track.id}" data-step="${i}"></button>`;
                }).join("")}
              </div>
            </div>`;

      return `
        <section class="track ${mute}" data-track-panel="${track.id}">
          <header class="track-head">
            <h2>${track.label}</h2>
            <label class="mute">
              <input type="checkbox" data-mute="${track.id}" ${seq.synth.muted[track.id] ? "checked" : ""}>
              mute
            </label>
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
  highlightStep(seq.playing ? seq.currentStep : -1);
}

function renderStepNumbers() {
  el("step-numbers").innerHTML = `
    <span class="note-name"></span>
    <div class="steps">
      ${Array.from({ length: STEPS }, (_, i) => `<span class="step-num">${i + 1}</span>`).join("")}
    </div>
  `;
}

function syncNoteCells(track, step) {
  const current = seq.pattern[track][step];
  document.querySelectorAll(`.cell[data-track="${track}"][data-step="${step}"]`).forEach((cell) => {
    cell.classList.toggle("on", cell.dataset.note ? cell.dataset.note === current : Boolean(current));
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
  cat.classList.toggle("playing", seq.playing);
  cat.classList.toggle("kick", seq.playing && step >= 0 && Boolean(seq.pattern.kick[step]));
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
    return;
  }
  if (cell.dataset.note || track !== paint.track) return;
  seq.setDrum(track, step, paint.on);
  syncNoteCells(track, step);
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

function bind() {
  el("grid").addEventListener("pointerdown", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell) return;
    e.preventDefault();
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
    if (e.target.closest("input, textarea, button, label")) return;
    if (e.code === "Space") {
      e.preventDefault();
      el("play").click();
    }
  });
}

renderGrid();
syncTransport();
bind();
