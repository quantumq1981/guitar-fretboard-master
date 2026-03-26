import { useState, useMemo } from "react";

/* ── Music theory constants ── */
const NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const ENHARMONIC = {"C#":"Db","D#":"Eb","F#":"Gb","G#":"Ab","A#":"Bb"};
const STD_TUNING = [40,45,50,55,59,64];
const STRING_NAMES = ["E","A","D","G","B","e"];
const FRET_MARKERS = [3,5,7,9,12,15,17,19,21,24];
const DOUBLE_MARKERS = new Set([12,24]);
const INTERVAL_LABELS = {0:"R",1:"b2",2:"2",3:"b3",4:"3",5:"4",6:"b5",7:"5",8:"b6",9:"6",10:"b7",11:"7"};

function noteIdx(name) {
  const map = {"Db":"C#","Eb":"D#","Fb":"E","Gb":"F#","Ab":"G#","Bb":"A#","Cb":"B"};
  const clean = map[name] || name;
  const i = NOTES.indexOf(clean);
  return i >= 0 ? i : 0;
}
function noteAt(s, f) { return (STD_TUNING[s] + f) % 12; }

/* ── CAGED patterns ── */
const MINOR_PENT_CAGED = [
  {name:"Pattern 1 (E-shape)", offsets:[[0,3],[0,2],[0,2],[0,2],[0,3],[0,3]]},
  {name:"Pattern 2 (D-shape)", offsets:[[3,5],[2,5],[2,5],[2,4],[3,5],[3,5]]},
  {name:"Pattern 3 (C-shape)", offsets:[[5,7],[5,7],[5,7],[4,7],[5,8],[5,7]]},
  {name:"Pattern 4 (A-shape)", offsets:[[7,10],[7,10],[7,9],[7,9],[8,10],[7,10]]},
  {name:"Pattern 5 (G-shape)", offsets:[[10,12],[10,12],[9,12],[9,12],[10,12],[10,12]]},
];
const MAJOR_PENT_CAGED = [
  {name:"Pattern 1 (E-shape)", offsets:[[0,2],[-1,2],[-1,2],[-1,1],[0,2],[0,2]]},
  {name:"Pattern 2 (D-shape)", offsets:[[2,4],[2,4],[2,4],[1,4],[2,5],[2,4]]},
  {name:"Pattern 3 (C-shape)", offsets:[[4,7],[4,7],[4,6],[4,6],[5,7],[4,7]]},
  {name:"Pattern 4 (A-shape)", offsets:[[7,9],[7,9],[6,9],[6,9],[7,9],[7,9]]},
  {name:"Pattern 5 (G-shape)", offsets:[[9,12],[9,11],[9,11],[9,11],[9,12],[9,12]]},
];

function rootFretOnLowE(rootNote) {
  const ri = noteIdx(rootNote);
  for (let f = 0; f <= 12; f++) if (noteAt(0, f) === ri) return f;
  return 0;
}

function addBlueNote(patterns, rootFret, rootNoteIdx) {
  const b5 = (rootNoteIdx + 6) % 12;
  return patterns.map(pat => {
    const lo = rootFret + Math.min(...pat.offsets.flat());
    const hi = rootFret + Math.max(...pat.offsets.flat());
    const newOffsets = pat.offsets.map((strOffsets, s) => {
      const extras = [...strOffsets];
      for (let f = lo; f <= hi; f++) {
        if (f >= 0 && f <= 24 && noteAt(s, f) === b5) {
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
    strOffsets.forEach(offset => {
      const fret = rootFret + offset;
      if (fret >= 0 && fret <= 24) {
        const n = noteAt(s, fret);
        highlights.push({ string: s, fret, note: n, interval: (n - rootNoteIdx + 12) % 12 });
      }
    });
  });
  return highlights;
}

function fullNeckHighlights(formula, rootNoteIdx) {
  const scaleNotes = new Set(formula.map(i => (rootNoteIdx + i) % 12));
  const out = [];
  for (let s = 0; s < 6; s++) for (let f = 0; f <= 24; f++) {
    const n = noteAt(s, f);
    if (scaleNotes.has(n)) out.push({ string: s, fret: f, note: n, interval: (n - rootNoteIdx + 12) % 12 });
  }
  return out;
}

/* ── Scale & chord formulas ── */
const SCALE_FORMULAS = {
  "Major Pentatonic": [0,2,4,7,9],
  "Minor Pentatonic": [0,3,5,7,10],
  "Blues":            [0,3,5,6,7,10],
  "Melodic Minor Asc":[0,2,3,5,7,9,11],
  "Melodic Minor Desc":[0,2,3,5,7,8,10],
};

const CHORD_FORMULAS = {
  "maj":[0,4,7],"min":[0,3,7],"dim":[0,3,6],"aug":[0,4,8],
  "maj7":[0,4,7,11],"min7":[0,3,7,10],"dom7":[0,4,7,10],
  "m7b5":[0,3,6,10],"dim7":[0,3,6,9],"minMaj7":[0,3,7,11],
  "augMaj7":[0,4,8,11],"aug7":[0,4,8,10],
};
const CHORD_DISPLAY = {
  "maj":"","min":"m","dim":"°","aug":"+","maj7":"maj7","min7":"m7","dom7":"7",
  "m7b5":"m7♭5","dim7":"°7","minMaj7":"m(maj7)","augMaj7":"+(maj7)","aug7":"+7",
};

const DIATONIC_FAMILIES = {
  "Major":[
    {degree:"I",semi:0,triad:"maj",seventh:"maj7"},{degree:"ii",semi:2,triad:"min",seventh:"min7"},
    {degree:"iii",semi:4,triad:"min",seventh:"min7"},{degree:"IV",semi:5,triad:"maj",seventh:"maj7"},
    {degree:"V",semi:7,triad:"maj",seventh:"dom7"},{degree:"vi",semi:9,triad:"min",seventh:"min7"},
    {degree:"vii°",semi:11,triad:"dim",seventh:"m7b5"},
  ],
  "Natural Minor":[
    {degree:"i",semi:0,triad:"min",seventh:"min7"},{degree:"ii°",semi:2,triad:"dim",seventh:"m7b5"},
    {degree:"III",semi:3,triad:"maj",seventh:"maj7"},{degree:"iv",semi:5,triad:"min",seventh:"min7"},
    {degree:"v",semi:7,triad:"min",seventh:"min7"},{degree:"VI",semi:8,triad:"maj",seventh:"maj7"},
    {degree:"VII",semi:10,triad:"maj",seventh:"dom7"},
  ],
  "Harmonic Minor":[
    {degree:"i",semi:0,triad:"min",seventh:"minMaj7"},{degree:"ii°",semi:2,triad:"dim",seventh:"m7b5"},
    {degree:"III+",semi:3,triad:"aug",seventh:"augMaj7"},{degree:"iv",semi:5,triad:"min",seventh:"min7"},
    {degree:"V",semi:7,triad:"maj",seventh:"dom7"},{degree:"VI",semi:8,triad:"maj",seventh:"maj7"},
    {degree:"vii°",semi:11,triad:"dim",seventh:"dim7"},
  ],
  "Melodic Minor":[
    {degree:"i",semi:0,triad:"min",seventh:"minMaj7"},{degree:"ii",semi:2,triad:"min",seventh:"min7"},
    {degree:"III+",semi:3,triad:"aug",seventh:"augMaj7"},{degree:"IV",semi:5,triad:"maj",seventh:"dom7"},
    {degree:"V",semi:7,triad:"maj",seventh:"dom7"},{degree:"vi°",semi:9,triad:"dim",seventh:"m7b5"},
    {degree:"vii°",semi:11,triad:"dim",seventh:"m7b5"},
  ],
};

function getDiatonicChords(rootNote, familyName, use7ths) {
  const family = DIATONIC_FAMILIES[familyName];
  if (!family) return [];
  const rootI = noteIdx(rootNote);
  return family.map(entry => {
    const chordRootI = (rootI + entry.semi) % 12;
    const chordRoot = NOTES[chordRootI];
    const type = use7ths ? entry.seventh : entry.triad;
    return { degree: entry.degree, name: chordRoot + CHORD_DISPLAY[type], rootIdx: chordRootI, formula: CHORD_FORMULAS[type] };
  });
}

/* ── Fretboard SVG ── */
const SHOW_FRETS = 15;

function Fretboard({ highlights, showIntervals }) {
  const SY = 44, FW = 56, LABEL_W = 28, OPEN_W = 52, TOP = 24, DOT_R = 15;
  const NUT_X = LABEL_W + OPEN_W;
  const W = NUT_X + FW * SHOW_FRETS + 24;

  // String y positions: string 5 (high e) at top, string 0 (low E) at bottom
  const sy = s => TOP + (5 - s) * SY + SY / 2;
  // Note x positions: fret 0 (open) left of nut, fret f centered between fret lines f-1 and f
  const nx = f => f === 0 ? LABEL_W + OPEN_W / 2 : NUT_X + (f - 0.5) * FW;

  const neckTop = sy(0);
  const neckBot = sy(5);
  const svgH = neckBot + DOT_R + 10;

  // Middle y for inlay dots
  const midY = (neckTop + neckBot) / 2;
  const upY  = (neckTop + sy(2)) / 2;
  const dnY  = (sy(3) + neckBot) / 2;

  return (
    <div style={{ overflowX: "auto", background: "#1c1008", borderRadius: 10, margin: "12px 0" }}>
      <svg width={W} height={svgH} style={{ display: "block" }}>
        {/* Fretboard background */}
        <rect x={NUT_X} y={neckTop} width={FW * SHOW_FRETS} height={neckBot - neckTop} fill="#3d2510" />

        {/* String lines */}
        {[0,1,2,3,4,5].map(s => (
          <line key={s} x1={LABEL_W + 8} y1={sy(s)} x2={W - 10} y2={sy(s)}
            stroke="#b89050" strokeWidth={0.8 + (5 - s) * 0.22} />
        ))}

        {/* Nut */}
        <rect x={NUT_X - 4} y={neckTop} width={7} height={neckBot - neckTop} fill="#d0b468" />

        {/* Fret lines */}
        {Array.from({ length: SHOW_FRETS }, (_, i) => i + 1).map(f => (
          <line key={f} x1={NUT_X + f * FW} y1={neckTop} x2={NUT_X + f * FW} y2={neckBot}
            stroke="#6a4a22" strokeWidth={1.5} />
        ))}

        {/* Inlay dots */}
        {FRET_MARKERS.filter(f => f <= SHOW_FRETS).map(f => {
          const cx = NUT_X + (f - 0.5) * FW;
          return DOUBLE_MARKERS.has(f) ? (
            <g key={f}>
              <circle cx={cx} cy={upY} r={5} fill="#4e3018" opacity={0.75} />
              <circle cx={cx} cy={dnY} r={5} fill="#4e3018" opacity={0.75} />
            </g>
          ) : (
            <circle key={f} cx={cx} cy={midY} r={5} fill="#4e3018" opacity={0.75} />
          );
        })}

        {/* Fret numbers */}
        {[3,5,7,9,12,15].filter(f => f <= SHOW_FRETS).map(f => (
          <text key={f} x={NUT_X + (f - 0.5) * FW} y={TOP - 6}
            textAnchor="middle" fill="#666" fontSize={11}>{f}</text>
        ))}

        {/* String names */}
        {[0,1,2,3,4,5].map(s => (
          <text key={s} x={8} y={sy(s) + 5} textAnchor="start"
            fill="#b0b8c8" fontSize={13} fontWeight="600">{STRING_NAMES[s]}</text>
        ))}

        {/* Note dots */}
        {highlights.filter(h => h.fret <= SHOW_FRETS).map((h, i) => {
          const cx = nx(h.fret), cy = sy(h.string);
          const isRoot = h.interval === 0;
          const label = showIntervals ? INTERVAL_LABELS[h.interval] : NOTES[h.note];
          return (
            <g key={`${h.string}-${h.fret}-${i}`}>
              <circle cx={cx} cy={cy} r={DOT_R}
                fill={isRoot ? "#c93030" : "#2860b0"}
                stroke={isRoot ? "#ff8888" : "#60a4f0"} strokeWidth={1.5} />
              <text x={cx} y={cy + 4} textAnchor="middle"
                fill="white" fontSize={10} fontWeight="700">{label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Chord grid ── */
function ChordDisplay({ chords, selected, onSelect }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
      {chords.map((c, i) => (
        <div key={i} onClick={() => onSelect(selected === i ? null : i)} style={{
          background: selected === i ? "#1e2535" : "#161a24",
          border: selected === i ? "1.5px solid #c8a030" : "1px solid #252b38",
          borderRadius: 8, padding: "10px 16px", minWidth: 72, textAlign: "center", cursor: "pointer",
        }}>
          <div style={{ color: selected === i ? "#c8a030" : "#555", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>{c.degree}</div>
          <div style={{ color: "#c8a030", fontSize: 17, fontWeight: 700 }}>{c.name}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Shared button style ── */
const btnStyle = (active) => ({
  padding: "6px 14px", borderRadius: 6, cursor: "pointer",
  border: active ? "1.5px solid #c8a030" : "1.5px solid #333",
  background: "transparent",
  color: active ? "#c8a030" : "#666",
  fontSize: 13, fontFamily: "sans-serif", fontWeight: active ? 700 : 400,
});

const ROOT_OPTIONS = NOTES.map(n => ({ value: n, label: ENHARMONIC[n] ? `${n} / ${ENHARMONIC[n]}` : n }));

/* ── App ── */
export default function App() {
  const [tab, setTab] = useState("pentatonic");

  // Shared
  const [keyRoot, setKeyRoot] = useState("A");
  const [showIntervals, setShowIntervals] = useState(true);

  // Pentatonic tab
  const [scaleVariant, setScaleVariant] = useState("Minor"); // "Major" | "Minor" | "Blues"
  const [position, setPosition] = useState(0);

  // Chords tab
  const [chordFamily, setChordFamily] = useState("Major");
  const [use7ths, setUse7ths] = useState(false);
  const [selectedChord, setSelectedChord] = useState(null);

  // Melodic minor tab
  const [melForm, setMelForm] = useState("Asc");

  const rootIndex = useMemo(() => noteIdx(keyRoot), [keyRoot]);
  const rootFret  = useMemo(() => rootFretOnLowE(keyRoot), [keyRoot]);

  const chords = useMemo(() => getDiatonicChords(keyRoot, chordFamily, use7ths), [keyRoot, chordFamily, use7ths]);
  const chordHighlights = useMemo(() => {
    if (selectedChord === null) return [];
    const c = chords[selectedChord];
    return c ? fullNeckHighlights(c.formula, c.rootIdx) : [];
  }, [selectedChord, chords]);

  const scaleTypeKey = scaleVariant === "Major" ? "Major Pentatonic"
    : scaleVariant === "Blues" ? "Blues" : "Minor Pentatonic";
  const formula = SCALE_FORMULAS[scaleTypeKey];

  const patterns = useMemo(() => {
    if (scaleVariant === "Major") return MAJOR_PENT_CAGED;
    if (scaleVariant === "Blues") return addBlueNote(MINOR_PENT_CAGED, rootFret, rootIndex);
    return MINOR_PENT_CAGED;
  }, [scaleVariant, rootFret, rootIndex]);

  const pentHighlights = useMemo(() => {
    if (position === 0) return fullNeckHighlights(formula, rootIndex);
    const pat = patterns[position - 1];
    return pat ? cagedToHighlights(pat, rootFret, rootIndex) : [];
  }, [position, patterns, formula, rootFret, rootIndex]);

  const melFormula = SCALE_FORMULAS[melForm === "Asc" ? "Melodic Minor Asc" : "Melodic Minor Desc"];
  const melHighlights = useMemo(() => fullNeckHighlights(melFormula, rootIndex), [melFormula, rootIndex]);

  const scaleSummary = `${keyRoot} ${scaleVariant} Pentatonic: `
    + formula.map(i => INTERVAL_LABELS[i]).join(" – ")
    + ` (${formula.map(i => NOTES[(rootIndex + i) % 12]).join(" – ")})`;

  const melSummary = `${keyRoot} Melodic Minor (${melForm === "Asc" ? "Ascending" : "Descending"}): `
    + melFormula.map(i => INTERVAL_LABELS[i]).join(" – ");

  const tabStyle = (active) => ({
    padding: "10px 18px", cursor: "pointer", background: "transparent", border: "none",
    borderBottom: active ? "2px solid #c8a030" : "2px solid transparent",
    color: active ? "#c8a030" : "#555",
    fontSize: 13, fontWeight: active ? 700 : 400, letterSpacing: 1, textTransform: "uppercase",
    fontFamily: "sans-serif",
  });

  const labelStyle = { fontSize: 10, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 6 };

  const showFretboard = tab === "pentatonic" || tab === "melodic" || (tab === "chords" && selectedChord !== null);

  return (
    <main style={{ background: "#0d0f14", color: "#d0d4e0", minHeight: "100vh", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 0 20px" }}>
        <h1 style={{ margin: 0, fontSize: 22, color: "#e0e4f0", fontWeight: 700 }}>Guitar Fretboard Mastery</h1>
        <p style={{ margin: "4px 0 16px", color: "#444", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
          CAGED • DIATONIC FAMILIES • MELODIC MINOR
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1e2230" }}>
          <button style={tabStyle(tab === "pentatonic")} onClick={() => setTab("pentatonic")}>♪ Pentatonic</button>
          <button style={tabStyle(tab === "chords")} onClick={() => setTab("chords")}># Chords</button>
          <button style={tabStyle(tab === "melodic")} onClick={() => setTab("melodic")}>♭ Melodic Minor</button>
        </div>
      </div>

      <div style={{ padding: "20px 20px 0 20px" }}>
        {/* Controls row */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap", marginBottom: 18 }}>
          {/* Root note */}
          <div>
            <div style={labelStyle}>Root Note</div>
            <select value={keyRoot} onChange={e => { setKeyRoot(e.target.value); setSelectedChord(null); }} style={{
              background: "#161920", color: "#d0d4e0", border: "1px solid #2a2d35",
              borderRadius: 6, padding: "7px 10px", fontSize: 14, cursor: "pointer",
            }}>
              {ROOT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {tab === "pentatonic" && (
            <div>
              <div style={labelStyle}>Scale Type</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["Major","Minor","Blues"].map(v => (
                  <button key={v} style={btnStyle(scaleVariant === v)}
                    onClick={() => { setScaleVariant(v); setPosition(0); }}>{v}</button>
                ))}
              </div>
            </div>
          )}

          {tab === "chords" && (
            <>
              <div>
                <div style={labelStyle}>Key Family</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Major","Natural Minor","Harmonic Minor","Melodic Minor"].map(f => (
                    <button key={f} style={btnStyle(chordFamily === f)} onClick={() => { setChordFamily(f); setSelectedChord(null); }}>{f}</button>
                  ))}
                </div>
              </div>
              <button style={{ ...btnStyle(use7ths), alignSelf: "flex-end" }} onClick={() => { setUse7ths(v => !v); setSelectedChord(null); }}>7ths</button>
            </>
          )}

          {tab === "melodic" && (
            <div>
              <div style={labelStyle}>Form</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["Asc","Ascending"],["Desc","Descending"]].map(([k,l]) => (
                  <button key={k} style={btnStyle(melForm === k)} onClick={() => setMelForm(k)}>{l}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CAGED positions (pentatonic only) */}
        {tab === "pentatonic" && (
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>CAGED Position</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={btnStyle(position === 0)} onClick={() => setPosition(0)}>Full Neck</button>
              {patterns.map((_, i) => (
                <button key={i} style={btnStyle(position === i + 1)} onClick={() => setPosition(i + 1)}>{i + 1}</button>
              ))}
            </div>
          </div>
        )}

        {/* Intervals toggle + legend */}
        {showFretboard && (
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
            <button style={btnStyle(showIntervals)} onClick={() => setShowIntervals(v => !v)}>
              {showIntervals ? "Intervals" : "Notes"}
            </button>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#c93030", display: "inline-block" }} />
              <span style={{ fontSize: 12, color: "#777" }}>Root</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#2860b0", display: "inline-block" }} />
              <span style={{ fontSize: 12, color: "#777" }}>Interval</span>
            </span>
          </div>
        )}

        {/* Content */}
        {tab === "pentatonic" && (
          <>
            <Fretboard highlights={pentHighlights} showIntervals={showIntervals} />
            <div style={{ padding: "10px 14px", background: "#111520", borderRadius: 8,
              fontSize: 13, color: "#777", fontFamily: "monospace", lineHeight: 1.5 }}>
              {scaleSummary}
            </div>
          </>
        )}

        {tab === "chords" && (
          <>
            <ChordDisplay chords={chords} selected={selectedChord} onSelect={setSelectedChord} />
            {selectedChord !== null && chords[selectedChord] && (
              <>
                <Fretboard highlights={chordHighlights} showIntervals={showIntervals} />
                <div style={{ padding: "10px 14px", background: "#111520", borderRadius: 8,
                  fontSize: 13, color: "#777", fontFamily: "monospace", lineHeight: 1.5 }}>
                  {chords[selectedChord].name}: {chords[selectedChord].formula.map(i => INTERVAL_LABELS[i]).join(" – ")}
                  {" "}({chords[selectedChord].formula.map(i => NOTES[(chords[selectedChord].rootIdx + i) % 12]).join(" – ")})
                </div>
              </>
            )}
          </>
        )}

        {tab === "melodic" && (
          <>
            <Fretboard highlights={melHighlights} showIntervals={showIntervals} />
            <div style={{ padding: "10px 14px", background: "#111520", borderRadius: 8,
              fontSize: 13, color: "#777", fontFamily: "monospace", lineHeight: 1.5 }}>
              {melSummary}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
