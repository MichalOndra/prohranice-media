// Vyrenderuje vizualy pro socialni site ze souboru v prispevky/*.json.
// Spousti se v GitHub Actions i lokalne: node sablona/render.mjs [ID]
import { chromium } from 'playwright';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const korenSablony = path.dirname(fileURLToPath(import.meta.url));
const koren = path.resolve(korenSablony, '..');
const slozkaPrispevku = path.join(koren, 'prispevky');
const slozkaObrazku = path.join(koren, 'img');

const ROZMERY = {
  ctverec: { width: 1080, height: 1080 },
  na45:    { width: 1080, height: 1350 },
  story:   { width: 1080, height: 1920 },
};

const chyby = [];

function zkontroluj(data, soubor) {
  const p = [];
  if (!data.id) p.push('chybi "id"');
  if (!data.spis) p.push('chybi "spis" (radek s odkazem na dokument nahore)');
  if (!data.cifra && !data.hlavni && !data.citat) p.push('chybi "cifra", "hlavni" nebo "citat"');
  if (data.rozvrzeni && !['pas', 'foto', 'zprava'].includes(data.rozvrzeni)) {
    p.push(`nezname "rozvrzeni" (povolene: pas, foto, zprava)`);
  }
  if ((data.rozvrzeni === 'pas' || data.rozvrzeni === 'foto') && !data.foto) {
    p.push(`rozvrzeni "${data.rozvrzeni}" potrebuje "foto"`);
  }
  if (data.formaty && !Array.isArray(data.formaty)) p.push('"formaty" musi byt seznam');
  for (const f of data.formaty || []) {
    if (!ROZMERY[f]) p.push(`neznamy format "${f}" (povolene: ${Object.keys(ROZMERY).join(', ')})`);
  }
  if (p.length) chyby.push(`${soubor}: ${p.join('; ')}`);
  return p.length === 0;
}

// Binarni prilohy (logo) jsou v repozitari ulozene jako base64 text,
// protoze konektor GitHub binarni soubory nahrat neumi. Rozbalime je.
async function rozbalPrilohy() {
  for (const jmeno of await readdir(korenSablony)) {
    if (!jmeno.endsWith('.b64')) continue;
    const zdroj = path.join(korenSablony, jmeno);
    // "logo.b64" nese webp, takze kdyz ve jmenu zadna dalsi pripona neni, doplnime ji.
    const zaklad = jmeno.slice(0, -4);
    const cil = path.join(korenSablony, zaklad.includes('.') ? zaklad : zaklad + '.webp');
    const text = await readFile(zdroj, 'utf8');
    await writeFile(cil, Buffer.from(text.trim(), 'base64'));
    console.log(`rozbaleno     ${jmeno} -> ${path.basename(cil)}`);
  }
}

const jenId = process.argv[2] || null;

if (!existsSync(slozkaObrazku)) await mkdir(slozkaObrazku, { recursive: true });
await rozbalPrilohy();

const soubory = (await readdir(slozkaPrispevku)).filter((f) => f.endsWith('.json')).sort();
if (!soubory.length) {
  console.log('Ve slozce prispevky/ nic neni, neni co renderovat.');
  process.exit(0);
}

const spousteci = process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {};
const prohlizec = await chromium.launch(spousteci);
const adresaSablony = 'file://' + path.join(korenSablony, 'sablona.html');
let hotovo = 0;

for (const soubor of soubory) {
  let data;
  try {
    data = JSON.parse(await readFile(path.join(slozkaPrispevku, soubor), 'utf8'));
  } catch (e) {
    chyby.push(`${soubor}: nejde precist jako JSON — ${e.message}`);
    continue;
  }
  if (!zkontroluj(data, soubor)) continue;
  if (jenId && data.id !== jenId) continue;

  for (const format of data.formaty || ['ctverec', 'story']) {
    const stranka = await prohlizec.newPage({ viewport: ROZMERY[format], deviceScaleFactor: 1 });
    await stranka.goto(adresaSablony, { waitUntil: 'load' });
    await stranka.evaluate(([d, f]) => vykresli(d, f), [data, format]);
    await stranka.evaluate(() => document.fonts.ready);
    // Fotky se stahuji ze site, tak pockame, nez se opravdu nactou.
    await stranka.waitForFunction(
      () => [...document.images].every((i) => i.complete && i.naturalWidth > 0),
      null,
      { timeout: 30000 },
    );
    await stranka.waitForTimeout(250);

    const cil = path.join(slozkaObrazku, `${data.id}_${format}.jpg`);
    await stranka.locator('#plocha').screenshot({ path: cil, type: 'jpeg', quality: 90 });
    await stranka.close();
    console.log(`vyrenderovano ${data.id}_${format}.jpg`);
    hotovo++;
  }
}

await prohlizec.close();

if (chyby.length) {
  console.error('\nChyby v podkladech:');
  for (const c of chyby) console.error('  - ' + c);
  process.exit(1);
}
console.log(`\nHotovo: ${hotovo} obrazku.`);
