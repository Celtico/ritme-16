"use client";

import { useCallback, useRef } from "react";
import type { Pattern } from "@/lib/pattern";
import type { TrackLevels } from "@/lib/kit";
import type { VisualState, VisualTrack } from "./Scene";

interface Source {
  pattern: Pattern;
  currentStep: number;
  isPlaying: boolean;
  readLevels: () => TrackLevels | null;
}

/**
 * Converteix el que hi ha al seqüenciador en el que necessita l'escena, i
 * torna una funció estable que el bucle de dibuix pot cridar cada fotograma
 * sense fer tornar a pintar res de React.
 *
 * El transport no exposa el temps, i el hook no s'ha de tocar: la posició amb
 * decimals s'interpola marcant quan ha canviat el pas i mirant quant fa que
 * dura, amb la durada de corxera que toca al BPM del patró. Si el rellotge
 * real i aquest se separen, el següent canvi de pas ho torna a lligar.
 */
export function useVisualSource(src: Source): () => VisualState | null {
  const ref = useRef(src);
  ref.current = src;

  const pas = useRef({ step: -1, at: 0 });

  return useCallback(() => {
    const { pattern, currentStep, isPlaying, readLevels } = ref.current;
    if (!pattern) return null;

    const ara = performance.now();
    if (currentStep !== pas.current.step) {
      pas.current = { step: currentStep, at: ara };
    }
    const msPas = (60_000 / pattern.bpm) / 4;
    const dins = isPlaying
      ? Math.min(1, (ara - pas.current.at) / msPas)
      : 0;

    const nivells = readLevels();
    const tracks: VisualTrack[] = pattern.tracks.map((t) => ({
      id: t.id,
      color: t.color,
      steps: passosDe(t),
    }));

    return {
      length: pattern.length,
      tracks,
      stepFloat: currentStep + dins,
      levels: nivells?.tracks ?? {},
      playing: isPlaying,
    };
  }, []);
}

/**
 * Les pistes melòdiques tenen `steps` a zero: el que sona hi és a `bass` o a
 * `chords`. Per al cilindre només cal saber si al pas hi ha alguna cosa.
 */
function passosDe(t: Pattern["tracks"][number]): number[] {
  if (t.bass) return t.bass.map((b) => (b ? (b.accent ? 2 : 1) : 0));
  if (t.chords) return t.chords.map((c) => (c ? 1 : 0));
  return t.steps;
}
