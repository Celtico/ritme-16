import { critique, distance, PASS_MARK, type Verdict } from "./critic";
import {
  clonePattern,
  emptyPattern,
  isMelodic,
  scaleNotes,
  type ChannelMix,
  type Mode,
  type Pattern,
  type PatternLength,
  type Track,
  type VoiceKind,
  type VoiceParams,
} from "./pattern";
import { addScene } from "./scenes";
import { chance, intRange, mulberry32, pick, range, shuffle, type Rng } from "./rng";
import {
  cloneSong,
  defaultFollow,
  SLOT_COUNT,
  SLOT_NAMES,
  type FollowAction,
  type Slot,
  type Song,
} from "./song";

/**
 * Densitat per posició dins del temps. Els quatre valors són, per ordre:
 * temps fort, "e", contratemps i "a". És el que separa un house d'un
 * breakbeat molt més que el tempo.
 */
export type Density = [number, number, number, number];

export interface VoiceRule {
  density: Density;
  accent: number;
  /** Pot no sortir a la cançó. Les que no ho són, hi surten sempre. */
  optional?: boolean;
}

export interface StyleSpec {
  id: string;
  name: string;
  bpm: [number, number];
  swing: [number, number];
  modes: Mode[];
  length: PatternLength;
  /** Les veus que hi poden sortir. Les que no hi són, prohibides. */
  voices: Partial<Record<VoiceKind, VoiceRule>>;
  /** Fa servir baix i acords? */
  melodic: boolean;
  /** Quantes ranures té la cançó, base i break inclosos. */
  slots: [number, number];
  /** Progressions possibles, en graus. */
  progressions: number[][];
  /**
   * Regles de gènere. S'apliquen després del sorteig i poden reescriure el
   * que calgui: són el que fa que un estil se senti, i van com a funcions
   * perquè "mai bombo al tercer temps" no és un número.
   */
  rules: Array<(p: Pattern, rng: Rng) => void>;
  sound?: Partial<Record<VoiceKind, (rng: Rng) => Partial<VoiceParams>>>;
  mix?: Partial<Record<VoiceKind, (rng: Rng) => Partial<ChannelMix>>>;
  /** Com de tolerant és el crític amb les veus del mateix registre. */
  overlapLimit?: number;
}

export interface Generated {
  song: Song;
  /** La llavor que ha donat aquesta cançó, que pot no ser la demanada. */
  seed: number;
  verdict: Verdict;
  attempts: number;
}

export const MAX_ATTEMPTS = 8;

const trobar = (p: Pattern, kind: VoiceKind): Track | undefined =>
  p.tracks.find((t) => t.kind === kind);

/** Els passos on toca una veu. */
export function hits(p: Pattern, kind: VoiceKind): number[] {
  const t = trobar(p, kind);
  if (!t) return [];
  const out: number[] = [];
  for (let i = 0; i < p.length; i++) if (t.steps[i]) out.push(i);
  return out;
}

function fillVoice(p: Pattern, kind: VoiceKind, rule: VoiceRule, rng: Rng) {
  const t = trobar(p, kind);
  if (!t) return;
  for (let i = 0; i < p.length; i++) {
    if (!chance(rng, rule.density[i % 4])) continue;
    t.steps[i] = chance(rng, rule.accent) ? 2 : 1;
  }
}

/**
 * El baix surt del bombo: hi cau a sobre el 70 % de les vegades i la resta
 * als contratemps. Un baix sortejat a part del bombo no s'hi enganxa mai.
 */
function buildBass(p: Pattern, rng: Rng) {
  const baix = trobar(p, "baix");
  if (!baix?.bass) return;
  const escala = scaleNotes(p.key);
  const arrel = 36 + p.key.root;
  const graus = [0, 4, escala.length - 1]; // fonamental, cinquena, i l'agut
  const cops = hits(p, "bombo");
  const posicions = new Set<number>();

  for (const i of cops) if (chance(rng, 0.7)) posicions.add(i);
  for (let i = 2; i < p.length; i += 4) if (chance(rng, 0.3)) posicions.add(i);
  if (posicions.size === 0) posicions.add(0);

  const ordenades = [...posicions].sort((a, b) => a - b);
  for (let n = 0; n < ordenades.length; n++) {
    const i = ordenades[n];
    const seguent = ordenades[n + 1] ?? p.length;
    // un pas de tensió cada dos compassos
    const tensio = i >= 32 - 4 || (i >= 16 - 2 && i < 16);
    const grau = tensio && chance(rng, 0.6) ? escala.length - 2 : pick(rng, graus);
    const octava = chance(rng, 0.2) ? 12 : 0;
    baix.bass[i] = {
      midi: arrel + escala[Math.min(grau, escala.length - 1)] + octava,
      length: Math.max(1, Math.min(4, seguent - i)),
      accent: cops.includes(i),
    };
  }
}

function buildChords(p: Pattern, style: StyleSpec, rng: Rng) {
  const acords = trobar(p, "acords");
  if (!acords?.chords) return;
  const progressio = pick(rng, style.progressions);
  const pas = p.length >= 32 ? 8 : 4;
  for (let n = 0; n * pas < p.length; n++) {
    const grau = progressio[n % progressio.length];
    acords.chords[n * pas] = {
      degree: grau,
      kind: chance(rng, 0.3) ? "seventh" : "triad",
      length: Math.min(8, pas),
      octave: 0,
    };
  }
}

function buildBase(style: StyleSpec, rng: Rng): Pattern {
  const p = emptyPattern(style.name);
  p.bpm = Math.round(range(rng, style.bpm));
  p.swing = +range(rng, style.swing).toFixed(2);
  p.length = style.length;
  p.key = { root: intRange(rng, [0, 11]), mode: pick(rng, style.modes) };

  for (const [kind, rule] of Object.entries(style.voices) as [
    VoiceKind,
    VoiceRule,
  ][]) {
    if (rule.optional && !chance(rng, 0.6)) continue;
    fillVoice(p, kind, rule, rng);
  }

  for (const regla of style.rules) regla(p, rng);

  if (style.melodic) {
    buildBass(p, rng);
    buildChords(p, style, rng);
  }

  for (const t of p.tracks) {
    const so = style.sound?.[t.kind];
    if (so) t.sound = { ...t.sound, ...so(rng) };
    const mescla = style.mix?.[t.kind];
    if (mescla) t.mix = { ...t.mix, ...mescla(rng) };
  }

  return p;
}

/** Una variació: la base amb una o dues veus més o menys. Mai una altra cosa. */
function buildVariation(base: Pattern, style: StyleSpec, rng: Rng, n: number): Pattern {
  const p = clonePattern(base);
  p.name = `${style.name} ${n}`;
  const presents = p.tracks.filter(
    (t) => !isMelodic(t.kind) && t.steps.some((c) => c),
  );
  const absents = p.tracks.filter(
    (t) =>
      !isMelodic(t.kind) &&
      style.voices[t.kind] &&
      !t.steps.some((c) => c),
  );

  const quantes = intRange(rng, [1, 2]);
  for (let k = 0; k < quantes; k++) {
    if (absents.length && chance(rng, 0.55)) {
      const t = pick(rng, absents);
      fillVoice(p, t.kind, style.voices[t.kind]!, rng);
    } else if (presents.length > 2) {
      const t = pick(rng, shuffle(rng, presents).slice(0, 1));
      // no es treu mai el bombo en una variació: per això hi ha el break
      if (t.kind !== "bombo") t.steps = t.steps.map(() => 0);
    }
  }
  for (const regla of style.rules) regla(p, rng);

  // Si el sorteig no ha canviat res (perquè no hi havia cap veu per afegir
  // ni prou per treure'n), es força un canvi: una variació idèntica a la
  // base no és una variació.
  if (distance(base, p) === 0) {
    const candidata = p.tracks.find(
      (t) => !isMelodic(t.kind) && t.kind !== "bombo" && style.voices[t.kind],
    );
    if (candidata) {
      for (let k = 0; k < 3; k++) {
        const i = intRange(rng, [0, p.length - 1]);
        candidata.steps[i] = candidata.steps[i] ? 0 : 1;
      }
    }
  }
  return p;
}

/** El break: fora el bombo i mig buit, per tornar a entrar. */
function buildBreak(base: Pattern, style: StyleSpec, rng: Rng): Pattern {
  const p = clonePattern(base);
  p.name = `${style.name} · break`;
  const bombo = trobar(p, "bombo");
  if (bombo) bombo.steps = bombo.steps.map(() => 0);
  for (const t of p.tracks) {
    if (isMelodic(t.kind) || t.kind === "bombo") continue;
    if (chance(rng, 0.4)) t.steps = t.steps.map(() => 0);
  }
  return p;
}

function ambEscenes(p: Pattern, style: StyleSpec): Pattern {
  const base = Object.keys(style.voices).slice(0, 2) as VoiceKind[];
  const intro = clonePattern(p);
  for (const t of intro.tracks) {
    t.mix = { ...t.mix, muted: !base.includes(t.kind) };
  }
  // "Intro" primer, i "Ple" després, que queda activa
  const amb = addScene(intro, "Intro");
  const ple = clonePattern(amb);
  for (const t of ple.tracks) t.mix = { ...t.mix, muted: false };
  return addScene(ple, "Ple");
}

function buildSong(style: StyleSpec, rng: Rng): Song {
  const total = intRange(rng, style.slots);
  const base = ambEscenes(buildBase(style, rng), style);
  const patrons: Pattern[] = [base];
  for (let i = 1; i < total - 1; i++) {
    patrons.push(buildVariation(base, style, rng, i));
  }
  patrons.push(buildBreak(base, style, rng));

  const iBreak = patrons.length - 1;
  const slots: Slot[] = Array.from({ length: SLOT_COUNT }, (_, i) => {
    if (i >= patrons.length) {
      return { pattern: emptyPattern(SLOT_NAMES[i]), follow: defaultFollow() };
    }
    let follow: FollowAction;
    if (i === iBreak) follow = { kind: "goto", every: 8, slot: 0 };
    else if (i === iBreak - 1) follow = { kind: "goto", every: 4, slot: iBreak };
    else follow = { kind: "next", every: 4 };
    return { pattern: patrons[i], follow };
  });

  return { slots, current: 0 };
}

/**
 * Genera una cançó i la fa passar pel crític. Si no arriba a la nota,
 * torna a provar amb la llavor següent: val més una cançó de la llavor 8
 * que una de dolenta de la 7.
 */
export function generate(style: StyleSpec, seed: number): Generated {
  let millor: Generated | null = null;
  for (let intent = 0; intent < MAX_ATTEMPTS; intent++) {
    const llavor = seed + intent;
    const song = buildSong(style, mulberry32(llavor));
    const verdict = critique(song, { overlapLimit: style.overlapLimit });
    const candidat = { song, seed: llavor, verdict, attempts: intent + 1 };
    if (verdict.score >= PASS_MARK) return candidat;
    if (!millor || verdict.score > millor.verdict.score) millor = candidat;
  }
  return { ...millor!, song: cloneSong(millor!.song) };
}
