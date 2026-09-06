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
- `src/components/StepRow.tsx` / `StepRuler.tsx` — els setze passos d'una pista i els
  seus números. Comparteixen classes d'amplada; la regla no en té cap d'escrita a mà.
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

- Els dos temes estan provats al navegador: sense tria desada mana `prefers-color-scheme`,
  el commutador desa la tria a `localStorage`, i en recarregar la tria guanya el sistema.
  Cap avís d'hidratació.
- El relleu s'ha revisat en fosc: els passos buits porten una línia clara a baix i el
  botó de play un bisell a dalt, perquè l'ombra negra sola no es veia.
- **Sense provar**: el parpelleig real en obrir amb la xarxa lenta (l'script en línia
  hauria d'evitar-lo, però només s'ha comprovat que el tema ja és correcte al primer
  render), el tema de nit a Safari i Firefox, i el `themeColor` de la barra del mòbil.
- L'app ocupa el viewport sencer i no es desplaça mai la pàgina. Verificat a 2560, 1440 i
  1024 px; **els 390 px no s'han pogut provar** perquè Chrome no fa la finestra tan
  estreta.
- Els vúmetres, els enviaments, el panoràmic i els retorns estan verificats per mesura;
  el camí de `prefers-reduced-motion` dels vúmetres, no.
- Modulacions: `velocitat` i `atzar` cap a qualsevol destinació i els LFO cap al tall
  estan verificats; una modulació d'LFO sonant i `Env Amp → tall`, no.
- El playhead es queda encès al darrer pas en aturar el transport: hi ha crides de
  `Tone.getDraw()` ja programades que arriben després de l'`stop()`.
- Pendent d'encàrrecs anteriors, no fet: el banc de 8 patrons amb follow actions, les
  escenes i les pistes melòdiques (baix i acords).
- Sense provar: Safari i Firefox, el mòbil, i què passa amb el `localStorage` ple.
