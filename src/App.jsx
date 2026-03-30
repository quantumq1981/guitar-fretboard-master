import { useState, useRef, useEffect, useMemo, Component } from "react";

// ── Error Boundary ────────────────────────────────────────────────────
// Prevents a JS error in any module from crashing the entire app.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, textAlign: "center", color: "#e84040", fontFamily: "monospace" }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>Something went wrong in this module.</div>
          <div style={{ fontSize: 12, color: "#7a8099", marginBottom: 16 }}>{String(this.state.error)}</div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e84040", background: "transparent", color: "#e84040", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// GUITAR FRETBOARD MASTERY SUITE v2.0
// ─────────────────────────────────────────────────────────────────────
// Authentic CAGED pentatonic patterns + comprehensive diatonic chord
// families (Major, Natural Minor, Harmonic Minor, Melodic Minor)
// All scales/chords generated from interval logic
// ═══════════════════════════════════════════════════════════════════════

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const ENHARMONIC = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };
const STD_TUNING = [40, 45, 50, 55, 59, 64];
const STD_OPEN = [4, 9, 2, 7, 11, 4];
const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];
const NUM_FRETS = 24;
const FRET_MARKERS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const DOUBLE_MARKERS = [12, 24];

function noteIdx(name) {
  const map = { Db: "C#", Eb: "D#", Fb: "E", Gb: "F#", Ab: "G#", Bb: "A#", Cb: "B" };
  const clean = map[name] || name;
  const i = NOTES.indexOf(clean);
  return i >= 0 ? i : 0;
}
function noteAt(s, f) {
  return (STD_TUNING[s] + f) % 12;
}
function noteName(idx) {
  return NOTES[idx % 12];
}

const INTERVAL_LABELS = {
  0: "R",
  1: "b2",
  2: "2",
  3: "b3",
  4: "3",
  5: "4",
  6: "b5",
  7: "5",
  8: "b6",
  9: "6",
  10: "b7",
  11: "7",
};

const ROOT_OPTIONS = NOTES.map((n) => ({
  value: n,
  label: ENHARMONIC[n] ? `${n} / ${ENHARMONIC[n]}` : n,
}));

function rootFretOnLowE(rootNote) {
  const ri = noteIdx(rootNote);
  for (let f = 0; f <= 12; f += 1) {
    if (noteAt(0, f) === ri) return f;
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════
// PENTATONIC CAGED PATTERNS — Traditional Shapes
// ═══════════════════════════════════════════════════════════════════════

const MINOR_PENT_CAGED = [
  { name: "Pattern 1 (E-shape)", offsets: [[0, 3], [0, 2], [0, 2], [0, 2], [0, 3], [0, 3]] },
  { name: "Pattern 2 (D-shape)", offsets: [[3, 5], [2, 5], [2, 5], [2, 4], [3, 5], [3, 5]] },
  { name: "Pattern 3 (C-shape)", offsets: [[5, 7], [5, 7], [5, 7], [4, 7], [5, 8], [5, 7]] },
  { name: "Pattern 4 (A-shape)", offsets: [[7, 10], [7, 10], [7, 9], [7, 9], [8, 10], [7, 10]] },
  { name: "Pattern 5 (G-shape)", offsets: [[10, 12], [10, 12], [9, 12], [9, 12], [10, 12], [10, 12]] },
];

const MAJOR_PENT_CAGED = [
  { name: "Pattern 1 (E-shape)", offsets: [[0, 2], [-1, 2], [-1, 2], [-1, 1], [0, 2], [0, 2]] },
  { name: "Pattern 2 (D-shape)", offsets: [[2, 4], [2, 4], [2, 4], [1, 4], [2, 5], [2, 4]] },
  { name: "Pattern 3 (C-shape)", offsets: [[4, 7], [4, 7], [4, 6], [4, 6], [5, 7], [4, 7]] },
  { name: "Pattern 4 (A-shape)", offsets: [[7, 9], [7, 9], [6, 9], [6, 9], [7, 9], [7, 9]] },
  { name: "Pattern 5 (G-shape)", offsets: [[9, 12], [9, 11], [9, 11], [9, 11], [9, 12], [9, 12]] },
];

function addBlueNote(patterns, rootFret, rootNoteIdx) {
  const b5 = (rootNoteIdx + 6) % 12;
  return patterns.map((pat) => {
    const lo = rootFret + Math.min(...pat.offsets.flat());
    const hi = rootFret + Math.max(...pat.offsets.flat());
    const newOffsets = pat.offsets.map((strOffsets, s) => {
      const extras = [...strOffsets];
      for (let f = lo; f <= hi; f += 1) {
        if (f >= 0 && f <= NUM_FRETS && noteAt(s, f) === b5) {
          const offset = f - rootFret;
          if (!extras.includes(offset)) extras.push(offset);
        }
      }
      return extras.sort((a, b) => a - b);
    });
    return { ...pat, offsets: newOffsets };
  });
}

function cagedToHighlights(pattern, rootFret, rootNoteIdx) {
  const highlights = [];
  pattern.offsets.forEach((strOffsets, s) => {
    strOffsets.forEach((offset) => {
      const fret = rootFret + offset;
      if (fret >= 0 && fret <= NUM_FRETS) {
        const n = noteAt(s, fret);
        const interval = (n - rootNoteIdx + 12) % 12;
        highlights.push({ string: s, fret, note: n, interval });
      }
    });
  });
  return highlights;
}

function fullNeckHighlights(formula, rootNoteIdx) {
  const scaleNotes = new Set(formula.map((i) => (rootNoteIdx + i) % 12));
  const out = [];
  for (let s = 0; s < 6; s += 1) {
    for (let f = 0; f <= NUM_FRETS; f += 1) {
      const n = noteAt(s, f);
      if (scaleNotes.has(n)) {
        out.push({ string: s, fret: f, note: n, interval: (n - rootNoteIdx + 12) % 12 });
      }
    }
  }
  return out;
}

const SCALE_FORMULAS = {
  "Major Pentatonic": [0, 2, 4, 7, 9],
  "Minor Pentatonic": [0, 3, 5, 7, 10],
  Blues: [0, 3, 5, 6, 7, 10],
  "Melodic Minor Asc": [0, 2, 3, 5, 7, 9, 11],
  "Melodic Minor Desc": [0, 2, 3, 5, 7, 8, 10],
};

// ═══════════════════════════════════════════════════════════════════════
// CHORD ENGINE — Comprehensive Diatonic Families
// ═══════════════════════════════════════════════════════════════════════

const CHORD_FORMULAS = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  dom7: [0, 4, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  minMaj7: [0, 3, 7, 11],
  augMaj7: [0, 4, 8, 11],
  aug7: [0, 4, 8, 10],
};

const CHORD_DISPLAY = {
  maj: "",
  min: "m",
  dim: "°",
  aug: "+",
  maj7: "maj7",
  min7: "m7",
  dom7: "7",
  m7b5: "m7♭5",
  dim7: "°7",
  minMaj7: "m(maj7)",
  augMaj7: "+(maj7)",
  aug7: "+7",
};

const DIATONIC_FAMILIES = {
  Major: [
    { degree: "I", semi: 0, triad: "maj", seventh: "maj7" },
    { degree: "ii", semi: 2, triad: "min", seventh: "min7" },
    { degree: "iii", semi: 4, triad: "min", seventh: "min7" },
    { degree: "IV", semi: 5, triad: "maj", seventh: "maj7" },
    { degree: "V", semi: 7, triad: "maj", seventh: "dom7" },
    { degree: "vi", semi: 9, triad: "min", seventh: "min7" },
    { degree: "vii°", semi: 11, triad: "dim", seventh: "m7b5" },
  ],
  "Natural Minor": [
    { degree: "i", semi: 0, triad: "min", seventh: "min7" },
    { degree: "ii°", semi: 2, triad: "dim", seventh: "m7b5" },
    { degree: "III", semi: 3, triad: "maj", seventh: "maj7" },
    { degree: "iv", semi: 5, triad: "min", seventh: "min7" },
    { degree: "v", semi: 7, triad: "min", seventh: "min7" },
    { degree: "VI", semi: 8, triad: "maj", seventh: "maj7" },
    { degree: "VII", semi: 10, triad: "maj", seventh: "dom7" },
  ],
  "Harmonic Minor": [
    { degree: "i", semi: 0, triad: "min", seventh: "minMaj7" },
    { degree: "ii°", semi: 2, triad: "dim", seventh: "m7b5" },
    { degree: "III+", semi: 3, triad: "aug", seventh: "augMaj7" },
    { degree: "iv", semi: 5, triad: "min", seventh: "min7" },
    { degree: "V", semi: 7, triad: "maj", seventh: "dom7" },
    { degree: "VI", semi: 8, triad: "maj", seventh: "maj7" },
    { degree: "vii°", semi: 11, triad: "dim", seventh: "dim7" },
  ],
  "Melodic Minor": [
    { degree: "i", semi: 0, triad: "min", seventh: "minMaj7" },
    { degree: "ii", semi: 2, triad: "min", seventh: "min7" },
    { degree: "III+", semi: 3, triad: "aug", seventh: "augMaj7" },
    { degree: "IV", semi: 5, triad: "maj", seventh: "dom7" },
    { degree: "V", semi: 7, triad: "maj", seventh: "dom7" },
    { degree: "vi°", semi: 9, triad: "dim", seventh: "m7b5" },
    { degree: "vii°", semi: 11, triad: "dim", seventh: "m7b5" },
  ],
};

function getDiatonicChords(rootNote, familyName, use7ths) {
  const family = DIATONIC_FAMILIES[familyName];
  if (!family) return [];
  const rootI = noteIdx(rootNote);
  return family.map((entry) => {
    const chordRootI = (rootI + entry.semi) % 12;
    const chordRoot = NOTES[chordRootI];
    const type = use7ths ? entry.seventh : entry.triad;
    const formula = CHORD_FORMULAS[type];
    const tones = formula.map((i) => (chordRootI + i) % 12);
    const suffix = CHORD_DISPLAY[type];
    return {
      degree: entry.degree,
      root: chordRoot,
      rootIdx: chordRootI,
      type,
      suffix,
      name: chordRoot + suffix,
      formula,
      tones,
    };
  });
}

const OPEN_SHAPES = {
  C_maj: { frets: [-1, 3, 2, 0, 1, 0] },
  D_maj: { frets: [-1, -1, 0, 2, 3, 2] },
  E_maj: { frets: [0, 2, 2, 1, 0, 0] },
  F_maj: { frets: [1, 3, 3, 2, 1, 1] },
  G_maj: { frets: [3, 2, 0, 0, 0, 3] },
  A_maj: { frets: [-1, 0, 2, 2, 2, 0] },
  B_maj: { frets: [-1, 2, 4, 4, 4, 2] },
  Bb_maj: { frets: [-1, 1, 3, 3, 3, 1] },
  Eb_maj: { frets: [-1, -1, 1, 3, 4, 3] },
  Ab_maj: { frets: [4, 6, 6, 5, 4, 4] },
  Db_maj: { frets: [-1, -1, 3, 1, 2, 1] },
  Gb_maj: { frets: [2, 4, 4, 3, 2, 2] },
  C_min: { frets: [-1, 3, 5, 5, 4, 3] },
  D_min: { frets: [-1, -1, 0, 2, 3, 1] },
  E_min: { frets: [0, 2, 2, 0, 0, 0] },
  F_min: { frets: [1, 3, 3, 1, 1, 1] },
  G_min: { frets: [3, 5, 5, 3, 3, 3] },
  A_min: { frets: [-1, 0, 2, 2, 1, 0] },
  B_min: { frets: [-1, 2, 4, 4, 3, 2] },
  Bb_min: { frets: [-1, 1, 3, 3, 2, 1] },
  Eb_min: { frets: [-1, -1, 1, 3, 4, 2] },
  Ab_min: { frets: [4, 6, 6, 4, 4, 4] },
  "C#_min": { frets: [-1, 4, 6, 6, 5, 4] },
  "F#_min": { frets: [2, 4, 4, 2, 2, 2] },
  "G#_min": { frets: [4, 6, 6, 4, 4, 4] },
  C_dim: { frets: [-1, 3, 4, 5, 4, -1] },
  D_dim: { frets: [-1, -1, 0, 1, 3, 1] },
  E_dim: { frets: [0, 1, 2, 0, -1, -1] },
  F_dim: { frets: [1, 2, 3, 1, -1, -1] },
  "F#_dim": { frets: [2, 3, 4, 2, -1, -1] },
  G_dim: { frets: [3, 4, 5, 3, -1, -1] },
  "G#_dim": { frets: [4, 5, 6, 4, -1, -1] },
  A_dim: { frets: [-1, 0, 1, 2, 1, -1] },
  B_dim: { frets: [-1, 2, 3, 4, 3, -1] },
  Bb_dim: { frets: [-1, 1, 2, 3, 2, -1] },
  "C#_dim": { frets: [-1, 4, 5, 6, 5, -1] },
  "D#_dim": { frets: [-1, -1, 1, 2, 4, 2] },
  C_aug: { frets: [-1, 3, 2, 1, 1, 0] },
  D_aug: { frets: [-1, -1, 0, 3, 3, 2] },
  E_aug: { frets: [0, 3, 2, 1, 1, 0] },
  F_aug: { frets: [1, 0, 3, 2, 2, 1] },
  G_aug: { frets: [3, 2, 1, 0, 0, 3] },
  A_aug: { frets: [-1, 0, 3, 2, 2, 1] },
  Ab_aug: { frets: [4, 3, 2, 1, 1, 0] },
  Bb_aug: { frets: [-1, 1, 0, 3, 3, 2] },
  Eb_aug: { frets: [-1, -1, 1, 0, 0, 3] },
  B_aug: { frets: [-1, 2, 1, 0, 0, 3] },
  C_dom7: { frets: [-1, 3, 2, 3, 1, 0] },
  D_dom7: { frets: [-1, -1, 0, 2, 1, 2] },
  E_dom7: { frets: [0, 2, 0, 1, 0, 0] },
  F_dom7: { frets: [1, 3, 1, 2, 1, 1] },
  G_dom7: { frets: [3, 2, 0, 0, 0, 1] },
  A_dom7: { frets: [-1, 0, 2, 0, 2, 0] },
  B_dom7: { frets: [-1, 2, 1, 2, 0, 2] },
  Bb_dom7: { frets: [-1, 1, 3, 1, 3, 1] },
  Eb_dom7: { frets: [-1, -1, 1, 3, 2, 3] },
  Ab_dom7: { frets: [4, 6, 4, 5, 4, 4] },
  C_maj7: { frets: [-1, 3, 2, 0, 0, 0] },
  D_maj7: { frets: [-1, -1, 0, 2, 2, 2] },
  E_maj7: { frets: [0, 2, 1, 1, 0, 0] },
  F_maj7: { frets: [1, 3, 2, 2, 1, 0] },
  G_maj7: { frets: [3, 2, 0, 0, 0, 2] },
  A_maj7: { frets: [-1, 0, 2, 1, 2, 0] },
  Bb_maj7: { frets: [-1, 1, 3, 2, 3, 1] },
  Eb_maj7: { frets: [-1, -1, 1, 3, 3, 3] },
  Ab_maj7: { frets: [4, 6, 5, 5, 4, 4] },
  C_min7: { frets: [-1, 3, 5, 3, 4, 3] },
  D_min7: { frets: [-1, -1, 0, 2, 1, 1] },
  E_min7: { frets: [0, 2, 0, 0, 0, 0] },
  F_min7: { frets: [1, 3, 1, 1, 1, 1] },
  G_min7: { frets: [3, 5, 3, 3, 3, 3] },
  A_min7: { frets: [-1, 0, 2, 0, 1, 0] },
  B_min7: { frets: [-1, 2, 0, 2, 0, 2] },
  Bb_min7: { frets: [-1, 1, 3, 1, 2, 1] },
  "F#_min7": { frets: [2, 4, 2, 2, 2, 2] },
  "C#_min7": { frets: [-1, 4, 6, 4, 5, 4] },
  "G#_min7": { frets: [4, 6, 4, 4, 4, 4] },
  C_m7b5: { frets: [-1, 3, 4, 3, 4, -1] },
  D_m7b5: { frets: [-1, -1, 0, 1, 1, 1] },
  E_m7b5: { frets: [0, 1, 0, 0, 3, 0] },
  F_m7b5: { frets: [1, 2, 3, 1, 4, 1] },
  "F#_m7b5": { frets: [2, 3, 2, 2, 5, 2] },
  G_m7b5: { frets: [3, 4, 3, 3, 6, 3] },
  "G#_m7b5": { frets: [4, 5, 6, 4, 7, 4] },
  A_m7b5: { frets: [-1, 0, 1, 0, 1, 3] },
  B_m7b5: { frets: [-1, 2, 3, 2, 3, 0] },
  Bb_m7b5: { frets: [-1, 1, 2, 1, 2, -1] },
  C_dim7: { frets: [-1, -1, 1, 2, 1, 2] },
  D_dim7: { frets: [-1, -1, 0, 1, 0, 1] },
  E_dim7: { frets: [0, 1, 2, 0, 2, 0] },
  F_dim7: { frets: [1, 2, 3, 1, 3, 1] },
  "G#_dim7": { frets: [4, 5, 6, 4, 6, 4] },
  B_dim7: { frets: [-1, 2, 3, 1, 3, 1] },
  Bb_dim7: { frets: [-1, 1, 2, 0, 2, 0] },
  C_minMaj7: { frets: [-1, 3, 5, 4, 4, 3] },
  A_minMaj7: { frets: [-1, 0, 2, 1, 1, 0] },
  D_minMaj7: { frets: [-1, -1, 0, 2, 2, 1] },
  E_minMaj7: { frets: [0, 2, 1, 0, 0, 0] },
  F_minMaj7: { frets: [1, 3, 2, 1, 1, 0] },
  "F#_minMaj7": { frets: [2, 4, 3, 2, 2, 1] },
  G_minMaj7: { frets: [3, 5, 4, 3, 3, 2] },
  B_minMaj7: { frets: [-1, 2, 4, 3, 3, 2] },
  Bb_minMaj7: { frets: [-1, 1, 3, 2, 2, 1] },
  "C#_minMaj7": { frets: [-1, 4, 6, 5, 5, 4] },
  "G#_minMaj7": { frets: [4, 6, 5, 4, 4, 3] },
  Eb_augMaj7: { frets: [-1, -1, 1, 0, 0, 3] },
  Ab_augMaj7: { frets: [4, 3, 2, 1, 1, 0] },
};

const BARRE_TEMPLATES = {
  E_maj: { base: [0, 2, 2, 1, 0, 0], rootStr: 0 },
  E_min: { base: [0, 2, 2, 0, 0, 0], rootStr: 0 },
  A_maj: { base: [-1, 0, 2, 2, 2, 0], rootStr: 1 },
  A_min: { base: [-1, 0, 2, 2, 1, 0], rootStr: 1 },
  A_dom7: { base: [-1, 0, 2, 0, 2, 0], rootStr: 1 },
  E_dom7: { base: [0, 2, 0, 1, 0, 0], rootStr: 0 },
  A_min7: { base: [-1, 0, 2, 0, 1, 0], rootStr: 1 },
  E_min7: { base: [0, 2, 0, 0, 0, 0], rootStr: 0 },
  A_maj7: { base: [-1, 0, 2, 1, 2, 0], rootStr: 1 },
  E_maj7: { base: [0, 2, 1, 1, 0, 0], rootStr: 0 },
  A_m7b5: { base: [-1, 0, 1, 0, 1, 0], rootStr: 1 },
  E_dim: { base: [0, 1, 2, 0, 2, 0], rootStr: 0 },
  A_dim: { base: [-1, 0, 1, 2, 1, 0], rootStr: 1 },
  A_minMaj7: { base: [-1, 0, 2, 1, 1, 0], rootStr: 1 },
  E_minMaj7: { base: [0, 2, 1, 0, 0, 0], rootStr: 0 },
};

function getBarreVoicings(rootNote, chordType) {
  const ri = noteIdx(rootNote);
  const typeMap = {
    maj: ["E_maj", "A_maj"],
    min: ["E_min", "A_min"],
    dom7: ["E_dom7", "A_dom7"],
    min7: ["E_min7", "A_min7"],
    maj7: ["E_maj7", "A_maj7"],
    m7b5: ["A_m7b5"],
    dim: ["E_dim", "A_dim"],
    dim7: ["E_dim"],
    minMaj7: ["E_minMaj7", "A_minMaj7"],
    aug: ["E_maj"],
    augMaj7: ["E_maj"],
    aug7: ["E_dom7"],
  };
  const templates = typeMap[chordType] || typeMap.maj;
  const voicings = [];
  templates.forEach((tKey) => {
    const tmpl = BARRE_TEMPLATES[tKey];
    if (!tmpl) return;
    const baseRoot = STD_OPEN[tmpl.rootStr];
    const offset = (ri - baseRoot + 12) % 12;
    if (offset === 0) return;
    const frets = tmpl.base.map((f) => (f === -1 ? -1 : f + offset));
    const shapeName = tKey.split("_")[0];
    voicings.push({
      frets,
      barre: offset,
      name: `${rootNote}${CHORD_DISPLAY[chordType] || ""} (${shapeName}-shape)`,
      startFret: offset,
    });
  });
  return voicings;
}

function getOpenVoicing(rootNote, chordType) {
  const keys = [`${rootNote}_${chordType}`];
  const enh = ENHARMONIC[rootNote];
  if (enh) keys.push(`${enh}_${chordType}`);
  for (const key of keys) {
    if (OPEN_SHAPES[key]) {
      return [
        {
          frets: OPEN_SHAPES[key].frets,
          name: `${rootNote}${CHORD_DISPLAY[chordType] || ""} (open)`,
          startFret: 0,
        },
      ];
    }
  }
  return [];
}

function getInversions(rootNote, chordType, inversion) {
  const formula = CHORD_FORMULAS[chordType];
  if (!formula) return [];
  const ri = noteIdx(rootNote);
  const tones = formula.map((i) => (ri + i) % 12);
  const bassIdx = Math.min(inversion, tones.length - 1);
  const bassNote = tones[bassIdx];
  const stringGroups = [
    [0, 1, 2],
    [1, 2, 3],
    [2, 3, 4],
    [3, 4, 5],
    [0, 1, 2, 3],
    [1, 2, 3, 4],
    [2, 3, 4, 5],
  ];
  const results = [];
  const seen = new Set();

  stringGroups.forEach((group) => {
    const loStr = group[0];
    for (let bassFret = 0; bassFret <= 15; bassFret += 1) {
      if (noteAt(loStr, bassFret) !== bassNote) continue;
      const voicing = new Array(6).fill(-1);
      voicing[loStr] = bassFret;
      const found = new Set([bassNote]);

      for (let gi = 1; gi < group.length; gi += 1) {
        const s = group[gi];
        let best = -1;
        let bestD = 99;
        for (let ff = Math.max(0, bassFret - 3); ff <= bassFret + 5 && ff <= NUM_FRETS; ff += 1) {
          const n = noteAt(s, ff);
          if (tones.includes(n) && Math.abs(ff - bassFret) < bestD) {
            bestD = Math.abs(ff - bassFret);
            best = ff;
          }
        }
        if (best >= 0) {
          voicing[s] = best;
          found.add(noteAt(s, best));
        }
      }

      if (tones.every((t) => found.has(t))) {
        const played = voicing.filter((f) => f >= 0);
        const span = played.length > 0 ? Math.max(...played) - Math.min(...played) : 0;
        if (span <= 5) {
          const key = voicing.join(",");
          if (!seen.has(key)) {
            seen.add(key);
            const invLabel = ["Root Pos", "1st Inv", "2nd Inv", "3rd Inv"][inversion] || "";
            results.push({
              frets: [...voicing],
              name: `${rootNote}${CHORD_DISPLAY[chordType] || ""} ${invLabel}`,
              startFret: played.length ? Math.min(...played) : bassFret,
            });
          }
        }
      }
    }
  });
  return results.slice(0, 24);
}

function voicingToHighlights(frets, rootNoteIdx) {
  return frets
    .map((f, s) => {
      if (f < 0) return null;
      const n = noteAt(s, f);
      return { string: s, fret: f, note: n, interval: (n - rootNoteIdx + 12) % 12 };
    })
    .filter(Boolean);
}

// ── Audio ────────────────────────────────────────────────────────────
// audioCtx is created lazily on first user gesture (required by iOS Safari).
// We always call .resume() before scheduling nodes because iOS suspends
// the context whenever the page loses focus.
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // iOS Safari suspends AudioContext until resumed inside a user-gesture handler
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playNote(midi) {
  const ctx = getAudioCtx();
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.8);
}

function playChord(frets) {
  // Ensure context is running before scheduling (important for iOS)
  getAudioCtx();
  frets.forEach((f, s) => {
    if (f < 0) return;
    setTimeout(() => playNote(STD_TUNING[s] + f), s * 40);
  });
}

// ── Color Palette ────────────────────────────────────────────────────
const K = {
  bg: "#0f1117",
  panel: "#181b24",
  border: "#252a36",
  surface: "#1e2230",
  surfHover: "#262b3a",
  text: "#e2e4ea",
  muted: "#7a8099",
  dim: "#4a5068",
  accent: "#c9a227",
  root: "#e84040",
  rootGlow: "rgba(232,64,64,0.3)",
  int: "#4a9eff",
  intGlow: "rgba(74,158,255,0.2)",
  blues: "#b44aff",
  bluesGlow: "rgba(180,74,255,0.2)",
  third: "#ff9f43",
  fifth: "#2ed573",
  minor3: "#ff6b6b",
  raised: "#ffd93d",
  fretWire: "#8a8070",
  nut: "#d4c8a8",
  str1: "#e8e0d0",
  str6: "#b0a890",
  dot: "rgba(255,255,255,0.08)",
};

const FW = 52;
const SS = 28;
const TM = 40;
const LM = 50;
const FBH = SS * 5;

function Fretboard({ highlights = [], showIntervals = true, colorMode = "scale" }) {
  const [tip, setTip] = useState(null);
  const ref = useRef(null);
  const fretX = useMemo(() => {
    const p = [LM];
    let x = LM;
    for (let i = 1; i <= NUM_FRETS; i += 1) {
      x += FW * Math.pow(0.97, i - 1);
      p.push(x);
    }
    return p;
  }, []);
  const W = fretX[NUM_FRETS] + 20;
  const H = TM + FBH + 50;
  const hmap = useMemo(() => {
    const m = {};
    highlights.forEach((h) => {
      m[`${h.string}-${h.fret}`] = h;
    });
    return m;
  }, [highlights]);

  function clr(h) {
    if (!h) return null;
    if (colorMode === "chord") {
      if (h.interval === 0) return K.root;
      if (h.interval === 3 || h.interval === 4) return K.third;
      if (h.interval === 7) return K.fifth;
      return K.int;
    }
    if (colorMode === "melodic") {
      if (h.interval === 0) return K.root;
      if (h.interval === 3) return K.minor3;
      if (h.interval === 9 || h.interval === 11) return K.raised;
      return K.int;
    }
    if (h.interval === 0) return K.root;
    if (h.interval === 6) return K.blues;
    return K.int;
  }
  function glw(h) {
    if (!h) return null;
    if (h.interval === 0) return K.rootGlow;
    if (h.interval === 6) return K.bluesGlow;
    return K.intGlow;
  }

  return (
    <div style={{ overflowX: "auto", overflowY: "hidden", width: "100%", paddingBottom: 8, WebkitOverflowScrolling: "touch" }}>
      <svg ref={ref} width={W} height={H} style={{ display: "block", minWidth: W, touchAction: "pan-x" }}>
        <defs>
          <linearGradient id="fbG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2a12" />
            <stop offset="100%" stopColor="#251a08" />
          </linearGradient>
        </defs>
        <rect x={LM} y={TM} width={W - LM - 20} height={FBH} rx={4} fill="url(#fbG)" />
        {FRET_MARKERS.map((f) => {
          if (f > NUM_FRETS) return null;
          const cx = (fretX[f - 1] + fretX[f]) / 2;
          if (DOUBLE_MARKERS.includes(f)) {
            return (
              <g key={`m${f}`}>
                <circle cx={cx} cy={TM + FBH * 0.28} r={5} fill={K.dot} />
                <circle cx={cx} cy={TM + FBH * 0.72} r={5} fill={K.dot} />
              </g>
            );
          }
          return <circle key={`m${f}`} cx={cx} cy={TM + FBH / 2} r={5} fill={K.dot} />;
        })}
        {FRET_MARKERS.filter((f) => f <= NUM_FRETS).map((f) => (
          <text
            key={`fn${f}`}
            x={(fretX[f - 1] + fretX[f]) / 2}
            y={TM - 10}
            textAnchor="middle"
            fill={K.dim}
            fontSize={11}
            fontFamily="'JetBrains Mono',monospace"
          >
            {f}
          </text>
        ))}
        <rect x={LM - 2} y={TM - 2} width={5} height={FBH + 4} fill={K.nut} rx={1} />
        {Array.from({ length: NUM_FRETS }, (_, i) => i + 1).map((f) => (
          <line key={f} x1={fretX[f]} y1={TM} x2={fretX[f]} y2={TM + FBH} stroke={K.fretWire} strokeWidth={1.5} opacity={0.5} />
        ))}
        {Array.from({ length: 6 }, (_, i) => {
          const y = TM + (5 - i) * SS;
          const th = 0.8 + i * 0.35;
          const op = 0.6 + (5 - i) * 0.06;
          return (
            <g key={i}>
              <line x1={LM} y1={y} x2={fretX[NUM_FRETS]} y2={y} stroke={K.str6} strokeWidth={th + 0.5} opacity={op * 0.3} />
              <line x1={LM} y1={y} x2={fretX[NUM_FRETS]} y2={y} stroke={K.str1} strokeWidth={th} opacity={op} />
            </g>
          );
        })}
        {STRING_NAMES.map((n, i) => (
          <text
            key={i}
            x={LM - 18}
            y={TM + (5 - i) * SS + 4}
            textAnchor="middle"
            fill={K.muted}
            fontSize={12}
            fontFamily="'JetBrains Mono',monospace"
          >
            {n}
          </text>
        ))}
        {Array.from({ length: 6 }, (_, s) =>
          Array.from({ length: NUM_FRETS + 1 }, (_, f) => {
            const h = hmap[`${s}-${f}`];
            if (!h) return null;
            const y = TM + (5 - s) * SS;
            const x = f === 0 ? LM - 30 : (fretX[f - 1] + fretX[f]) / 2;
            const c = clr(h);
            const g = glw(h);
            const r = h.interval === 0 ? 11 : 9;
            const midi = STD_TUNING[s] + f;
            const nn = noteName(midi);
            const il = INTERVAL_LABELS[h.interval] || "?";
            return (
              <g
                key={`${s}-${f}`}
                style={{ cursor: "pointer" }}
                onClick={() => playNote(midi)}
                onTouchStart={(e) => {
                  // Prevent ghost mouse-click on iOS and enable audio on touch
                  e.preventDefault();
                  playNote(midi);
                  const rc = ref.current.getBoundingClientRect();
                  const t = e.touches[0];
                  setTip({ x: t.clientX - rc.left, y: t.clientY - rc.top - 36, text: `${nn} (${il})` });
                  // Auto-dismiss tooltip after 1.5 s on touch devices
                  setTimeout(() => setTip(null), 1500);
                }}
                onMouseEnter={(e) => {
                  const rc = ref.current.getBoundingClientRect();
                  setTip({ x: e.clientX - rc.left, y: e.clientY - rc.top - 30, text: `${nn} (${il})` });
                }}
                onMouseLeave={() => setTip(null)}
              >
                <circle cx={x} cy={y} r={r + 4} fill={g} opacity={0.6} />
                <circle cx={x} cy={y} r={r} fill={c} opacity={0.9} />
                <circle cx={x} cy={y} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={9}
                  fontWeight="bold"
                  fontFamily="'JetBrains Mono',monospace"
                  style={{ pointerEvents: "none" }}
                >
                  {showIntervals ? il : nn}
                </text>
              </g>
            );
          }),
        )}
        {tip && (
          <g>
            <rect x={tip.x - 40} y={tip.y - 12} width={80} height={24} rx={4} fill="#000" opacity={0.85} />
            <text x={tip.x} y={tip.y + 3} textAnchor="middle" fill="#fff" fontSize={12} fontFamily="'JetBrains Mono',monospace">
              {tip.text}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

function ChordBox({ voicing, rootNote, selected, onSelect }) {
  if (!voicing) return null;
  const { frets, name } = voicing;
  const played = frets.filter((f) => f >= 0);
  const minF = Math.max(1, Math.min(...played.filter((f) => f > 0)) || 1);
  const numF = Math.max(4, Math.max(...played, minF + 3) - minF + 1);
  const dStart = played.some((f) => f > 0) ? minF : 0;
  const ri = noteIdx(rootNote);
  const w = 100;
  const h = 130;
  const sx = 15;
  const sy = 25;
  const sw = 12;
  const sh = Math.min(20, 80 / numF);
  return (
    <div
      onClick={onSelect}
      style={{
        cursor: "pointer",
        background: selected ? K.surfHover : K.surface,
        border: `1px solid ${selected ? K.accent : K.border}`,
        borderRadius: 8,
        padding: "6px 4px",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: 95,
        transition: "all 0.15s",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <text x={w / 2} y={14} textAnchor="middle" fill={K.text} fontSize={9} fontFamily="'JetBrains Mono',monospace" fontWeight="bold">
          {(name || "").substring(0, 18)}
        </text>
        {dStart > 1 && (
          <text x={8} y={sy + sh / 2 + 3} textAnchor="middle" fill={K.muted} fontSize={8} fontFamily="'JetBrains Mono',monospace">
            {dStart}fr
          </text>
        )}
        {dStart <= 1 && <rect x={sx} y={sy - 2} width={sw * 5} height={3} fill={K.nut} />}
        {Array.from({ length: numF + 1 }, (_, i) => (
          <line key={i} x1={sx} y1={sy + i * sh} x2={sx + sw * 5} y2={sy + i * sh} stroke={K.fretWire} strokeWidth={0.8} opacity={0.5} />
        ))}
        {Array.from({ length: 6 }, (_, i) => (
          <line key={i} x1={sx + i * sw} y1={sy} x2={sx + i * sw} y2={sy + numF * sh} stroke={K.str1} strokeWidth={0.8 + i * 0.15} opacity={0.5} />
        ))}
        {frets.map((f, s) => {
          if (f === -1)
            return (
              <text key={s} x={sx + s * sw} y={sy - 6} textAnchor="middle" fill={K.muted} fontSize={10}>
                ×
              </text>
            );
          if (f === 0) return <circle key={s} cx={sx + s * sw} cy={sy - 6} r={4} fill="none" stroke={K.text} strokeWidth={1.5} />;
          const rel = f - dStart + 1;
          const cy2 = sy + (rel - 0.5) * sh;
          const n = noteAt(s, f);
          const iv = (n - ri + 12) % 12;
          const cl = iv === 0 ? K.root : iv === 3 || iv === 4 ? K.third : iv === 7 ? K.fifth : K.int;
          return (
            <g key={s}>
              <circle cx={sx + s * sw} cy={cy2} r={7} fill={cl} opacity={0.9} />
              <text x={sx + s * sw} y={cy2 + 3} textAnchor="middle" fill="#fff" fontSize={7} fontWeight="bold" fontFamily="'JetBrains Mono',monospace">
                {INTERVAL_LABELS[iv]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Btn({ children, active, onClick, color: cl, small }) {
  return (
    <button
      onClick={onClick}
      style={{
        // min 44px height satisfies Apple HIG & Android touch target guidelines
        padding: small ? "10px 12px" : "11px 16px",
        minHeight: 44,
        borderRadius: 6,
        border: `1px solid ${active ? cl || K.accent : K.border}`,
        background: active ? `${cl || K.accent}22` : "transparent",
        color: active ? cl || K.accent : K.muted,
        cursor: "pointer",
        fontSize: small ? 12 : 13,
        fontFamily: "'JetBrains Mono',monospace",
        fontWeight: active ? 600 : 400,
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        // Prevent iOS double-tap zoom and ghost clicks
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}

function Sel({ value, onChange, options, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <span
          style={{
            color: K.muted,
            fontSize: 11,
            fontFamily: "'JetBrains Mono',monospace",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {label}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "10px 12px",
          minHeight: 44,
          borderRadius: 6,
          border: `1px solid ${K.border}`,
          background: K.surface,
          color: K.text,
          fontSize: 16, // iOS zooms in on <16px font-size inputs — keep at 16
          fontFamily: "'JetBrains Mono',monospace",
          cursor: "pointer",
          outline: "none",
          // iOS native select styling
          WebkitAppearance: "none",
          appearance: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {options.map((o) => (
          <option key={o.value || o} value={o.value || o}>
            {o.label || o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Lbl({ children }) {
  return (
    <div
      style={{
        color: K.muted,
        fontSize: 11,
        fontFamily: "'JetBrains Mono',monospace",
        textTransform: "uppercase",
        letterSpacing: 1.5,
        marginTop: 12,
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function Pill({ items }) {
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 8, flexWrap: "wrap" }}>
      {items.map(([color, label], i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: K.muted }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} /> {label}
        </span>
      ))}
    </div>
  );
}

function InfoBar({ children }) {
  return (
    <div style={{ marginTop: 12, padding: "8px 12px", background: K.surface, borderRadius: 8, border: `1px solid ${K.border}` }}>
      <span style={{ color: K.muted, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }}>{children}</span>
    </div>
  );
}

function PentatonicModule() {
  const [root, setRoot] = useState("A");
  const [scaleType, setScaleType] = useState("Minor Pentatonic");
  const [pos, setPos] = useState(0);
  const [showIv, setShowIv] = useState(true);
  const ri = noteIdx(root);
  const rf = rootFretOnLowE(root);
  const formula = SCALE_FORMULAS[scaleType];
  const patterns = useMemo(() => {
    if (scaleType === "Major Pentatonic") return MAJOR_PENT_CAGED;
    if (scaleType === "Blues") return addBlueNote(MINOR_PENT_CAGED, rf, ri);
    return MINOR_PENT_CAGED;
  }, [scaleType, rf, ri]);

  const highlights = useMemo(() => {
    if (pos === 0) return fullNeckHighlights(formula, ri);
    const pat = patterns[pos - 1];
    if (!pat) return [];
    return cagedToHighlights(pat, rf, ri);
  }, [pos, patterns, rf, ri, formula]);

  const legend = [
    [K.root, "Root"],
    [K.int, "Interval"],
  ];
  if (scaleType === "Blues") legend.push([K.blues, "Blue Note (b5)"]);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16, alignItems: "flex-end" }}>
        <Sel label="Root Note" value={root} onChange={setRoot} options={ROOT_OPTIONS} />
        <div>
          <Lbl>Scale Type</Lbl>
          <div style={{ display: "flex", gap: 4 }}>
            {["Major Pentatonic", "Minor Pentatonic", "Blues"].map((t) => (
              <Btn
                key={t}
                active={scaleType === t}
                onClick={() => {
                  setScaleType(t);
                  setPos(0);
                }}
              >
                {t.replace(" Pentatonic", "")}
              </Btn>
            ))}
          </div>
        </div>
        <div>
          <Lbl>CAGED Position</Lbl>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <Btn active={pos === 0} onClick={() => setPos(0)} color={K.accent}>
              Full Neck
            </Btn>
            {patterns.map((_, i) => (
              <Btn key={i} active={pos === i + 1} onClick={() => setPos(i + 1)} small>
                {i + 1}
              </Btn>
            ))}
          </div>
        </div>
        <Btn active={showIv} onClick={() => setShowIv(!showIv)} small>
          {showIv ? "Intervals" : "Notes"}
        </Btn>
      </div>
      {pos > 0 && (
        <div style={{ marginBottom: 8, color: K.accent, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }}>
          {patterns[pos - 1]?.name} — Frets {rf + Math.min(...patterns[pos - 1].offsets.flat())}–
          {rf + Math.max(...patterns[pos - 1].offsets.flat())}
        </div>
      )}
      <Pill items={legend} />
      <Fretboard highlights={highlights} showIntervals={showIv} colorMode="scale" />
      <InfoBar>
        {root} {scaleType}: {formula.map((i) => INTERVAL_LABELS[i]).join(" – ")} ({formula.map((i) => NOTES[(ri + i) % 12]).join(" – ")})
      </InfoBar>
    </div>
  );
}

function ChordModule() {
  const [keyRoot, setKeyRoot] = useState("C");
  const [family, setFamily] = useState("Major");
  const [use7ths, setUse7ths] = useState(false);
  const [selDeg, setSelDeg] = useState(0);
  const [voicingCat, setVoicingCat] = useState("Open");
  const [inversion, setInversion] = useState(0);
  const [selV, setSelV] = useState(null);
  const [showIv, setShowIv] = useState(true);

  const diaChords = useMemo(() => getDiatonicChords(keyRoot, family, use7ths), [keyRoot, family, use7ths]);
  const ac = diaChords[selDeg];

  const voicings = useMemo(() => {
    if (!ac) return [];
    const { root: cr, type } = ac;
    if (voicingCat === "Open") return getOpenVoicing(cr, type);
    if (voicingCat === "Barre") return getBarreVoicings(cr, type);
    if (voicingCat === "Inversions") return getInversions(cr, type, inversion);
    return [];
  }, [ac, voicingCat, inversion]);

  useEffect(() => {
    setSelV(voicings[0] || null);
  }, [voicings]);

  useEffect(() => {
    setSelDeg(0);
  }, [keyRoot, family, use7ths]);

  const highlights = useMemo(() => {
    if (!selV || !ac) return [];
    return voicingToHighlights(selV.frets, ac.rootIdx);
  }, [selV, ac]);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12, alignItems: "flex-end" }}>
        <Sel label="Key" value={keyRoot} onChange={setKeyRoot} options={ROOT_OPTIONS} />
        <div>
          <Lbl>Key Type</Lbl>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {["Major", "Natural Minor", "Harmonic Minor", "Melodic Minor"].map((f) => (
              <Btn key={f} active={family === f} onClick={() => setFamily(f)} small>
                {f}
              </Btn>
            ))}
          </div>
        </div>
        <Btn active={use7ths} onClick={() => setUse7ths(!use7ths)} small>
          {use7ths ? "7th Chords" : "Triads"}
        </Btn>
      </div>

      <Lbl>{`Diatonic Chords in ${keyRoot} ${family}`}</Lbl>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
        {diaChords.map((ch, i) => (
          <button
            key={i}
            onClick={() => {
              setSelDeg(i);
              setSelV(null);
            }}
            style={{
              padding: "10px 14px",
              minHeight: 52,
              borderRadius: 8,
              cursor: "pointer",
              border: `1px solid ${selDeg === i ? K.accent : K.border}`,
              background: selDeg === i ? `${K.accent}22` : K.surface,
              color: selDeg === i ? K.accent : K.text,
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              transition: "all 0.15s",
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span style={{ fontSize: 10, color: selDeg === i ? K.accent : K.muted }}>{ch.degree}</span>
            <span>{ch.name}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12, alignItems: "flex-end" }}>
        <div>
          <Lbl>Voicing Type</Lbl>
          <div style={{ display: "flex", gap: 4 }}>
            {["Open", "Barre", "Inversions"].map((c) => (
              <Btn
                key={c}
                active={voicingCat === c}
                onClick={() => {
                  setVoicingCat(c);
                  setSelV(null);
                }}
              >
                {c}
              </Btn>
            ))}
          </div>
        </div>
        {voicingCat === "Inversions" && (
          <div>
            <Lbl>Inversion</Lbl>
            <div style={{ display: "flex", gap: 4 }}>
              {["Root Pos", "1st Inv", "2nd Inv"].map((l, i) => (
                <Btn
                  key={i}
                  active={inversion === i}
                  onClick={() => {
                    setInversion(i);
                    setSelV(null);
                  }}
                  small
                >
                  {l}
                </Btn>
              ))}
            </div>
          </div>
        )}
        <Btn active={showIv} onClick={() => setShowIv(!showIv)} small>
          {showIv ? "Intervals" : "Notes"}
        </Btn>
        {selV && (
          <Btn onClick={() => playChord(selV.frets)} color="#2ed573" small>
            ▶ Strum
          </Btn>
        )}
      </div>

      <Pill items={[[K.root, "Root"], [K.third, "3rd"], [K.fifth, "5th"], [K.int, "Other"]]} />

      {voicings.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16, maxHeight: 200, overflowY: "auto", padding: 4, WebkitOverflowScrolling: "touch" }}>
          {voicings.map((v, i) => (
            <ChordBox
              key={i}
              voicing={v}
              rootNote={ac?.root || keyRoot}
              selected={selV && selV.frets.join(",") === v.frets.join(",")}
              onSelect={() => setSelV(v)}
            />
          ))}
        </div>
      ) : (
        <div style={{ padding: 16, color: K.muted, textAlign: "center", fontStyle: "italic", fontSize: 13 }}>
          {`No ${voicingCat.toLowerCase()} voicing for ${ac?.name || ""}. Try another category.`}
        </div>
      )}

      <Fretboard highlights={highlights} showIntervals={showIv} colorMode="chord" />

      {ac && (
        <InfoBar>
          {`${ac.name} (${ac.degree} of ${keyRoot} ${family}): ${ac.formula
            .map((i) => INTERVAL_LABELS[i] || i)
            .join(" – ")} → ${ac.tones.map((t) => NOTES[t]).join(" – ")}`}
        </InfoBar>
      )}
    </div>
  );
}

function getMelodicMinorPositions(rootNote, direction) {
  const formula = direction === "Ascending" ? SCALE_FORMULAS["Melodic Minor Asc"] : SCALE_FORMULAS["Melodic Minor Desc"];
  const ri = noteIdx(rootNote);
  const scaleNotes = new Set(formula.map((i) => (ri + i) % 12));
  const all = [];
  for (let s = 0; s < 6; s += 1) {
    for (let f = 0; f <= NUM_FRETS; f += 1) {
      const n = noteAt(s, f);
      if (scaleNotes.has(n)) all.push({ string: s, fret: f, note: n, interval: (n - ri + 12) % 12 });
    }
  }
  const lowE = [];
  for (let f = 0; f <= 14; f += 1) {
    if (scaleNotes.has(noteAt(0, f))) lowE.push(f);
  }
  const positions = lowE.slice(0, 7).map((sf, idx) => {
    const lo = sf;
    const hi = sf + 5;
    return { id: idx + 1, fretLo: lo, fretHi: hi, notes: all.filter((n) => n.fret >= lo && n.fret <= hi) };
  });
  return { allNotes: all, positions };
}

function MelodicMinorModule() {
  const [root, setRoot] = useState("A");
  const [dir, setDir] = useState("Ascending");
  const [pos, setPos] = useState(0);
  const [showIv, setShowIv] = useState(true);
  const { allNotes, positions } = useMemo(() => getMelodicMinorPositions(root, dir), [root, dir]);
  const highlights = pos === 0 ? allNotes : positions[pos - 1]?.notes || [];
  const formula = dir === "Ascending" ? SCALE_FORMULAS["Melodic Minor Asc"] : SCALE_FORMULAS["Melodic Minor Desc"];
  const ri = noteIdx(root);
  const legend = [
    [K.root, "Root"],
    [K.minor3, "b3 (Minor 3rd)"],
  ];
  if (dir === "Ascending") legend.push([K.raised, "6 & 7 (Raised)"]);
  else legend.push([K.int, "Natural Minor Intervals"]);

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16, alignItems: "flex-end" }}>
        <Sel label="Root Note" value={root} onChange={setRoot} options={ROOT_OPTIONS} />
        <div>
          <Lbl>Direction</Lbl>
          <div style={{ display: "flex", gap: 4 }}>
            <Btn
              active={dir === "Ascending"}
              onClick={() => {
                setDir("Ascending");
                setPos(0);
              }}
            >
              Ascending (Jazz)
            </Btn>
            <Btn
              active={dir === "Descending"}
              onClick={() => {
                setDir("Descending");
                setPos(0);
              }}
            >
              Descending (Natural)
            </Btn>
          </div>
        </div>
        <div>
          <Lbl>3NPS Position</Lbl>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <Btn active={pos === 0} onClick={() => setPos(0)} color={K.accent}>
              Full
            </Btn>
            {positions.map((_, i) => (
              <Btn key={i} active={pos === i + 1} onClick={() => setPos(i + 1)} small>
                {i + 1}
              </Btn>
            ))}
          </div>
        </div>
        <Btn active={showIv} onClick={() => setShowIv(!showIv)} small>
          {showIv ? "Intervals" : "Notes"}
        </Btn>
      </div>
      <Pill items={legend} />
      <Fretboard highlights={highlights} showIntervals={showIv} colorMode="melodic" />
      <InfoBar>
        {`${root} Melodic Minor (${dir}): ${formula.map((i) => INTERVAL_LABELS[i]).join(" – ")} (${formula
          .map((i) => NOTES[(ri + i) % 12])
          .join(" – ")})`}
      </InfoBar>
      {dir === "Ascending" && (
        <InfoBar>
          Jazz Melodic Minor — same ascending and descending. The raised 6th and 7th distinguish it from Natural Minor.
        </InfoBar>
      )}
    </div>
  );
}

export default function App() {
  const [mod, setMod] = useState("pentatonic");
  return (
    // Fonts are loaded in index.html <head> — no <link> inside JSX body
    <div style={{ background: K.bg, color: K.text, minHeight: "100vh", fontFamily: "'Instrument Sans','SF Pro',-apple-system,sans-serif" }}>
      <div
        style={{
          padding: "16px 20px",
          borderBottom: `1px solid ${K.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `linear-gradient(135deg,${K.accent},${K.root})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            🎸
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.5 }}>Guitar Fretboard Mastery</div>
            <div style={{ fontSize: 10, color: K.muted, fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase", letterSpacing: 1 }}>
              CAGED • Diatonic Families • Melodic Minor
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, background: K.panel, borderRadius: 8, padding: 3, border: `1px solid ${K.border}` }}>
          {[
            { id: "pentatonic", label: "Pentatonic", icon: "♫" },
            { id: "chords", label: "Chords", icon: "♯" },
            { id: "melodic", label: "Melodic Minor", icon: "♭" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setMod(t.id)}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: mod === t.id ? `${K.accent}25` : "transparent",
                color: mod === t.id ? K.accent : K.muted,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: mod === t.id ? 600 : 400,
                fontFamily: "'Instrument Sans',sans-serif",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <ErrorBoundary key={mod}>
          {mod === "pentatonic" && <PentatonicModule />}
          {mod === "chords" && <ChordModule />}
          {mod === "melodic" && <MelodicMinorModule />}
        </ErrorBoundary>
      </div>
      <div style={{ padding: "8px 20px 16px", textAlign: "center" }}>
        <span style={{ color: K.dim, fontSize: 11, fontFamily: "'JetBrains Mono',monospace" }}>
          Click any note to hear it • Hover for note name + interval • All patterns from interval logic
        </span>
      </div>
    </div>
  );
}
