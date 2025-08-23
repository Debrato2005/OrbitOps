// server/snapshot_celestrak.js
// Usage examples:
// 1) Catalog mode: CATALOG_URL=https://celestrak.org/NORAD/elements/visual.txt MAX=1000 MODE=catalog node snapshot_celestrak.js
// 2) List mode: MODE=list MAX=1000 node snapshot_celestrak.js
//
// Dependencies: undici, satellite.js
const { fetch } = require('undici');
const satellite = require('satellite.js');
const fs = require('fs').promises;
const path = require('path');

const OUT = path.join(__dirname, 'snapshot.json'); // output used by your server
const NORADS_FILE = path.join(__dirname, 'norads.txt');

const MODE = process.env.MODE || 'catalog'; // 'catalog' or 'list'
const MAX = Number(process.env.MAX || 1000);
const CATALOG_URL = process.env.CATALOG_URL || 'https://celestrak.org/NORAD/elements/visual.txt';
const SLEEP_MS = Number(process.env.SLEEP_MS || 200); // politeness between requests in list mode

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

function parseCatalogTextToTles(text, max) {
  const lines = text.split('\n').map(l=>l.replace(/\r/g,'')).filter(Boolean);
  const out = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim();
    const l1 = lines[i+1].trim();
    const l2 = lines[i+2].trim();
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

async function fetchTLEForNorad(norad) {
  const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${encodeURIComponent(norad)}&FORMAT=TLE`;
  const res = await fetch(url, { headers: { 'User-Agent': 'snapshot-gen/1.0' }});
  if (!res.ok) throw new Error(`TLE fetch ${norad} failed ${res.status}`);
  const txt = await res.text();
  const lines = txt.trim().split('\n').filter(Boolean);
  if (lines.length < 3) throw new Error('Invalid TLE for ' + norad);
  return { name: lines[0].trim(), tle: [lines[1].trim(), lines[2].trim()] };
}

function computeRepresentativeRk(line1, line2, epochIso) {
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    const t = new Date(epochIso);
    const eci = satellite.propagate(satrec, t);
    if (!eci || !eci.position) return [NaN, NaN, NaN];
    return [eci.position.x, eci.position.y, eci.position.z];
  } catch (e) {
    return [NaN, NaN, NaN];
  }
}

async function run() {
  const epochIso = new Date().toISOString();
  console.log(`snapshot_celestrak starting (mode=${MODE}, max=${MAX}) epoch=${epochIso}`);

  const items = [];
  try {
    if (MODE === 'catalog') {
      const tles = await fetchCatalog(CATALOG_URL);
      for (let i=0;i<Math.min(tles.length, MAX);++i){
        const it = tles[i];
        const r_km = computeRepresentativeRk(it.tle[0], it.tle[1], epochIso);
        let norad = NaN;
        try { norad = Number(it.tle[1].substr(2,5).trim()); if (!Number.isFinite(norad)) norad = NaN; } catch(e){}
        items.push({ norad: norad, name: it.name, tle: it.tle, last_epoch_iso: epochIso, r_km, category: 'snapshot' });
      }
    } else if (MODE === 'list') {
      const txt = await fs.readFile(NORADS_FILE, 'utf8');
      const ids = txt.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,MAX);
      console.log('Will fetch list-mode NORADs:', ids.length);
      for (let i=0;i<ids.length;++i){
        const id = ids[i];
        try {
          const res = await fetchTLEForNorad(id);
          const r_km = computeRepresentativeRk(res.tle[0], res.tle[1], epochIso);
          items.push({ norad: Number(id), name: res.name, tle: res.tle, last_epoch_iso: epochIso, r_km, category: 'snapshot' });
          console.log(`Fetched ${id} (${i+1}/${ids.length})`);
        } catch(e){
          console.warn(`Failed ${id}: ${e.message}`);
        }
        await sleep(SLEEP_MS);
      }
    } else {
      throw new Error('Unknown MODE: ' + MODE);
    }

    await fs.writeFile(OUT, JSON.stringify(items, null, 2), 'utf8');
    console.log(`Wrote ${OUT} with ${items.length} items`);
  } catch (e) {
    console.error('snapshot_celestrak failed', e);
    process.exit(2);
  }
}

run();
