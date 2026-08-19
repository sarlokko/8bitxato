# 8BITXATO

Mixer 8-bit nel browser: componi un loop chiptune a 16 step. Nato su `sarlok`, ora vive qui.

## Come si usa

```bash
npm start
```

Apri http://localhost:3000

- **Lead** e **basso**: clicca (o trascina) una casella per mettere una nota (una sola per colonna)
- **Kick / snare / hat**: accendi o spegni il colpo
- Ogni click suona subito la nota
- **CHIP** sceglie la sonorità 8-bit: CLASSICO (default), NES, BOY, SALA, NOTTE
- **PLAY** o barra spaziatrice per ascoltare
- **Xato** balla sul beat quando il loop gira
- **UNDO** o Ctrl+Z
- Tastiera: `1–8` lead, `Z X C` kick/snare/hat
- Il pattern si salva da solo nel browser
- **COPIA LINK** per condividere il loop (resta nell'URL)
- **ESPORTA / IMPORTA** per il JSON

## Tracce

Sul kit **CLASSICO** (i suoni originali):

| Traccia | Suono |
|---------|--------|
| LEAD | onda quadra |
| BASS | onda triangolare |
| KICK | tom 8-bit con pitch drop |
| SNARE | rumore + click |
| HAT | rumore corto |

Gli altri kit restano 8-bit: **NES** pulse 25%, **BOY** pulse sottile, **SALA** arcade, **NOTTE** triangolo morbido.

## Test

```bash
npm test
```

## Deploy

Ogni push su `main` pubblica il branch `gh-pages`.

Una volta: **Settings → Pages** → Deploy from a branch → `gh-pages` / `(root)` → Save

URL: https://sarlokko.github.io/8bitxato/
