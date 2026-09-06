---
name: audio-ui
description: Com es dibuixen les interfícies d'àudio del RITME-16 — l'espai de treball i el panell de so d'una veu. Fes-lo servir abans de tocar cap component de src/components, en especial si has d'afegir controls, panells, pestanyes o qualsevol cosa que reguli un paràmetre de síntesi.
---

# Interfícies d'àudio del RITME-16

> **Procedència.** L'apartat de l'espai de treball surt de com funciona
> l'Ableton Live; el del panell de so, de l'Arturia Pigments. Les captures de
> referència de `referencies/` no eren al repositori quan es va escriure això,
> així que el document recull la disposició descrita, no mesurada sobre la
> imatge. Si algun dia hi són, val més comparar-hi.

## El que no es negocia

La paleta i les tipografies del RITME-16 no canvien mai per assemblar-se a cap
referència. Res de fons blau fosc, res d'anells blau cel, res del color del
Pigments. Del que copiem és **la disposició i el comportament**, no l'aspecte.

| Ús | Variable |
| --- | --- |
| Xassís | `--color-panel`, `--color-panel-hi`, `--color-panel-lo` |
| Text | `--color-ink`, `--color-ink-soft` |
| Envolupants, pas actiu | `--color-oxblood` |
| LFO, accent, playhead | `--color-ochre` |
| Aleatori, pistes melòdiques, accions | `--color-teal` |
| Títols i xifres | `--font-display` (Bricolage) |
| Tota la resta | `--font-sans` (Instrument) |

Les xifres grans van sempre amb `tabular-nums`: si ballen en canviar, el
control sembla espatllat.

---

## L'espai de treball

La consola és una màquina, no una pàgina web. Tot viu dins d'una sola caixa
amb vora, i el que canvia de mida ho fa per dins.

De dalt a baix:

1. **Capçalera** — nom i una línia de context. Fons `ink`.
2. **Transport** — play, tempo, swing, llums de compàs. Una franja.
3. **Graella** — la llista de pistes. Cada fila té la seva columna de control
   enganxada a l'esquerra (`sticky left-0`) i els passos a la dreta, amb
   desplaçament horitzontal si no hi caben.
4. **Panell inferior** — el que ara és el panell de so. És **una zona amb
   pestanyes**, no una franja d'un sol ús: cada pestanya és una vista de la
   pista seleccionada o del patró.
5. **Banc de patrons** — presets, sortejar, buidar, desar.

### Selecció

Com a l'Ableton, hi ha **una pista seleccionada** i el panell inferior en
mostra els detalls. Clicar el nom d'una pista la selecciona. La selecció es
veu al nom (fons `panel-hi` ple i vora més marcada), no amb cap color nou.

Seleccionar **no** és sonar, ni silenciar, ni res que s'escolti: és només què
mira el panell de baix. L'audició té el seu botó ▶ a part.

### Pestanyes del panell inferior

Van a dalt de tot del panell, alineades a l'esquerra, en `font-sans` de 13 px.
L'activa porta el fons `panel-hi` i una vora inferior de 2 px del color de la
seva família; les altres són planes. Si no hi ha cap pista seleccionada, el
panell mostra **una sola línia de text** dient-ho, no una graella buida.

---

## Panell de so d'una veu

Tres bandes horitzontals, amb l'ordre del senyal com a guia.

```
┌─ banda 1 · la cadena ────────────────────────────┬─ macros ─┐
│  Oscil·lador  │  Filtre  │  Drive  │  Amp        │  ◎ ◎     │
│   ◎ ◎ ◎       │  ◎ ◎ [resposta]  │  ◎   │ ◎ ◎ ◎  │  ◎ ◎     │
├─ banda 2 · les fonts de modulació ───────────────┴──────────┤
│  [Env Amp] [Env Filtre] [LFO 1] [LFO 2] [Velocitat] [Atzar] │
├─ banda 3 · l'editor de la font triada ──────────────────────┤
│  Envolupants │ LFO │ Atzar        ← pestanyes de família    │
│  [gràfic ADSR amb punts arrossegables]  ◎ ◎ ◎ ◎             │
└─────────────────────────────────────────────────────────────┘
```

### Banda 1 — la cadena

Els blocs van **d'esquerra a dreta en l'ordre en què passa el senyal**:
Oscil·lador · Filtre · Drive · Amp. Separats per una línia vertical d'1 px
`ink/15`, amb el nom del bloc a sobre en 11 px `ink-soft`.

Regla dura: **només s'hi dibuixen blocs que existeixin de debò a
`lib/voices.ts`**. Si una veu no té filtre, el bloc del filtre no hi surt; no
es dibuixa un control que no vagi enlloc. I una veu té **un sol motor**: aquí
no s'hi apilen oscil·ladors.

### Els knobs

- Etiqueta **a sota**, 12 px, `ink-soft`, en minúscula.
- **Cap valor numèric permanent.** El número apareix en un tooltip només
  mentre s'arrossega, i desapareix en deixar-lo anar. Un panell ple de xifres
  es llegeix com un formulari, i això no és un formulari.
- Mides: **40 px** els principals (Cutoff, Decay), **28 px** els secundaris,
  **56 px** els macros.
- S'arrosseguen en vertical. Amunt puja. `Shift` afina; doble clic torna al
  valor de fàbrica.
- Dibuixats en SVG: un arc de fons `panel-lo`, un arc de valor `ink`, i una
  marca radial. Els bipolars (afinació, quantitat de modulació) omplen des del
  centre, no des de l'esquerra.

Cada knob ha de ser també accessible amb teclat: `role="slider"`, `aria-label`
en català, fletxes que el moguin.

### Banda 2 — la tira de modulacions

Una fila de targetes de **64×80 px**, una per font: Env Amp, Env Filtre,
LFO 1, LFO 2, Velocitat, Aleatori.

Cada targeta porta el nom a dalt (11 px) i **una mini-visualització SVG** de
la forma a sota: el perfil de l'envolupant, l'ona de l'LFO, una barra per a la
velocitat, un traç irregular per a l'aleatori. La visualització segueix els
paràmetres reals de la font: si mous l'atac, el dibuix es mou.

Una font **inactiva** (sense cap destinació assignada) va atenuada al 45 %.

Clicar una targeta la **selecciona**. Amb una font seleccionada:

- cada knob de la banda 1 mostra un **anell exterior** amb la quantitat de
  modulació que aquella font li aplica, de −100 a +100 %, omplint des de dalt
  del knob cap a un costat o l'altre segons el signe;
- arrossegar **verticalment sobre l'anell** en canvia la quantitat, sense
  tocar el valor del knob;
- l'anell pren el color de la família de la font.

**Sense cap font seleccionada, els anells no es dibuixen.** El panell en repòs
ha de ser llegible; els anells són un mode, no decoració permanent.

### El display del filtre

Un SVG de **200×60 px** dins el bloc del filtre amb la **resposta en
freqüència calculada**, no una corba decorativa: passa-baixos, passa-alts o
passa-banda segons el tipus, amb la campana de la Q on toqui.

Eix X logarítmic de 20 Hz a 20 kHz; eix Y de −40 a +20 dB. Segueix el cutoff i
la ressonància **en temps real** mentre s'arrosseguen. Traç `ink` d'1,5 px
sobre fons `panel-lo/40`, amb una guia vertical `ochre` al cutoff.

El càlcul viu a `lib/` i es prova amb punts coneguts: a un passa-baixos, la
freqüència de tall cau ~3 dB amb Q=0,707, i la caiguda és de 12 dB per octava.

### Banda 3 — pestanyes per família

| Família | Color de la pestanya activa |
| --- | --- |
| Envolupants | `oxblood` |
| LFO | `ochre` |
| Aleatori | `teal` |

L'editor d'envolupant és un **gràfic ADSR amb els punts arrossegables**, i
**a més** els quatre knobs. Les dues maneres editen el mateix valor: el gràfic
va bé per trobar la forma, els knobs per afinar-la. Qui no pugui arrossegar ha
de poder fer servir els knobs amb el teclat.

L'LFO mostra forma, velocitat (sincronitzada al transport: `1n`, `2n`, `4n`,
`8n`, `16n`) i profunditat.

### Macros

Fins a **quatre** knobs de 56 px al lateral dret, sempre visibles, sigui quina
sigui la pestanya. Cadascun:

- té un **nom editable** (clic al nom → camp de text, `Enter` desa, `Escape`
  cancel·la); per defecte "Macro 1".. "Macro 4";
- porta una llista d'**assignacions**: paràmetre de destinació i quantitat;
- **es defineix per patró**, no per pista: un macro pot moure coses de pistes
  diferents alhora, que és tot el sentit que té.

Aplicar un macro és **escriure els paràmetres de destinació**. No hi ha cap
node d'àudio de macro.

### Prohibit

1. Més d'un motor de síntesi per veu.
2. Blocs que no corresponguin a nodes reals de `lib/voices.ts`.
3. El color del Pigments, ni cap altre de fora de la paleta.
4. Valors numèrics permanents sota els knobs.
5. Recrear nodes en moure un control: **sempre** escriure sobre els que ja
   sonen. Un paràmetre que talla el so en tocar-lo és un paràmetre trencat.

---

## Com provar-ho

L'àudio no es pot verificar mirant la pantalla. Penja un `AnalyserNode` de la
destinació sobreescrivint `AudioNode.prototype.connect` **abans** del primer
gest de l'usuari, i mesura. Compte: hi ha uns 125 ms de latència entre el
dispar i el senyal, i les veus de soroll varien fins a 2,8 dB entre dispars
idèntics, o sigui que allà la mesura no distingeix canvis petits.
