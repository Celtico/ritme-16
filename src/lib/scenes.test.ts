import { describe, expect, it } from "vitest";
import { emptyPattern, MAX_SCENES, type Pattern } from "./pattern";
import {
  addScene,
  applyScene,
  captureMix,
  removeScene,
  renameScene,
  syncActiveScene,
} from "./scenes";

/** Un patró amb el bombo silenciat i la caixa en solitari. */
function ambBarreja(): Pattern {
  const p = emptyPattern();
  p.tracks[0].mix.muted = true;
  p.tracks[1].mix.solo = true;
  p.tracks[2].mix.volume = -12;
  return p;
}

describe("desar una escena", () => {
  it("hi guarda la barreja d'ara i la deixa activa", () => {
    const p = addScene(ambBarreja(), "Trencada");
    expect(p.scenes).toHaveLength(1);
    expect(p.scenes[0].name).toBe("Trencada");
    expect(p.activeScene).toBe(0);
    expect(p.scenes[0].mix[p.tracks[0].id].muted).toBe(true);
    expect(p.scenes[0].mix[p.tracks[1].id].solo).toBe(true);
  });

  it("posa un nom per defecte si no n'hi donen cap", () => {
    const p = addScene(emptyPattern(), "   ");
    expect(p.scenes[0].name).toBe("Escena 1");
  });

  it("no toca el patró original", () => {
    const p = emptyPattern();
    addScene(p, "Una");
    expect(p.scenes).toHaveLength(0);
  });

  it("no en desa més de vuit", () => {
    let p = emptyPattern();
    for (let i = 0; i < 20; i++) p = addScene(p, `E${i}`);
    expect(p.scenes).toHaveLength(MAX_SCENES);
    // i la primera no s'ha perdut pel camí
    expect(p.scenes[0].name).toBe("E0");
  });
});

describe("aplicar una escena", () => {
  it("torna la barreja tal com estava", () => {
    let p = addScene(ambBarreja(), "Trencada");
    p.tracks[0].mix.muted = false;
    p.tracks[1].mix.solo = false;
    p = applyScene(p, 0);
    expect(p.tracks[0].mix.muted).toBe(true);
    expect(p.tracks[1].mix.solo).toBe(true);
    expect(p.tracks[2].mix.volume).toBe(-12);
    expect(p.activeScene).toBe(0);
  });

  it("no toca les pistes que l'escena no esmenta", () => {
    let p = addScene(emptyPattern(), "Buida");
    // una pista afegida després que es desés l'escena
    delete p.scenes[0].mix[p.tracks[3].id];
    p.tracks[3].mix.muted = true;
    p = applyScene(p, 0);
    expect(p.tracks[3].mix.muted).toBe(true);
  });

  it("no fa res amb una escena que no existeix", () => {
    const p = emptyPattern();
    expect(applyScene(p, 4)).toBe(p);
  });
});

describe("l'escena activa segueix el que toques", () => {
  it("s'hi escriu la barreja d'ara", () => {
    let p = addScene(ambBarreja(), "Una");
    p.tracks[0].mix.muted = false;
    p = syncActiveScene(p);
    expect(p.scenes[0].mix[p.tracks[0].id].muted).toBe(false);
  });

  it("no fa res si no n'hi ha cap d'activa", () => {
    const p = emptyPattern();
    expect(syncActiveScene(p)).toBe(p);
  });
});

describe("reanomenar i eliminar", () => {
  it("canvia el nom", () => {
    const p = renameScene(addScene(emptyPattern(), "Una"), 0, "Altra");
    expect(p.scenes[0].name).toBe("Altra");
  });

  it("no deixa posar-hi un nom buit", () => {
    const p = renameScene(addScene(emptyPattern(), "Una"), 0, "  ");
    expect(p.scenes[0].name).toBe("Una");
  });

  it("treu l'escena i desactiva si era l'activa", () => {
    let p = addScene(addScene(emptyPattern(), "A"), "B");
    expect(p.activeScene).toBe(1);
    p = removeScene(p, 1);
    expect(p.scenes.map((e) => e.name)).toEqual(["A"]);
    expect(p.activeScene).toBeNull();
  });

  it("recol·loca l'índex de l'activa si en treuen una d'abans", () => {
    let p = addScene(addScene(addScene(emptyPattern(), "A"), "B"), "C");
    expect(p.activeScene).toBe(2);
    p = removeScene(p, 0);
    expect(p.scenes.map((e) => e.name)).toEqual(["B", "C"]);
    expect(p.activeScene).toBe(1);
  });
});

describe("captura de la barreja", () => {
  it("agafa una entrada per pista", () => {
    const p = emptyPattern();
    const mix = captureMix(p);
    expect(Object.keys(mix).sort()).toEqual(p.tracks.map((t) => t.id).sort());
  });

  it("no comparteix els objectes amb les pistes", () => {
    const p = emptyPattern();
    const mix = captureMix(p);
    mix[p.tracks[0].id].muted = true;
    expect(p.tracks[0].mix.muted).toBe(false);
  });
});
