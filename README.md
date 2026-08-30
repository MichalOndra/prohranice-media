# prohranice-media

Veřejné úložiště obrázků pro kampaň **PRO Hranice 2026**. Slouží k jedinému účelu:
dát hotovým vizuálům veřejnou adresu, ze které si je Facebook a Instagram načtou.

## Jak to funguje

1. Do složky `prispevky/` přibude textový soubor `*.json` s obsahem příspěvku.
2. Push spustí workflow **Vyrenderovat vizualy** (GitHub Actions).
3. Workflow stáhne fonty, rozbalí logo, vyrenderuje obrázky v Chromiu
   a commitne je do `img/`.
4. Veřejná adresa obrázku je pak:
   `https://raw.githubusercontent.com/MichalOndra/prohranice-media/main/img/D1_ctverec.jpg`

Do repozitáře se tedy zapisuje jen text (~0,5 kB na příspěvek), obrázky vyrábí robot.

## Formát souboru v `prispevky/`

```json
{
  "id": "D1",
  "nadtitul": "Doloženo · usnesení č. 524/2025",
  "hlavni": "10 milionů",
  "podtitul": "korun ročně navíc do rozpočtu Hranic",
  "sloupce": [
    { "popis": "Platí víc", "text": "areály těžkého průmyslu", "akcent": true },
    { "popis": "Platí stejně", "text": "rodinné domy a byty" }
  ],
  "formaty": ["ctverec", "story"]
}
```

| Pole | Povinné | K čemu |
|---|---|---|
| `id` | ano | Název výsledného souboru, `D1` → `img/D1_ctverec.jpg` |
| `nadtitul` | ano | Malý text nahoře, tyrkysově, verzálkami |
| `hlavni` | ano* | Hlavní sdělení. Velikost písma se volí podle délky |
| `citat` | ano* | Místo `hlavni` — vysází se v uvozovkách, k němu `autor` |
| `podtitul` | ne | Vysvětlující řádek pod hlavním sdělením |
| `sloupce` | ne | Dva sloupce pod čarou, `akcent: true` zvýrazní jeden |
| `body` | ne | Seznam odrážek pod čarou |
| `pravni` | ne | Patička; výchozí je „Zadavatel i zpracovatel: PRO Hranice" |
| `formaty` | ne | `ctverec` (1080×1080) a `story` (1080×1920), výchozí obojí |

\* Vyplňuje se buď `hlavni`, nebo `citat`.

## Vizuální styl

Podle grafického manuálu PRO Hranice 2026: navy `#1B2B50`, tyrkysová `#6CB3B0`,
červená `#E85D4E` (maximálně jednou na materiál), fonty Urbanist a Inter.
Logo a adresa `prohranice.cz` jsou na každém vizuálu.

## Lokální spuštění

```
npm install
npx playwright install chromium
base64 -d sablona/logo.b64 > sablona/logo.webp
node sablona/render.mjs        # vše
node sablona/render.mjs D1     # jen jeden příspěvek
```
