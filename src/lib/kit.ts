import {
  createVoice,
  KINDS,
  makeModSampler,
  type VoiceChain,
  type VoiceKind,
  type VoiceParams,
} from "./voices";
import type { ChannelMix, Returns } from "./pattern";

type ToneModule = typeof import("tone");

export interface TrackLevels {
  /** Nivell de cada pista per id, de 0 a 1. */
  tracks: Record<string, number>;
  master: number;
}

export interface DrumKit {
  /** Crea la cadena d'una pista si no hi és, o la refà si n'ha canviat el tipus. */
  ensureTrack(id: string, kind: VoiceKind): void;
  removeTrack(id: string): void;
  trigger(id: string, time: number, velocity: number): void;
  /** Les veus melòdiques: quins MIDI sonen alhora i quant duren. */
  triggerNote(
    id: string,
    time: number,
    midis: number[],
    duration: number,
    velocity: number,
  ): void;
  /**
   * `trim` és el retoc de l'usuari en dB, relatiu al nivell propi del tipus
   * de veu: 0 vol dir "tal com ve de fàbrica", no "a tot drap".
   */
  setVolume(id: string, trim: number): void;
  setParams(id: string, params: VoiceParams): void;
  /** Panoràmic (-1..1) i els dos enviaments (0..1). */
  setRouting(id: string, mix: ChannelMix): void;
  setReturns(returns: Returns): void;
  /** Llegeix tots els vúmetres de cop; el pinta un sol bucle de dibuix. */
  levels(): TrackLevels;
  dispose(): void;
}

interface Entry {
  kind: VoiceKind;
  chain: VoiceChain;
  volume: InstanceType<ToneModule["Volume"]>;
  drive: InstanceType<ToneModule["Distortion"]>;
  panner: InstanceType<ToneModule["Panner"]>;
  sendA: InstanceType<ToneModule["Gain"]>;
  sendB: InstanceType<ToneModule["Gain"]>;
  meter: InstanceType<ToneModule["Meter"]>;
  trim: number;
  /** El kit en guarda una còpia per poder modular la saturació a cada cop. */
  params: VoiceParams | null;
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
  const mod = makeModSampler(Tone);

  // Els dos retorns globals. Van al mateix compressor de bus que les pistes,
  // i hi entren pels enviaments de cada pista, en paral·lel al so directe.
  const reverb = new Tone.Reverb({ decay: 2.2, wet: 1 }).connect(master);
  const delay = new Tone.FeedbackDelay({
    delayTime: "8n.",
    feedback: 0.35,
    wet: 1,
  }).connect(master);
  const returnA = new Tone.Gain(1).connect(reverb);
  const returnB = new Tone.Gain(1).connect(delay);
  void reverb.generate();

  const masterMeter = new Tone.Meter({ normalRange: true, smoothing: 0.7 });
  master.connect(masterMeter);

  const destroy = (e: Entry) => {
    e.chain.dispose();
    e.drive.dispose();
    e.volume.dispose();
    e.panner.dispose();
    e.sendA.dispose();
    e.sendB.dispose();
    e.meter.dispose();
  };

  return {
    ensureTrack(id, kind) {
      const previ = entries.get(id);
      if (previ) {
        if (previ.kind === kind) return;
        destroy(previ);
        entries.delete(id);
      }
      // saturació -> volum -> [panoràmic -> bus] i, en paral·lel, els
      // dos enviaments, que pengen del volum i no del panoràmic perquè el
      // retorn és mono i el panoràmic és de la sortida directa
      const volume = new Tone.Volume(KINDS[kind].level);
      const panner = new Tone.Panner(0).connect(master);
      volume.connect(panner);
      const sendA = new Tone.Gain(0).connect(returnA);
      const sendB = new Tone.Gain(0).connect(returnB);
      volume.connect(sendA);
      volume.connect(sendB);
      const meter = new Tone.Meter({ normalRange: true, smoothing: 0.7 });
      volume.connect(meter);
      const drive = new Tone.Distortion({ distortion: 0, wet: 0 }).connect(
        volume,
      );
      entries.set(id, {
        kind,
        chain: createVoice(Tone, kind, drive, mod),
        volume,
        drive,
        panner,
        sendA,
        sendB,
        meter,
        trim: 0,
        params: null,
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
      // la saturació viu al kit, no a la cadena, així que es modula aquí
      if (e.params) {
        const d = Math.max(
          0,
          Math.min(1, e.params.drive + mod(e.params, "drive", velocity)),
        );
        e.drive.distortion = d;
        e.drive.wet.value = d;
      }
      e.chain.trigger(time, velocity);
    },

    triggerNote(id, time, midis, duration, velocity) {
      const e = entries.get(id);
      if (!e?.chain.triggerNote) return;
      if (e.params) {
        const d = Math.max(
          0,
          Math.min(1, e.params.drive + mod(e.params, "drive", velocity)),
        );
        e.drive.distortion = d;
        e.drive.wet.value = d;
      }
      e.chain.triggerNote(time, midis, duration, velocity);
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
      e.params = params;
      e.drive.distortion = params.drive;
      e.drive.wet.value = params.drive;
      e.chain.setParams(params);
    },

    setRouting(id, mix) {
      const e = entries.get(id);
      if (!e) return;
      e.panner.pan.value = Math.max(-1, Math.min(1, mix.pan));
      e.sendA.gain.value = Math.max(0, Math.min(1, mix.sendA));
      e.sendB.gain.value = Math.max(0, Math.min(1, mix.sendB));
    },

    setReturns(returns) {
      // canviar el decay del Reverb regenera la resposta impulsional, i això
      // és asíncron: la reverberació calla un instant mentre es refà
      const decay = Math.max(0.2, Math.min(8, returns.a.decay));
      if (Number(reverb.decay) !== decay) {
        reverb.decay = decay;
        void reverb.generate();
      }
      reverb.wet.value = returns.a.muted ? 0 : returns.a.wet;
      delay.delayTime.value = returns.b.time;
      delay.feedback.value = Math.max(0, Math.min(0.9, returns.b.feedback));
      delay.wet.value = returns.b.muted ? 0 : returns.b.wet;
    },

    levels() {
      const tracks: Record<string, number> = {};
      for (const [id, e] of entries) {
        const v = e.meter.getValue();
        tracks[id] = typeof v === "number" ? v : v[0];
      }
      const m = masterMeter.getValue();
      return { tracks, master: typeof m === "number" ? m : m[0] };
    },

    dispose() {
      for (const e of entries.values()) destroy(e);
      entries.clear();
      returnA.dispose();
      returnB.dispose();
      reverb.dispose();
      delay.dispose();
      masterMeter.dispose();
      master.dispose();
    },
  };
}
