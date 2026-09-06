/**
 * Comprova que res no queda tallat a cap amplada.
 *
 * La regla no és "tot dins del viewport" sinó "tot abastable": un element
 * fora de la pantalla dins d'un contenidor que es pot desplaçar es veu
 * desplaçant-lo, i això no és un error. El que sí que ho és, és un element
 * que no es pot fer aparèixer de cap manera.
 *
 * Fa servir el Chrome del sistema amb playwright-core, per no haver de
 * baixar un navegador sencer com a dependència de desenvolupament.
 */
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";

const URL = process.env.RITME_URL ?? "http://localhost:3000";
const AMPLADES = [
  [2560, 1400],
  [1440, 900],
  [1024, 800],
  [390, 844],
];

const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

/** S'executa dins de la pàgina. */
function mesura() {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const nom = (el) =>
    (
      el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      (el.textContent || "").trim().slice(0, 26) ||
      el.tagName
    ).replace(/\s+/g, " ");

  const potDesplacar = (el, eix) => {
    let p = el;
    while (p && p !== document.documentElement) {
      const cs = getComputedStyle(p);
      const ov = eix === "x" ? cs.overflowX : cs.overflowY;
      const cal =
        eix === "x"
          ? p.scrollWidth > p.clientWidth + 1
          : p.scrollHeight > p.clientHeight + 1;
      if (/auto|scroll/.test(ov) && cal) return true;
      p = p.parentElement;
    }
    return false;
  };

  const desbordaments = [];
  for (const el of document.querySelectorAll("div,section,main,header,ul")) {
    const dx = el.scrollWidth - el.clientWidth;
    const dy = el.scrollHeight - el.clientHeight;
    if (dx > 1 && !potDesplacar(el, "x")) desbordaments.push(`${nom(el)} dx=${dx}`);
    if (dy > 1 && !potDesplacar(el, "y")) desbordaments.push(`${nom(el)} dy=${dy}`);
  }

  const fora = [];
  for (const el of document.querySelectorAll(
    "button,input,select,[role=slider],[role=meter]",
  )) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const p = [];
    if (r.right > W + 0.5 && !potDesplacar(el, "x")) p.push(`+${Math.round(r.right - W)}px dreta`);
    if (r.left < -0.5 && !potDesplacar(el, "x")) p.push(`+${Math.round(-r.left)}px esquerra`);
    if (r.bottom > H + 0.5 && !potDesplacar(el, "y")) p.push(`+${Math.round(r.bottom - H)}px sota`);
    if (r.top < -0.5 && !potDesplacar(el, "y")) p.push(`+${Math.round(-r.top)}px sobre`);
    if (p.length) fora.push(`${nom(el)} → ${p.join(", ")}`);
  }
  return { desbordaments, fora };
}

const executablePath = CHROME.find((p) => existsSync(p));
if (!executablePath) {
  console.error("No s'ha trobat cap Chrome instal·lat.");
  process.exit(1);
}

const navegador = await chromium.launch({ executablePath, headless: true });
let errors = 0;

for (const [width, height] of AMPLADES) {
  const context = await navegador.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  // amb una pista seleccionada, que és quan el panell inferior és més ple
  await page.locator('button[title^="So de Bombo"]').first().click();
  await page.waitForTimeout(400);

  const { desbordaments, fora } = await page.evaluate(mesura);
  await page.screenshot({ path: `/tmp/layout-${width}.png`, fullPage: false });

  const be = desbordaments.length === 0 && fora.length === 0;
  console.log(
    `${be ? "ok  " : "FALLA"} ${width}×${height} — desbordaments: ${desbordaments.length}, fora: ${fora.length}`,
  );
  for (const d of desbordaments) console.log(`        desborda: ${d}`);
  for (const f of fora) console.log(`        fora: ${f}`);
  if (!be) errors++;
  await context.close();
}

await navegador.close();
if (errors) {
  console.error(`\n${errors} amplada(es) amb elements tallats.`);
  process.exit(1);
}
console.log("\nCap element tallat a cap amplada.");
