import { useState, useRef, useEffect, useMemo } from "react";

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const ENHARMONIC = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };
const STD_TUNING = [40, 45, 50, 55, 59, 64];
const STD_OPEN = [4, 9, 2, 7, 11, 4];
const STRING_NAMES = ["E", "A", "D", "G", "B", "e"];
const NUM_FRETS = 24;
const FRET_MARKERS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const DOUBLE_MARKERS = [12, 24];

function noteIdx(name) {
  const map = { "Db": "C#", "Eb": "D#", "Fb": "E", "Gb": "F#", "Ab": "G#", "Bb": "A#", "Cb": "B" };
  const clean = map[name] || name;
  const i = NOTES.indexOf(clean);
  return i >= 0 ? i : 0;
}
function noteAt(s, f) { return (STD_TUNING[s] + f) % 12; }
function noteName(idx) { return NOTES[idx % 12]; }

const INTERVAL_LABELS = {
  0: "R", 1: "b2", 2: "2", 3: "b3", 4: "3", 5: "4", 6: "b5", 7: "5", 8: "b6", 9: "6", 10: "b7", 11: "7"
};

const ROOT_OPTIONS = NOTES.map((n) => ({
  value: n, label: ENHARMONIC[n] ? `${n} / ${ENHARMONIC[n]}` : n
}));

function rootFretOnLowE(rootNote) {
  const ri = noteIdx(rootNote);
  for (let f = 0; f <= 12; f++) {
    if (noteAt(0, f) === ri) return f;
  }
  return 0;
}

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
      for (let f = lo; f <= hi; f++) {
        if (f >= 0 && f <= NUM_FRETS && noteAt(s, f) === b5) {
          const offset = f - rootFret;
          if (!extras.includes(offset)) extras.push(offset);
        }
      }
      return extras.sort((a, b) => a - b);
    });
    return { ...pat, name: pat.name, offsets: newOffsets };
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
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= NUM_FRETS; f++) {
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
  "Blues": [0, 3, 5, 6, 7, 10],
  "Melodic Minor Asc": [0, 2, 3, 5, 7, 9, 11],
  "Melodic Minor Desc": [0, 2, 3, 5, 7, 8, 10],
};

const CHORD_FORMULAS = {
  "maj": [0, 4, 7], "min": [0, 3, 7], "dim": [0, 3, 6], "aug": [0, 4, 8],
  "maj7": [0, 4, 7, 11], "min7": [0, 3, 7, 10], "dom7": [0, 4, 7, 10],
  "m7b5": [0, 3, 6, 10], "dim7": [0, 3, 6, 9], "minMaj7": [0, 3, 7, 11],
  "augMaj7": [0, 4, 8, 11], "aug7": [0, 4, 8, 10],
};

const CHORD_DISPLAY = {
  "maj": "", "min": "m", "dim": "°", "aug": "+", "maj7": "maj7", "min7": "m7", "dom7": "7", "m7b5": "m7♭5",
  "dim7": "°7", "minMaj7": "m(maj7)", "augMaj7": "+(maj7)", "aug7": "+7",
};

const DIATONIC_FAMILIES = {
  "Major": [
    { degree: "I", semi: 0, triad: "maj", seventh: "maj7" }, { degree: "ii", semi: 2, triad: "min", seventh: "min7" },
    { degree: "iii", semi: 4, triad: "min", seventh: "min7" }, { degree: "IV", semi: 5, triad: "maj", seventh: "maj7" },
    { degree: "V", semi: 7, triad: "maj", seventh: "dom7" }, { degree: "vi", semi: 9, triad: "min", seventh: "min7" },
    { degree: "vii°", semi: 11, triad: "dim", seventh: "m7b5" },
  ],
  "Natural Minor": [
    { degree: "i", semi: 0, triad: "min", seventh: "min7" }, { degree: "ii°", semi: 2, triad: "dim", seventh: "m7b5" },
    { degree: "III", semi: 3, triad: "maj", seventh: "maj7" }, { degree: "iv", semi: 5, triad: "min", seventh: "min7" },
    { degree: "v", semi: 7, triad: "min", seventh: "min7" }, { degree: "VI", semi: 8, triad: "maj", seventh: "maj7" },
    { degree: "VII", semi: 10, triad: "maj", seventh: "dom7" },
  ],
  "Harmonic Minor": [
    { degree: "i", semi: 0, triad: "min", seventh: "minMaj7" }, { degree: "ii°", semi: 2, triad: "dim", seventh: "m7b5" },
    { degree: "III+", semi: 3, triad: "aug", seventh: "augMaj7" }, { degree: "iv", semi: 5, triad: "min", seventh: "min7" },
    { degree: "V", semi: 7, triad: "maj", seventh: "dom7" }, { degree: "VI", semi: 8, triad: "maj", seventh: "maj7" },
    { degree: "vii°", semi: 11, triad: "dim", seventh: "dim7" },
  ],
  "Melodic Minor": [
    { degree: "i", semi: 0, triad: "min", seventh: "minMaj7" }, { degree: "ii", semi: 2, triad: "min", seventh: "min7" },
    { degree: "III+", semi: 3, triad: "aug", seventh: "augMaj7" }, { degree: "IV", semi: 5, triad: "maj", seventh: "dom7" },
    { degree: "V", semi: 7, triad: "maj", seventh: "dom7" }, { degree: "vi°", semi: 9, triad: "dim", seventh: "m7b5" },
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
    return { degree: entry.degree, root: chordRoot, rootIdx: chordRootI, type, suffix, name: chordRoot + suffix, formula, tones };
  });
}

function App() {
  const [keyRoot, setKeyRoot] = useState("A");
  const [scaleType, setScaleType] = useState("Minor Pentatonic");
  const [position, setPosition] = useState(0);
  const [showIntervals, setShowIntervals] = useState(true);

  const rootIndex = noteIdx(keyRoot);
  const rootFret = rootFretOnLowE(keyRoot);
  const formula = SCALE_FORMULAS[scaleType];

  const patterns = useMemo(() => {
    if (scaleType === "Major Pentatonic") return MAJOR_PENT_CAGED;
    if (scaleType === "Blues") return addBlueNote(MINOR_PENT_CAGED, rootFret, rootIndex);
    return MINOR_PENT_CAGED;
  }, [scaleType, rootFret, rootIndex]);

  const highlights = useMemo(() => {
    if (position === 0) return fullNeckHighlights(formula, rootIndex);
    const pat = patterns[position - 1];
    if (!pat) return [];
    return cagedToHighlights(pat, rootFret, rootIndex);
  }, [position, patterns, formula, rootFret, rootIndex]);

  return (
    <main style={{ background: "#0f1117", color: "#e2e4ea", minHeight: "100vh", padding: 20, fontFamily: "sans-serif" }}>
      <h1>Guitar Fretboard Mastery Suite v2.0</h1>
      <p>Interactive CAGED pentatonics and diatonic chord family logic engine.</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <select value={keyRoot} onChange={(e) => setKeyRoot(e.target.value)}>
          {ROOT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={scaleType} onChange={(e) => { setScaleType(e.target.value); setPosition(0); }}>
          {Object.keys(SCALE_FORMULAS).filter((s) => s.includes("Pentatonic") || s === "Blues").map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button onClick={() => setShowIntervals((v) => !v)}>{showIntervals ? "Intervals" : "Notes"}</button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => setPosition(0)}>Full Neck</button>
        {patterns.map((_, i) => <button key={i} onClick={() => setPosition(i + 1)}>{i + 1}</button>)}
      </div>

      <pre style={{ marginTop: 16, padding: 12, background: "#1e2230", borderRadius: 8 }}>
        {JSON.stringify({
          keyRoot,
          scaleType,
          position,
          notes: highlights.slice(0, 20).map((h) => ({ string: h.string, fret: h.fret, note: NOTES[h.note], interval: INTERVAL_LABELS[h.interval] })),
          diatonicSample: getDiatonicChords(keyRoot, "Major", true).slice(0, 3),
        }, null, 2)}
      </pre>
    </main>
  );
}

export default App;
