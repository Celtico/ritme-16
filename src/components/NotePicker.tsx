"use client";

import { useEffect, useRef, useState } from "react";
import {
  isInScale,
  midiToName,
  scaleNotes,
  snapToScale,
  type Key,
} from "@/lib/pattern";

interface Props {
  step: number;
  patternKey: Key;
  /** Si és actiu, les notes de fora d'escala surten atenuades. */
  snap: boolean;
  onPick: (midi: number) => void;
  onClose: () => void;
}

/** Les tecles Q..I toquen els graus 1..8 de l'escala. */
const DEGREE_KEYS = ["q", "w", "e", "r", "t", "y", "u", "i"];

export function NotePicker({ step, patternKey, snap, onPick, onClose }: Props) {
  const [octave, setOctave] = useState(3);
  const caixa = useRef<HTMLDivElement | null>(null);
  const base = (octave + 1) * 12 + patternKey.root;

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) onClose();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setOctave((o) => Math.min(6, o + 1));
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setOctave((o) => Math.max(0, o - 1));
        return;
      }
      const grau = DEGREE_KEYS.indexOf(e.key.toLowerCase());
      if (grau >= 0) {
        // la barra espaiadora i les tecles 1-8 han de seguir funcionant, i
        // per això aquí només s'agafen les lletres Q..I
        e.preventDefault();
        e.stopPropagation();
        const escala = scaleNotes(patternKey);
        const n = escala.length;
        onPick(base + escala[grau % n] + 12 * Math.floor(grau / n));
      }
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla, true);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla, true);
    };
  }, [base, onClose, onPick, patternKey]);

  // una octava sencera més la fonamental de dalt
  const notes = Array.from({ length: 13 }, (_, i) => base + 12 - i);

  return (
    <div
      ref={caixa}
      className="absolute bottom-full left-0 z-50 mb-1 w-28 rounded-[3px] border border-ink/40 bg-panel-hi p-1 shadow-[var(--shadow-pop)]"
    >
      <div className="mb-1 flex items-center justify-between px-1 text-[11px] text-ink-soft">
        <span>Pas {step + 1}</span>
        <span className="tabular-nums">oct. {octave}</span>
      </div>
      <div className="max-h-56 overflow-y-auto">
        {notes.map((midi) => {
          const dins = isInScale(patternKey, midi);
          return (
            <button
              key={midi}
              type="button"
              onClick={() => onPick(snap ? snapToScale(patternKey, midi) : midi)}
              className={[
                "w-full rounded-[2px] px-2 py-0.5 text-left text-[12px] tabular-nums transition-colors hover:bg-teal hover:text-on-accent",
                dins ? "text-ink" : "text-ink-soft",
                snap && !dins ? "opacity-40" : "",
              ].join(" ")}
            >
              {midiToName(midi)}
            </button>
          );
        })}
      </div>
      <p className="mt-1 px-1 text-[10px] leading-tight text-ink-soft">
        Q…I: graus · ↑↓ octava · Esc tanca
      </p>
    </div>
  );
}
