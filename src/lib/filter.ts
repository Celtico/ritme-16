/**
 * Resposta en freqüència dels filtres biquad, per dibuixar-la al panell de so.
 * Cap dependència: són les fórmules del RBJ Audio EQ Cookbook, les mateixes
 * que fa servir el BiquadFilterNode del navegador.
 */

export type FilterType = "lowpass" | "highpass" | "bandpass";

/**
 * Guany del filtre a la freqüència demanada, en dB.
 *
 * @param type   tipus de filtre
 * @param cutoff freqüència de tall, en Hz
 * @param q      factor de qualitat; 0,707 és la resposta plana de Butterworth
 * @param freq   la freqüència que es vol mesurar, en Hz
 * @param sampleRate normalment 48000
 */
export function magnitudeDb(
  type: FilterType,
  cutoff: number,
  q: number,
  freq: number,
  sampleRate = 48000,
): number {
  const w0 = (2 * Math.PI * cutoff) / sampleRate;
  const cos0 = Math.cos(w0);
  const sin0 = Math.sin(w0);
  const alpha = sin0 / (2 * Math.max(q, 0.0001));

  let b0: number, b1: number, b2: number;
  const a0 = 1 + alpha;
  const a1 = -2 * cos0;
  const a2 = 1 - alpha;

  if (type === "lowpass") {
    b1 = 1 - cos0;
    b0 = b1 / 2;
    b2 = b0;
  } else if (type === "highpass") {
    b1 = -(1 + cos0);
    b0 = (1 + cos0) / 2;
    b2 = b0;
  } else {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
  }

  // |H(e^jw)| avaluada al cercle unitat
  const w = (2 * Math.PI * freq) / sampleRate;
  const cosw = Math.cos(w);
  const sinw = Math.sin(w);
  const cos2w = Math.cos(2 * w);
  const sin2w = Math.sin(2 * w);

  const numRe = b0 + b1 * cosw + b2 * cos2w;
  const numIm = -(b1 * sinw + b2 * sin2w);
  const denRe = a0 + a1 * cosw + a2 * cos2w;
  const denIm = -(a1 * sinw + a2 * sin2w);

  const num = Math.hypot(numRe, numIm);
  const den = Math.hypot(denRe, denIm);
  if (den === 0) return -Infinity;
  return 20 * Math.log10(num / den);
}

/** Punts d'una corba de resposta, amb l'eix de freqüència logarítmic. */
export function responseCurve(
  type: FilterType,
  cutoff: number,
  q: number,
  points = 96,
  min = 20,
  max = 20000,
): { freq: number; db: number }[] {
  const out: { freq: number; db: number }[] = [];
  for (let i = 0; i < points; i++) {
    const freq = min * Math.pow(max / min, i / (points - 1));
    out.push({ freq, db: magnitudeDb(type, cutoff, q, freq) });
  }
  return out;
}
