import { describe, expect, it } from "vitest";
import {
  clonePattern,
  DECAY_MAX,
  DECAY_MIN,
  defaultParams,
  defaultTracks,
  emptyPattern,
  KINDS,
  makeTrack,
  PRESETS,
  STEPS,
  VOICE_KINDS,
  anySolo,
  isAudible,
} from "./pattern";

describe("model del patró", () => {
  it("dona setze cel·les a totes les pistes de tots els presets", () => {
    for (const p of PRESETS) {
      for (const t of p.tracks) {
        expect(t.steps, `${p.name} / ${t.id}`).toHaveLength(STEPS);
      }
    }
  });

  it("posa les vuit veus de percussió, en ordre, a cada preset", () => {
    for (const p of PRESETS) {
      expect(p.tracks.map((t) => t.kind)).toEqual(VOICE_KINDS);
    }
  });

  it("dona un id únic a cada pista", () => {
    for (const p of PRESETS) {
      const ids = p.tracks.map((t) => t.id);
      expect(new Set(ids).size, p.name).toBe(ids.length);
    }
  });

  it("clona sense compartir cap array ni cap objecte", () => {
    const a = emptyPattern("a");
    const b = clonePattern(a);
    b.tracks[0].steps[0] = 2;
    b.tracks[1].mix.muted = true;
    b.tracks[2].sound.drive = 0.8;
    expect(a.tracks[0].steps[0]).toBe(0);
    expect(a.tracks[1].mix.muted).toBe(false);
    expect(a.tracks[2].sound.drive).toBe(0);
  });

  it("no comparteix ni tan sols l'array de pistes", () => {
    const a = emptyPattern("a");
    const b = clonePattern(a);
    b.tracks.pop();
    expect(a.tracks).toHaveLength(8);
  });
});

describe("pistes", () => {
  it("agafa nom, color i nivell del tipus", () => {
    for (const kind of VOICE_KINDS) {
      const t = makeTrack(kind);
      expect(t.name).toBe(KINDS[kind].name);
      expect(t.color).toBe(KINDS[kind].color);
      expect(t.sound).toEqual(defaultParams(kind));
    }
  });

  it("fa servir el tipus com a id si no se n'hi dona cap", () => {
    expect(makeTrack("bombo").id).toBe("bombo");
    expect(makeTrack("bombo", "bombo-2").id).toBe("bombo-2");
  });

  it("dona objectes independents a cada crida", () => {
    const a = defaultTracks();
    a[0].sound.pitch = 5;
    expect(defaultTracks()[0].sound.pitch).toBe(0);
  });
});

describe("comandaments de so per defecte", () => {
  it("deixa el to al centre i la saturació fora, que és el so de fàbrica", () => {
    for (const kind of VOICE_KINDS) {
      const p = defaultParams(kind);
      expect(p.pitch, kind).toBe(0);
      expect(p.tone, kind).toBe(0.5);
      expect(p.drive, kind).toBe(0);
    }
  });

  it("dona a cada veu la caiguda que tenia la cadena, dins del marge", () => {
    const esperat: Record<string, number> = {
      bombo: 0.42,
      caixa: 0.17,
      palmada: 0.11,
      charles: 0.045,
      charlesObert: 0.38,
      aro: 0.035,
      timbal: 0.34,
      cencerro: 0.3,
    };
    for (const kind of VOICE_KINDS) {
      const { decay } = defaultParams(kind);
      expect(decay, kind).toBe(esperat[kind]);
      expect(decay, kind).toBeGreaterThanOrEqual(DECAY_MIN);
      expect(decay, kind).toBeLessThanOrEqual(DECAY_MAX);
    }
  });
});

describe("silenci i solitari", () => {
  it("deixa sonar tothom quan no hi ha cap solitari", () => {
    const p = emptyPattern();
    expect(anySolo(p)).toBe(false);
    for (const t of p.tracks) expect(isAudible(p, t)).toBe(true);
  });

  it("calla tothom menys el solitari", () => {
    const p = emptyPattern();
    p.tracks[2].mix.solo = true;
    expect(anySolo(p)).toBe(true);
    expect(isAudible(p, p.tracks[2])).toBe(true);
    expect(isAudible(p, p.tracks[0])).toBe(false);
  });

  it("fa que el silenci guanyi al solitari de la mateixa pista", () => {
    const p = emptyPattern();
    p.tracks[1].mix.solo = true;
    p.tracks[1].mix.muted = true;
    expect(isAudible(p, p.tracks[1])).toBe(false);
  });
});
