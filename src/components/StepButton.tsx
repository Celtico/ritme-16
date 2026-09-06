"use client";

import type { Cell } from "@/lib/pattern";

interface Props {
  cell: Cell;
  index: number;
  voiceName: string;
  underPlayhead: boolean;
  onToggle: (accent: boolean) => void;
}

const FACE: Record<Cell, string> = {
  0: "bg-panel-lo/70 shadow-[inset_0_2px_3px_rgba(29,27,23,0.35)]",
  1: "bg-oxblood shadow-[0_1px_0_rgba(239,233,219,0.35),0_2px_4px_rgba(0,0,0,0.4)]",
  2: "bg-ochre shadow-[0_1px_0_rgba(239,233,219,0.5),0_2px_6px_rgba(201,138,43,0.5)]",
};

export function StepButton({
  cell,
  index,
  voiceName,
  underPlayhead,
  onToggle,
}: Props) {
  const state = cell === 0 ? "buit" : cell === 1 ? "actiu" : "accentuat";

  return (
    <button
      type="button"
      aria-label={`${voiceName}, pas ${index + 1}, ${state}`}
      aria-pressed={cell !== 0}
      onClick={(e) => onToggle(e.shiftKey || e.altKey)}
      onContextMenu={(e) => {
        e.preventDefault();
        onToggle(true);
      }}
      className={[
        "h-9 min-w-[28px] max-w-[64px] flex-1 rounded-[3px] border border-ink/40 transition-[transform,background-color] duration-75",
        "active:translate-y-px",
        FACE[cell],
        underPlayhead
          ? "ring-2 ring-panel-hi/90 ring-offset-0 brightness-125"
          : "",
      ].join(" ")}
    />
  );
}
