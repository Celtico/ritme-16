export const STEPS = 16;

export type VoiceId =
  | "bombo"
  | "caixa"
  | "palmada"
  | "charles"
  | "charlesObert"
  | "aro"
  | "timbal"
  | "cencerro";

export interface VoiceMeta {
  id: VoiceId;
  /** Nom curt visible a la consola */
  name: string;
  /** Tecla d'audició ràpida (1..8) */
  key: string;
}

export const VOICES: VoiceMeta[] = [
  { id: "bombo", name: "Bombo", key: "1" },
  { id: "caixa", name: "Caixa", key: "2" },
  { id: "palmada", name: "Palmada", key: "3" },
  { id: "charles", name: "Charles", key: "4" },
  { id: "charlesObert", name: "Charles obert", key: "5" },
  { id: "aro", name: "Aro", key: "6" },
  { id: "timbal", name: "Timbal", key: "7" },
  { id: "cencerro", name: "Cencerro", key: "8" },
];

/** 0 = silenci, 1 = normal, 2 = accent */
export type Cell = 0 | 1 | 2;

export interface ChannelMix {
  volume: number; // dB, de -40 a +6
  muted: boolean;
  solo: boolean;
}

export interface Pattern {
  name: string;
  bpm: number;
  /** 0 = recte, 0.6 = molt swingat */
  swing: number;
  steps: Record<VoiceId, Cell[]>;
  mix: Record<VoiceId, ChannelMix>;
}

function emptyLane(): Cell[] {
  return Array<Cell>(STEPS).fill(0);
}

export function emptySteps(): Record<VoiceId, Cell[]> {
  return Object.fromEntries(VOICES.map((v) => [v.id, emptyLane()])) as Record<
    VoiceId,
    Cell[]
  >;
}

export function defaultMix(): Record<VoiceId, ChannelMix> {
  return Object.fromEntries(
    VOICES.map((v) => [v.id, { volume: 0, muted: false, solo: false }]),
  ) as Record<VoiceId, ChannelMix>;
}

export function emptyPattern(name = "Sense títol"): Pattern {
  return { name, bpm: 104, swing: 0, steps: emptySteps(), mix: defaultMix() };
}

export function clonePattern(p: Pattern): Pattern {
  return {
    name: p.name,
    bpm: p.bpm,
    swing: p.swing,
    steps: Object.fromEntries(
      Object.entries(p.steps).map(([k, v]) => [k, [...v]]),
    ) as Record<VoiceId, Cell[]>,
    mix: Object.fromEntries(
      Object.entries(p.mix).map(([k, v]) => [k, { ...v }]),
    ) as Record<VoiceId, ChannelMix>,
  };
}

/**
 * Escriu una línia a partir d'una cadena de 16 caràcters.
 * "." = silenci, "x" = normal, "X" = accent. Molt més llegible que un array.
 */
function lane(spec: string): Cell[] {
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
  lanes: Partial<Record<VoiceId, string>>,
): Pattern {
  const p = emptyPattern(name);
  p.bpm = bpm;
  p.swing = swing;
  for (const [id, spec] of Object.entries(lanes)) {
    p.steps[id as VoiceId] = lane(spec as string);
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
