"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createKit, type DrumKit } from "@/lib/kit";
import {
  clonePattern,
  emptyPattern,
  PRESETS,
  STEPS,
  VOICES,
  type Cell,
  type Pattern,
  type VoiceId,
} from "@/lib/pattern";

type ToneModule = typeof import("tone");
type Sequence = InstanceType<ToneModule["Sequence"]>;

const ACCENT_VELOCITY = 1;
const NORMAL_VELOCITY = 0.6;

export function useSequencer() {
  const [pattern, setPattern] = useState<Pattern>(() =>
    clonePattern(PRESETS[0]),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [audioReady, setAudioReady] = useState(false);

  const toneRef = useRef<ToneModule | null>(null);
  const kitRef = useRef<DrumKit | null>(null);
  const seqRef = useRef<Sequence | null>(null);
  const patternRef = useRef(pattern);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  /** Carrega Tone només al client i només després d'un gest de l'usuari. */
  const ensureAudio = useCallback(async () => {
    if (!toneRef.current) {
      toneRef.current = await import("tone");
    }
    const Tone = toneRef.current;
    await Tone.start();
    if (!kitRef.current) {
      kitRef.current = createKit(Tone);
      const mix = patternRef.current.mix;
      for (const v of VOICES) kitRef.current.setVolume(v.id, mix[v.id].volume);
    }
    setAudioReady(true);
    return { Tone, kit: kitRef.current };
  }, []);

  const start = useCallback(async () => {
    const { Tone, kit } = await ensureAudio();
    const transport = Tone.getTransport();
    transport.bpm.value = patternRef.current.bpm;
    transport.swing = patternRef.current.swing;
    transport.swingSubdivision = "16n";

    if (!seqRef.current) {
      const indices = Array.from({ length: STEPS }, (_, i) => i);
      seqRef.current = new Tone.Sequence(
        (time, step) => {
          const p = patternRef.current;
          const anySolo = VOICES.some((v) => p.mix[v.id].solo);
          for (const v of VOICES) {
            const cell = p.steps[v.id][step];
            if (!cell) continue;
            const ch = p.mix[v.id];
            if (ch.muted || (anySolo && !ch.solo)) continue;
            kit.trigger(
              v.id,
              time,
              cell === 2 ? ACCENT_VELOCITY : NORMAL_VELOCITY,
            );
          }
          Tone.getDraw().schedule(() => setCurrentStep(step), time);
        },
        indices,
        "16n",
      ).start(0);
    }

    transport.start();
    setIsPlaying(true);
  }, [ensureAudio]);

  const stop = useCallback(() => {
    const Tone = toneRef.current;
    if (Tone) {
      Tone.getTransport().stop();
      Tone.getTransport().position = 0;
    }
    setIsPlaying(false);
    setCurrentStep(-1);
  }, []);

  const toggleTransport = useCallback(() => {
    if (isPlaying) stop();
    else void start();
  }, [isPlaying, start, stop]);

  // Neteja en desmuntar
  useEffect(() => {
    return () => {
      seqRef.current?.dispose();
      seqRef.current = null;
      kitRef.current?.dispose();
      kitRef.current = null;
      toneRef.current?.getTransport().stop();
    };
  }, []);

  // El transport llegeix aquests valors en directe
  useEffect(() => {
    const Tone = toneRef.current;
    if (!Tone) return;
    Tone.getTransport().bpm.value = pattern.bpm;
    Tone.getTransport().swing = pattern.swing;
  }, [pattern.bpm, pattern.swing]);

  // --- Edició -----------------------------------------------------------

  const toggleStep = useCallback(
    (voice: VoiceId, index: number, accent = false) => {
      setPattern((prev) => {
        const next = clonePattern(prev);
        const current = next.steps[voice][index];
        let value: Cell;
        if (accent) value = current === 2 ? 1 : 2;
        else value = current === 0 ? 1 : 0;
        next.steps[voice][index] = value;
        return next;
      });
    },
    [],
  );

  const clearLane = useCallback((voice: VoiceId) => {
    setPattern((prev) => {
      const next = clonePattern(prev);
      next.steps[voice] = Array<Cell>(STEPS).fill(0);
      return next;
    });
  }, []);

  const setChannel = useCallback(
    (voice: VoiceId, changes: Partial<Pattern["mix"][VoiceId]>) => {
      if (changes.volume !== undefined) {
        kitRef.current?.setVolume(voice, changes.volume);
      }
      setPattern((prev) => {
        const next = clonePattern(prev);
        next.mix[voice] = { ...next.mix[voice], ...changes };
        return next;
      });
    },
    [],
  );

  const setBpm = useCallback((bpm: number) => {
    setPattern((prev) => ({ ...prev, bpm: Math.min(200, Math.max(40, bpm)) }));
  }, []);

  const setSwing = useCallback((swing: number) => {
    setPattern((prev) => ({ ...prev, swing }));
  }, []);

  const loadPattern = useCallback((p: Pattern) => {
    const next = clonePattern(p);
    setPattern(next);
    for (const v of VOICES) kitRef.current?.setVolume(v.id, next.mix[v.id].volume);
  }, []);

  const clearAll = useCallback(() => {
    setPattern((prev) => {
      const next = emptyPattern("Sense títol");
      next.bpm = prev.bpm;
      next.swing = prev.swing;
      next.mix = clonePattern(prev).mix;
      return next;
    });
  }, []);

  /** Genera alguna cosa tocable, no soroll: cada veu té la seva densitat. */
  const randomise = useCallback(() => {
    const density: Record<VoiceId, number> = {
      bombo: 0.22,
      caixa: 0.12,
      palmada: 0.08,
      charles: 0.45,
      charlesObert: 0.06,
      aro: 0.1,
      timbal: 0.07,
      cencerro: 0.05,
    };
    setPattern((prev) => {
      const next = clonePattern(prev);
      for (const v of VOICES) {
        next.steps[v.id] = Array.from({ length: STEPS }, (_, i) => {
          const onBeat = i % 4 === 0;
          const chance = density[v.id] * (onBeat ? 2.4 : 1);
          if (Math.random() > chance) return 0 as Cell;
          return (onBeat && Math.random() < 0.4 ? 2 : 1) as Cell;
        });
      }
      // garanteix un punt d'ancoratge al primer temps
      next.steps.bombo[0] = 2;
      return next;
    });
  }, []);

  const audition = useCallback(
    async (voice: VoiceId) => {
      const { Tone, kit } = await ensureAudio();
      kit.trigger(voice, Tone.now(), ACCENT_VELOCITY);
    },
    [ensureAudio],
  );

  return {
    pattern,
    isPlaying,
    currentStep,
    audioReady,
    start,
    stop,
    toggleTransport,
    toggleStep,
    clearLane,
    setChannel,
    setBpm,
    setSwing,
    loadPattern,
    clearAll,
    randomise,
    audition,
  };
}
