import {
  clonePattern,
  MAX_SCENES,
  type ChannelMix,
  type Pattern,
  type Scene,
} from "./pattern";

/** La barreja que hi ha ara, tal com quedaria desada en una escena. */
export function captureMix(p: Pattern): Record<string, ChannelMix> {
  return Object.fromEntries(p.tracks.map((t) => [t.id, { ...t.mix }]));
}

/**
 * Desa la barreja d'ara com una escena nova i la deixa activa. Si ja n'hi ha
 * MAX_SCENES, no fa res: val més no desar-la que fer fora la primera sense
 * dir-ho.
 */
export function addScene(p: Pattern, name: string): Pattern {
  if (p.scenes.length >= MAX_SCENES) return p;
  const next = clonePattern(p);
  next.scenes.push({ name: name.trim() || `Escena ${p.scenes.length + 1}`, mix: captureMix(p) });
  next.activeScene = next.scenes.length - 1;
  return next;
}

/**
 * Aplica una escena. Les pistes que l'escena no esmenti es queden com
 * estaven: una escena desada abans d'afegir una pista no l'ha de silenciar.
 */
export function applyScene(p: Pattern, index: number): Pattern {
  const escena = p.scenes[index];
  if (!escena) return p;
  const next = clonePattern(p);
  for (const t of next.tracks) {
    const desada = escena.mix[t.id];
    if (desada) t.mix = { ...desada };
  }
  next.activeScene = index;
  return next;
}

/** Escriu la barreja d'ara a l'escena activa, si n'hi ha cap. */
export function syncActiveScene(p: Pattern): Pattern {
  if (p.activeScene === null || !p.scenes[p.activeScene]) return p;
  const next = clonePattern(p);
  next.scenes[next.activeScene!] = {
    ...next.scenes[next.activeScene!],
    mix: captureMix(p),
  };
  return next;
}

export function renameScene(p: Pattern, index: number, name: string): Pattern {
  if (!p.scenes[index]) return p;
  const next = clonePattern(p);
  next.scenes[index] = {
    ...next.scenes[index],
    name: name.trim() || next.scenes[index].name,
  };
  return next;
}

export function removeScene(p: Pattern, index: number): Pattern {
  if (!p.scenes[index]) return p;
  const next = clonePattern(p);
  next.scenes.splice(index, 1);
  if (next.activeScene === index) next.activeScene = null;
  else if (next.activeScene !== null && next.activeScene > index) {
    next.activeScene -= 1;
  }
  return next;
}

export type { Scene };
