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

Clicar el nom d'una veu obre els seus quatre comandaments, que es desen amb el
patró:

| Comandament | Què fa |
| --- | --- |
| Afinació | −12 a +12 semitons. A les veus de soroll, que no tenen cap to que afinar, mou el filtre: és el gest equivalent |
| Caiguda | de 20 ms a 1,5 s |
| To | fosc o brillant. El 50 % és exactament el filtre de fàbrica: per sota baixa dues octaves, per sobre puja fins al sostre de la veu |
| Saturació | de net a aplanat, amb un `Distortion` per veu abans del bus |

Cap comandament no recrea nodes: tots escriuen sobre la cadena que ja sona. Els
valors per defecte reprodueixen el so original, i el botó «De fàbrica» hi torna.

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
