"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createKit, type DrumKit } from "@/lib/kit";
import {
  clonePattern,
  emptyLane,
  isAudible,
  KINDS,
  PRESETS,
  STEPS,
  type Cell,
  type ChannelMix,
  type Pattern,
  type Track,
  type VoiceParams,
} from "@/lib/pattern";

type ToneModule = typeof import("tone");
// InstanceType<> perdria el paràmetre de tipus i el deixaria en `unknown`;
// els passos de la seqüència són índexs.
type StepSequence = import("tone").Sequence<number>;

const ACCENT_VELOCITY = 1;
const NORMAL_VELOCITY = 0.6;

/** Aboca al kit tot el que el patró diu de cada pista. */
function applyTracks(kit: DrumKit, p: Pattern) {
  for (const t of p.tracks) {
    kit.ensureTrack(t.id, t.kind);
    kit.setVolume(t.id, t.mix.volume);
    kit.setParams(t.id, t.sound);
  }
}

export function useSequencer() {
  const [pattern, setPattern] = useState<Pattern>(() =>
    clonePattern(PRESETS[0]),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [audioReady, setAudioReady] = useState(false);

  const toneRef = useRef<ToneModule | null>(null);
  const kitRef = useRef<DrumKit | null>(null);
  const seqRef = useRef<StepSequence | null>(null);
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
    }
    // les pistes poden haver canviat des de l'últim cop
    applyTracks(kitRef.current, patternRef.current);
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
          for (const t of p.tracks) {
            const cell = t.steps[step];
            if (!cell || !isAudible(p, t)) continue;
            kit.trigger(
              t.id,
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

  /** Reescriu una pista pel seu id, deixant la resta del patró intacta. */
  const editTrack = useCallback(
    (id: string, change: (t: Track) => void) => {
      setPattern((prev) => {
        const next = clonePattern(prev);
        const track = next.tracks.find((t) => t.id === id);
        if (!track) return prev;
        change(track);
        return next;
      });
    },
    [],
  );

  const toggleStep = useCallback(
    (id: string, index: number, accent = false) => {
      editTrack(id, (t) => {
        const current = t.steps[index];
        t.steps[index] = accent
          ? current === 2
            ? 1
            : 2
          : current === 0
            ? 1
            : 0;
      });
    },
    [editTrack],
  );

  const clearLane = useCallback(
    (id: string) => editTrack(id, (t) => (t.steps = emptyLane())),
    [editTrack],
  );

  const setChannel = useCallback(
    (id: string, changes: Partial<ChannelMix>) => {
      if (changes.volume !== undefined) {
        kitRef.current?.setVolume(id, changes.volume);
      }
      editTrack(id, (t) => (t.mix = { ...t.mix, ...changes }));
    },
    [editTrack],
  );

  const setSound = useCallback(
    (id: string, changes: Partial<VoiceParams>) => {
      // el kit ha de sentir el canvi ara, no al proper render
      const previ = patternRef.current.tracks.find((t) => t.id === id);
      if (!previ) return;
      const next = { ...previ.sound, ...changes };
      kitRef.current?.setParams(id, next);
      editTrack(id, (t) => (t.sound = next));
    },
    [editTrack],
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
    if (kitRef.current) applyTracks(kitRef.current, next);
  }, []);

  const clearAll = useCallback(() => {
    setPattern((prev) => ({
      ...clonePattern(prev),
      name: "Sense títol",
      tracks: prev.tracks.map((t) => ({ ...t, steps: emptyLane() })),
    }));
  }, []);

  /** Genera alguna cosa tocable, no soroll: cada tipus de veu té la seva densitat. */
  const randomise = useCallback(() => {
    setPattern((prev) => {
      const next = clonePattern(prev);
      for (const t of next.tracks) {
        t.steps = Array.from({ length: STEPS }, (_, i) => {
          const onBeat = i % 4 === 0;
          const chance = KINDS[t.kind].density * (onBeat ? 2.4 : 1);
          if (Math.random() > chance) return 0 as Cell;
          return (onBeat && Math.random() < 0.4 ? 2 : 1) as Cell;
        });
      }
      // garanteix un punt d'ancoratge al primer temps
      const primer = next.tracks.find((t) => t.kind === "bombo") ?? next.tracks[0];
      if (primer) primer.steps[0] = 2;
      return next;
    });
  }, []);

  const audition = useCallback(
    async (id: string) => {
      const { Tone, kit } = await ensureAudio();
      kit.trigger(id, Tone.now(), ACCENT_VELOCITY);
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
    setSound,
    setBpm,
    setSwing,
    loadPattern,
    clearAll,
    randomise,
    audition,
  };
}
