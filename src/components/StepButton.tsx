"use client";

import type { Cell } from "@/lib/pattern";

interface Props {
  cell: Cell;
  index: number;
  voiceName: string;
  underPlayhead: boolean;
  onToggle: (accent: boolean) => void;
  /** Columna de la graella, comptant les columnes mortes entre grups. */
  column: number;
}

const FACE: Record<Cell, string> = {
  0: "bg-panel-lo/70 shadow-[var(--shadow-inset)]",
  1: "bg-oxblood shadow-[var(--shadow-raised)]",
  2: "bg-ochre shadow-[var(--shadow-accent)]",
};

export function StepButton({
  cell,
  index,
  voiceName,
  underPlayhead,
  onToggle,
  column,
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
      style={{ gridColumn: column }}
      className={[
        "h-9 min-w-[20px] rounded-[3px] border border-ink/40 transition-[transform,background-color] duration-75",
        "active:translate-y-px",
        FACE[cell],
        underPlayhead
          ? "ring-2 ring-panel-hi/90 ring-offset-0 brightness-125"
          : "",
      ].join(" ")}
    />
  );
}
