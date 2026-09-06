"use client";

import { RULER_HEIGHT } from "./layout";

const GROUPS = [0, 1, 2, 3];

/**
 * Els números dels passos. Fa servir exactament la mateixa estructura de
 * grups i les mateixes classes d'amplada que una fila de passos, perquè si
 * no, els números deixen de caure sobre les seves cel·les.
 */
export function StepRuler({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex gap-3" style={{ height: RULER_HEIGHT }} aria-hidden>
      {GROUPS.map((g) => (
        <div key={g} className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => {
            const index = g * 4 + i;
            return (
              <div
                key={index}
                className={[
                  "min-w-[28px] max-w-[64px] flex-1 text-center text-[11px] tabular-nums",
                  currentStep === index
                    ? "text-ochre"
                    : i === 0
                      ? "text-ink"
                      : "text-ink-soft/60",
                ].join(" ")}
              >
                {index + 1}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
