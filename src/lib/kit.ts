import {
  createVoice,
  KINDS,
  type VoiceChain,
  type VoiceKind,
  type VoiceParams,
} from "./voices";

type ToneModule = typeof import("tone");

export interface DrumKit {
  /** Crea la cadena d'una pista si no hi és, o la refà si n'ha canviat el tipus. */
  ensureTrack(id: string, kind: VoiceKind): void;
  removeTrack(id: string): void;
  trigger(id: string, time: number, velocity: number): void;
  /**
   * `trim` és el retoc de l'usuari en dB, relatiu al nivell propi del tipus
   * de veu: 0 vol dir "tal com ve de fàbrica", no "a tot drap".
   */
  setVolume(id: string, trim: number): void;
  setParams(id: string, params: VoiceParams): void;
  dispose(): void;
}

interface Entry {
  kind: VoiceKind;
  chain: VoiceChain;
  volume: InstanceType<ToneModule["Volume"]>;
  drive: InstanceType<ToneModule["Distortion"]>;
  trim: number;
}

/**
 * El kit no sap res de cap veu concreta: només guarda una cadena per pista i
 * la demana a lib/voices.ts. Cada pista penja d'una saturació i un Volume
 * propis que van a un compressor de bus abans de la sortida.
 */
export function createKit(Tone: ToneModule): DrumKit {
  const master = new Tone.Compressor({
    threshold: -14,
    ratio: 3,
    attack: 0.004,
    release: 0.12,
  }).toDestination();

  const entries = new Map<string, Entry>();

  const destroy = (e: Entry) => {
    e.chain.dispose();
    e.drive.dispose();
    e.volume.dispose();
  };

  return {
    ensureTrack(id, kind) {
      const previ = entries.get(id);
      if (previ) {
        if (previ.kind === kind) return;
        destroy(previ);
        entries.delete(id);
      }
      const volume = new Tone.Volume(KINDS[kind].level).connect(master);
      const drive = new Tone.Distortion({ distortion: 0, wet: 0 }).connect(
        volume,
      );
      entries.set(id, {
        kind,
        chain: createVoice(Tone, kind, drive),
        volume,
        drive,
        trim: 0,
      });
    },

    removeTrack(id) {
      const e = entries.get(id);
      if (!e) return;
      destroy(e);
      entries.delete(id);
    },

    trigger(id, time, velocity) {
      const e = entries.get(id);
      if (!e) return;
      // el charles ofega el charles obert, com en una bateria real
      const chokes = KINDS[e.kind].chokes;
      if (chokes) {
        for (const altre of entries.values()) {
          if (chokes.includes(altre.kind)) altre.chain.release(time);
        }
      }
      e.chain.trigger(time, velocity);
    },

    setVolume(id, trim) {
      const e = entries.get(id);
      if (!e) return;
      e.trim = trim;
      e.volume.volume.value = KINDS[e.kind].level + trim;
    },

    setParams(id, params) {
      const e = entries.get(id);
      if (!e) return;
      e.drive.distortion = params.drive;
      e.drive.wet.value = params.drive;
      e.chain.setParams(params);
    },

    dispose() {
      for (const e of entries.values()) destroy(e);
      entries.clear();
      master.dispose();
    },
  };
}
