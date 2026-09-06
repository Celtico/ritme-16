import { isMelodic, type Pattern, type VoiceKind } from "./pattern";
import { isEmptyPattern, type Song } from "./song";

/**
 * El crític. No mira si una cançó és vàlida (d'això ja se n'ocupa normalise)
 * sinó si val la pena escoltar-la: ni buida ni saturada, amb aire, i amb
 * variacions que es distingeixin de la base sense ser una altra cançó.
 */
export interface Verdict {
  score: number;
  issues: string[];
}

/** Per sota d'això val més tornar-ho a provar amb una altra llavor. */
export const PASS_MARK = 0.75;

/** Cel·les actives per compàs de setze passos. */
function density(p: Pattern): number {
  const compassos = Math.max(1, p.length / 16);
  let actives = 0;
  for (const t of p.tracks) {
    for (let i = 0; i < p.length; i++) if (t.steps[i]) actives++;
    for (let i = 0; i < p.length; i++) {
      if (t.bass?.[i] || t.chords?.[i]) actives++;
    }
  }
  return actives / compassos;
}

/** Quants passos no toca absolutament ningú. */
function emptySteps(p: Pattern): number {
  let buits = 0;
  for (let i = 0; i < p.length; i++) {
    const algu = p.tracks.some(
      (t) => t.steps[i] || t.bass?.[i] || t.chords?.[i],
    );
    if (!algu) buits++;
  }
  return buits;
}

/** Les veus que ocupen el mateix registre i per tant es tapen. */
const REGISTRES: VoiceKind[][] = [
  ["bombo", "timbal"],
  ["caixa", "palmada"],
  ["charles", "charlesObert"],
  ["aro", "cencerro"],
];

/** Quant es poden solapar dues veus del mateix registre, per defecte. */
export const DEFAULT_OVERLAP_LIMIT = 0.4;

export interface CriticOptions {
  /**
   * Fracció màxima de cops de la veu menys densa que poden coincidir amb
   * l'altra del seu registre. Va per estil: al ternari, que és el més dens,
   * qualsevol solapament es nota molt més que a la percussió.
   */
  overlapLimit?: number;
}

/**
 * Dues veus del mateix registre que caiguin sovint juntes sonen com una de
 * sola i més forta. Es mesura contra la menys densa: si una veu de tres cops
 * en fa dos sobre l'altra, ha desaparegut, encara que per a l'altra siguin
 * dos de vint.
 */
function registreSolapat(p: Pattern, limit: number): string[] {
  const problemes: string[] = [];
  for (const [a, b] of REGISTRES) {
    const ta = p.tracks.find((t) => t.kind === a);
    const tb = p.tracks.find((t) => t.kind === b);
    if (!ta || !tb) continue;
    let juntes = 0;
    let copsA = 0;
    let copsB = 0;
    for (let i = 0; i < p.length; i++) {
      if (ta.steps[i]) copsA++;
      if (tb.steps[i]) copsB++;
      if (ta.steps[i] && tb.steps[i]) juntes++;
    }
    const menys = Math.min(copsA, copsB);
    if (menys < 2) continue;
    const fraccio = juntes / menys;
    if (fraccio > limit) {
      problemes.push(
        `${a} i ${b} coincideixen al ${Math.round(fraccio * 100)} % dels cops`,
      );
    }
  }
  return problemes;
}

/** Cel·les en què dos patrons difereixen. */
export function distance(a: Pattern, b: Pattern): number {
  let d = 0;
  const n = Math.max(a.length, b.length);
  for (const ta of a.tracks) {
    const tb = b.tracks.find((t) => t.id === ta.id);
    if (!tb) continue;
    for (let i = 0; i < n; i++) if ((ta.steps[i] ?? 0) !== (tb.steps[i] ?? 0)) d++;
  }
  return d;
}

export function critique(song: Song, options: CriticOptions = {}): Verdict {
  const limit = options.overlapLimit ?? DEFAULT_OVERLAP_LIMIT;
  const issues: string[] = [];
  const plenes = song.slots.filter((s) => !isEmptyPattern(s.pattern));
  if (plenes.length < 3) issues.push("menys de tres ranures amb contingut");

  const base = plenes[0]?.pattern;
  if (!base) return { score: 0, issues: ["cap ranura amb contingut"] };

  for (const slot of plenes) {
    const p = slot.pattern;
    const d = density(p);
    if (d < 8) issues.push(`"${p.name}" massa buit (${d.toFixed(1)} per compàs)`);
    if (d > 46) issues.push(`"${p.name}" saturat (${d.toFixed(1)} per compàs)`);
    if (emptySteps(p) < 1) issues.push(`"${p.name}" no té cap pas lliure`);
    issues.push(...registreSolapat(p, limit).map((x) => `"${p.name}": ${x}`));
  }

  // les variacions han de ser variacions: ni idèntiques ni una altra cançó
  for (const slot of plenes.slice(1)) {
    const d = distance(base, slot.pattern);
    if (d < 2) issues.push(`"${slot.pattern.name}" no es distingeix de la base`);
    if (d > 40) issues.push(`"${slot.pattern.name}" no s'assembla gens a la base`);
  }

  // les pistes melòdiques, si n'hi ha, han de dir alguna cosa
  const teMelodia = base.tracks.some((t) => isMelodic(t.kind));
  if (teMelodia) {
    const notes = base.tracks.reduce(
      (n, t) =>
        n +
        (t.bass ?? []).filter(Boolean).length +
        (t.chords ?? []).filter(Boolean).length,
      0,
    );
    if (notes > 0 && notes < 3) issues.push("amb prou feines hi ha melodia");
  }

  const penalitzacio = Math.min(1, issues.length * 0.15);
  return { score: +(1 - penalitzacio).toFixed(2), issues };
}

export function passes(song: Song, options?: CriticOptions): boolean {
  return critique(song, options).score >= PASS_MARK;
}
