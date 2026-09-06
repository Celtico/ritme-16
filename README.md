# RITME-16

Caixa de ritmes de 16 passos al navegador. Vuit veus de percussió
sintetitzades en temps real amb Tone.js: cap sample, cap fitxer d'àudio, cap
llicència de tercers.

## Posar-ho en marxa

```bash
npm install
npm run dev
```

## Com es toca

| Acció | Com |
| --- | --- |
| Activar un pas | clic |
| Accentuar un pas | majúscules + clic, o clic dret |
| Arrencar i aturar | barra espaiadora, o el botó rodó |
| Escoltar una veu solta | tecles 1–8, o el botó ▶ de la fila |
| Obrir els comandaments de so | clic al nom de la veu |
| Buidar una fila | doble clic al nom de la veu |

El botó «+ Pista» n'afegeix (fins a 16) i el menú ⋯ de cada fila permet
reanomenar-la, canviar-ne el color, duplicar-la, moure-la o eliminar-la. Les
tecles 1 a 8 sempre fan sonar les vuit primeres.

Cada fila porta, a més del volum, un panoràmic i dos enviaments: A cap a una
reverberació i B cap a un retard sincronitzat al tempo. Els dos retorns són les
dues files del final, amb els seus controls i el seu silenci. A la dreta de cada
fila hi ha un vúmetre, que només es mou mentre sona el transport.

Els patrons desats van a `localStorage` d'aquest navegador. Els tres patrons
d'exemple (`PRESETS`) estan definits al codi.

## Arquitectura

```
src/
  lib/pattern.ts       model del patró: pistes, barreja i patrons d'exemple
  lib/voices.ts        una fàbrica per tipus de veu; afegir-ne una és afegir-hi una funció
  lib/kit.ts           registre de cadenes de síntesi, una per pista
  lib/theory.ts        escales i acords (encara sense connectar)
  lib/storage.ts       desar/carregar amb validació del que ve del navegador
  hooks/useSequencer.ts transport de Tone, seqüència i totes les edicions
  components/          consola, transport, files, panell de so, banc de patrons
```

Tres decisions que val la pena conèixer abans de tocar res:

**Tone.js s'importa dinàmicament.** `await import("tone")` només s'executa
dins d'`ensureAudio()`, cridat des d'un gest de l'usuari. Així el mòdul mai
no s'avalua durant el renderitzat de servidor i el `AudioContext` es crea
quan el navegador ho permet.

**La seqüència llegeix d'una ref, no de l'estat.** El callback de
`Tone.Sequence` viu al fil d'àudio i llegeix `patternRef.current`. Editar un
pas mentre sona no re-programa res: el següent pas ja veu el canvi. La
sincronia visual va per `Tone.getDraw().schedule()`, que és l'única manera de
lligar el temps d'àudio amb el temps del navegador sense derives.

**Els passos tenen tres estats, no dos.** `0` silenci, `1` normal, `2`
accent. L'accent només canvia la velocitat de disparament (1.0 contra 0.6),
que és el que fa que un patró recte soni humà.

## El so de cada veu es toca

Clicar el nom d'una pista obre el panell de so, que es desa amb el patró. Té
tres bandes, i la de dalt segueix l'ordre del senyal:

**La cadena.** Oscil·lador (afinació), Filtre (tall, ressonància, tipus, amb la
resposta dibuixada de debò), Drive (saturació) i Amp (caiguda). Cada veu només
mostra els blocs que té: les de soroll pur no tenen res que afinar.

**Les fonts de modulació.** Env Amp, Env Filtre, LFO 1, LFO 2, Velocitat i
Atzar. Triant-ne una, els comandaments on aquella font pot arribar mostren un
anell exterior; arrossegant-lo s'hi encamina, de −100 a +100 %. Les envolupants
només arriben al filtre; les altres fonts es mostregen en el moment del cop i
van a qualsevol paràmetre.

**L'editor.** Pestanyes per família: envolupants, amb el gràfic ADSR de punts
arrossegables; LFO, sincronitzats al tempo; i atzar.

A la dreta hi ha quatre macros, que són del patró i no de la pista: un de sol
pot moure paràmetres de pistes diferents alhora.

Cap comandament no recrea nodes: tots escriuen sobre la cadena que ja sona. Els
valors per defecte reprodueixen el so original, i «De fàbrica» hi torna.

## Veus

| Veu | Síntesi |
| --- | --- |
| Bombo | membrana amb caiguda de to de 45 ms |
| Caixa | cos tonal a G2 + soroll blanc filtrat per dalt |
| Palmada | tres ràfegues de soroll a 0, 11 i 23 ms per bandpass |
| Charles tancat / obert | soroll per filtre passa-alts; el tancat ofega l'obert |
| Aro, Cencerro | `MetalSynth` amb harmonicitats i ressonàncies diferents |
| Timbal | membrana greu amb caiguda llarga |

Per canviar el so d'una veu només cal tocar `src/lib/kit.ts`: cada cadena hi
és sencera, del generador al bus.

## Idees per continuar

- Longitud de patró variable (8, 16, 32) i polirítmies per pista.
- Encadenar patrons en una cançó.
- Exportar a WAV amb `Tone.Offline`.
- Compartir patrons per URL: el model ja és serialitzable a JSON.
