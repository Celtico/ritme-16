import {
  DECAY_MAX,
  DECAY_MIN,
  defaultParams,
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
export interface Track {
  id: string;
  name: string;
  kind: VoiceKind;
  /** Nom d'un color de la paleta de globals.css. */
  color: string;
  steps: Cell[];
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
    mix: defaultMix(),
    sound: defaultParams(kind),
  };
}

/** Una pista per tipus de veu, en l'ordre en què els declara voices.ts. */
export function defaultTracks(): Track[] {
  return VOICE_KINDS.map((k) => makeTrack(k));
}

export function emptyPattern(name = "Sense títol"): Pattern {
  return {
    name,
    bpm: 104,
    swing: 0,
    tracks: defaultTracks(),
    macros: defaultMacros(),
    returns: defaultReturns(),
  };
}

export function cloneTrack(t: Track): Track {
  return {
    ...t,
    steps: [...t.steps],
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

function build(
  name: string,
  bpm: number,
  swing: number,
  lanes: Partial<Record<VoiceKind, string>>,
): Pattern {
  const p = emptyPattern(name);
  p.bpm = bpm;
  p.swing = swing;
  for (const [kind, spec] of Object.entries(lanes)) {
    const track = p.tracks.find((t) => t.kind === (kind as VoiceKind));
    if (track) track.steps = lane(spec as string);
  }
  return p;
}

export const PRESETS: Pattern[] = [
  build("Quatre per terra", 124, 0, {
    bombo: "X...x...X...x...",
    charles: "..x...x...x...x.",
    palmada: "....X.......X...",
    charlesObert: "............x...",
  }),
  build("Trencat", 92, 0.18, {
    bombo: "X.....x..X......",
    caixa: "....X.......X...",
    charles: "x.x.x.x.x.x.xxx.",
    aro: "..x........x....",
  }),
  build("Cambra lenta", 76, 0.32, {
    bombo: "X.......x.......",
    caixa: "....X.......X..x",
    charles: "x.x.x.x.x.x.x.x.",
    cencerro: "........x.......",
    timbal: "..............x.",
  }),
];
