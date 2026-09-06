import {
  clonePattern,
  defaultMix,
  defaultParams,
  defaultTracks,
  emptyLane,
  emptyPattern,
  KINDS,
  type Cell,
  type ChannelMix,
  type Pattern,
  type Track,
  type VoiceKind,
  type VoiceParams,
  VOICE_KINDS,
} from "./pattern";

const KEY = "ritme16.patterns.v1";

export interface SavedPattern {
  id: string;
  pattern: Pattern;
  savedAt: number;
}

/**
 * El model anterior guardava tres registres indexats pel tipus de veu en
 * comptes d'una llista de pistes. Els patrons desats amb aquella versió
 * encara viuen al navegador de la gent, així que cal saber-los llegir.
 */
interface LegacyPattern {
  name?: string;
  bpm?: number;
  swing?: number;
  steps?: Record<string, Cell[]>;
  mix?: Record<string, ChannelMix>;
  sound?: Record<string, VoiceParams>;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object";

/** Valida el que ve de localStorage abans de fer-lo servir. */
function looksLikePattern(value: unknown): boolean {
  if (!isObject(value)) return false;
  if (typeof value.bpm !== "number") return false;
  // qualsevol de les dues formes serveix: la nova o l'antiga
  return Array.isArray(value.tracks) || (isObject(value.steps) && isObject(value.mix));
}

function normaliseSteps(cells: unknown): Cell[] {
  const out = emptyLane();
  if (!Array.isArray(cells)) return out;
  for (let i = 0; i < out.length; i++) {
    const c = cells[i];
    out[i] = c === 1 || c === 2 ? c : 0;
  }
  return out;
}

function normaliseMix(mix: unknown): ChannelMix {
  const base = defaultMix();
  if (!isObject(mix)) return base;
  return {
    volume: typeof mix.volume === "number" ? mix.volume : base.volume,
    muted: mix.muted === true,
    solo: mix.solo === true,
  };
}

function normaliseSound(kind: VoiceKind, sound: unknown): VoiceParams {
  const base = defaultParams(kind);
  if (!isObject(sound)) return base;
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return {
    pitch: num(sound.pitch, base.pitch),
    decay: num(sound.decay, base.decay),
    tone: num(sound.tone, base.tone),
    drive: num(sound.drive, base.drive),
  };
}

/**
 * Converteix un patró del model antic. L'id de cada pista és el tipus de veu
 * que la indexava, cosa que fa la migració determinista i deixa els patrons
 * desats apuntant a les mateixes cadenes de sempre.
 */
function fromLegacy(old: LegacyPattern): Pattern {
  return {
    name: typeof old.name === "string" ? old.name : "Sense títol",
    bpm: typeof old.bpm === "number" ? old.bpm : 104,
    swing: typeof old.swing === "number" ? old.swing : 0,
    tracks: VOICE_KINDS.map((kind) => ({
      id: kind,
      name: KINDS[kind].name,
      kind,
      color: KINDS[kind].color,
      steps: normaliseSteps(old.steps?.[kind]),
      mix: normaliseMix(old.mix?.[kind]),
      sound: normaliseSound(kind, old.sound?.[kind]),
    })),
  };
}

function normaliseTrack(raw: unknown, index: number): Track | null {
  if (!isObject(raw)) return null;
  const kind = VOICE_KINDS.includes(raw.kind as VoiceKind)
    ? (raw.kind as VoiceKind)
    : null;
  if (!kind) return null;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `${kind}-${index}`,
    name: typeof raw.name === "string" ? raw.name : KINDS[kind].name,
    kind,
    color: typeof raw.color === "string" ? raw.color : KINDS[kind].color,
    steps: normaliseSteps(raw.steps),
    mix: normaliseMix(raw.mix),
    sound: normaliseSound(kind, raw.sound),
  };
}

/**
 * Deixa qualsevol cosa que vingui del navegador en un patró vàlid: completa
 * el que falti, descarta el que no s'entengui i migra el model antic.
 */
export function normalise(value: unknown): Pattern {
  if (!isObject(value)) return emptyPattern();

  if (Array.isArray(value.tracks)) {
    const tracks = value.tracks
      .map((t, i) => normaliseTrack(t, i))
      .filter((t): t is Track => t !== null);
    // ids repetits farien que dues pistes compartissin cadena de síntesi
    const vistos = new Set<string>();
    for (const t of tracks) {
      while (vistos.has(t.id)) t.id = `${t.id}-2`;
      vistos.add(t.id);
    }
    return {
      name: typeof value.name === "string" ? value.name : "Sense títol",
      bpm: typeof value.bpm === "number" ? value.bpm : 104,
      swing: typeof value.swing === "number" ? value.swing : 0,
      tracks: tracks.length > 0 ? tracks : defaultTracks(),
    };
  }

  return fromLegacy(value as LegacyPattern);
}

export function loadSaved(): SavedPattern[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is SavedPattern =>
          isObject(entry) && looksLikePattern(entry.pattern),
      )
      .map((entry) => ({ ...entry, pattern: normalise(entry.pattern) }));
  } catch {
    return [];
  }
}

export function persist(list: SavedPattern[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // quota plena o mode privat: el patró segueix viu a la sessió
  }
}

export { clonePattern };
