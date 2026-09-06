"use client";

import { StepButton } from "./StepButton";
import { groupsOf4 } from "./groups";
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
      className={["flex gap-3", dimmed ? "opacity-45" : ""].join(" ")}
      style={{ height: ROW_HEIGHT, marginBottom: ROW_GAP }}
    >
      {groupsOf4(length).map((g, gi) => (
        <div key={gi} className="flex flex-1 gap-1">
          {g.map((index) => {
            const cell = track.steps[index];
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
