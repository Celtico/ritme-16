/**
 * Teoria mínima per a les pistes melòdiques. Cap dependència: ni Tone, ni
 * React, ni res. Tot són nombres de semitons.
 *
 * Conveni d'octava: com a Tone.js i a la notació científica, el MIDI 60 és el
 * Do central i es diu "Do4".
 */

export type Mode =
  | "major"
  | "minor"
  | "dorian"
  | "mixolydian"
  | "pentMin"
  | "pentMaj";

export interface Key {
  /** Fonamental com a classe d'altura, 0 = Do … 11 = Si. */
  root: number;
  mode: Mode;
}

export type ChordKind = "triad" | "seventh";

/** Semitons de cada grau respecte de la fonamental. */
const SCALES: Record<Mode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  pentMin: [0, 3, 5, 7, 10],
  pentMaj: [0, 2, 4, 7, 9],
};

export const MODE_NAMES: Record<Mode, string> = {
  major: "major",
  minor: "menor",
  dorian: "dòric",
  mixolydian: "mixolidi",
  pentMin: "pentatònica menor",
  pentMaj: "pentatònica major",
};

/** Noms llatins, mai anglosaxons. */
const NOTE_NAMES = [
  "Do",
  "Do#",
  "Re",
  "Re#",
  "Mi",
  "Fa",
  "Fa#",
  "Sol",
  "Sol#",
  "La",
  "La#",
  "Si",
];

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Semitons de l'escala respecte de la fonamental. */
export function scaleNotes(key: Key): number[] {
  return [...SCALES[key.mode]];
}

/** Classes d'altura (0..11) que formen part de l'escala. */
export function scalePitchClasses(key: Key): number[] {
  return scaleNotes(key).map((i) => mod(key.root + i, 12));
}

/**
 * El grau `index` de l'escala, comptant des de 0 i pujant d'octava quan
 * es dona la volta. Accepta índexs més grans que l'escala i negatius.
 */
function degreeOffset(intervals: number[], index: number): number {
  const n = intervals.length;
  return intervals[mod(index, n)] + 12 * Math.floor(index / n);
}

/**
 * Munta l'acord del grau demanat apilant terceres de l'escala, que és el que
 * fa que a menor el I surti menor i el VI major sense haver-ho de dir.
 *
 * Amb les escales pentatòniques, que només tenen cinc graus, els graus 6 i 7
 * donen la volta i tornen a l'octava següent. És estrany demanar-ho, però val
 * més que doni un acord coherent que no pas que peti.
 */
export function degreeToChord(
  key: Key,
  degree: number,
  kind: ChordKind,
): number[] {
  const intervals = scaleNotes(key);
  const start = degree - 1;
  const steps = kind === "seventh" ? [0, 2, 4, 6] : [0, 2, 4];
  return steps.map((s) => key.root + degreeOffset(intervals, start + s));
}

/**
 * La nota de l'escala més propera. Si en queden dues a la mateixa distància
 * es tria la de sota, perquè baixar sona menys sorprenent que pujar.
 */
export function snapToScale(key: Key, midi: number): number {
  const pcs = new Set(scalePitchClasses(key));
  for (let d = 0; d <= 6; d++) {
    if (pcs.has(mod(midi - d, 12))) return midi - d;
    if (pcs.has(mod(midi + d, 12))) return midi + d;
  }
  return midi;
}

export function isInScale(key: Key, midi: number): boolean {
  return scalePitchClasses(key).includes(mod(midi, 12));
}

/** "Do4", "Re#3"… El MIDI 60 és Do4. */
export function midiToName(midi: number): string {
  return `${NOTE_NAMES[mod(midi, 12)]}${Math.floor(midi / 12) - 1}`;
}

/** Només el nom de la classe d'altura, per al selector de tonalitat. */
export function pitchClassName(pc: number): string {
  return NOTE_NAMES[mod(pc, 12)];
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];

/**
 * Numeració romana del grau, en majúscules si l'acord surt major i en
 * minúscules si surt menor. Els disminuïts porten un "°".
 */
export function degreeRoman(key: Key, degree: number): string {
  const [a, b, c] = degreeToChord(key, degree, "triad");
  const tercera = b - a;
  const quinta = c - a;
  const base = ROMAN[mod(degree - 1, 7)];
  if (quinta === 6) return `${base.toLowerCase()}°`;
  return tercera <= 3 ? base.toLowerCase() : base;
}
