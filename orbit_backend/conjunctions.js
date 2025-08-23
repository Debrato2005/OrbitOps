// conjunctions.js
const satellite = require('satellite.js');

// Propagate a satellite for a given duration & step
function propagateTrajectory(line1, line2, startIso, durationS = 3600, stepS = 60) {
  const satrec = satellite.twoline2satrec(line1, line2);
  const start = new Date(startIso);
  const steps = Math.max(1, Math.ceil(durationS / stepS));
  const out = new Array(steps);
  for (let i = 0; i < steps; ++i) {
    const t = new Date(start.getTime() + i * stepS * 1000);
    const eci = satellite.propagate(satrec, t);
    if (!eci || !eci.position) {
      out[i] = { t: t.toISOString(), r: [NaN, NaN, NaN] };
      continue;
    }
    out[i] = {
      t: t.toISOString(),
      r: [eci.position.x, eci.position.y, eci.position.z]
    };
  }
  return out;
}

// Euclidean distance (km)
function distKm(r1, r2) {
  const dx = r1[0] - r2[0];
  const dy = r1[1] - r2[1];
  const dz = r1[2] - r2[2];
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

// Main conjunction detection
function findConjunctions(target, others, opts = {}) {
  const {
    startIso = new Date().toISOString(),
    durationS = 3600 * 24, // 24 hours
    stepS = 60,           // 1 minute
    thresholdKm = 500000     // report if closer than this
  } = opts;

  const trajTarget = propagateTrajectory(target.line1, target.line2, startIso, durationS, stepS);

  const events = [];
  for (const obj of others) {
    if (!obj.tle) continue;
    if (String(obj.norad) === String(target.norad)) continue;
    const trajOther = propagateTrajectory(obj.tle[0], obj.tle[1], startIso, durationS, stepS);

    let minD = Infinity, minT = null;
    for (let i = 0; i < trajTarget.length; i++) {
      const d = distKm(trajTarget[i].r, trajOther[i].r);
      if (d < minD) {
        minD = d;
        minT = trajTarget[i].t;
      }
    }

    if (minD < thresholdKm) {
      events.push({
        target: target.name,
        other: obj.name,
        other_norad: obj.norad,
        min_distance_km: minD,
        time_of_closest_approach: minT
      });
    }
  }

  return events;
}

module.exports = { findConjunctions };
