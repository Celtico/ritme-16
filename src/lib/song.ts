import { clonePattern, emptyPattern, PRESETS, type Pattern } from "./pattern";

export const SLOT_COUNT = 8;
export const SLOT_NAMES = ["A", "B", "C", "D", "E", "F", "G", "H"];

/** Cada quants compassos es decideix si es canvia de ranura. */
export const EVERY_OPTIONS = [1, 2, 4, 8] as const;
export type Every = (typeof EVERY_OPTIONS)[number];

export type FollowAction =
  | { kind: "loop"; every: Every }
  | { kind: "next"; every: Every }
  | { kind: "goto"; every: Every; slot: number }
  | { kind: "random"; every: Every; candidates: number[] };

export const FOLLOW_KINDS = ["loop", "next", "goto", "random"] as const;
export type FollowKind = (typeof FOLLOW_KINDS)[number];

export const FOLLOW_NAMES: Record<FollowKind, string> = {
  loop: "repeteix",
  next: "següent",
  goto: "salta a",
  random: "a l'atzar",
};

export interface Slot {
  pattern: Pattern;
  follow: FollowAction;
}

export interface Song {
  slots: Slot[];
  current: number;
}

export function defaultFollow(): FollowAction {
  return { kind: "loop", every: 1 };
}

/** Una ranura sense res: ni un pas, ni una nota. */
export function isEmptyPattern(p: Pattern): boolean {
  return p.tracks.every(
    (t) =>
      t.steps.every((c) => c === 0) &&
      (t.bass ?? []).every((n) => !n) &&
      (t.chords ?? []).every((c) => !c),
  );
}

export function emptySong(): Song {
  return {
    slots: Array.from({ length: SLOT_COUNT }, (_, i) => ({
      // la primera ranura ve amb un exemple; la resta, en blanc
      pattern: i === 0 ? clonePattern(PRESETS[0]) : emptyPattern(SLOT_NAMES[i]),
      follow: defaultFollow(),
    })),
    current: 0,
  };
}

export function cloneSong(s: Song): Song {
  return {
    current: s.current,
    slots: s.slots.map((slot) => ({
      pattern: clonePattern(slot.pattern),
      follow: cloneFollow(slot.follow),
    })),
  };
}

export function cloneFollow(f: FollowAction): FollowAction {
  return f.kind === "random" ? { ...f, candidates: [...f.candidates] } : { ...f };
}

export function currentPattern(s: Song): Pattern {
  return s.slots[s.current].pattern;
}

/**
 * Quina ranura toca després. És pura i rep el generador d'atzar per
 * paràmetre, perquè si no seria l'única part del programa que no es podria
 * provar dues vegades igual.
 *
 * "Següent" es salta les ranures buides: passar a una de buida vol dir un
 * compàs de silenci, que gairebé mai no és el que es vol.
 */
export function resolveFollow(
  song: Song,
  from: number,
  random: () => number = Math.random,
): number {
  const follow = song.slots[from]?.follow;
  if (!follow) return from;

  switch (follow.kind) {
    case "loop":
      return from;

    case "next": {
      for (let n = 1; n <= SLOT_COUNT; n++) {
        const i = (from + n) % SLOT_COUNT;
        if (!isEmptyPattern(song.slots[i].pattern)) return i;
      }
      return from;
    }

    case "goto":
      return follow.slot >= 0 && follow.slot < SLOT_COUNT ? follow.slot : from;

    case "random": {
      const possibles = follow.candidates.filter(
        (i) => i >= 0 && i < SLOT_COUNT,
      );
      if (possibles.length === 0) return from;
      const i = Math.min(
        possibles.length - 1,
        Math.floor(random() * possibles.length),
      );
      return possibles[i];
    }
  }
}
