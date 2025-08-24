// src/services/planManeuvers.js
// --- FINAL CORRECTED VERSION using a Linear Model ---
import { Satellite, Vector3D } from 'ootk';
import { openPrimaryDbForScript, openDebrisDbForScript } from './dataManager.js';

const SAFE_MISS_DISTANCE_KM = 10;
const PROBABILITY_THRESHOLD = 1e-4;
const MIN_MISS_DISTANCE_FOR_PLANNING_KM = 5;
const MANEUVER_TIME_OFFSET_MIN = -30;
const MANEUVER_WINDOW_HOURS = 50;
const MU_EARTH = 398600.4418;

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

// --- Helper functions are unchanged ---
function norm(v) { return Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z); }
function add(v1, v2) { return new Vector3D(v1.x+v2.x, v1.y+v2.y, v1.z+v2.z); }
function sub(v1, v2) { return new Vector3D(v1.x-v2.x, v1.y-v2.y, v1.z-v2.z); }
function scale(v, s) { return new Vector3D(v.x*s, v.y*s, v.z*s); }
function normalize(v) { const n = norm(v); return n === 0 ? new Vector3D(0,0,0) : scale(v, 1/n); }
function rvToElements(r, v) { const rVec = [r.x, r.y, r.z]; const vVec = [v.x, v.y, v.z]; const rMag = Math.hypot(...rVec); const vMag = Math.hypot(...vVec); const h = [rVec[1]*vVec[2]-rVec[2]*vVec[1], rVec[2]*vVec[0]-rVec[0]*vVec[2], rVec[0]*vVec[1]-rVec[1]*vVec[0]]; const rDotV = rVec[0]*vVec[0]+rVec[1]*vVec[1]+rVec[2]*vVec[2]; const eVec = [((vMag*vMag - MU_EARTH/rMag)*rVec[0] - rDotV*vVec[0])/MU_EARTH, ((vMag*vMag - MU_EARTH/rMag)*rVec[1] - rDotV*vVec[1])/MU_EARTH, ((vMag*vMag - MU_EARTH/rMag)*rVec[2] - rDotV*vVec[2])/MU_EARTH]; const e = Math.hypot(...eVec); const energy = vMag*vMag/2 - MU_EARTH/rMag; const a = -MU_EARTH/(2*energy); return { a, e, perigee: a*(1-e), apogee: a*(1+e) }; }


// --- Calculation function rewritten for a robust Linear Model ---
async function findMinimalBurn(primaryAsset, secondaryAsset, burnTime, tca, targetSeparationKm) {
    // 1. Get positions of BOTH satellites at TCA without any maneuver.
    const primaryStateAtTca = primaryAsset.eci(tca);
    const secondaryStateAtTca = secondaryAsset.eci(tca);
    if (!primaryStateAtTca?.position || !secondaryStateAtTca?.position) {
        log(`[ERROR] Could not propagate one or both assets to TCA.`);
        return null;
    }
    const primaryPosAtTca = new Vector3D(primaryStateAtTca.position.x, primaryStateAtTca.position.y, primaryStateAtTca.position.z);
    const secondaryPosAtTca = new Vector3D(secondaryStateAtTca.position.x, secondaryStateAtTca.position.y, secondaryStateAtTca.position.z);

    // 2. Get the primary asset's velocity at the time of the burn.
    const primaryStateAtBurn = primaryAsset.eci(burnTime);
    if (!primaryStateAtBurn?.velocity) {
        log(`[ERROR] Could not propagate primary asset to burn time.`);
        return null;
    }
    const primaryVelAtBurn = new Vector3D(primaryStateAtBurn.velocity.x, primaryStateAtBurn.velocity.y, primaryStateAtBurn.velocity.z);
    const burnDirection = normalize(primaryVelAtBurn); // Maneuvers are most efficient along the velocity vector.
    const dtSeconds = (tca.getTime() - burnTime.getTime()) / 1000;

    // 3. This function now uses a linear model to find the new separation.
    const separation = (dv_mps) => {
        const dv_kps = dv_mps / 1000; // Convert to km/s
        const deltaV_vector = scale(burnDirection, dv_kps); // The change in velocity
        const deltaR_vector = scale(deltaV_vector, dtSeconds); // The resulting change in position (d = v*t)
        
        const newPrimaryPos = add(primaryPosAtTca, deltaR_vector); // The new position after the maneuver
        return newPrimaryPos.distance(secondaryPosAtTca);
    };

    // 4. Use a search algorithm to find the burn that achieves the target separation.
    let lo = 0.0, hi = 0.1;
    while (separation(hi) < targetSeparationKm && hi < 50) { hi *= 2; }
    if (separation(hi) < targetSeparationKm) return null;

    for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (separation(mid) < targetSeparationKm) { lo = mid; } else { hi = mid; }
    }
    return (lo + hi) / 2;
}


// --- Main Planner ---
export async function planManeuvers(scc_number) {
    const primaryDb = await openPrimaryDbForScript();
    const debrisDb = await openDebrisDbForScript();

    const primaryRec = await debrisDb.get('SELECT * FROM satellites WHERE scc_number=?', [scc_number]);
    if (!primaryRec) { return; }
    const primaryAsset = new Satellite(primaryRec);
  
    const conjunctions = await primaryDb.all('SELECT * FROM conjunctions WHERE primary_scc = ? OR secondary_scc = ?', [scc_number, scc_number]);
    if (!conjunctions.length) { return; }

    const updateStmt = await primaryDb.prepare(`UPDATE conjunctions SET required_burn_dv_mps=?, new_apogee_km=?, new_perigee_km=? WHERE id=?`);
    const now = new Date();

    for (const conj of conjunctions) {
        let finalBurn = null, newApogee = null, newPerigee = null;
        const isHighRisk = conj.miss_distance_km < MIN_MISS_DISTANCE_FOR_PLANNING_KM && ((conj.max_prob != null && conj.max_prob >= PROBABILITY_THRESHOLD) || conj.max_prob == null);
        const tca = new Date(conj.tca);
        const hoursToTca = (tca.getTime() - now.getTime()) / 3600000;
        const isUrgent = hoursToTca > 0 && hoursToTca <= MANEUVER_WINDOW_HOURS;

        if (isHighRisk && isUrgent) {
            const secondaryScc = conj.primary_scc === scc_number ? conj.secondary_scc : conj.primary_scc;
            log(`Event #${conj.id} is high-risk. Loading TLE for secondary satellite #${secondaryScc}...`);
            const secondaryRec = await debrisDb.get('SELECT * FROM satellites WHERE scc_number=?', [secondaryScc]);
            if (!secondaryRec) {
                log(`   -> [ERROR] Could not find TLE for secondary satellite #${secondaryScc}.`);
                await updateStmt.run([null, null, null, conj.id]);
                continue;
            }
            const secondaryAsset = new Satellite(secondaryRec);
            log(`   -> Successfully loaded TLE for ${secondaryRec.name}.`);
            const burnTime = new Date(tca.getTime() + MANEUVER_TIME_OFFSET_MIN * 60000);
            
            finalBurn = await findMinimalBurn(primaryAsset, secondaryAsset, burnTime, tca, SAFE_MISS_DISTANCE_KM);
            
            if (finalBurn !== null) {
                // To calculate the new orbit, we simulate the final state at the burn time
                const preBurnState = primaryAsset.eci(burnTime);
                if (preBurnState) {
                    const v = new Vector3D(preBurnState.velocity.x, preBurnState.velocity.y, preBurnState.velocity.z);
                    const postBurnVelocity = add(v, scale(normalize(v), finalBurn / 1000));
                    const elems = rvToElements(preBurnState.position, postBurnVelocity);
                    newApogee = elems.apogee;
                    newPerigee = elems.perigee;
                    log(`    -> Solution Found: Δv=${finalBurn.toFixed(3)} m/s, new orbit ${newPerigee.toFixed(1)} x ${newApogee.toFixed(1)} km`);
                } else {
                    log(`    -> Solution Found but could not calculate new orbit.`);
                }
            } else {
                 log(`    -> Solution NOT Found.`);
            }
        }
        await updateStmt.run([finalBurn, newApogee, newPerigee, conj.id]);
    }

    await updateStmt.finalize();
    await primaryDb.close();
    await debrisDb.close();
    log('Maneuver planning complete.');
}

// --- CLI ---
if (process.argv[1].endsWith('planManeuvers.js')) {
    const scc = parseInt(process.argv[2]);
    if (!scc) { console.error("Usage: node planManeuvers.js <scc_number>"); process.exit(1); }
    planManeuvers(scc).catch(e => {
        console.error("An unhandled error occurred:", e);
    });
}