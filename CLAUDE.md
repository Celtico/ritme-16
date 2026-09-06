# CLAUDE.md

## Què és

RITME-16 és una caixa de ritmes de 16 passos que sona al navegador: vuit veus de
percussió sintetitzades en temps real amb Tone.js, sense cap sample. Next.js 15
(App Router), React 19, TypeScript strict i Tailwind v4.

## Comandes

| Comanda | Quan |
| --- | --- |
| `npm run dev` | provar-ho de veritat; l'àudio només es pot comprovar aquí |
| `npm run build` | abans de tancar una tasca que toqui rutes, fonts o layout |
| `npm run typecheck` | després de qualsevol canvi a `.ts`/`.tsx` |
| `npm run lint` | ídem; `next build` també hi falla, o sigui que val més passar-hi abans |
| `npm test` | tests de `src/lib` (encara no existeix: cal afegir Vitest) |

Abans de donar una tasca per acabada, `typecheck` i `lint` han de passar nets.

## Decisions que no es canvien

- Tone s'importa dinàmicament dins d'`ensureAudio()` i només després d'un gest de
  l'usuari. Així no s'avalua durant el render de servidor ni crea l'`AudioContext`
  abans d'hora.
- El callback de `Tone.Sequence` llegeix `patternRef.current`, mai l'estat de React.
  Editar mentre sona no ha de re-programar res.
- La sincronia visual va per `Tone.getDraw().schedule()`. Ni `setTimeout` ni escriure
  l'estat directament des del fil d'àudio.
- Les cel·les tenen tres valors: `0` silenci, `1` normal, `2` accent. L'accent només
  canvia la velocitat de disparament, res més.
- Cap fitxer d'àudio: tot es sintetitza a `src/lib/kit.ts`.
- La UI és en català. El text nou, també.
- No tocar la paleta, les tipografies ni el layout de la consola si no ho demanen.

## On va cada cosa

- `src/app/layout.tsx` — `lang="ca"`, fonts i metadades. Cap lògica d'interfície.
- `src/app/page.tsx` — només munta `<Console/>`. Res de client aquí.
- `src/app/globals.css` — el `@theme` de Tailwind v4 (paleta, tipografies) i els
  controls lliscants. No hi van utilitats noves ni estils de components.
- `src/components/Console.tsx` — composició de la consola i les tecles globals
  (espai, 1–8). Cap crida a Tone.
- `src/components/Transport.tsx` — play/stop, tempo, swing, llums de compàs. Només
  presentació: rep valors i callbacks.
- `src/components/TrackLane.tsx` — una fila: nom, M/S, volum i els passos.
- `src/components/StepButton.tsx` — una cel·la i el mapa `FACE` d'aparença per valor.
- `src/components/PatternBank.tsx` — presets, sortejar, buidar i el desat al navegador.
- `src/hooks/useSequencer.ts` — tot l'estat del patró i tot Tone: transport, seqüència,
  edicions. Cap component no ha de tocar Tone pel seu compte.
- `src/lib/pattern.ts` — el model pur: tipus, `VOICES`, `PRESETS`. Sense React ni Tone.
- `src/lib/kit.ts` — les vuit cadenes de síntesi. Rep el mòdul Tone per paràmetre; no
  se l'importa ell mateix.
- `src/lib/storage.ts` — `localStorage` i la validació del que en surt. Sense React.

## Com treballar

- Un commit per canvi lògic, amb el missatge en català i en imperatiu.
- No preguntis res que es pugui decidir llegint el codi o provant-ho.
- Pregunta només si la decisió és irreversible o canvia el disseny visual.
- Si alguna cosa no es pot verificar (l'àudio real, el comportament al navegador),
  digues-ho al final del resum en lloc de donar-ho per bo.
- No afegeixis dependències sense justificar-les en una línia del commit.

## Sospitós / pendent

- `MetalSynth.triggerAttackRelease` a `src/lib/kit.ts` (aro, cencerro): **resolt pel que
  fa a la signatura**. A Tone 15.1.22 `MetalSynth` estén `Monophonic`, o sigui que hereta
  `triggerAttackRelease(note, duration, time?, velocity?)`; les crides amb la freqüència
  al davant (`420`, `560`) són correctes i `tsc` no s'hi queixa. El que **no** està
  comprovat és com sonen.
- `typecheck` i `build` passen nets, però res no s'ha executat mai al navegador: ni el
  so, ni el playhead, ni el desat a `localStorage`.
