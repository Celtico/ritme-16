"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createKit, type DrumKit, type TrackLevels } from "@/lib/kit";
import { renderPattern } from "@/lib/render";
import {
  addScene,
  applyScene as applySceneTo,
  removeScene as removeSceneFrom,
  renameScene as renameSceneIn,
  syncActiveScene,
} from "@/lib/scenes";
import {
  cloneSong,
  currentPattern,
  emptySong,
  SLOT_NAMES,
  resolveFollow,
  type FollowAction,
  type Song,
} from "@/lib/song";
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
  emptyPattern,
  KINDS,
  MAX_STEPS,
  placeNote,
  moveTrack as move,
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
  /**
   * La font de veritat és la ref, no l'estat: el fil d'àudio hi ha d'escriure
   * el canvi de ranura i el pas següent l'ha de veure ja fet. L'estat només
   * hi va al darrere per poder dibuixar.
   */
  const songRef = useRef<Song>(emptySong());
  const [song, setSong] = useState<Song>(songRef.current);
  const pattern = currentPattern(song);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [audioReady, setAudioReady] = useState(false);

  const toneRef = useRef<ToneModule | null>(null);
  const kitRef = useRef<DrumKit | null>(null);
  const seqRef = useRef<StepSequence | null>(null);
  /** Hi ha canvis des de l'últim cop que es va carregar una cançó sencera? */
  const [dirty, setDirty] = useState(false);

  const commitSong = useCallback(
    (updater: (s: Song) => Song, net = false) => {
      const next = updater(songRef.current);
      songRef.current = next;
      setSong(next);
      setDirty(!net);
    },
    [],
  );

  /** Substitueix la cançó sencera. La marca com a neta. */
  const loadSong = useCallback(
    (nova: Song) => {
      commitSong(() => {
        if (kitRef.current) applyTracks(kitRef.current, currentPattern(nova));
        return nova;
      }, true);
      barsRef.current = 0;
      lastSwitchRef.current = 0;
    },
    [commitSong],
  );

  /** Reescriu el patró de la ranura que sona. */
  const setPattern = useCallback(
    (updater: (p: Pattern) => Pattern) =>
      commitSong((s) => {
        const next = cloneSong(s);
        next.slots[next.current].pattern = updater(
          next.slots[next.current].pattern,
        );
        return next;
      }),
    [commitSong],
  );

  /** Compassos comptats des que sona, i quan es va canviar de ranura. */
  const barsRef = useRef(0);
  const lastSwitchRef = useRef(0);

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
    applyTracks(kitRef.current, currentPattern(songRef.current));
    setAudioReady(true);
    return { Tone, kit: kitRef.current };
  }, []);

  const start = useCallback(async () => {
    const { Tone, kit } = await ensureAudio();
    const transport = Tone.getTransport();
    transport.bpm.value = currentPattern(songRef.current).bpm;
    transport.swing = currentPattern(songRef.current).swing;
    transport.swingSubdivision = "16n";

    if (!seqRef.current) {
      // Un rellotge fix de MAX_STEPS setzens. El patró s'hi enrotlla amb un
      // mòdul, o sigui que canviar de llargada o de ranura no reprograma res.
      const indices = Array.from({ length: MAX_STEPS }, (_, i) => i);
      seqRef.current = new Tone.Sequence(
        (time, step) => {
          const s = songRef.current;
          const p = currentPattern(s);
          const i = step % p.length;

          triggerStep(kit, p, i, time, Tone.Time("16n").toSeconds());

          // un compàs són setze setzens del rellotge
          if (step % 16 === 15) barsRef.current += 1;

          // La decisió es pren al darrer pas del patró, dins del callback:
          // escrivint la ref, el pas 0 que ve tot seguit ja llegeix la
          // ranura nova i no hi ha cap forat.
          if (i === p.length - 1) {
            const { every } = s.slots[s.current].follow;
            if (barsRef.current - lastSwitchRef.current >= every) {
              lastSwitchRef.current = barsRef.current;
              const { scene } = s.slots[s.current].follow;
              const seguent = resolveFollow(s, s.current);
              if (seguent !== s.current || scene !== undefined) {
                const nova = cloneSong(s);
                nova.current = seguent;
                if (scene !== undefined) {
                  nova.slots[seguent].pattern = applySceneTo(
                    nova.slots[seguent].pattern,
                    scene,
                  );
                }
                songRef.current = nova;
                if (kit) applyTracks(kit, currentPattern(nova));
                Tone.getDraw().schedule(() => setSong(nova), time);
              }
            }
          }

          Tone.getDraw().schedule(() => setCurrentStep(i), time);
        },
        indices,
        "16n",
      ).start(0);
    }

    transport.start();
    setIsPlaying(true);
  }, [ensureAudio]);

  const stop = useCallback(() => {
    barsRef.current = 0;
    lastSwitchRef.current = 0;
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
  }, [setPattern]);

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
    [setPattern],
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
      const previ = currentPattern(songRef.current).tracks.find((t) => t.id === id);
      if (!previ) return;
      const mix = { ...previ.mix, ...changes };
      // el kit ho ha de sentir ara, no al proper render
      if (changes.volume !== undefined) kitRef.current?.setVolume(id, mix.volume);
      kitRef.current?.setRouting(id, mix);
      editTrack(id, (t) => (t.mix = mix));
      // els M i els S modifiquen l'escena activa, si n'hi ha cap
      setPattern(syncActiveScene);
    },
    [editTrack, setPattern],
  );

  const setReturns = useCallback((changes: Partial<Returns>) => {
    const next = { ...currentPattern(songRef.current).returns, ...changes };
    kitRef.current?.setReturns(next);
    setPattern((prev) => ({ ...clonePattern(prev), returns: next }));
  }, [setPattern]);

  /** El bucle de dibuix dels vúmetres els llegeix tots d'un sol cop. */
  const readLevels = useCallback((): TrackLevels | null => {
    return kitRef.current?.levels() ?? null;
  }, []);

  const setSound = useCallback(
    (id: string, changes: Partial<VoiceParams>) => {
      // el kit ha de sentir el canvi ara, no al proper render
      const previ = currentPattern(songRef.current).tracks.find((t) => t.id === id);
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
      const prev = currentPattern(songRef.current);
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
      setPattern(() => next);
    },
    [setPattern],
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
    setPattern(() => next);
  }, [setPattern]);

  const addTrack = useCallback(
    (kind: VoiceKind) => restructure(add(currentPattern(songRef.current), kind)),
    [restructure],
  );

  const duplicateTrack = useCallback(
    (id: string) => restructure(duplicate(currentPattern(songRef.current), id)),
    [restructure],
  );

  const removeTrack = useCallback(
    (id: string) => {
      const next = remove(currentPattern(songRef.current), id);
      if (next === currentPattern(songRef.current)) return;
      restructure(next, id);
    },
    [restructure],
  );

  const moveTrack = useCallback(
    (id: string, delta: number) => restructure(move(currentPattern(songRef.current), id, delta)),
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
  }, [setPattern]);

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

  // --- El banc de ranures --------------------------------------------------

  /** Tria quina ranura sona i s'edita. Aplica el kit de seguida. */
  const selectSlot = useCallback(
    (index: number) => {
      commitSong((s) => {
        if (index < 0 || index >= s.slots.length || index === s.current) return s;
        const next = { ...s, current: index };
        if (kitRef.current) applyTracks(kitRef.current, currentPattern(next));
        return next;
      });
      lastSwitchRef.current = barsRef.current;
    },
    [commitSong],
  );

  const setFollow = useCallback(
    (index: number, follow: FollowAction) =>
      commitSong((s) => {
        const next = cloneSong(s);
        if (next.slots[index]) next.slots[index].follow = follow;
        return next;
      }),
    [commitSong],
  );

  /** Copia el patró d'una ranura a una altra, la follow action a part. */
  const copySlot = useCallback(
    (from: number, to: number) =>
      commitSong((s) => {
        if (from === to || !s.slots[from] || !s.slots[to]) return s;
        const next = cloneSong(s);
        next.slots[to].pattern = clonePattern(s.slots[from].pattern);
        if (to === next.current && kitRef.current) {
          applyTracks(kitRef.current, next.slots[to].pattern);
        }
        return next;
      }),
    [commitSong],
  );

  const clearSlot = useCallback(
    (index: number) =>
      commitSong((s) => {
        const next = cloneSong(s);
        if (next.slots[index]) {
          next.slots[index].pattern = emptyPattern(SLOT_NAMES[index]);
        }
        return next;
      }),
    [commitSong],
  );

  // --- Escenes -------------------------------------------------------------

  const saveScene = useCallback(
    (name: string) => setPattern((p) => addScene(p, name)),
    [setPattern],
  );

  const applyScene = useCallback(
    (index: number) =>
      commitSong((s) => {
        const next = cloneSong(s);
        next.slots[next.current].pattern = applySceneTo(
          next.slots[next.current].pattern,
          index,
        );
        if (kitRef.current) applyTracks(kitRef.current, currentPattern(next));
        return next;
      }),
    [commitSong],
  );

  const renameScene = useCallback(
    (index: number, name: string) =>
      setPattern((p) => renameSceneIn(p, index, name)),
    [setPattern],
  );

  const removeScene = useCallback(
    (index: number) => setPattern((p) => removeSceneFrom(p, index)),
    [setPattern],
  );

  const setBpm = useCallback((bpm: number) => {
    setPattern((prev) => ({ ...prev, bpm: Math.min(200, Math.max(40, bpm)) }));
  }, [setPattern]);

  const setLength = useCallback((length: PatternLength) => {
    setPattern((prev) => ({ ...clonePattern(prev), length }));
  }, [setPattern]);

  const setSwing = useCallback((swing: number) => {
    setPattern((prev) => ({ ...prev, swing }));
  }, [setPattern]);

  const loadPattern = useCallback((p: Pattern) => {
    const next = clonePattern(p);
    setPattern(() => next);
    if (kitRef.current) applyTracks(kitRef.current, next);
  }, [setPattern]);

  const clearAll = useCallback(() => {
    setPattern((prev) => ({
      ...clonePattern(prev),
      name: "Sense títol",
      tracks: prev.tracks.map((t) => ({ ...t, steps: emptyLane() })),
    }));
  }, [setPattern]);

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
  }, [setPattern]);

  const [exporting, setExporting] = useState(false);

  /**
   * Exporta el patró a WAV. Carrega Tone si encara no hi és, però no fa
   * servir el context que sona: Tone.Offline en munta un de propi.
   */
  const exportWav = useCallback(async (): Promise<ArrayBuffer | null> => {
    setExporting(true);
    try {
      if (!toneRef.current) toneRef.current = await import("tone");
      return await renderPattern(toneRef.current, currentPattern(songRef.current));
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
    song,
    dirty,
    loadSong,
    selectSlot,
    setFollow,
    copySlot,
    clearSlot,
    saveScene,
    applyScene,
    renameScene,
    removeScene,
    randomise,
    audition,
    exportWav,
    exporting,
  };
}
