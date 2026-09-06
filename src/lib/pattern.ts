import type { ChordKind, Key } from "./theory";
import {
  DECAY_MAX,
  DECAY_MIN,
  defaultParams,
  isMelodic,
  KINDS,
  MAX_MACROS,
  MAX_TRACKS,
  VOICE_KINDS,
  type ModTarget,
  type SyncRate,
  type VoiceKind,
  type VoiceParams,
} from "./voices";

export const STEPS = 16;

export * from "./theory";
export { isMelodic, MELODIC_KINDS, midiToHz } from "./voices";
export {
  canRoute,
  DECAY_MAX,
  MAX_TRACKS,
  TRACK_COLORS,
  DECAY_MIN,
  defaultFilter,
  defaultParams,
  FAMILY_COLOR,
  KINDS,
  LFO_SHAPES,
  MAX_LFO,
  MAX_MACROS,
  lfoValueAt,
  MOD_ROUTES,
  MOD_SOURCES,
  MOD_TARGETS,
  SOURCE_FAMILY,
  SOURCE_NAMES,
  SYNC_RATES,
  TARGET_NAMES,
  VOICE_KINDS,
} from "./voices";
export type {
  BlockId,
  TrackColor,
  EnvParams,
  FilterParams,
  FilterType,
  LfoParams,
  LfoShape,
  Mod,
  ModSource,
  ModTarget,
  SyncRate,
  VoiceKind,
  VoiceParams,
} from "./voices";

/** 0 = silenci, 1 = normal, 2 = accent */
export type Cell = 0 | 1 | 2;

export interface ChannelMix {
  volume: number; // dB, de -32 a +6
  muted: boolean;
  solo: boolean;
  /** -1 tot a l'esquerra, 0 al centre, 1 tot a la dreta. */
  pan: number;
  /** 0..1 cap al retorn A (reverb). */
  sendA: number;
  /** 0..1 cap al retorn B (retard). */
  sendB: number;
}

/** El retorn A: una reverberació. */
export interface ReverbReturn {
  /** Segons de cua. */
  decay: number;
  /** 0..1, el nivell amb què torna al bus. */
  wet: number;
  muted: boolean;
}

/** El retorn B: un retard realimentat, sincronitzat al tempo. */
export interface DelayReturn {
  time: SyncRate;
  /** 0..0,9. Per damunt, no s'apaga mai. */
  feedback: number;
  wet: number;
  muted: boolean;
}

export interface Returns {
  a: ReverbReturn;
  b: DelayReturn;
}

export function defaultReturns(): Returns {
  return {
    a: { decay: 2.2, wet: 1, muted: false },
    b: { time: "8n", feedback: 0.35, wet: 1, muted: false },
  };
}

/**
 * Una pista del patró. L'ordre de l'array `tracks` és l'ordre visual, i `id`
 * és el que fa servir el kit per trobar la seva cadena de síntesi.
 */
/** Una nota del baix. `length` és en passos: cobreix els que vénen darrere. */
export interface BassNote {
  midi: number;
  length: number;
  accent: boolean;
}

/** Un acord: es resol amb la tonalitat del patró en el moment de sonar. */
export interface ChordNote {
  degree: number;
  kind: ChordKind;
  length: number;
  octave: -1 | 0 | 1;
}

export type BassStep = BassNote | null;
export type ChordStep = ChordNote | null;

/**
 * La nota des d'on es munten els acords. El Do3: així una tríada de la menor
 * cau a La3-Do4-Mi4, just per damunt del baix i sense envair-lo. Amb el Do
 * central quedava una octava massa amunt i sonava a caixa de música.
 */
export const CHORD_BASE_MIDI = 48;

export const BASS_MAX_LENGTH = 4;
export const CHORD_MAX_LENGTH = 8;

export function emptyBass(): BassStep[] {
  return Array<BassStep>(STEPS).fill(null);
}

export function emptyChords(): ChordStep[] {
  return Array<ChordStep>(STEPS).fill(null);
}

export interface Track {
  id: string;
  name: string;
  kind: VoiceKind;
  /** Nom d'un color de la paleta de globals.css. */
  color: string;
  /** Els passos de percussió. A les pistes melòdiques, tot a zero. */
  steps: Cell[];
  /** Només a les pistes de tipus "baix". */
  bass?: BassStep[];
  /** Només a les pistes de tipus "acords". */
  chords?: ChordStep[];
  mix: ChannelMix;
  sound: VoiceParams;
}

/** Una assignació de macro: quin paràmetre de quina pista, i quant. */
export interface MacroAssignment {
  trackId: string;
  param: ModTarget;
  /** -1..1 */
  amount: number;
}

/**
 * Els macros viuen al patró i no a la pista, perquè el sentit que tenen és
 * justament moure coses de pistes diferents alhora. Aplicar-ne un és escriure
 * els paràmetres de destinació: no hi ha cap node d'àudio de macro.
 */
export interface Macro {
  name: string;
  /** 0..1 */
  value: number;
  assignments: MacroAssignment[];
}

export function defaultMacros(): Macro[] {
  return Array.from({ length: MAX_MACROS }, (_, i) => ({
    name: `Macro ${i + 1}`,
    value: 0,
    assignments: [],
  }));
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/**
 * Aplicar un macro és escriure els paràmetres de destinació; no hi ha cap node
 * d'àudio de macro. El càlcul es fa sempre des del valor de fàbrica de la veu,
 * no des del que hi hagi ara: així el macro no va derivant cada cop que es mou
 * i, tornant-lo a zero, la veu queda com estava.
 */
export function applyMacroAssignment(
  track: Track,
  assignment: MacroAssignment,
  value: number,
): VoiceParams {
  const base = defaultParams(track.kind);
  const amount = assignment.amount * value;
  const s = { ...track.sound };
  switch (assignment.param) {
    case "cutoff":
      s.filter = {
        ...s.filter,
        cutoff: clamp(base.filter.cutoff * Math.pow(4, amount), 20, 20000),
      };
      break;
    case "pitch":
      s.pitch = clamp(Math.round(base.pitch + amount * 12), -12, 12);
      break;
    case "decay":
      s.decay = clamp(base.decay * Math.pow(4, amount), DECAY_MIN, DECAY_MAX);
      break;
    case "drive":
      s.drive = clamp(base.drive + amount, 0, 1);
      break;
  }
  return s;
}

export interface Pattern {
  name: string;
  bpm: number;
  /** 0 = recte, 0.6 = molt swingat */
  swing: number;
  tracks: Track[];
  macros: Macro[];
  returns: Returns;
  /** Tonalitat i mode. Els acords són graus; el baix, MIDI absoluts. */
  key: Key;
}

export function emptyLane(): Cell[] {
  return Array<Cell>(STEPS).fill(0);
}

export function defaultMix(): ChannelMix {
  return { volume: 0, muted: false, solo: false, pan: 0, sendA: 0, sendB: 0 };
}

/**
 * Una pista nova del tipus demanat. L'id per defecte és el tipus mateix, que
 * és el que fa que els patrons migrats i els presets tinguin ids estables;
 * quan se n'afegeixin de repetides caldrà passar-n'hi un d'únic.
 */
export function makeTrack(kind: VoiceKind, id: string = kind): Track {
  return {
    id,
    name: KINDS[kind].name,
    kind,
    color: KINDS[kind].color,
    steps: emptyLane(),
    ...(kind === "baix" ? { bass: emptyBass() } : {}),
    ...(kind === "acords" ? { chords: emptyChords() } : {}),
    mix: defaultMix(),
    sound: defaultParams(kind),
  };
}

/** La fonamental per defecte: la menor, que no porta cap alteració. */
export const DEFAULT_KEY: Key = { root: 9, mode: "minor" };

/**
 * Les vuit de percussió més el baix i els acords, en aquest ordre: la
 * percussió a dalt i les melòdiques a sota, separades.
 */
export function defaultTracks(): Track[] {
  return [
    ...VOICE_KINDS.filter((k) => !isMelodic(k)),
    ...VOICE_KINDS.filter(isMelodic),
  ].map((k) => makeTrack(k));
}

export function emptyPattern(name = "Sense títol"): Pattern {
  return {
    name,
    bpm: 104,
    swing: 0,
    tracks: defaultTracks(),
    macros: defaultMacros(),
    returns: defaultReturns(),
    key: DEFAULT_KEY,
  };
}

export function cloneTrack(t: Track): Track {
  return {
    ...t,
    steps: [...t.steps],
    ...(t.bass ? { bass: t.bass.map((n) => (n ? { ...n } : null)) } : {}),
    ...(t.chords ? { chords: t.chords.map((c) => (c ? { ...c } : null)) } : {}),
    mix: { ...t.mix },
    sound: {
      ...t.sound,
      filter: { ...t.sound.filter },
      envFilter: { ...t.sound.envFilter },
      lfo: t.sound.lfo.map((l) => ({ ...l })),
      mods: t.sound.mods.map((m) => ({ ...m })),
    },
  };
}

export function clonePattern(p: Pattern): Pattern {
  return {
    name: p.name,
    bpm: p.bpm,
    swing: p.swing,
    tracks: p.tracks.map(cloneTrack),
    macros: p.macros.map((m) => ({
      ...m,
      assignments: m.assignments.map((a) => ({ ...a })),
    })),
    returns: { a: { ...p.returns.a }, b: { ...p.returns.b } },
    key: { ...p.key },
  };
}

/**
 * Un id que no xoqui amb cap dels que ja hi ha. Els ids lliguen la pista amb
 * la seva cadena de síntesi: dues pistes amb el mateix id en compartirien una.
 */
export function uniqueTrackId(p: Pattern, base: string): string {
  const presos = new Set(p.tracks.map((t) => t.id));
  if (!presos.has(base)) return base;
  for (let n = 2; ; n++) {
    const provi = `${base}-${n}`;
    if (!presos.has(provi)) return provi;
  }
}

/** Afegeix una pista del tipus demanat al final. Si ja n'hi ha prou, no fa res. */
export function addTrack(p: Pattern, kind: VoiceKind): Pattern {
  if (p.tracks.length >= MAX_TRACKS) return p;
  const next = clonePattern(p);
  next.tracks.push(makeTrack(kind, uniqueTrackId(next, kind)));
  return next;
}

/** Copia una pista sencera, passos i so inclosos, just a sota de l'original. */
export function duplicateTrack(p: Pattern, id: string): Pattern {
  if (p.tracks.length >= MAX_TRACKS) return p;
  const i = p.tracks.findIndex((t) => t.id === id);
  if (i < 0) return p;
  const next = clonePattern(p);
  const copia = cloneTrack(next.tracks[i]);
  copia.id = uniqueTrackId(next, id);
  copia.name = `${next.tracks[i].name} (còpia)`;
  next.tracks.splice(i + 1, 0, copia);
  return next;
}

/** Treu una pista. Mai no en deixa cap patró sense pistes. */
export function removeTrack(p: Pattern, id: string): Pattern {
  if (p.tracks.length <= 1) return p;
  if (!p.tracks.some((t) => t.id === id)) return p;
  const next = clonePattern(p);
  next.tracks = next.tracks.filter((t) => t.id !== id);
  // els macros que hi apuntaven es queden orfes
  next.macros = next.macros.map((m) => ({
    ...m,
    assignments: m.assignments.filter((a) => a.trackId !== id),
  }));
  return next;
}

/** Mou una pista amunt (-1) o avall (+1). Als extrems, es queda on és. */
export function moveTrack(p: Pattern, id: string, delta: number): Pattern {
  const i = p.tracks.findIndex((t) => t.id === id);
  if (i < 0) return p;
  const j = i + delta;
  if (j < 0 || j >= p.tracks.length) return p;
  const next = clonePattern(p);
  const [moguda] = next.tracks.splice(i, 1);
  next.tracks.splice(j, 0, moguda);
  return next;
}

/**
 * Col·loca una nota en una fila melòdica. Una nota cobreix els passos de
 * darrere seu, així que abans esborra el que hi hagi a sota i, si topa amb la
 * següent, s'escurça per no trepitjar-la.
 */
export function placeNote<T extends { length: number }>(
  fila: (T | null)[],
  index: number,
  nota: T | null,
  maxLength: number,
): (T | null)[] {
  const out = [...fila];
  if (index < 0 || index >= out.length) return out;

  // treu la nota que ja cobrís aquest pas
  for (let i = index; i >= 0; i--) {
    const n = out[i];
    if (n) {
      if (i + n.length > index) out[i] = null;
      break;
    }
  }

  if (!nota) return out;

  let length = Math.max(1, Math.min(maxLength, nota.length));
  for (let j = index + 1; j < Math.min(index + length, out.length); j++) {
    if (out[j]) {
      length = j - index;
      break;
    }
  }
  length = Math.min(length, out.length - index);
  out[index] = { ...nota, length };
  return out;
}

/** Quina nota cobreix aquest pas, si n'hi ha cap. */
export function noteCovering<T extends { length: number }>(
  fila: (T | null)[],
  index: number,
): { start: number; note: T } | null {
  for (let i = index; i >= 0; i--) {
    const n = fila[i];
    if (n) return i + n.length > index ? { start: i, note: n } : null;
  }
  return null;
}

export function findTrack(p: Pattern, id: string): Track | undefined {
  return p.tracks.find((t) => t.id === id);
}

/** Hi ha alguna pista en solitari? Determina qui calla i qui sona. */
export function anySolo(p: Pattern): boolean {
  return p.tracks.some((t) => t.mix.solo);
}

export function isAudible(p: Pattern, t: Track): boolean {
  if (t.mix.muted) return false;
  return !anySolo(p) || t.mix.solo;
}

/**
 * Escriu una línia a partir d'una cadena de 16 caràcters.
 * "." = silenci, "x" = normal, "X" = accent. Molt més llegible que un array.
 */
export function lane(spec: string): Cell[] {
  const cells = emptyLane();
  for (let i = 0; i < Math.min(spec.length, STEPS); i++) {
    const c = spec[i];
    cells[i] = c === "X" ? 2 : c === "x" ? 1 : 0;
  }
  return cells;
}

/** [pas, MIDI, llargada] — el baix, en notes absolutes. */
type BassSpec = [number, number, number][];
/** [pas, grau, llargada, octava] — els acords, en graus de la tonalitat. */
type ChordSpec = [number, number, number, -1 | 0 | 1][];

function build(
  name: string,
  bpm: number,
  swing: number,
  lanes: Partial<Record<VoiceKind, string>>,
  key: Key = DEFAULT_KEY,
  bass: BassSpec = [],
  chords: ChordSpec = [],
): Pattern {
  const p = emptyPattern(name);
  p.bpm = bpm;
  p.swing = swing;
  p.key = { ...key };
  for (const [kind, spec] of Object.entries(lanes)) {
    const track = p.tracks.find((t) => t.kind === (kind as VoiceKind));
    if (track) track.steps = lane(spec as string);
  }
  const baix = p.tracks.find((t) => t.kind === "baix");
  if (baix?.bass) {
    for (const [i, midi, length] of bass) {
      baix.bass[i] = { midi, length, accent: i % 4 === 0 };
    }
  }
  const acords = p.tracks.find((t) => t.kind === "acords");
  if (acords?.chords) {
    for (const [i, degree, length, octave] of chords) {
      acords.chords[i] = { degree, kind: "triad", length, octave };
    }
  }
  return p;
}

// Notes MIDI que fem servir als exemples, per no escriure xifres pelades.
const LA2 = 45;
const SI2 = 47;
const DO3 = 48;
const RE3 = 50;
const MI3 = 52;
const FA2 = 41;
const SOL2 = 43;

const LA_MENOR: Key = { root: 9, mode: "minor" };
const RE_DORIC: Key = { root: 2, mode: "dorian" };

export const PRESETS: Pattern[] = [
  // i - VI - III - VII a la menor, amb el baix fent fonamental i quinta
  build(
    "Quatre per terra",
    124,
    0,
    {
      bombo: "X...x...X...x...",
      charles: "..x...x...x...x.",
      palmada: "....X.......X...",
      charlesObert: "............x...",
    },
    LA_MENOR,
    [
      [0, LA2, 2],
      [2, MI3, 2],
      [4, FA2, 2],
      [6, DO3, 2],
      [8, DO3, 2],
      [10, SOL2, 2],
      [12, SOL2, 2],
      [14, RE3, 2],
    ],
    [
      [0, 1, 4, 0],
      [4, 6, 4, 0],
      [8, 3, 4, 0],
      [12, 7, 4, 0],
    ],
  ),
  // i - IV a re dòric: el IV major és el que fa que soni dòric i no menor
  build(
    "Trencat",
    92,
    0.18,
    {
      bombo: "X.....x..X......",
      caixa: "....X.......X...",
      charles: "x.x.x.x.x.x.xxx.",
      aro: "..x........x....",
    },
    RE_DORIC,
    [
      [0, RE3 - 12, 3],
      [3, RE3 - 12, 1],
      [6, DO3, 2],
      [8, SOL2, 3],
      [11, SI2, 1],
      [14, DO3, 2],
    ],
    [
      [0, 1, 8, 0],
      [8, 4, 8, 0],
    ],
  ),
  // dos acords llargs i un baix que amb prou feines es mou
  build(
    "Cambra lenta",
    76,
    0.32,
    {
      bombo: "X.......x.......",
      caixa: "....X.......X..x",
      charles: "x.x.x.x.x.x.x.x.",
      cencerro: "........x.......",
      timbal: "..............x.",
    },
    LA_MENOR,
    [
      [0, LA2, 4],
      [6, DO3, 2],
      [8, FA2, 4],
      [14, DO3, 2],
    ],
    [
      [0, 1, 8, 0],
      [8, 6, 8, 0],
    ],
  ),
];
