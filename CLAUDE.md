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
- Les operacions sobre pistes (afegir, duplicar, moure, eliminar) són funcions pures de
  `pattern.ts` que retornen un patró nou; el hook només les crida i avisa el kit. Màxim
  16 pistes, i mai cap patró sense pistes.
- Les files guarden sempre `MAX_STEPS` (32) cel·les; `pattern.length` diu quantes en
  sonen. Escurçar un patró no esborra res.
- **La font de veritat de la cançó és `songRef`, no l'estat de React.** El fil d'àudio hi
  escriu el canvi de ranura i el pas següent l'ha de veure ja fet; l'estat hi va al
  darrere només per dibuixar. Tota mutació passa per `commitSong()`.
- La `Tone.Sequence` és un rellotge fix de 32 setzens i el patró s'hi enrotlla amb un
  mòdul. Ni la llargada ni el canvi de ranura reprogramen mai res.
- El patró és una llista de pistes (`Pattern.tracks`), no registres indexats per veu.
  L'ordre de l'array és l'ordre visual i `track.id` és el que lliga la pista amb la seva
  cadena de síntesi.
- Cap fitxer d'àudio: tot es sintetitza a `src/lib/kit.ts`.
- La UI és en català. El text nou, també.
- Abans de tocar cap component, llegeix `.claude/skills/audio-ui/SKILL.md`: hi ha la
  disposició del panell de so i les regles de knobs, anells i macros.
- Cap valor numèric fix sota els knobs: el número surt al globus mentre s'arrossega.
- **Arrodoneix les coordenades que calculis en un SVG** (tres decimals ja basten). El
  servidor i el navegador poden donar l'últim bit diferent a `Math.cos` o `Math.log`, i
  llavors React avisa que l'HTML no coincideix. Ha passat, i el rètol d'error del mode
  `dev` és fàcil de confondre amb un clic fet abans d'hidratar.
- No tocar la paleta ni les tipografies si no ho demanen.
- **Cap color ni cap ombra escrits a mà en un component.** Hi ha tema dia i tema nit; el
  que canvia és el valor de la variable, no el nom. Un `rgba()` amb xifres vol dir que
  aquell tros es quedarà encallat en un tema.
- `--color-ink` és fosc de dia i clar de nit: no el facis servir com a *fons* d'una
  superfície fosca. Per a això hi ha `--color-header`, i `--color-on-accent` per al text
  que va damunt d'un color saturat.
- L'app ocupa el viewport sencer i **no es desplaça mai la pàgina**: el desplaçament és
  sempre d'una regió. Si afegeixes res a l'arrel, comprova-ho a 2560, 1440 i 1024 px.

## On va cada cosa

- `src/app/layout.tsx` — `lang="ca"`, fonts i metadades. Cap lògica d'interfície.
- `src/app/page.tsx` — només munta `<Workspace/>`. Res de client aquí.
- `src/app/globals.css` — els dos temes. El `@theme` (que és `static`, si no Tailwind
  poda les variables que cap classe no fa servir) només apunta a variables; els valors
  viuen a `:root` (dia), `:root[data-theme="night"]` i el bloc de `prefers-color-scheme`.
  També hi ha els tokens d'ombra i els controls lliscants. No hi van utilitats noves.
- `src/lib/theme.ts` — la clau del `localStorage` i el tipus. **Mòdul pla a posta**:
  `layout.tsx` és de servidor i, si això visqués al hook (`"use client"`), el valor hi
  arribaria com a `undefined`.
- `src/hooks/useTheme.ts` — llegeix i canvia el tema. Qui el fixa abans del primer
  pintat és un script en línia de `layout.tsx`.
- `src/components/Workspace.tsx` — l'arrel: una graella de `h-dvh w-screen` amb transport
  (52 px), centre i panell inferior, els divisors arrossegables, la sincronia de
  desplaçament entre panells i les tecles globals (espai, 1–8). Cap crida a Tone.
- `src/components/layout.ts` — les mesures compartides (alçada de fila, buit, alçada de
  la regla, amplades del panell). **Si les repeteixes a un component, els dos panells es
  desalineen**: la fila 8 d'una banda ha de caure al mateix píxel que la de l'altra.
- `src/components/groups.ts` — reparteix els índexs en grups de quatre. **La regla, els
  passos i les files melòdiques han de fer servir aquesta i no la seva**: si cadascú es
  fes la partició, es desalinearien en canviar la llargada.
- `src/components/StepRow.tsx` / `StepRuler.tsx` — els passos d'una pista i els
  seus números. Comparteixen classes d'amplada; la regla no en té cap d'escrita a mà.
- `src/components/MelodyRow.tsx` — la fila del baix i la dels acords. Una nota s'estén
  sobre les cel·les que cobreix: no es dibuixen cel·les repetides.
- `src/components/NotePicker.tsx` / `ChordPicker.tsx` — els selectors flotants.
- `src/components/TrackRow.tsx` — una fila de la llista de pistes: tot el que no són
  passos. Alçada idèntica a la d'una fila de la graella.
- `src/components/Transport.tsx` — títol, play/stop, tempo, swing i llums de compàs, tot
  en una franja de 52 px. Només presentació: rep valors i callbacks.
- `src/components/ReturnRows.tsx` — les dues files de retorn, al final de la llista.
- `src/components/TrackMenu.tsx`, `AddTrack.tsx` — reanomenar, color, duplicar, moure,
  eliminar i afegir pistes. L'obertura del menú la governa el Workspace, no cada menú, i
  el menú es dibuixa amb un portal al `body`: dins la fila quedava tallat pel
  desplaçament del panell.
- `src/components/Meter.tsx` — la barra de 4 px. Rep el nivell ja llegit.
- `src/components/StepButton.tsx` — una cel·la i el mapa `FACE` d'aparença per valor.
- `src/components/SoundPanel.tsx` — el panell de so en tres bandes (cadena, fonts de
  modulació, editor de la família). Només presentació: rep un `Track` i retorna canvis.
- `src/components/Knob.tsx` — el knob d'SVG, amb anell de modulació opcional. Etiqueta a
  sota i valor només al globus mentre s'arrossega, mai fix.
- `src/components/FilterDisplay.tsx`, `ModStrip.tsx`, `Macros.tsx` — les peces del panell.
- `src/components/PatternBank.tsx` — presets, sortejar, buidar i el desat al navegador.
- `src/hooks/useSequencer.ts` — tot l'estat del patró i tot Tone: transport, seqüència,
  edicions. Cap component no ha de tocar Tone pel seu compte.
- `src/hooks/useMeters.ts` — **un sol** bucle de dibuix per a tots els vúmetres. Ni se
  n'obre un per fila, ni es llegeix cap meter des d'un component.
- `src/lib/pattern.ts` — el model pur: `Track`, `Pattern`, `PRESETS`. Sense React ni Tone.
- `src/lib/voices.ts` — una fàbrica per tipus de veu i la taula `KINDS` (nom, color,
  nivell, densitat). **Afegir una veu nova és afegir-hi una entrada i una fàbrica**: cap
  altre fitxer no ha de tenir tipus de veu escrits a mà.
- `src/lib/theory.ts` — escales, acords per grau, ajust a l'escala i noms de nota en
  notació llatina. El fa servir el seqüenciador per resoldre els acords.
- `src/lib/filter.ts` — la resposta en freqüència dels biquads, per dibuixar-la. Fórmules
  del RBJ Cookbook, provades contra punts coneguts.
- `src/lib/kit.ts` — un registre de cadenes per `track.id`: `ensureTrack`, `removeTrack`,
  `trigger`, `setVolume`, `setParams`. No sap res de cap veu concreta; les demana a
  `voices.ts`. Rep el mòdul Tone per paràmetre, cosa que permet provar-lo amb un Tone
  fals. Res d'aquí no ha de recrear nodes per un canvi de paràmetre.
- `src/lib/storage.ts` — `localStorage` i la validació del que en surt. Sense React.
- `src/lib/playback.ts` — `applyTracks` i `triggerStep`: què sona a cada pas. **Ho
  comparteixen el transport en directe i l'exportació**; si cadascú tingués la seva
  còpia, el WAV acabaria sonant diferent del que se sent.
- `src/lib/render.ts` — el renderitzat fora de línia amb `Tone.Offline`.
- `src/lib/rng.ts` — atzar reproduïble. **Res del generador no ha de cridar `Math.random`
  directament**: l'atzar va sempre per paràmetre, o la llavor no serveix de res.
- `src/lib/generate.ts` — el motor. Rep l'estil com a dada; no en té cap escrit a dins.
- `src/lib/styles.ts` — els set estils. Afegir-ne un és afegir una entrada aquí.
- `src/lib/critic.ts` — què fa que una cançó valgui la pena. Si suspèn, el generador
  torna a provar amb la llavor següent.
- `src/components/GenerateMenu.tsx` — el selector d'estil i llavor.
- `src/lib/song.ts` — el banc de vuit ranures i les follow actions. `resolveFollow()` és
  pura i rep el generador d'atzar per paràmetre, per poder-la provar dues vegades igual.
- `src/components/SlotBank.tsx` — la fila A–H amb l'acció i el copia/enganxa.
- `src/lib/scenes.ts` — desar, aplicar i sincronitzar escenes. Operacions pures.
- `src/components/SceneColumn.tsx` — les escenes, al costat del banc.
- `src/lib/share.ts` — el patró dins d'un paràmetre d'adreça. Sense cap API del
  navegador (ni `btoa`, ni `Buffer`), perquè el còdec es pugui provar sencer i doni el
  mateix a tot arreu. En descodificar passa sempre per `normalise`.
- `src/lib/wav.ts` — codificació WAV de 16 bits. Rep qualsevol cosa amb la forma d'un
  AudioBuffer, i per això es prova sense obrir cap AudioContext.

## Com treballar

- Un commit per canvi lògic, amb el missatge en català i en imperatiu.
- No preguntis res que es pugui decidir llegint el codi o provant-ho.
- Pregunta només si la decisió és irreversible o canvia el disseny visual.
- Si alguna cosa no es pot verificar (l'àudio real, el comportament al navegador),
  digues-ho al final del resum en lloc de donar-ho per bo.
- No afegeixis dependències sense justificar-les en una línia del commit.

## Com es comporten les variacions i el break

Mesurat sobre 20 llavors per estil (365 variacions en total). "Distància" són
cel·les de percussió que difereixen de la base.

| Estil | dist. mitjana | dins de 2–5 | cel·les base → variació → break |
| --- | --- | --- | --- |
| house | 2,7 | 39/57 | 11,1 → 12,4 → 5,2 |
| breakbeat | 3,9 | 37/59 | 18,1 → 16,5 → 7,8 |
| trip-hop | 2,8 | 28/41 | 16,1 → 16,0 → 9,0 |
| techno | 3,6 | 47/61 | 13,7 → 12,4 → 7,2 |
| dub | 3,4 | 24/37 | 21,9 → 21,7 → 10,0 |
| ternari | 3,3 | 32/40 | 28,4 → 28,4 → 10,3 |
| percussió | 4,2 | 53/70 | 16,9 → 17,0 → 6,8 |

**El break va bé a tot arreu**: 140 de 140 casos queden més buits que la base,
i de mitjana a la meitat o menys.

**Les variacions no.** Només 260 de 365 (71 %) cauen dins de la forquilla de
2–5 cel·les demanada. Els dos extrems fallen per motius diferents:

- **Massa poc (distància 1).** Passa a tots els estils. Ve de la xarxa de
  seguretat de `buildVariation`, que quan el sorteig no canvia res força tres
  commutacions de cel·la; si en cauen dues sobre passos ja actius, la
  distància neta queda en 1.
- **Massa (fins a 14 al breakbeat, 12 al trip-hop i al techno).** Treure una
  veu sencera compta totes les seves cel·les. Al breakbeat el charles en fa
  vuit, i treure'l dona una distància de 8 d'un sol cop.

O sigui que la forquilla de 2–5 i la manera de fer variacions són
incompatibles tal com estan: **una variació que treu una veu no hi pot cabre
mai**. O es mesura la distància en veus i no en cel·les, o la forquilla ha de
ser més ampla per a les que treuen una veu. No s'ha canviat res: només
mesurat.

## Sospitós / pendent

- El generador està provat amb 200 llavors per estil: 1.400 cançons vàlides, totes
  passen el crític i totes cauen dins dels rangs declarats. Cada regla de gènere té el
  seu test (house sempre als quatre temps, breakbeat mai al tercer, dub el charles obert
  al contratemps, ternari el tresillo…).
- **El ternari no fa 12 ni 24 passos**: `PATTERN_LENGTHS` és `[8, 16, 32]`. Es fa amb 32
  i tresillo 3+3+2, que és el que tanca en una graella binària. Si algun dia es vol un
  6/8 de debò, cal afegir 12 i 24 al model.
- **No s'ha pogut escoltar res.** Tot el que se sap del so surt de mesures amb un
  `AnalyserNode`; que una cançó generada soni a l'estil que diu és l'única cosa que no
  es pot verificar des d'aquí.
- `lib/demos.ts` **no existeix**: les cinc cançons d'exemple escrites a mà no s'han fet.
- El canvi de ranura no fa cap tall: verificat amb el playhead (cap salt irregular, tots
  els canvis al darrer pas) i amb l'envolupant (cap silenci més llarg que el que hi ha
  entre dos bombos).
- L'escena activa segueix el que toques: per fer-ne una de diferent cal duplicar-la amb
  «+» i editar després.
- Sense provar: Safari i Firefox, el mòbil, i què passa amb el `localStorage` ple.
