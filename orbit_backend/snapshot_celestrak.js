// snapshot_celestrak.js
// Usage: MODE=catalog MAX=500 node snapshot_celestrak.js
// Dependencies: undici, satellite.js
const { fetch } = require('undici');
const satellite = require('satellite.js');
const fs = require('fs').promises;
const path = require('path');

const OUT = path.join(__dirname, 'snapshot.json');
const MODE = process.env.MODE || 'catalog';
const MAX = Number(process.env.MAX || 500);
const CATALOG_URL = process.env.CATALOG_URL || 'https://celestrak.org/NORAD/elements/visual.txt';

function parseCatalogTextToTles(text, max) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i];
    const l1 = lines[i+1];
    const l2 = lines[i+2];
    if (l1.startsWith('1 ') && l2.startsWith('2 ')) {
      out.push({ name, tle: [l1, l2] });
      if (out.length >= max) break;
    }
  }
  return out;
}

async function fetchCatalog(url) {
  console.log('Downloading catalog:', url);
  const res = await fetch(url, { headers: { 'User-Agent': 'snapshot-gen/1.0' }});
  if (!res.ok) throw new Error(`Catalog fetch failed ${res.status}`);
  const txt = await res.text();
  return parseCatalogTextToTles(txt, MAX);
}

function computeRk(line1, line2, epochIso) {
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    const eci = satellite.propagate(satrec, new Date(epochIso));
    if (!eci || !eci.position) return [NaN, NaN, NaN];
    return [eci.position.x, eci.position.y, eci.position.z];
  } catch {
    return [NaN, NaN, NaN];
  }
}

async function run() {
  const epochIso = new Date().toISOString();
  const tles = await fetchCatalog(CATALOG_URL);
  const items = tles.map(it => {
    const r_km = computeRk(it.tle[0], it.tle[1], epochIso);
    let norad = NaN;
    try { norad = Number(it.tle[1].substr(2,5).trim()); } catch {}
    return { norad, name: it.name, tle: it.tle, r_km, last_epoch_iso: epochIso, category: 'snapshot' };
  });
  await fs.writeFile(OUT, JSON.stringify(items, null, 2), 'utf8');
  console.log(`Wrote ${OUT} with ${items.length} objects`);
}

run().catch(e => { console.error(e); process.exit(1); });
