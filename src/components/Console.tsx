"use client";

import { useEffect, useState } from "react";
import { PatternBank } from "./PatternBank";
import { TrackLane } from "./TrackLane";
import { Transport } from "./Transport";
import { VoicePanel } from "./VoicePanel";
import { useSequencer } from "@/hooks/useSequencer";
import { VOICES, type VoiceId } from "@/lib/pattern";

function StepRuler({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-end gap-3 pb-1" aria-hidden>
      <div className="w-[222px] shrink-0" />
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
  const [soundVoice, setSoundVoice] = useState<VoiceId | null>(null);
  const anySolo = VOICES.some((v) => seq.pattern.mix[v.id].solo);
  const openVoice = VOICES.find((v) => v.id === soundVoice);
  const { toggleTransport, audition } = seq;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Les dreceres del navegador manen: cmd+1 canvia de pestanya, no fa sonar res.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Només s'aparten els camps on l'usuari escriu de debò. Un control
      // lliscant també és un <input>, però amb el focus a sobre la barra
      // espaiadora hi és inútil, i abans això deixava el transport mut.
      const target = e.target as HTMLElement | null;
      const escrivint =
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable ||
        (target instanceof HTMLInputElement &&
          !["range", "checkbox", "radio", "button", "submit"].includes(
            target.type,
          ));
      if (escrivint) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) toggleTransport();
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
                onOpenSound={() =>
                  setSoundVoice((v) => (v === voice.id ? null : voice.id))
                }
                onClear={() => seq.clearLane(voice.id)}
                soundOpen={soundVoice === voice.id}
              />
            ))}
          </div>
        </div>

        {openVoice ? (
          <VoicePanel
            voice={openVoice}
            params={seq.pattern.sound[openVoice.id]}
            onChange={(changes) => seq.setSound(openVoice.id, changes)}
            onClose={() => setSoundVoice(null)}
          />
        ) : null}

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
          accentuar-lo. La barra espaiadora arrenca i atura; les tecles 1 a 8 i
          el botó ▶ fan sonar cada veu solta; el nom de la veu obre els seus
          comandaments de so, i el doble clic hi buida la fila.
        </p>
      </div>
    </div>
  );
}
