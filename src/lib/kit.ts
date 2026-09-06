import { defaultSound, type VoiceId, type VoiceParams } from "./pattern";

type ToneModule = typeof import("tone");

export interface DrumKit {
  trigger(id: VoiceId, time: number, velocity: number): void;
  /**
   * `trim` és el retoc de l'usuari en dB, relatiu al nivell propi de la veu:
   * 0 vol dir "tal com ve de fàbrica", no "a tot drap".
   */
  setVolume(id: VoiceId, trim: number): void;
  /** Aplica els comandaments de so en directe. No recrea cap node. */
  setParams(id: VoiceId, params: VoiceParams): void;
  dispose(): void;
}

/**
 * El pes de cada veu dins la barreja. Són els nivells que fan que el conjunt
 * no passi de 0 dBFS: el MetalSynth de l'aro i el cencerro surt molt calent i
 * necessita més de 20 dB d'atenuació.
 */
const LEVELS: Record<VoiceId, number> = {
  bombo: -2,
  caixa: -9,
  palmada: -10,
  charles: -16,
  charlesObert: -18,
  aro: -22,
  timbal: -8,
  cencerro: -24,
};

const semitons = (n: number) => Math.pow(2, n / 12);

/**
 * Recorregut del comandament de to. El 0,5 sempre cau exactament al valor de
 * fàbrica, així que un patró sense tocar sona igual que abans; per sota baixa
 * dues octaves i per sobre puja fins al sostre que admeti la veu.
 */
function sweep(base: number, tone: number, ceiling = base * 4): number {
  const floor = base / 4;
  const top = Math.min(base * 4, ceiling);
  return tone < 0.5
    ? floor * Math.pow(base / floor, tone * 2)
    : base * Math.pow(top / base, (tone - 0.5) * 2);
}

/**
 * Totes les veus són sintetitzades en temps real: cap sample, cap fitxer
 * d'àudio, cap llicència. Cada veu penja d'una saturació i un Volume propis
 * que van a un compressor de bus abans de la sortida.
 */
export function createKit(Tone: ToneModule): DrumKit {
  const master = new Tone.Compressor({
    threshold: -14,
    ratio: 3,
    attack: 0.004,
    release: 0.12,
  }).toDestination();

  const channels = {} as Record<VoiceId, InstanceType<ToneModule["Volume"]>>;
  const drives = {} as Record<VoiceId, InstanceType<ToneModule["Distortion"]>>;

  /** Retorna el node on han d'entrar les fonts de la veu. */
  const bus = (id: VoiceId) => {
    const vol = new Tone.Volume(LEVELS[id]).connect(master);
    const drive = new Tone.Distortion({ distortion: 0, wet: 0 }).connect(vol);
    channels[id] = vol;
    drives[id] = drive;
    return drive;
  };

  // --- Bombo: membrana amb caiguda de to ràpida -------------------------
  const bomboTo = new Tone.Filter(12000, "lowpass").connect(bus("bombo"));
  const bombo = new Tone.MembraneSynth({
    pitchDecay: 0.045,
    octaves: 6,
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.42, sustain: 0.008, release: 1.2 },
  }).connect(bomboTo);

  // --- Caixa: cos tonal + soroll filtrat --------------------------------
  const caixaOut = bus("caixa");
  const caixaHp = new Tone.Filter(1500, "highpass").connect(caixaOut);
  const caixaNoise = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.17, sustain: 0 },
  }).connect(caixaHp);
  const caixaBody = new Tone.MembraneSynth({
    pitchDecay: 0.02,
    octaves: 3,
    envelope: { attack: 0.001, decay: 0.14, sustain: 0, release: 0.1 },
  }).connect(new Tone.Volume(-8).connect(caixaOut));

  // --- Palmada: tres ràfegues curtes + cua ------------------------------
  const palmadaBp = new Tone.Filter({
    frequency: 1100,
    type: "bandpass",
    Q: 1.6,
  }).connect(bus("palmada"));
  const palmada = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.11, sustain: 0 },
  }).connect(palmadaBp);

  // --- Charles tancat i obert (l'obert s'ofega quan sona el tancat) ------
  const charlesHp = new Tone.Filter(7200, "highpass").connect(bus("charles"));
  const charles = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.045, sustain: 0 },
  }).connect(charlesHp);
  const obertHp = new Tone.Filter(7200, "highpass").connect(
    bus("charlesObert"),
  );
  const charlesObert = new Tone.NoiseSynth({
    noise: { type: "white" },
    envelope: { attack: 0.001, decay: 0.38, sustain: 0.02, release: 0.12 },
  }).connect(obertHp);

  // --- Aro i cencerro: metàl·lics ---------------------------------------
  const aro = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.035, release: 0.01 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 5200,
    octaves: 1.2,
  }).connect(bus("aro"));

  const cencerro = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.3, release: 0.08 },
    harmonicity: 12,
    modulationIndex: 16,
    resonance: 900,
    octaves: 0.4,
  }).connect(bus("cencerro"));

  // --- Timbal greu -------------------------------------------------------
  const timbalTo = new Tone.Filter(12000, "lowpass").connect(bus("timbal"));
  const timbal = new Tone.MembraneSynth({
    pitchDecay: 0.1,
    octaves: 3,
    oscillator: { type: "sine" },
    envelope: { attack: 0.001, decay: 0.34, sustain: 0.01, release: 0.6 },
  }).connect(timbalTo);

  const params = defaultSound();

  /**
   * Com tradueix cada veu els seus comandaments. Les veus de soroll no tenen
   * cap to que afinar, així que hi movem el filtre: és el gest equivalent.
   */
  const appliers: Record<VoiceId, (p: VoiceParams) => void> = {
    bombo: (p) => {
      bombo.envelope.decay = p.decay;
      bomboTo.frequency.value = sweep(12000, p.tone, 18000);
    },
    caixa: (p) => {
      caixaNoise.envelope.decay = p.decay;
      // el cos segueix la cua amb la proporció que tenia de fàbrica
      caixaBody.envelope.decay = p.decay * (0.14 / 0.17);
      caixaHp.frequency.value = sweep(1500, p.tone);
    },
    palmada: (p) => {
      palmada.envelope.decay = p.decay;
      palmadaBp.frequency.value = sweep(1100, p.tone) * semitons(p.pitch);
    },
    charles: (p) => {
      charles.envelope.decay = p.decay;
      charlesHp.frequency.value = sweep(7200, p.tone, 16000) * semitons(p.pitch);
    },
    charlesObert: (p) => {
      charlesObert.envelope.decay = p.decay;
      obertHp.frequency.value = sweep(7200, p.tone, 16000) * semitons(p.pitch);
    },
    aro: (p) => {
      aro.envelope.decay = p.decay;
      // el sostre de resonance del MetalSynth és 7000 Hz
      aro.resonance = sweep(5200, p.tone, 7000);
    },
    timbal: (p) => {
      timbal.envelope.decay = p.decay;
      timbalTo.frequency.value = sweep(12000, p.tone, 18000);
    },
    cencerro: (p) => {
      cencerro.envelope.decay = p.decay;
      cencerro.resonance = sweep(900, p.tone);
    },
  };

  /** Transposa una nota amb l'afinació que tingui ara la veu. */
  const nota = (base: string, id: VoiceId) =>
    Tone.Frequency(base).transpose(params[id].pitch).toFrequency();

  const triggers: Record<
    VoiceId,
    (time: number, velocity: number) => void
  > = {
    bombo: (t, v) =>
      bombo.triggerAttackRelease(nota("C1", "bombo"), "8n", t, v),
    caixa: (t, v) => {
      caixaBody.triggerAttackRelease(nota("G2", "caixa"), "32n", t, v);
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
    aro: (t, v) =>
      aro.triggerAttackRelease(420 * semitons(params.aro.pitch), "64n", t, v),
    timbal: (t, v) =>
      timbal.triggerAttackRelease(nota("A1", "timbal"), "8n", t, v),
    cencerro: (t, v) =>
      cencerro.triggerAttackRelease(
        560 * semitons(params.cencerro.pitch),
        "16n",
        t,
        v,
      ),
  };

  const nodes = [
    master,
    bombo,
    bomboTo,
    caixaNoise,
    caixaHp,
    caixaBody,
    palmada,
    palmadaBp,
    charles,
    charlesHp,
    charlesObert,
    obertHp,
    aro,
    cencerro,
    timbal,
    timbalTo,
  ];

  return {
    trigger(id, time, velocity) {
      triggers[id]?.(time, velocity);
    },
    setVolume(id, trim) {
      const ch = channels[id];
      if (ch) ch.volume.value = LEVELS[id] + trim;
    },
    setParams(id, next) {
      params[id] = { ...next };
      const drive = drives[id];
      if (drive) {
        drive.distortion = next.drive;
        drive.wet.value = next.drive;
      }
      appliers[id]?.(params[id]);
    },
    dispose() {
      for (const n of nodes) n.dispose();
      for (const ch of Object.values(channels)) ch.dispose();
      for (const d of Object.values(drives)) d.dispose();
    },
  };
}
