import { clonePattern, emptyPattern, type Pattern, VOICES } from "./pattern";

const KEY = "ritme16.patterns.v1";

export interface SavedPattern {
  id: string;
  pattern: Pattern;
  savedAt: number;
}

/** Valida el que ve de localStorage abans de fer-lo servir. */
function isPattern(value: unknown): value is Pattern {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<Pattern>;
  if (typeof p.bpm !== "number" || !p.steps || !p.mix) return false;
  return VOICES.every(
    (v) => Array.isArray(p.steps?.[v.id]) && !!p.mix?.[v.id],
  );
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
          !!entry &&
          typeof entry === "object" &&
          isPattern((entry as SavedPattern).pattern),
      )
      .map((entry) => ({ ...entry, pattern: normalise(entry.pattern) }));
  } catch {
    return [];
  }
}

/** Completa qualsevol veu que faltés en un patró desat amb una versió antiga. */
function normalise(p: Pattern): Pattern {
  const base = emptyPattern(p.name);
  const merged = clonePattern(base);
  merged.bpm = p.bpm;
  merged.swing = p.swing ?? 0;
  for (const v of VOICES) {
    if (p.steps[v.id]) merged.steps[v.id] = [...p.steps[v.id]];
    if (p.mix[v.id]) merged.mix[v.id] = { ...p.mix[v.id] };
  }
  return merged;
}

export function persist(list: SavedPattern[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // quota plena o mode privat: el patró segueix viu a la sessió
  }
}
