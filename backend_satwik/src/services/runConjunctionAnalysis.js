// backend/src/services/runConjunctionAnalysis.js

import { Satellite, Vector3D } from 'ootk';
import { openPrimaryDbForScript, openDebrisDbForScript } from './dataManager.js';

// --- Configuration ---
const PREDICTION_WINDOW_HOURS = 24;
const PROPAGATION_STEP_S = 120;
const MISS_DISTANCE_THRESHOLD_KM = 5;

const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

async function runAnalysis(scc_number) {
    const overallStartTime = Date.now();
    log(`Starting FAST analysis for SCC #${scc_number}...`);

    let primaryDb, debrisDb;
    try {
        primaryDb = await openPrimaryDbForScript();
        debrisDb = await openDebrisDbForScript();

        const primaryAssetRecord = await debrisDb.get('SELECT * FROM satellites WHERE scc_number = ?', [scc_number]);
        if (!primaryAssetRecord) throw new Error(`Primary asset SCC #${scc_number} not found.`);
        
        const primaryAsset = new Satellite(primaryAssetRecord);
        log(`Primary asset: ${primaryAsset.name} (${primaryAssetRecord.scc_number})`);
        
        const startTimeForDb = new Date().toISOString();
        await primaryDb.run('DELETE FROM conjunctions WHERE primary_scc = ?', [scc_number]);

        log('Performing apogee/perigee filter...');
        const candidates = await debrisDb.all(
            `SELECT scc_number, name, tle1, tle2 FROM satellites WHERE
             scc_number != ? AND
             apogee_km >= ? AND
             perigee_km <= ?`,
            [scc_number, primaryAsset.perigee, primaryAsset.apogee]
        );
        log(`Found ${candidates.length} potential candidates.`);

        let conjunctionsFound = 0;
        // --- THIS IS THE FIX (Part 1) ---
        // The INSERT statement is updated to include the new columns.
        const conjunctionInsertStmt = await primaryDb.prepare(
            `INSERT INTO conjunctions (
                primary_scc, secondary_scc, primary_name, secondary_name, 
                tca, miss_distance_km, relative_speed_km_s, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );

        await primaryDb.exec('BEGIN TRANSACTION;');
        try {
            for (const candidate of candidates) {
                try {
                    const secondaryAsset = new Satellite(candidate);
                    let minDistance = Infinity;
                    let tca = null;
                    const propagationDurationMs = PREDICTION_WINDOW_HOURS * 3600 * 1000;
                    const stepMs = PROPAGATION_STEP_S * 1000;
                    const now = new Date();

                    for (let ms = 0; ms <= propagationDurationMs; ms += stepMs) {
                        const currentTime = new Date(now.getTime() + ms);
                        const primaryPos = primaryAsset.eci(currentTime).position;
                        const secondaryPos = secondaryAsset.eci(currentTime).position;
                        if (!primaryPos || !secondaryPos) continue;
                        const distance = new Vector3D(primaryPos.x, primaryPos.y, primaryPos.z)
                                         .distance(new Vector3D(secondaryPos.x, secondaryPos.y, secondaryPos.z));
                        if (distance < minDistance) {
                            minDistance = distance;
                            tca = currentTime;
                        }
                    }
                    
                    if (minDistance < MISS_DISTANCE_THRESHOLD_KM) {
                        const eci1_at_tca = primaryAsset.eci(tca);
                        const eci2_at_tca = secondaryAsset.eci(tca);
                        if (!eci1_at_tca?.velocity || !eci2_at_tca?.velocity) continue;
            
                        const v1 = new Vector3D(eci1_at_tca.velocity.x, eci1_at_tca.velocity.y, eci1_at_tca.velocity.z);
                        const v2 = new Vector3D(eci2_at_tca.velocity.x, eci2_at_tca.velocity.y, eci2_at_tca.velocity.z);
                        const relativeSpeed = v1.subtract(v2).magnitude();

                        if (relativeSpeed < 0.0001) {
                            log(`  -> DISCARDED: Duplicate TLE detected for #${candidate.scc_number}. Relative speed is zero.`);
                            continue;
                        }

                        log(`!!! High-risk conjunction found with ${candidate.name} (#${candidate.scc_number}) !!!`);
                        log(`    -> TCA: ${tca.toISOString()}, Miss Distance: ${minDistance.toFixed(3)} km, Rel. Speed: ${relativeSpeed.toFixed(2)} km/s`);
                        
                        // --- THIS IS THE FIX (Part 2) ---
                        // We now pass the extra data to the INSERT statement.
                        await conjunctionInsertStmt.run(
                            scc_number, 
                            candidate.scc_number, 
                            primaryAsset.name, 
                            candidate.name,
                            tca.toISOString(), 
                            minDistance, 
                            relativeSpeed, // Storing the speed
                            startTimeForDb
                        );
                        conjunctionsFound++;
                    }

                } catch(e) { /* Instantly skip bad TLEs */ }
            }
            await primaryDb.exec('COMMIT;');
        } catch (e) {
            console.error("Error during transaction, rolling back.", e);
            await primaryDb.exec('ROLLBACK;');
        } finally {
            await conjunctionInsertStmt.finalize();
        }
        
        const overallDuration = (Date.now() - overallStartTime) / 1000;
        log(`Analysis complete. Stored ${conjunctionsFound} high-risk conjunctions. [Total Duration: ${overallDuration.toFixed(2)}s]`);
    } finally {
        await primaryDb?.close();
        await debrisDb?.close();
        log("Script database connections closed.");
    }
}

async function main() {
    const scc_arg = process.argv[2];
    if (!scc_arg || isNaN(parseInt(scc_arg, 10))) {
        console.error("Usage: npm run analyze:conjunctions -- <scc_number>");
        process.exit(1);
    }
    const scc_number = parseInt(scc_arg, 10);
    
    try {
        await runAnalysis(scc_number);
    } catch(e) {
        console.error("Analysis script failed:", e.message);
    }
}

main();