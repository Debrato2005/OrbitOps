// index.js - improved server
// Install deps: npm i express satellite.js undici cors zlib
const express = require('express');
const satellite = require('satellite.js');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

let fetchFunc;
if (typeof fetch === 'function') {
  fetchFunc = fetch; // Node 18+
} else {
  // fallback for older Node: undici
  try {
    fetchFunc = require('undici').fetch;
  } catch (e) {
    console.error('No global fetch and undici not installed. Run: npm i undici');
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// In-memory caches for demo
const tleCache = new Map(); // norad -> { name, line1, line2, fetchedAt }
let demoSnapshot = null;    // loaded from snapshot.json if present

// Helper: load snapshot.json if present
function loadSnapshot() {
  const p = path.join(__dirname, 'snapshot.json');
  if (fs.existsSync(p)) {
    try {
      const raw = fs.readFileSync(p, 'utf8');
      demoSnapshot = JSON.parse(raw);
      console.log(`Loaded snapshot.json (${demoSnapshot.length} objects)`);
    } catch (e) {
      console.warn('Failed to parse snapshot.json:', e.message);
      demoSnapshot = null;
    }
  } else {
    console.log('No snapshot.json found in project root.');
  }
}
loadSnapshot();

// Helper: fetch TLE from Celestrak gp.php (per-NORAD call)
async function fetchTLE(noradId) {
  const key = String(noradId);
  if (tleCache.has(key)) return tleCache.get(key);

  const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${encodeURIComponent(noradId)}&FORMAT=TLE`;
  const r = await fetchFunc(url, { headers: { 'User-Agent': 'orbital-demo/1.0' }});
  if (!r.ok) throw new Error(`TLE fetch failed ${r.status} ${r.statusText}`);
  const txt = await r.text();
  const lines = txt.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 3) throw new Error('Invalid TLE response (expected name + 2 lines)');

  const name = lines[0];
  const line1 = lines[1];
  const line2 = lines[2];
  if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) {
    throw new Error('Malformed TLE lines returned');
  }
  const payload = { name, line1, line2, fetchedAt: new Date().toISOString() };
  tleCache.set(key, payload);
  return payload;
}

// Helper: propagate a TLE into positions (ECI km + velocities km/s)
function propagateTLEtoPositions(line1, line2, startIso, durationS = 3600, stepS = 60) {
  const satrec = satellite.twoline2satrec(line1, line2);
  const start = new Date(startIso);
  const steps = Math.max(1, Math.ceil(durationS / stepS));
  const out = new Array(steps);
  for (let i = 0; i < steps; ++i) {
    const t = new Date(start.getTime() + i * stepS * 1000);
    const eci = satellite.propagate(satrec, t);
    if (!eci || !eci.position) {
      out[i] = { t: t.toISOString(), r: [NaN, NaN, NaN], v: [NaN, NaN, NaN] };
      continue;
    }
    out[i] = {
      t: t.toISOString(),
      r: [eci.position.x, eci.position.y, eci.position.z],
      v: [eci.velocity.x, eci.velocity.y, eci.velocity.z]
    };
  }
  return out;
}

/* === GET /api/tle/:noradId  ===
   Returns TLE lines and metadata (cached) */
app.get('/api/tle/:noradId', async (req, res) => {
  try {
    const norad = req.params.noradId;
    if (!/^\d+$/.test(norad)) return res.status(400).json({ error: 'noradId must be numeric' });
    const tle = await fetchTLE(norad);
    res.json({ norad: Number(norad), name: tle.name, line1: tle.line1, line2: tle.line2, fetchedAt: tle.fetchedAt });
  } catch (err) {
    console.error('/api/tle error', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* === GET /api/satellite/:noradId ===
   Returns current lat/lon/alt for quick UI display */
app.get('/api/satellite/:noradId', async (req, res) => {
  try {
    const norad = req.params.noradId;
    if (!/^\d+$/.test(norad)) return res.status(400).json({ error: 'noradId must be numeric' });
    const tle = await fetchTLE(norad);
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const now = new Date();
    const pv = satellite.propagate(satrec, now);
    if (!pv || !pv.position) return res.status(500).json({ error: 'Propagation failed' });
    const gmst = satellite.gstime(now);
    const posGd = satellite.eciToGeodetic(pv.position, gmst);
    res.json({
      norad: Number(norad),
      name: tle.name,
      lat: posGd.latitude * 180/Math.PI,
      lon: posGd.longitude * 180/Math.PI,
      alt_km: posGd.height
    });
  } catch (err) {
    console.error('/api/satellite error', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* === POST /api/propagate ===
   Body: { tle: [line1,line2], start_iso, duration_s, step_s }
   Returns: { positions: [{t, r:[x,y,z], v:[vx,vy,vz]}, ...] } */
app.post('/api/propagate', (req, res) => {
  try {
    const { tle, start_iso, duration_s = 3600, step_s = 60 } = req.body || {};
    if (!Array.isArray(tle) || tle.length < 2) return res.status(400).json({ error: 'tle must be [line1,line2]' });
    const traj = propagateTLEtoPositions(tle[0], tle[1], start_iso || new Date().toISOString(), duration_s, step_s);
    res.json({ start_iso: start_iso || new Date().toISOString(), duration_s, step_s, positions: traj });
  } catch (err) {
    console.error('/api/propagate error', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* === GET /api/objects?limit=1000 ===
   Returns simple snapshot list if snapshot.json is present */
app.get('/api/objects', (req, res) => {
  try {
    const limit = Math.min(50000, Number(req.query.limit) || 1000);
    if (!demoSnapshot) return res.json({ meta: { total_available: 0, snapshot_count: 0 }, objects: [] });
    const objects = demoSnapshot.slice(0, limit).map(o => ({
      norad: o.norad,
      name: o.name,
      category: o.category || 'unknown',
      r_km: o.r_km || [NaN, NaN, NaN],
      last_epoch: o.last_epoch_iso || null
    }));
    res.json({ meta: { total_available: demoSnapshot.length, snapshot_count: objects.length }, objects });
  } catch (err) {
    console.error('/api/objects error', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* === Optional: reload snapshot endpoint (protected in prod) === */
app.post('/api/_reload_snapshot', (req, res) => {
  try {
    loadSnapshot();
    res.json({ ok: true, loaded: demoSnapshot ? demoSnapshot.length : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
