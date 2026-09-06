"use client";

import { useEffect } from "react";
import { PatternBank } from "./PatternBank";
import { TrackLane } from "./TrackLane";
import { Transport } from "./Transport";
import { useSequencer } from "@/hooks/useSequencer";
import { VOICES } from "@/lib/pattern";

function StepRuler({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-end gap-3 pb-1" aria-hidden>
      <div className="w-[186px] shrink-0" />
      <div className="flex gap-3">
        {[0, 1, 2, 3].map((g) => (
          <div key={g} className="flex gap-1">
            {[0, 1, 2, 3].map((i) => {
              const index = g * 4 + i;
              const isBeat = i === 0;
              return (
                <div
                  key={index}
                  className={[
                    "w-8 text-center text-[11px] tabular-nums sm:w-9",
                    currentStep === index
                      ? "text-ochre"
                      : isBeat
                        ? "text-ink"
                        : "text-ink-soft/60",
                  ].join(" ")}
                >
                  {index + 1}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Console() {
  const seq = useSequencer();
  const anySolo = VOICES.some((v) => seq.pattern.mix[v.id].solo);
  const { toggleTransport, audition } = seq;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        toggleTransport();
        return;
      }
      const voice = VOICES.find((v) => v.key === e.key);
      if (voice) void audition(voice.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleTransport, audition]);

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-12">
      <div className="overflow-hidden rounded-lg border border-ink/50 bg-panel text-ink shadow-[0_24px_60px_-20px_rgba(0,0,0,0.75)]">
        <header className="flex items-baseline justify-between gap-4 bg-ink px-4 py-3 text-panel-hi sm:px-6">
          <h1 className="font-display text-xl tracking-tight">RITME-16</h1>
          <p className="text-[12px] text-panel-lo">
            vuit veus sintetitzades, setze passos
          </p>
        </header>

        <Transport
          isPlaying={seq.isPlaying}
          bpm={seq.pattern.bpm}
          swing={seq.pattern.swing}
          currentStep={seq.currentStep}
          onToggle={seq.toggleTransport}
          onBpm={seq.setBpm}
          onSwing={seq.setSwing}
        />

        <div className="overflow-x-auto px-4 py-3 sm:px-6">
          <div className="min-w-max">
            <StepRuler currentStep={seq.currentStep} />
            {VOICES.map((voice) => (
              <TrackLane
                key={voice.id}
                voice={voice}
                cells={seq.pattern.steps[voice.id]}
                mix={seq.pattern.mix[voice.id]}
                currentStep={seq.currentStep}
                dimmed={
                  seq.pattern.mix[voice.id].muted ||
                  (anySolo && !seq.pattern.mix[voice.id].solo)
                }
                onToggleStep={(index, accent) =>
                  seq.toggleStep(voice.id, index, accent)
                }
                onChangeMix={(changes) => seq.setChannel(voice.id, changes)}
                onAudition={() => void seq.audition(voice.id)}
                onClear={() => seq.clearLane(voice.id)}
              />
            ))}
          </div>
        </div>

        <PatternBank
          pattern={seq.pattern}
          onLoad={seq.loadPattern}
          onClear={seq.clearAll}
          onRandomise={seq.randomise}
        />
      </div>

      <div className="mx-auto mt-5 max-w-2xl text-[13px] leading-relaxed text-panel-lo">
        <p>
          Clica un pas per activar-lo i torna-hi amb la tecla de majúscules per
          accentuar-lo. La barra espaiadora arrenca i atura; les tecles 1 a 8
          fan sonar cada veu solta; doble clic al nom d&apos;una veu buida la
          seva fila.
        </p>
      </div>
    </div>
  );
}
