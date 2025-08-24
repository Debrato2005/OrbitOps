// index.js - improved server
// Install deps: npm i express satellite.js undici cors zlib
const express = require('express');
const satellite = require('satellite.js');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { findConjunctions } = require('./conjunctions');


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
async function fetchTLE(norad) {
  const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${norad}&FORMAT=TLE`;
  const res = await fetch(url);
  const text = (await res.text()).trim();

  if (text.startsWith('No GP data')) {
    throw new Error(`No TLE data found for NORAD ${norad}`);
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  if (lines.length === 2) {
    // No name provided, just line1 and line2
    return { name: `NORAD ${norad}`, line1: lines[0], line2: lines[1] };
  } else if (lines.length === 3) {
    return { name: lines[0], line1: lines[1], line2: lines[2] };
  } else {
    throw new Error(`Unexpected TLE format for NORAD ${norad}: ${text}`);
  }
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
// --- Math helpers for conjunction search ---
function distKm(a, b) {
  const dx = a[0]-b[0], dy = a[1]-b[1], dz = a[2]-b[2];
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

function lerpState(p0, p1, alpha) {
  return [
    p0[0] + (p1[0]-p0[0]) * alpha,
    p0[1] + (p1[1]-p1[1]) * alpha,
    p0[2] + (p1[2]-p0[2]) * alpha,
  ];
}

function refineMinBetweenSamples(r0a, r1a, r0b, r1b, refineSamples = 20) {
  let best = { alpha: 0, dKm: distKm(r0a, r0b) };
  for (let k = 1; k <= refineSamples; k++) {
    const a = k / refineSamples;
    const ra = lerpState(r0a, r1a, a);
    const rb = lerpState(r0b, r1b, a);
    const d = distKm(ra, rb);
    if (d < best.dKm) best = { alpha: a, dKm: d };
  }
  return best;
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

/* === GET /api/conjunctions/:noradId ===
   Check target satellite against snapshot objects */
app.get('/api/conjunctions/:noradId', async (req, res) => {
  try {
    if (!demoSnapshot) {
      return res.json({ events: [], meta: { msg: 'no snapshot loaded' } });
    }

    const norad = req.params.noradId;
    if (!/^\d+$/.test(norad)) {
      return res.status(400).json({ error: 'noradId must be numeric' });
    }

    // Fetch TLE for the target satellite
    const tle = await fetchTLE(norad);
    const target = { name: tle.name, line1: tle.line1, line2: tle.line2, norad };

    // **Filter snapshot to exclude the target itself**
    const others = demoSnapshot.filter(o => String(o.norad) !== norad);

    // Find conjunctions comparing target against others
    const events = findConjunctions(target, others, {
      durationS: 3600 * 6, // 6 hours
      stepS: 60,
      thresholdKm: 10
    });

    res.json({ target: tle.name, events, checked: others.length });
  } catch (err) {
    console.error('/api/conjunctions error', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

