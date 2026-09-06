"use client";

import { RULER_HEIGHT } from "./layout";
import { groupsOf4 } from "./groups";

/**
 * Els números dels passos. Fa servir exactament la mateixa estructura de
 * grups i les mateixes classes d'amplada que una fila de passos, perquè si
 * no, els números deixen de caure sobre les seves cel·les.
 */
export function StepRuler({
  currentStep,
  length,
}: {
  currentStep: number;
  length: number;
}) {
  return (
    <div className="flex gap-3" style={{ height: RULER_HEIGHT }} aria-hidden>
      {groupsOf4(length).map((g, gi) => (
        <div key={gi} className="flex flex-1 gap-1">
          {g.map((index, i) => {
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
