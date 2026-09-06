import type { VoiceId } from "./pattern";

type ToneModule = typeof import("tone");

export interface DrumKit {
  trigger(id: VoiceId, time: number, velocity: number): void;
  setVolume(id: VoiceId, db: number): void;
  dispose(): void;
}

/**
 * Totes les veus són sintetitzades en temps real: cap sample, cap fitxer
 * d'àudio, cap llicència. Cada veu penja d'un Volume propi que va a un
 * compressor de bus abans de la sortida.
 */
export function createKit(Tone: ToneModule): DrumKit {
  const master = new Tone.Compressor({
    threshold: -14,
    ratio: 3,
    attack: 0.004,
    release: 0.12,
  }).toDestination();

  const channels = {} as Record<VoiceId, InstanceType<ToneModule["Volume"]>>;
  const bus = (id: VoiceId, db: number) => {
    const v = new Tone.Volume(db).connect(master);
    channels[id] = v;
    return v;
  };

  // --- Bombo: membrana amb caiguda de to ràpida -------------------------
  const bombo = new Tone.MembraneSynth({
    pitchDecay: 0.045,
    octaves: 6,
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.42, sustain: 0.008, release: 1.2 },
  }).connect(bus("bombo", -2));

  // --- Caixa: cos tonal + soroll filtrat --------------------------------
  const caixaOut = bus("caixa", -9);
  const caixaNoise = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.17, sustain: 0 },
  }).connect(new Tone.Filter(1500, "highpass").connect(caixaOut));
  const caixaBody = new Tone.MembraneSynth({
    pitchDecay: 0.02,
    octaves: 3,
    envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.1 },
  }).connect(new Tone.Volume(-8).connect(caixaOut));

  // --- Palmada: tres ràfegues curtes + cua ------------------------------
  const palmadaOut = bus("palmada", -10);
  const palmada = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.11, sustain: 0 },
  }).connect(
    new Tone.Filter({ frequency: 1100, type: "bandpass", Q: 1.6 }).connect(
      palmadaOut,
    ),
  );

  // --- Charles tancat i obert (l'obert s'ofega quan sona el tancat) ------
  const hatFilter = () => new Tone.Filter(7200, "highpass");
  const charles = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.045, sustain: 0 },
  }).connect(hatFilter().connect(bus("charles", -16)));
  const charlesObert = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.38, sustain: 0.02, release: 0.12 },
  }).connect(hatFilter().connect(bus("charlesObert", -18)));

  // --- Aro i cencerro: metàl·lics ---------------------------------------
  const aro = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.035, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 5200,
    octaves: 1.2,
  }).connect(bus("aro", -22));

  const cencerro = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.3, release: 0.08 },
    harmonicity: 12,
    modulationIndex: 16,
    resonance: 900,
    octaves: 0.4,
  }).connect(bus("cencerro", -24));

  // --- Timbal greu -------------------------------------------------------
  const timbal = new Tone.MembraneSynth({
    pitchDecay: 0.1,
    octaves: 3,
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.34, sustain: 0.01, release: 0.6 },
  }).connect(bus("timbal", -8));

  const triggers: Record<
    VoiceId,
    (time: number, velocity: number) => void
  > = {
    bombo: (t, v) => bombo.triggerAttackRelease("C1", "8n", t, v),
    caixa: (t, v) => {
      caixaBody.triggerAttackRelease("G2", "32n", t, v);
      caixaNoise.triggerAttackRelease("16n", t, v);
    },
    palmada: (t, v) => {
      palmada.triggerAttackRelease("32n", t, v * 0.7);
      palmada.triggerAttackRelease("32n", t + 0.011, v * 0.85);
      palmada.triggerAttackRelease("16n", t + 0.023, v);
    },
    charles: (t, v) => {
      // ofega el charles obert, com en una bateria real
      charlesObert.triggerRelease(t);
      charles.triggerAttackRelease("32n", t, v);
    },
    charlesObert: (t, v) => charlesObert.triggerAttackRelease("8n", t, v),
    aro: (t, v) => aro.triggerAttackRelease(420, "64n", t, v),
    timbal: (t, v) => timbal.triggerAttackRelease("A1", "8n", t, v),
    cencerro: (t, v) => cencerro.triggerAttackRelease(560, "16n", t, v),
  };

  const nodes = [
    master,
    bombo,
    caixaNoise,
    caixaBody,
    palmada,
    charles,
    charlesObert,
    aro,
    cencerro,
    timbal,
  ];

  return {
    trigger(id, time, velocity) {
      triggers[id]?.(time, velocity);
    },
    setVolume(id, db) {
      const ch = channels[id];
      if (ch) ch.volume.value = db;
    },
    dispose() {
      for (const n of nodes) n.dispose();
      for (const ch of Object.values(channels)) ch.dispose();
    },
  };
}
