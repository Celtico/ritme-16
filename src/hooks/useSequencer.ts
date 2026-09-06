"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createKit, type DrumKit, type TrackLevels } from "@/lib/kit";
import { renderPattern } from "@/lib/render";
import {
  ACCENT_VELOCITY,
  applyTracks,
  triggerStep,
} from "@/lib/playback";
import {
  addTrack as add,
  applyMacroAssignment,
  BASS_MAX_LENGTH,
  CHORD_MAX_LENGTH,
  clonePattern,
  duplicateTrack as duplicate,
  emptyLane,
  KINDS,
  placeNote,
  moveTrack as move,
  PRESETS,
  removeTrack as remove,
  type BassNote,
  type Cell,
  type ChannelMix,
  type ChordNote,
  type Key,
  type PatternLength,
  type Macro,
  type Pattern,
  type Returns,
  type Track,
  type VoiceKind,
  type VoiceParams,
} from "@/lib/pattern";

type ToneModule = typeof import("tone");
// InstanceType<> perdria el paràmetre de tipus i el deixaria en `unknown`;
// els passos de la seqüència són índexs.
type StepSequence = import("tone").Sequence<number>;


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
      const indices = Array.from(
        { length: patternRef.current.length },
        (_, i) => i,
      );
      seqRef.current = new Tone.Sequence(
        (time, step) => {
          triggerStep(
            kit,
            patternRef.current,
            step,
            time,
            Tone.Time("16n").toSeconds(),
          );
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

  /**
   * La llargada es canvia escrivint els events de la seqüència, no refent-la:
   * recrear-la mentre sona perdria el lloc del transport.
   */
  useEffect(() => {
    const seq = seqRef.current;
    if (!seq) return;
    if (seq.events.length !== pattern.length) {
      seq.events = Array.from({ length: pattern.length }, (_, i) => i);
    }
  }, [pattern.length]);

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
      const previ = patternRef.current.tracks.find((t) => t.id === id);
      if (!previ) return;
      const mix = { ...previ.mix, ...changes };
      // el kit ho ha de sentir ara, no al proper render
      if (changes.volume !== undefined) kitRef.current?.setVolume(id, mix.volume);
      kitRef.current?.setRouting(id, mix);
      editTrack(id, (t) => (t.mix = mix));
    },
    [editTrack],
  );

  const setReturns = useCallback((changes: Partial<Returns>) => {
    const next = { ...patternRef.current.returns, ...changes };
    kitRef.current?.setReturns(next);
    setPattern((prev) => ({ ...clonePattern(prev), returns: next }));
  }, []);

  /** El bucle de dibuix dels vúmetres els llegeix tots d'un sol cop. */
  const readLevels = useCallback((): TrackLevels | null => {
    return kitRef.current?.levels() ?? null;
  }, []);

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

  /** Moure un macro escriu els paràmetres de totes les seves destinacions. */
  const setMacro = useCallback(
    (index: number, changes: Partial<Macro>) => {
      const prev = patternRef.current;
      const anterior = prev.macros[index];
      if (!anterior) return;
      const macro = { ...anterior, ...changes };
      const next = clonePattern(prev);
      next.macros[index] = macro;
      for (const a of macro.assignments) {
        const t = next.tracks.find((x) => x.id === a.trackId);
        if (!t) continue;
        t.sound = applyMacroAssignment(t, a, macro.value);
        kitRef.current?.setParams(t.id, t.sound);
      }
      setPattern(next);
    },
    [],
  );

  // --- Gestió de pistes ---------------------------------------------------

  /**
   * Les operacions que canvien la llista de pistes passen totes per aquí: el
   * kit ha de saber quines cadenes ha de tenir abans no soni el pas següent.
   */
  const restructure = useCallback((next: Pattern, eliminada?: string) => {
    const kit = kitRef.current;
    if (kit) {
      if (eliminada) kit.removeTrack(eliminada);
      applyTracks(kit, next);
    }
    patternRef.current = next;
    setPattern(next);
  }, []);

  const addTrack = useCallback(
    (kind: VoiceKind) => restructure(add(patternRef.current, kind)),
    [restructure],
  );

  const duplicateTrack = useCallback(
    (id: string) => restructure(duplicate(patternRef.current, id)),
    [restructure],
  );

  const removeTrack = useCallback(
    (id: string) => {
      const next = remove(patternRef.current, id);
      if (next === patternRef.current) return;
      restructure(next, id);
    },
    [restructure],
  );

  const moveTrack = useCallback(
    (id: string, delta: number) => restructure(move(patternRef.current, id, delta)),
    [restructure],
  );

  const renameTrack = useCallback(
    (id: string, name: string) => editTrack(id, (t) => (t.name = name)),
    [editTrack],
  );

  const setTrackColor = useCallback(
    (id: string, color: string) => editTrack(id, (t) => (t.color = color)),
    [editTrack],
  );

  // --- Edició melòdica ----------------------------------------------------

  const setKey = useCallback((key: Key) => {
    setPattern((prev) => ({ ...clonePattern(prev), key }));
  }, []);

  const setBassNote = useCallback(
    (id: string, index: number, note: BassNote | null) =>
      editTrack(id, (t) => {
        if (t.bass) t.bass = placeNote(t.bass, index, note, BASS_MAX_LENGTH);
      }),
    [editTrack],
  );

  const setChordNote = useCallback(
    (id: string, index: number, chord: ChordNote | null) =>
      editTrack(id, (t) => {
        if (t.chords) {
          t.chords = placeNote(t.chords, index, chord, CHORD_MAX_LENGTH);
        }
      }),
    [editTrack],
  );

  const setBpm = useCallback((bpm: number) => {
    setPattern((prev) => ({ ...prev, bpm: Math.min(200, Math.max(40, bpm)) }));
  }, []);

  const setLength = useCallback((length: PatternLength) => {
    setPattern((prev) => ({ ...clonePattern(prev), length }));
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
        const nova = emptyLane();
        for (let i = 0; i < next.length; i++) {
          const onBeat = i % 4 === 0;
          const chance = KINDS[t.kind].density * (onBeat ? 2.4 : 1);
          if (Math.random() > chance) continue;
          nova[i] = (onBeat && Math.random() < 0.4 ? 2 : 1) as Cell;
        }
        t.steps = nova;
      }
      // garanteix un punt d'ancoratge al primer temps
      const primer = next.tracks.find((t) => t.kind === "bombo") ?? next.tracks[0];
      if (primer) primer.steps[0] = 2;
      return next;
    });
  }, []);

  const [exporting, setExporting] = useState(false);

  /**
   * Exporta el patró a WAV. Carrega Tone si encara no hi és, però no fa
   * servir el context que sona: Tone.Offline en munta un de propi.
   */
  const exportWav = useCallback(async (): Promise<ArrayBuffer | null> => {
    setExporting(true);
    try {
      if (!toneRef.current) toneRef.current = await import("tone");
      return await renderPattern(toneRef.current, patternRef.current);
    } finally {
      setExporting(false);
    }
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
    setKey,
    setBassNote,
    setChordNote,
    setMacro,
    setReturns,
    readLevels,
    addTrack,
    duplicateTrack,
    removeTrack,
    moveTrack,
    renameTrack,
    setTrackColor,
    setBpm,
    setLength,
    setSwing,
    loadPattern,
    clearAll,
    randomise,
    audition,
    exportWav,
    exporting,
  };
}
