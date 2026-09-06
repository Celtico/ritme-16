import {
  defaultParams,
  KINDS,
  VOICE_KINDS,
  type VoiceKind,
  type VoiceParams,
} from "./voices";

export const STEPS = 16;

export {
  DECAY_MAX,
  DECAY_MIN,
  defaultParams,
  KINDS,
  VOICE_KINDS,
} from "./voices";
export type { VoiceKind, VoiceParams } from "./voices";

/** 0 = silenci, 1 = normal, 2 = accent */
export type Cell = 0 | 1 | 2;

export interface ChannelMix {
  volume: number; // dB, de -32 a +6
  muted: boolean;
  solo: boolean;
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

export interface Pattern {
  name: string;
  bpm: number;
  /** 0 = recte, 0.6 = molt swingat */
  swing: number;
  tracks: Track[];
}

export function emptyLane(): Cell[] {
  return Array<Cell>(STEPS).fill(0);
}

export function defaultMix(): ChannelMix {
  return { volume: 0, muted: false, solo: false };
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
  return { name, bpm: 104, swing: 0, tracks: defaultTracks() };
}

export function cloneTrack(t: Track): Track {
  return {
    ...t,
    steps: [...t.steps],
    mix: { ...t.mix },
    sound: { ...t.sound },
  };
}

export function clonePattern(p: Pattern): Pattern {
  return {
    name: p.name,
    bpm: p.bpm,
    swing: p.swing,
    tracks: p.tracks.map(cloneTrack),
  };
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
