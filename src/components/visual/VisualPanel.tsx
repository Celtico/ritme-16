"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Scene, type VisualState } from "./Scene";

interface Props {
  /** El bucle de dibuix demana l'estat aquí; no arriba mai per props. */
  read: () => VisualState | null;
}

/**
 * Munta el canvas i fa girar el bucle de dibuix. Tota la feina de 3D és a
 * Scene; aquí només hi ha React.
 *
 * El bucle s'atura quan la pestanya no es veu, quan la finestra perd el focus
 * i amb prefers-reduced-motion. En aquest últim cas es dibuixa un sol
 * fotograma cada vegada que canvia el pas.
 */
export function VisualPanel({ read }: Props) {
  const readRef = useRef(read);
  readRef.current = read;
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const contenidor = useRef<HTMLDivElement | null>(null);
  const escena = useRef<Scene | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useRef(false);
  const enfocada = useRef(true);
  const ultimPas = useRef(-1);

  const senseMoviment =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const dibuixa = useCallback(() => {
    const s = escena.current;
    if (!s) return;
    s.update(readRef.current());
    s.render();
  }, []);

  useEffect(() => {
    let viu = true;
    let handle = 0;
    const el = canvas.current;
    const caixa = contenidor.current;
    if (!el || !caixa) return;

    const s = new Scene(el);
    escena.current = s;

    const mesura = () => {
      const r = caixa.getBoundingClientRect();
      s.resize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height)));
    };

    const bucle = () => {
      if (!viu) return;
      if (visible.current && enfocada.current) dibuixa();
      handle = requestAnimationFrame(bucle);
    };

    s.init()
      .then(() => {
        if (!viu) return;
        mesura();
        dibuixa();
        if (!senseMoviment) handle = requestAnimationFrame(bucle);
      })
      .catch(() => setError("No s'ha pogut obrir el 3D en aquest navegador."));

    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = e.isIntersecting;
      },
      { threshold: 0.01 },
    );
    io.observe(caixa);

    const ro = new ResizeObserver(() => {
      mesura();
      if (senseMoviment) dibuixa();
    });
    ro.observe(caixa);

    const focus = () => {
      enfocada.current = true;
    };
    const desenfoc = () => {
      enfocada.current = false;
    };
    window.addEventListener("focus", focus);
    window.addEventListener("blur", desenfoc);

    return () => {
      viu = false;
      cancelAnimationFrame(handle);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", desenfoc);
      s.dispose();
      escena.current = null;
    };
  }, [dibuixa, senseMoviment]);

  /** Amb moviment reduït es dibuixa només quan canvia el pas. */
  useEffect(() => {
    if (!senseMoviment) return;
    const t = window.setInterval(() => {
      const pas = Math.floor(readRef.current()?.stepFloat ?? 0);
      if (pas !== ultimPas.current) {
        ultimPas.current = pas;
        dibuixa();
      }
    }, 60);
    return () => window.clearInterval(t);
  }, [dibuixa, senseMoviment]);

  // --- òrbita amb el ratolí, sense OrbitControls -------------------------
  const arrossegant = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    arrossegant.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const a = arrossegant.current;
    if (!a || !escena.current) return;
    escena.current.orbita(e.clientX - a.x, e.clientY - a.y);
    arrossegant.current = { x: e.clientX, y: e.clientY };
    if (senseMoviment) dibuixa();
  };
  const onUp = () => {
    arrossegant.current = null;
  };

  return (
    <div ref={contenidor} className="relative h-full min-h-[140px] w-full">
      <canvas
        ref={canvas}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={() => {
          escena.current?.restauraCamera();
          dibuixa();
        }}
        aria-label="Vista en tres dimensions del patró"
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
      />
      {error ? (
        <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-[13px] text-ink-soft">
          {error}
        </p>
      ) : null}
    </div>
  );
}
