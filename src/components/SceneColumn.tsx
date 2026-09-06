"use client";

import { useState } from "react";
import { MAX_SCENES, type Pattern } from "@/lib/pattern";

interface Props {
  pattern: Pattern;
  onApply: (index: number) => void;
  onSave: (name: string) => void;
  onRename: (index: number, name: string) => void;
  onRemove: (index: number) => void;
}

/**
 * Les escenes: quines veus sonen, amb nom. Van al costat del banc de
 * ranures perquè són l'altra meitat del mateix gest, com a la vista de
 * sessió de l'Ableton.
 */
export function SceneColumn({
  pattern,
  onApply,
  onSave,
  onRename,
  onRemove,
}: Props) {
  const [editant, setEditant] = useState<number | null>(null);
  const [text, setText] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[11px] text-ink-soft">escenes</span>

      {pattern.scenes.map((escena, i) => {
        const activa = pattern.activeScene === i;
        if (editant === i) {
          return (
            <input
              key={i}
              autoFocus
              value={text}
              aria-label={`Nom de l'escena ${i + 1}`}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => {
                onRename(i, text);
                setEditant(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setEditant(null);
              }}
              className="w-24 rounded-[3px] border border-ink/30 bg-panel-hi px-1 py-0.5 text-[12px] text-ink"
            />
          );
        }
        return (
          <span key={i} className="flex items-stretch">
            <button
              type="button"
              aria-pressed={activa}
              title={`Aplicar ${escena.name} · doble clic per reanomenar`}
              onClick={() => onApply(i)}
              onDoubleClick={() => {
                setText(escena.name);
                setEditant(i);
              }}
              className={[
                "max-w-[110px] truncate rounded-l-[3px] border px-2 py-0.5 text-[12px] transition-colors",
                activa
                  ? "border-teal bg-teal text-on-accent"
                  : "border-ink/30 bg-panel-hi text-ink hover:bg-raise",
              ].join(" ")}
            >
              {escena.name}
            </button>
            <button
              type="button"
              aria-label={`Esborrar ${escena.name}`}
              onClick={() => onRemove(i)}
              className="rounded-r-[3px] border border-l-0 border-ink/30 bg-panel-hi px-1 text-[11px] text-ink-soft transition-colors hover:bg-oxblood hover:text-on-accent"
            >
              ×
            </button>
          </span>
        );
      })}

      <button
        type="button"
        disabled={pattern.scenes.length >= MAX_SCENES}
        title={
          pattern.scenes.length >= MAX_SCENES
            ? "Ja hi ha vuit escenes"
            : "Desar els silencis i els solitaris d'ara com una escena"
        }
        onClick={() => onSave(`Escena ${pattern.scenes.length + 1}`)}
        className="h-6 w-6 rounded-[3px] border border-ink/30 bg-panel-hi text-[13px] leading-none text-ink transition-colors hover:bg-raise disabled:cursor-default disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
