import {
  clonePattern,
  defaultFilter,
  defaultMacros,
  defaultMix,
  defaultParams,
  defaultReturns,
  DEFAULT_KEY,
  emptyBass,
  emptyChords,
  BASS_MAX_LENGTH,
  CHORD_MAX_LENGTH,
  defaultTracks,
  emptyLane,
  emptyPattern,
  KINDS,
  LFO_SHAPES,
  MOD_SOURCES,
  MOD_TARGETS,
  SYNC_RATES,
  type Cell,
  type BassStep,
  type ChannelMix,
  type ChordStep,
  type Key,
  type Mode,
  type EnvParams,
  type FilterParams,
  type LfoParams,
  type LfoShape,
  type Macro,
  type MacroAssignment,
  type Mod,
  type ModSource,
  type ModTarget,
  type Pattern,
  type Returns,
  type SyncRate,
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

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/** Els patrons anteriors als enviaments no porten pan ni sends: hi van a zero. */
function normaliseMix(mix: unknown): ChannelMix {
  const base = defaultMix();
  if (!isObject(mix)) return base;
  return {
    volume: typeof mix.volume === "number" ? mix.volume : base.volume,
    muted: mix.muted === true,
    solo: mix.solo === true,
    pan: clamp(num(mix.pan, base.pan), -1, 1),
    sendA: clamp(num(mix.sendA, base.sendA), 0, 1),
    sendB: clamp(num(mix.sendB, base.sendB), 0, 1),
  };
}

function normaliseReturns(raw: unknown): Returns {
  const base = defaultReturns();
  if (!isObject(raw)) return base;
  const a = isObject(raw.a) ? raw.a : {};
  const b = isObject(raw.b) ? raw.b : {};
  return {
    a: {
      decay: clamp(num(a.decay, base.a.decay), 0.2, 8),
      wet: clamp(num(a.wet, base.a.wet), 0, 1),
      muted: a.muted === true,
    },
    b: {
      time: SYNC_RATES.includes(b.time as SyncRate)
        ? (b.time as SyncRate)
        : base.b.time,
      feedback: clamp(num(b.feedback, base.b.feedback), 0, 0.9),
      wet: clamp(num(b.wet, base.b.wet), 0, 1),
      muted: b.muted === true,
    },
  };
}

const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

/**
 * La fórmula del comandament "to" que hi havia abans del panell de so: un
 * recorregut geomètric al voltant del filtre de fàbrica, amb 0,5 al centre.
 * Es conserva només per convertir els patrons desats amb aquella versió.
 */
function toneAntic(base: number, tone: number, ceiling = base * 4): number {
  const floor = base / 4;
  const top = Math.min(base * 4, ceiling);
  return tone < 0.5
    ? floor * Math.pow(base / floor, tone * 2)
    : base * Math.pow(top / base, (tone - 0.5) * 2);
}

function normaliseFilter(kind: VoiceKind, raw: unknown, tone: unknown): FilterParams {
  const base = defaultFilter(kind);
  if (isObject(raw)) {
    const type = raw.type;
    return {
      type:
        type === "lowpass" || type === "highpass" || type === "bandpass"
          ? type
          : base.type,
      cutoff: Math.max(20, Math.min(20000, num(raw.cutoff, base.cutoff))),
      q: Math.max(0.1, Math.min(20, num(raw.q, base.q))),
    };
  }
  // patró d'abans del panell: el "to" es converteix en freqüència de tall
  if (typeof tone === "number" && Number.isFinite(tone)) {
    const sostre = kind === "aro" ? 7000 : undefined;
    return { ...base, cutoff: toneAntic(base.cutoff, tone, sostre) };
  }
  return base;
}

function normaliseEnv(kind: VoiceKind, raw: unknown): EnvParams {
  const base = defaultParams(kind).envFilter;
  if (!isObject(raw)) return base;
  return {
    attack: num(raw.attack, base.attack),
    decay: num(raw.decay, base.decay),
    sustain: Math.max(0, Math.min(1, num(raw.sustain, base.sustain))),
    release: num(raw.release, base.release),
    amount: Math.max(0, Math.min(1, num(raw.amount, base.amount))),
  };
}

function normaliseLfos(kind: VoiceKind, raw: unknown): LfoParams[] {
  const base = defaultParams(kind).lfo;
  if (!Array.isArray(raw)) return base;
  // el model no en desa més de MAX_LFO, per molt que n'hi arribin
  return base.map((fabrica, i) => {
    const v = raw[i];
    if (!isObject(v)) return fabrica;
    const shape = v.shape;
    const rate = v.rate;
    return {
      shape: LFO_SHAPES.includes(shape as LfoShape)
        ? (shape as LfoShape)
        : fabrica.shape,
      rate: SYNC_RATES.includes(rate as SyncRate)
        ? (rate as SyncRate)
        : fabrica.rate,
      depth: Math.max(0, Math.min(1, num(v.depth, fabrica.depth))),
    };
  });
}

function normaliseMods(raw: unknown): Mod[] {
  if (!Array.isArray(raw)) return [];
  const out: Mod[] = [];
  for (const v of raw) {
    if (!isObject(v)) continue;
    if (!MOD_SOURCES.includes(v.source as ModSource)) continue;
    if (!MOD_TARGETS.includes(v.target as ModTarget)) continue;
    out.push({
      source: v.source as ModSource,
      target: v.target as ModTarget,
      amount: Math.max(-1, Math.min(1, num(v.amount, 0))),
    });
  }
  return out;
}

function normaliseSound(kind: VoiceKind, sound: unknown): VoiceParams {
  const base = defaultParams(kind);
  if (!isObject(sound)) return base;
  return {
    pitch: num(sound.pitch, base.pitch),
    decay: num(sound.decay, base.decay),
    drive: Math.max(0, Math.min(1, num(sound.drive, base.drive))),
    filter: normaliseFilter(kind, sound.filter, sound.tone),
    envFilter: normaliseEnv(kind, sound.envFilter),
    lfo: normaliseLfos(kind, sound.lfo),
    mods: normaliseMods(sound.mods),
  };
}

/** Com a màxim MAX_MACROS, i cadascun amb les assignacions que s'entenguin. */
function normaliseMacros(raw: unknown): Macro[] {
  const base = defaultMacros();
  if (!Array.isArray(raw)) return base;
  return base.map((fabrica, i) => {
    const v = raw[i];
    if (!isObject(v)) return fabrica;
    const assignacions = Array.isArray(v.assignments)
      ? v.assignments.flatMap((a): MacroAssignment[] => {
          if (!isObject(a) || typeof a.trackId !== "string") return [];
          if (!MOD_TARGETS.includes(a.param as ModTarget)) return [];
          return [
            {
              trackId: a.trackId,
              param: a.param as ModTarget,
              amount: Math.max(-1, Math.min(1, num(a.amount, 0))),
            },
          ];
        })
      : [];
    return {
      name: typeof v.name === "string" && v.name ? v.name : fabrica.name,
      value: Math.max(0, Math.min(1, num(v.value, 0))),
      assignments: assignacions,
    };
  });
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
    macros: defaultMacros(),
    returns: defaultReturns(),
    key: { ...DEFAULT_KEY },
  };
}

const MODES: Mode[] = [
  "major",
  "minor",
  "dorian",
  "mixolydian",
  "pentMin",
  "pentMaj",
];

/** Els patrons anteriors a les pistes melòdiques no porten tonalitat. */
function normaliseKey(raw: unknown): Key {
  if (!isObject(raw)) return { ...DEFAULT_KEY };
  const root = Math.round(num(raw.root, DEFAULT_KEY.root));
  return {
    root: ((root % 12) + 12) % 12,
    mode: MODES.includes(raw.mode as Mode)
      ? (raw.mode as Mode)
      : DEFAULT_KEY.mode,
  };
}

/**
 * Les notes del baix i dels acords. Es descarta el que no s'entengui i es
 * retallen les llargades: una nota que sobresurti del compàs trepitjaria
 * passos que no existeixen.
 */
function normaliseBass(raw: unknown): BassStep[] {
  const out = emptyBass();
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < out.length; i++) {
    const v = raw[i];
    if (!isObject(v) || typeof v.midi !== "number") continue;
    out[i] = {
      midi: clamp(Math.round(v.midi), 0, 127),
      length: clamp(Math.round(num(v.length, 1)), 1, BASS_MAX_LENGTH),
      accent: v.accent === true,
    };
  }
  return netejaSolapaments(out);
}

function normaliseChords(raw: unknown): ChordStep[] {
  const out = emptyChords();
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < out.length; i++) {
    const v = raw[i];
    if (!isObject(v) || typeof v.degree !== "number") continue;
    const octave = Math.round(num(v.octave, 0));
    out[i] = {
      degree: clamp(Math.round(v.degree), 1, 7),
      kind: v.kind === "seventh" ? "seventh" : "triad",
      length: clamp(Math.round(num(v.length, 4)), 1, CHORD_MAX_LENGTH),
      octave: (octave < 0 ? -1 : octave > 0 ? 1 : 0) as -1 | 0 | 1,
    };
  }
  return netejaSolapaments(out);
}

/**
 * Una nota llarga cobreix els passos de darrere, i allà no n'hi pot haver cap
 * altra. Si el que ve del navegador en porta, es retalla la primera.
 */
function netejaSolapaments<T extends { length: number } | null>(
  files: T[],
): T[] {
  for (let i = 0; i < files.length; i++) {
    const n = files[i];
    if (!n) continue;
    let cap = n.length;
    for (let j = i + 1; j < Math.min(i + n.length, files.length); j++) {
      if (files[j]) {
        cap = j - i;
        break;
      }
    }
    if (cap !== n.length) files[i] = { ...n, length: cap };
  }
  return files;
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
    ...(kind === "baix" ? { bass: normaliseBass(raw.bass) } : {}),
    ...(kind === "acords" ? { chords: normaliseChords(raw.chords) } : {}),
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
      macros: normaliseMacros(value.macros),
      returns: normaliseReturns(value.returns),
      key: normaliseKey(value.key),
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
