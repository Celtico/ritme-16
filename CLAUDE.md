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
| `npm test` | tests de `src/lib` amb Vitest; ha de passar abans de tancar res |

Abans de donar una tasca per acabada, `typecheck`, `lint` i `test` han de passar nets.
No facis `npm run build` amb el servidor de `dev` engegat: es trepitgen el `.next` i
el `dev` es queda servint pàgines sense estils fins que el reinicies.

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
- `src/components/VoicePanel.tsx` — els quatre comandaments de so d'una veu. Només
  presentació: rep `VoiceParams` i retorna canvis.
- `src/components/PatternBank.tsx` — presets, sortejar, buidar i el desat al navegador.
- `src/hooks/useSequencer.ts` — tot l'estat del patró i tot Tone: transport, seqüència,
  edicions. Cap component no ha de tocar Tone pel seu compte.
- `src/lib/pattern.ts` — el model pur: tipus, `VOICES`, `PRESETS`. Sense React ni Tone.
- `src/lib/kit.ts` — les vuit cadenes de síntesi, `LEVELS` (la barreja) i `setParams`,
  que aplica els comandaments en directe. Rep el mòdul Tone per paràmetre; no se
  l'importa ell mateix. Res d'aquí no ha de recrear nodes per un canvi de paràmetre.
- `src/lib/storage.ts` — `localStorage` i la validació del que en surt. Sense React.

## Com treballar

- Un commit per canvi lògic, amb el missatge en català i en imperatiu.
- No preguntis res que es pugui decidir llegint el codi o provant-ho.
- Pregunta només si la decisió és irreversible o canvia el disseny visual.
- Si alguna cosa no es pot verificar (l'àudio real, el comportament al navegador),
  digues-ho al final del resum en lloc de donar-ho per bo.
- No afegeixis dependències sense justificar-les en una línia del commit.

## Sospitós / pendent

- Verificat al navegador amb un `AnalyserNode` penjat de la destinació (cal sobreescriure
  `AudioNode.prototype.connect` abans del primer gest): els quatre comandaments mouen el
  senyal de debò — afinació ×2 a +12 semitons, caiguda 430→220 ms, saturació baixa el
  factor de cresta de 3,6 a 2,1, i el to puja el centre espectral d'11 a 17 kHz.
- Els presets sonen igual que abans de la Fase 1: bombo, aro, timbal i cencerro donen el
  mateix dBFS al decimal. Les veus de soroll varien fins a 2,8 dB entre dispars idèntics,
  o sigui que allà la mesura no distingeix; s'ha comprovat que la desviació observada és
  menor que aquesta dispersió.
- Compte en mesurar: hi ha uns 125 ms de latència entre el dispar i el senyal a
  l'analitzador. Si mesures abans, sembla que no soni res.
- Sense provar: Safari i Firefox, el mòbil, i què passa amb el `localStorage` ple.
