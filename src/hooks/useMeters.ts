"use client";

import { useEffect, useRef, useState } from "react";
import type { TrackLevels } from "@/lib/kit";

const BUIT: TrackLevels = { tracks: {}, master: 0 };

/**
 * Un sol bucle de dibuix per a tots els vúmetres: llegir-los d'un en un des
 * de cada fila voldria dir un bucle per pista. S'atura quan el transport
 * està parat, i amb `prefers-reduced-motion` no anima: fa una sola lectura.
 */
export function useMeters(
  read: () => TrackLevels | null,
  running: boolean,
): TrackLevels {
  const [levels, setLevels] = useState<TrackLevels>(BUIT);
  const readRef = useRef(read);
  readRef.current = read;

  useEffect(() => {
    if (!running) {
      setLevels(BUIT);
      return;
    }

    const senseMoviment =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (senseMoviment) {
      setLevels(readRef.current() ?? BUIT);
      return;
    }

    let viu = true;
    let handle = 0;
    const tick = () => {
      if (!viu) return;
      setLevels(readRef.current() ?? BUIT);
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => {
      viu = false;
      cancelAnimationFrame(handle);
    };
  }, [running]);

  return levels;
}
