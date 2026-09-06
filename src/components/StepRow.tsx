"use client";

import { StepButton } from "./StepButton";
import { CELL_GAP, stepColumn, stepGridTemplate } from "./grid";
import { ROW_GAP, ROW_HEIGHT } from "./layout";
import type { Track } from "@/lib/pattern";

interface Props {
  track: Track;
  length: number;
  currentStep: number;
  dimmed: boolean;
  onToggleStep: (index: number, accent: boolean) => void;
}

/** Els passos d'una pista. Res més: els controls són a l'altre panell. */
export function StepRow({
  track,
  length,
  currentStep,
  dimmed,
  onToggleStep,
}: Props) {
  return (
    <div
      className={dimmed ? "opacity-45" : ""}
      style={{
        display: "grid",
        gridTemplateColumns: stepGridTemplate(length),
        columnGap: CELL_GAP,
        height: ROW_HEIGHT,
        marginBottom: ROW_GAP,
      }}
    >
      {Array.from({ length }, (_, index) => (
        <StepButton
          key={index}
          cell={track.steps[index]}
          index={index}
          voiceName={track.name}
          underPlayhead={currentStep === index}
          onToggle={(accent) => onToggleStep(index, accent)}
          column={stepColumn(index)}
        />
      ))}
    </div>
  );
}
