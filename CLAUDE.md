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
- El patró és una llista de pistes (`Pattern.tracks`), no registres indexats per veu.
  L'ordre de l'array és l'ordre visual i `track.id` és el que lliga la pista amb la seva
  cadena de síntesi.
- Cap fitxer d'àudio: tot es sintetitza a `src/lib/kit.ts`.
- La UI és en català. El text nou, també.
- Abans de tocar cap component, llegeix `.claude/skills/audio-ui/SKILL.md`: hi ha la
  disposició del panell de so i les regles de knobs, anells i macros.
- Cap valor numèric fix sota els knobs: el número surt al globus mentre s'arrossega.
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
- `src/components/TrackLane.tsx` — una fila: nom, M/S, volum i els passos. Rep un
  `Track` sencer.
- `src/components/StepButton.tsx` — una cel·la i el mapa `FACE` d'aparença per valor.
- `src/components/SoundPanel.tsx` — el panell de so en tres bandes (cadena, fonts de
  modulació, editor de la família). Només presentació: rep un `Track` i retorna canvis.
- `src/components/Knob.tsx` — el knob d'SVG, amb anell de modulació opcional. Etiqueta a
  sota i valor només al globus mentre s'arrossega, mai fix.
- `src/components/FilterDisplay.tsx`, `ModStrip.tsx`, `Macros.tsx` — les peces del panell.
- `src/components/PatternBank.tsx` — presets, sortejar, buidar i el desat al navegador.
- `src/hooks/useSequencer.ts` — tot l'estat del patró i tot Tone: transport, seqüència,
  edicions. Cap component no ha de tocar Tone pel seu compte.
- `src/lib/pattern.ts` — el model pur: `Track`, `Pattern`, `PRESETS`. Sense React ni Tone.
- `src/lib/voices.ts` — una fàbrica per tipus de veu i la taula `KINDS` (nom, color,
  nivell, densitat). **Afegir una veu nova és afegir-hi una entrada i una fàbrica**: cap
  altre fitxer no ha de tenir tipus de veu escrits a mà.
- `src/lib/theory.ts` — escales, acords i noms de nota. Encara no hi ha res connectat.
- `src/lib/filter.ts` — la resposta en freqüència dels biquads, per dibuixar-la. Fórmules
  del RBJ Cookbook, provades contra punts coneguts.
- `src/lib/kit.ts` — un registre de cadenes per `track.id`: `ensureTrack`, `removeTrack`,
  `trigger`, `setVolume`, `setParams`. No sap res de cap veu concreta; les demana a
  `voices.ts`. Rep el mòdul Tone per paràmetre, cosa que permet provar-lo amb un Tone
  fals. Res d'aquí no ha de recrear nodes per un canvi de paràmetre.
- `src/lib/storage.ts` — `localStorage` i la validació del que en surt. Sense React.

## Com treballar

- Un commit per canvi lògic, amb el missatge en català i en imperatiu.
- No preguntis res que es pugui decidir llegint el codi o provant-ho.
- Pregunta només si la decisió és irreversible o canvia el disseny visual.
- Si alguna cosa no es pot verificar (l'àudio real, el comportament al navegador),
  digues-ho al final del resum en lloc de donar-ho per bo.
- No afegeixis dependències sense justificar-les en una línia del commit.

## Sospitós / pendent

- El panell de so està verificat al navegador de punta a punta: tancar el tall de 20 kHz a
  20 Hz baixa el bombo 12,3 dB; `Velocitat → afinació` al 100 % li puja el fonamental de
  35 a 64 Hz; arrossegar l'anell escriu la modulació sense moure el valor del knob; i el
  gràfic ADSR mou l'atac, la caiguda i el sosteniment.
- **Els anells només surten on la font arriba.** `MOD_ROUTES` a `voices.ts` mana: les
  envolupants només al tall, la resta a qualsevol paràmetre. Comprovat a la interfície.
- L'LFO es mostreja en disparar amb `lfoValueAt`, que és una funció pura i està provada
  per separat; el camí que fa servir és el mateix que s'ha verificat amb la velocitat,
  però **no s'ha mesurat una modulació d'LFO sonant**. Compte: està sincronitzat al
  transport, o sigui que amb el transport aturat el seu valor no es mou.
- **No s'han mesurat per separat**: `Env Amp → tall` (l'envolupant d'amplitud com a font
  del filtre) ni la modulació de la saturació, que viu al kit i no a la cadena.
- Les veus metàl·liques (aro, cencerro) no tenen node Filter: el tall hi escriu la
  `resonance` del MetalSynth, o sigui que allà no hi ha ni envolupant de filtre ni LFO en
  temps d'àudio, encara que sí que s'hi apliquen les modulacions per cop.
- Els presets sonen igual: bombo, aro, timbal i cencerro donen el mateix dBFS al decimal.
  Les veus de soroll varien molt entre dispars idèntics (la palmada, fins a 4,3 dB), o
  sigui que allà la mesura no distingeix.
- Per mesurar el so: pengeu un `AnalyserNode` de la destinació sobreescrivint
  `AudioNode.prototype.connect` abans del primer gest. Hi ha uns 125 ms de latència, i si
  es simulen esdeveniments de punter cal deixar-hi una pausa entremig: els oients
  s'enganxen en un efecte i el primer moviment es perd.
- El playhead es queda encès al darrer pas en aturar el transport: hi ha crides de
  `Tone.getDraw()` ja programades que arriben després de l'`stop()`. Ve d'abans.
- Pendent d'encàrrecs anteriors, no fet: el banc de 8 patrons amb follow actions, les
  escenes, les pistes melòdiques (baix i acords) i la gestió de pistes (+ Pista, menú,
  sends, retorns, pan i vúmetres).
- Sense provar: Safari i Firefox, el mòbil, i què passa amb el `localStorage` ple.
