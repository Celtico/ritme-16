"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { generate } from "@/lib/generate";
import { STYLES } from "@/lib/styles";
import type { Song } from "@/lib/song";

interface Props {
  /** Si hi ha canvis sense desar, es demana confirmació abans de substituir. */
  dirty: boolean;
  onGenerate: (song: Song) => void;
}

const AMPLADA = 256;
const ALCADA = 190;

export function GenerateMenu({ dirty, onGenerate }: Props) {
  const [obert, setObert] = useState(false);
  const [style, setStyle] = useState(STYLES[0].id);
  const [seed, setSeed] = useState(1);
  const [resultat, setResultat] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement | null>(null);
  const boto = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  /**
   * Va a un portal al body. Dins del panell inferior, que es desplaça, el
   * popover quedava tallat catorze píxels per dalt.
   */
  useLayoutEffect(() => {
    if (!obert || !boto.current) {
      setPos(null);
      return;
    }
    const col = () => {
      const r = boto.current?.getBoundingClientRect();
      if (!r) return;
      const cap = r.top - ALCADA >= 4;
      setPos({
        left: Math.max(4, Math.min(r.left, window.innerWidth - AMPLADA - 4)),
        top: cap ? r.top - ALCADA - 4 : Math.min(window.innerHeight - ALCADA - 4, r.bottom + 4),
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

  useEffect(() => {
    if (!obert) return;
    const fora = (e: MouseEvent) => {
      const dins =
        caixa.current?.contains(e.target as Node) ||
        boto.current?.contains(e.target as Node);
      if (!dins) setObert(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setObert(false);
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [obert]);

  const genera = () => {
    if (
      dirty &&
      !window.confirm(
        "Hi ha canvis sense desar. Vols substituir la cançó per una de generada?",
      )
    ) {
      return;
    }
    const spec = STYLES.find((s) => s.id === style)!;
    const out = generate(spec, seed);
    onGenerate(out.song);
    // la llavor pot no ser la demanada: si no passava el crític, se n'ha
    // provat la següent
    setResultat(
      out.seed === seed
        ? `Llavor ${out.seed}`
        : `Llavor ${out.seed} (la ${seed} no passava el crític)`,
    );
    setSeed(out.seed);
  };

  return (
    <>
      <button
        ref={boto}
        type="button"
        aria-expanded={obert}
        onClick={() => setObert((v) => !v)}
        className="rounded-[3px] border border-ink/30 bg-panel-hi px-3 py-1.5 text-[13px] text-ink transition-colors hover:bg-raise"
      >
        Genera
      </button>

      {obert && pos
        ? createPortal(
            <div
              ref={caixa}
              style={{ left: pos.left, top: pos.top, width: AMPLADA }}
              className="fixed z-[100] rounded-[3px] border border-ink/40 bg-panel-hi p-2 shadow-[var(--shadow-pop)]"
            >
          <label className="mb-2 flex items-center gap-2 text-[12px] text-ink-soft">
            estil
            <select
              value={style}
              aria-label="Estil"
              onChange={(e) => setStyle(e.target.value)}
              className="flex-1 rounded-[3px] border border-ink/30 bg-panel px-1 py-0.5 text-[12px] text-ink"
            >
              {STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mb-2 flex items-center gap-2 text-[12px] text-ink-soft">
            llavor
            <input
              type="number"
              value={seed}
              min={0}
              aria-label="Llavor"
              onChange={(e) => setSeed(Math.max(0, Number(e.target.value) | 0))}
              className="w-20 rounded-[3px] border border-ink/30 bg-panel px-1 py-0.5 text-[12px] text-ink tabular-nums"
            />
            <button
              type="button"
              aria-label="Llavor a l'atzar"
              title="Llavor a l'atzar"
              onClick={() => setSeed(Math.floor(Math.random() * 100000))}
              className="rounded-[3px] border border-ink/30 bg-panel px-1.5 py-0.5 text-[13px] leading-none text-ink transition-colors hover:bg-raise"
            >
              ⚄
            </button>
          </label>

          <button
            type="button"
            onClick={genera}
            className="w-full rounded-[3px] border border-ink/30 bg-teal px-2 py-1 text-[12px] text-on-accent transition-colors hover:bg-teal/85"
          >
            Genera la cançó
          </button>

          {resultat ? (
            <p className="mt-1 text-[11px] text-ink-soft tabular-nums">
              {resultat}
            </p>
          ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
