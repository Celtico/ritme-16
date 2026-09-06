"use client";

import { StepButton } from "./StepButton";
import { ROW_GAP, ROW_HEIGHT } from "./layout";
import type { Track } from "@/lib/pattern";

interface Props {
  track: Track;
  currentStep: number;
  dimmed: boolean;
  onToggleStep: (index: number, accent: boolean) => void;
}

const GROUPS = [0, 1, 2, 3];

/** Els setze passos d'una pista. Res més: els controls són a l'altre panell. */
export function StepRow({ track, currentStep, dimmed, onToggleStep }: Props) {
  return (
    <div
      className={["flex gap-3", dimmed ? "opacity-45" : ""].join(" ")}
      style={{ height: ROW_HEIGHT, marginBottom: ROW_GAP }}
    >
      {GROUPS.map((g) => (
        <div key={g} className="flex flex-1 gap-1">
          {track.steps.slice(g * 4, g * 4 + 4).map((cell, i) => {
            const index = g * 4 + i;
            return (
              <StepButton
                key={index}
                cell={cell}
                index={index}
                voiceName={track.name}
                underPlayhead={currentStep === index}
                onToggle={(accent) => onToggleStep(index, accent)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
