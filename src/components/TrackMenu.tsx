"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TRACK_COLORS, type Track } from "@/lib/pattern";

interface Props {
  track: Track;
  /** Perquè "Mou amunt" i "Mou avall" sàpiguen quan no van enlloc. */
  first: boolean;
  last: boolean;
  onRename: (name: string) => void;
  onColor: (color: string) => void;
  onDuplicate: () => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  canDuplicate: boolean;
  canRemove: boolean;
  /**
   * L'obertura la governa la consola, no cada menú: si cadascun se la
   * guardés, se'n podrien tenir dos d'oberts alhora. Amb el ratolí no
   * passaria, perquè el mousedown tanca l'anterior, però amb el teclat sí.
   */
  open: boolean;
  onToggle: (open: boolean) => void;
}

function Opcio({
  children,
  onClick,
  disabled,
  perillosa,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  perillosa?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "w-full rounded-[2px] px-2 py-1 text-left text-[12px] transition-colors disabled:cursor-default disabled:opacity-40",
        perillosa
          ? "text-oxblood hover:bg-oxblood hover:text-on-accent"
          : "text-ink hover:bg-panel-lo/70",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

const AMPLADA = 176;
/** Prou per a les sis opcions i la graella de colors. */
const ALCADA = 250;

export function TrackMenu({
  track,
  first,
  last,
  onRename,
  onColor,
  onDuplicate,
  onMove,
  onRemove,
  canDuplicate,
  canRemove,
  open: obert,
  onToggle,
}: Props) {
  const setObert = onToggle;
  const [reanomenant, setReanomenant] = useState(false);
  const [confirmant, setConfirmant] = useState(false);
  const [text, setText] = useState(track.name);
  const caixa = useRef<HTMLDivElement | null>(null);
  const boto = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  /**
   * El menú es dibuixa amb un portal al body i es col·loca a mà. Dins la fila
   * quedava tallat pel desplaçament del panell i per sota de les altres
   * files, que és el que passava abans.
   */
  useLayoutEffect(() => {
    if (!obert || !boto.current) {
      setPos(null);
      return;
    }
    const col = () => {
      const r = boto.current?.getBoundingClientRect();
      if (!r) return;
      const cap = r.bottom + ALCADA <= window.innerHeight;
      setPos({
        left: Math.max(4, Math.min(r.left, window.innerWidth - AMPLADA - 4)),
        top: cap ? r.bottom + 4 : Math.max(4, r.top - ALCADA - 4),
      });
    };
    col();
    window.addEventListener("resize", col);
    window.addEventListener("scroll", col, true);
    return () => {
      window.removeEventListener("resize", col);
      window.removeEventListener("scroll", col, true);
    };
  }, [obert]);

  // tancar clicant fora, com qualsevol menú
  useEffect(() => {
    if (!obert) return;
    const fora = (e: MouseEvent) => {
      const dins =
        caixa.current?.contains(e.target as Node) ||
        boto.current?.contains(e.target as Node);
      if (!dins) setObert(false);
    };
    const escapada = (e: KeyboardEvent) => {
      if (e.key === "Escape") setObert(false);
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", escapada);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", escapada);
    };
  }, [obert, setObert]);

  useEffect(() => {
    if (!obert) {
      setReanomenant(false);
      setConfirmant(false);
    }
  }, [obert]);

  const tePassos = track.steps.some((c) => c !== 0);

  return (
    <>
      <button
        ref={boto}
        type="button"
        aria-label={`Opcions de ${track.name}`}
        aria-expanded={obert}
        title={`Opcions de ${track.name}`}
        onClick={() => setObert(!obert)}
        className="h-6 w-5 rounded-[3px] border border-ink/25 bg-panel-hi text-[11px] leading-none text-ink-soft transition-colors hover:bg-raise"
      >
        ⋯
      </button>

      {obert && pos
        ? createPortal(
            <div
              ref={caixa}
              style={{ left: pos.left, top: pos.top, width: AMPLADA }}
              className="fixed z-[100] rounded-[3px] border border-ink/40 bg-panel-hi p-1 shadow-[var(--shadow-pop)]"
            >
          {reanomenant ? (
            <input
              autoFocus
              value={text}
              aria-label="Nom de la pista"
              onChange={(e) => setText(e.target.value)}
              onBlur={() => {
                onRename(text.trim() || track.name);
                setObert(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setObert(false);
              }}
              className="mb-1 w-full rounded-[2px] border border-ink/30 bg-panel px-1 py-0.5 text-[12px] text-ink"
            />
          ) : (
            <Opcio
              onClick={() => {
                setText(track.name);
                setReanomenant(true);
              }}
            >
              Reanomena
            </Opcio>
          )}

          <div className="px-2 py-1">
            <div className="mb-1 text-[11px] text-ink-soft">Color</div>
            <div className="flex flex-wrap gap-1">
              {TRACK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  aria-pressed={track.color === c}
                  onClick={() => onColor(c)}
                  style={{ backgroundColor: `var(--color-${c})` }}
                  className={[
                    "h-5 w-5 rounded-[2px] border transition-transform",
                    track.color === c
                      ? "border-ink scale-110"
                      : "border-ink/30 hover:scale-105",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>

          <Opcio onClick={onDuplicate} disabled={!canDuplicate}>
            Duplica
          </Opcio>
          <Opcio onClick={() => onMove(-1)} disabled={first}>
            Mou amunt
          </Opcio>
          <Opcio onClick={() => onMove(1)} disabled={last}>
            Mou avall
          </Opcio>

          {confirmant ? (
            <div className="mt-1 border-t border-ink/15 px-2 py-1">
              <p className="mb-1 text-[11px] text-ink-soft">
                Aquesta pista té passos. Segur?
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={onRemove}
                  className="rounded-[2px] bg-oxblood px-2 py-0.5 text-[11px] text-on-accent"
                >
                  Elimina
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmant(false)}
                  className="rounded-[2px] border border-ink/30 px-2 py-0.5 text-[11px] text-ink"
                >
                  Deixa-ho
                </button>
              </div>
            </div>
          ) : (
            <Opcio
              perillosa
              disabled={!canRemove}
              onClick={() => (tePassos ? setConfirmant(true) : onRemove())}
            >
              Elimina
            </Opcio>
          )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
