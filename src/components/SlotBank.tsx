"use client";

import { useState } from "react";
import {
  EVERY_OPTIONS,
  FOLLOW_KINDS,
  FOLLOW_NAMES,
  isEmptyPattern,
  SLOT_NAMES,
  type Every,
  type FollowAction,
  type FollowKind,
  type Song,
} from "@/lib/song";

interface Props {
  song: Song;
  /** La ranura que sona ara, que pot no ser la que s'edita. */
  onSelect: (index: number) => void;
  onFollow: (index: number, follow: FollowAction) => void;
  onCopy: (from: number, to: number) => void;
  onClear: (index: number) => void;
}

/** Canvia de tipus conservant el que es pugui de l'acció anterior. */
function ambTipus(anterior: FollowAction, kind: FollowKind): FollowAction {
  const every = anterior.every;
  if (kind === "goto") {
    return { kind, every, slot: anterior.kind === "goto" ? anterior.slot : 0 };
  }
  if (kind === "random") {
    return {
      kind,
      every,
      candidates:
        anterior.kind === "random" && anterior.candidates.length
          ? anterior.candidates
          : [0, 1],
    };
  }
  return { kind, every };
}

export function SlotBank({ song, onSelect, onFollow, onCopy, onClear }: Props) {
  const [copiada, setCopiada] = useState<number | null>(null);
  const actual = song.slots[song.current];

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5">
      <div className="flex gap-1">
        {song.slots.map((slot, i) => {
          const sona = i === song.current;
          const buida = isEmptyPattern(slot.pattern);
          return (
            <button
              key={i}
              type="button"
              aria-pressed={sona}
              title={`Ranura ${SLOT_NAMES[i]}${buida ? " (buida)" : ""}`}
              onClick={() => onSelect(i)}
              className={[
                "h-7 w-7 rounded-[3px] border font-display text-[13px] transition-colors",
                sona
                  ? "border-ochre bg-ochre text-on-accent"
                  : buida
                    ? "border-ink/25 bg-panel-lo/40 text-ink-soft"
                    : "border-ink/35 bg-panel-hi text-ink hover:bg-raise",
              ].join(" ")}
            >
              {SLOT_NAMES[i]}
            </button>
          );
        })}
      </div>

      <span className="mx-1 h-5 w-px bg-ink/20" aria-hidden />

      {/* l'acció de la ranura que sona */}
      <label className="flex items-center gap-1 text-[11px] text-ink-soft">
        després
        <select
          value={actual.follow.kind}
          aria-label={`Acció de la ranura ${SLOT_NAMES[song.current]}`}
          onChange={(e) =>
            onFollow(song.current, ambTipus(actual.follow, e.target.value as FollowKind))
          }
          className="rounded-[3px] border border-ink/30 bg-panel-hi px-1 py-0.5 text-[12px] text-ink"
        >
          {FOLLOW_KINDS.map((k) => (
            <option key={k} value={k}>
              {FOLLOW_NAMES[k]}
            </option>
          ))}
        </select>
      </label>

      {actual.follow.kind === "goto" ? (
        <select
          value={actual.follow.slot}
          aria-label="Ranura de destinació"
          onChange={(e) =>
            onFollow(song.current, {
              ...actual.follow,
              slot: Number(e.target.value),
            } as FollowAction)
          }
          className="rounded-[3px] border border-ink/30 bg-panel-hi px-1 py-0.5 text-[12px] text-ink"
        >
          {SLOT_NAMES.map((n, i) => (
            <option key={i} value={i}>
              {n}
            </option>
          ))}
        </select>
      ) : null}

      {actual.follow.kind === "random" ? (
        <span className="flex gap-0.5">
          {SLOT_NAMES.map((n, i) => {
            const hi = actual.follow.kind === "random" && actual.follow.candidates.includes(i);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={hi}
                aria-label={`${n} entre les candidates`}
                onClick={() => {
                  if (actual.follow.kind !== "random") return;
                  const c = hi
                    ? actual.follow.candidates.filter((x) => x !== i)
                    : [...actual.follow.candidates, i].sort((a, b) => a - b);
                  onFollow(song.current, { ...actual.follow, candidates: c });
                }}
                className={[
                  "h-5 w-5 rounded-[2px] border text-[10px]",
                  hi
                    ? "border-teal bg-teal text-on-accent"
                    : "border-ink/25 bg-panel-lo/40 text-ink-soft",
                ].join(" ")}
              >
                {n}
              </button>
            );
          })}
        </span>
      ) : null}

      <label className="flex items-center gap-1 text-[11px] text-ink-soft">
        cada
        <select
          value={actual.follow.every}
          aria-label="Cada quants compassos"
          onChange={(e) =>
            onFollow(song.current, {
              ...actual.follow,
              every: Number(e.target.value) as Every,
            })
          }
          className="rounded-[3px] border border-ink/30 bg-panel-hi px-1 py-0.5 text-[12px] text-ink tabular-nums"
        >
          {EVERY_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        compassos
      </label>

      <span className="mx-1 h-5 w-px bg-ink/20" aria-hidden />

      <button
        type="button"
        onClick={() => setCopiada(song.current)}
        className="rounded-[3px] border border-ink/30 bg-panel-hi px-2 py-0.5 text-[12px] text-ink transition-colors hover:bg-raise"
      >
        {copiada === null
          ? "Copia"
          : `Copiada ${SLOT_NAMES[copiada]}`}
      </button>
      <button
        type="button"
        disabled={copiada === null || copiada === song.current}
        onClick={() => {
          if (copiada !== null) onCopy(copiada, song.current);
        }}
        className="rounded-[3px] border border-ink/30 bg-panel-hi px-2 py-0.5 text-[12px] text-ink transition-colors hover:bg-raise disabled:cursor-default disabled:opacity-40"
      >
        Enganxa
      </button>
      <button
        type="button"
        onClick={() => onClear(song.current)}
        className="rounded-[3px] border border-ink/30 bg-panel-hi px-2 py-0.5 text-[12px] text-ink transition-colors hover:bg-raise"
      >
        Buida
      </button>
    </div>
  );
}
