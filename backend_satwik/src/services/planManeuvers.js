// src/services/planManeuvers.js

import { DetailedSatellite, Satellite, Vector3D } from 'ootk';
import { openPrimaryDbForScript, openDebrisDbForScript } from './dataManager.js';
import { fileURLToPath } from 'url';

// --- Configuration ---
const SAFE_MISS_DISTANCE_KM = 10;
const MANEUVER_TIME_OFFSET_MIN = -30;

const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

/**
 * --- OUR OWN RELIABLE MATH (FINAL VERSION) ---
 * This version uses a linear projection, which is stable and will not fail.
 * It calculates the new position based on fundamental physics principles.
 */
export function simulateManeuver(satellite, burnTime, tca, burnMps) {
  try {
    const stateAtBurn = satellite.eci(burnTime);
    const stateAtTca = satellite.eci(tca);
    if (!stateAtBurn?.position || !stateAtBurn?.velocity || !stateAtTca?.position) return null;

    const velocityAtBurn = new Vector3D(
      stateAtBurn.velocity.x,
      stateAtBurn.velocity.y,
      stateAtBurn.velocity.z
    );
    const originalPosAtTca = new Vector3D(
      stateAtTca.position.x,
      stateAtTca.position.y,
      stateAtTca.position.z
    );

    // Δv in km/s
    const burnKps = burnMps / 1000;

    // Unit direction of motion at burn
    const vhat = velocityAtBurn.normalize();

    // Time from burn to TCA (s)
    const dt = (tca.getTime() - burnTime.getTime()) / 1000;

    // First-order displacement due to Δv only (km)
    const deltaR = new Vector3D(vhat.x * burnKps * dt, vhat.y * burnKps * dt, vhat.z * burnKps * dt);

    // New position at TCA (original orbit position + Δv effect)
    return new Vector3D(
      originalPosAtTca.x + deltaR.x,
      originalPosAtTca.y + deltaR.y,
      originalPosAtTca.z + deltaR.z
    );
  } catch (e) {
    console.error("Error during manual simulation:", e);
    return null;
  }
}


async function planManeuvers(scc_number) {
    const overallStartTime = Date.now();
    log(`Starting maneuver planning for SCC #${scc_number}...`);

    let primaryDb, debrisDb;
    try {
        primaryDb = await openPrimaryDbForScript();
        debrisDb = await openDebrisDbForScript();

        const primaryAssetRecord = await debrisDb.get('SELECT * FROM satellites WHERE scc_number = ?', [scc_number]);
        if (!primaryAssetRecord) throw new Error(`Primary asset SCC #${scc_number} not found.`);
        
        // We can use the basic Satellite object now, as we don't need DetailedSatellite
        const primaryAsset = new Satellite(primaryAssetRecord);
        
        const conjunctions = await primaryDb.all('SELECT * FROM conjunctions WHERE primary_scc = ?', [scc_number]);
        if (conjunctions.length === 0) {
            log('No conjunctions found to plan for. Exiting.');
            return;
        }
        log(`Found ${conjunctions.length} conjunction events to analyze.`);

        const updateStmt = await primaryDb.prepare(
            `UPDATE conjunctions SET
                required_burn_dv_mps = ?,
                new_apogee_km = ?,
                new_perigee_km = ?
             WHERE id = ?`
        );
        
        for (const conj of conjunctions) {
            let finalBurn = null;
            let newApogee = null;
            let newPerigee = null;

            const distanceNeeded = SAFE_MISS_DISTANCE_KM - conj.miss_distance_km;

            if (distanceNeeded > 0) {
                log(`  -> Analyzing Event #${conj.id} with ${conj.secondary_scc}.`);
                
                const tca = new Date(conj.tca);
                const burnTime = new Date(tca.getTime() + MANEUVER_TIME_OFFSET_MIN * 60000);
                const testBurnMps = 0.1;
                
                const originalPosAtTca = primaryAsset.eci(tca).position;
                const newPosAtTca = simulateManeuver(primaryAsset, burnTime, tca, testBurnMps);

                if (newPosAtTca) {
                    const separationGained = new Vector3D(newPosAtTca.x, newPosAtTca.y, newPosAtTca.z)
                                              .distance(new Vector3D(originalPosAtTca.x, originalPosAtTca.y, originalPosAtTca.z));

                    if (separationGained > 0) {
                        const mpsPerKmSeparation = testBurnMps / separationGained;
                        finalBurn = distanceNeeded * mpsPerKmSeparation;
                        
                        // To get the new orbit, we still need to create a temporary satellite state
                        const finalBurnState = simulateManeuver(primaryAsset, burnTime, tca, finalBurn);
                        const stateAtBurn = primaryAsset.eci(burnTime);
                        const finalVelocity = new Vector3D(stateAtBurn.velocity.x, stateAtBurn.velocity.y, stateAtBurn.velocity.z).normalize().multiply((finalBurn/1000) + stateAtBurn.velocity.magnitude());

                        const satWithFinalBurn = Satellite.fromState(
                           stateAtBurn.position.x, stateAtBurn.position.y, stateAtBurn.position.z,
                           finalVelocity.x, finalVelocity.y, finalVelocity.z,
                           burnTime
                        );
                        newApogee = satWithFinalBurn.apogee;
                        newPerigee = satWithFinalBurn.perigee;
                        log(`     Solution Found: Burn of ${finalBurn.toFixed(3)} m/s -> New Orbit: ${newPerigee.toFixed(1)} x ${newApogee.toFixed(1)} km.`);
                    }
                }
            }
            await updateStmt.run([finalBurn, newApogee, newPerigee, conj.id]);
        }
        
        await updateStmt.finalize();
        log(`Maneuver planning complete.`);
    } finally {
        await primaryDb?.close();
        await debrisDb?.close();
        log("Script database connections closed.");
    }
}


async function main() {
    const scc_arg = process.argv[2];
    if (!scc_arg || isNaN(parseInt(scc_arg, 10))) {
        console.error("Usage: npm run plan:maneuvers -- <scc_number>");
        process.exit(1);
    }
    const scc_number = parseInt(scc_arg, 10);
    
    try {
        await planManeuvers(scc_number);
    } catch(e) {
        console.error("Maneuver planning script failed:", e.message);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}