"use client";

import { CELL_GAP, stepColumn, stepGridTemplate } from "./grid";
import { RULER_HEIGHT } from "./layout";

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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: stepGridTemplate(length),
        columnGap: CELL_GAP,
        height: RULER_HEIGHT,
      }}
      aria-hidden
    >
      {Array.from({ length }, (_, index) => (
        <div
          key={index}
          style={{ gridColumn: stepColumn(index) }}
          className={[
            "min-w-[20px] text-center text-[11px] tabular-nums",
            currentStep === index
              ? "text-ochre"
              : index % 4 === 0
                ? "text-ink"
                : "text-ink-soft/60",
          ].join(" ")}
        >
          {index + 1}
        </div>
      ))}
    </div>
  );
}
