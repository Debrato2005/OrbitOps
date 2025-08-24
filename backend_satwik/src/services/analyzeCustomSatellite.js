// /*import { Satellite, Vector3D } from 'ootk';
// import { openPrimaryDbForScript, openDebrisDbForScript } from './dataManager.js';

// // --- OPTIMIZED CONFIGURATION ---
// const PREDICTION_WINDOW_HOURS = 24;      // REDUCED: Halves the work.
// const PROPAGATION_STEP_S = 180;          // INCREASED: Reduces work by another 33%.
// const MISS_DISTANCE_THRESHOLD_KM = 10;   // Report anything within 10km.
// const ORBIT_FILTER_TOLERANCE_KM = 100; // Add a buffer to the orbital filter for safety.

// const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

// async function runAnalysis(scc_number) {
//     log(`Starting FAST LOCAL analysis for custom satellite SCC #${scc_number}...`);

//     const primaryDb = await openPrimaryDbForScript();
//     const debrisDb = await openDebrisDbForScript();

//     try {
//         // 1. Fetch our custom satellite
//         const primaryAssetRecord = await debrisDb.get('SELECT * FROM satellites WHERE scc_number = ? AND is_custom = 1', [scc_number]);
//         if (!primaryAssetRecord) throw new Error(`Custom satellite SCC #${scc_number} not found in debris.db.`);
        
//         const primaryAsset = new Satellite(primaryAssetRecord);
//         log(`Primary asset: ${primaryAsset.name} (#${primaryAssetRecord.scc_number})`);
//         log(`  -> Orbit: ${primaryAsset.perigee.toFixed(2)}km x ${primaryAsset.apogee.toFixed(2)}km`);

//         // --- OPTIMIZATION #1: ORBITAL FILTERING ---
//         // Fetch only candidates whose orbits physically overlap with our primary asset's orbit.
//         log('Filtering catalog for satellites with overlapping orbits...');
//         const perigeeWithTolerance = primaryAsset.perigee - ORBIT_FILTER_TOLERANCE_KM;
//         const apogeeWithTolerance = primaryAsset.apogee + ORBIT_FILTER_TOLERANCE_KM;

//         const candidates = await debrisDb.all(
//             `SELECT scc_number, name, tle1, tle2 FROM satellites WHERE
//              scc_number != ? AND
//              apogee_km >= ? AND
//              perigee_km <= ?`,
//             [scc_number, perigeeWithTolerance, apogeeWithTolerance]
//         );
//         log(`Found ${candidates.length} potential candidates after filtering (down from the full catalog). This will be much faster.`);
        
//         // 3. Prepare to insert any findings into the main conjunctions table
//         const conjunctionInsertStmt = await primaryDb.prepare(
//             `INSERT OR IGNORE INTO conjunctions (primary_scc, secondary_scc, primary_name, secondary_name, tca, miss_distance_km, relative_speed_km_s, created_at)
//              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
//         );
        
//         let conjunctionsFound = 0;
//         const startTimeForDb = new Date().toISOString();
//         let checkedCount = 0;

//         for (const candidate of candidates) {
//             // --- OPTIMIZATION #4: PROGRESS FEEDBACK ---
//             checkedCount++;
//             if (checkedCount % 100 === 0) {
//                 log(`  ... checked ${checkedCount} of ${candidates.length} candidates.`);
//             }

//             try {
//                 const secondaryAsset = new Satellite(candidate);
//                 let minDistance = Infinity;
//                 let tca = null;
//                 const propagationDurationMs = PREDICTION_WINDOW_HOURS * 3600 * 1000;
//                 const stepMs = PROPAGATION_STEP_S * 1000;
//                 const now = new Date();

//                 for (let ms = 0; ms <= propagationDurationMs; ms += stepMs) {
//                     const currentTime = new Date(now.getTime() + ms);
//                     const primaryPos = primaryAsset.eci(currentTime).position;
//                     const secondaryPos = secondaryAsset.eci(currentTime).position;
//                     if (!primaryPos || !secondaryPos) continue;

//                     const distance = new Vector3D(primaryPos.x, primaryPos.y, primaryPos.z)
//                                      .distance(new Vector3D(secondaryPos.x, secondaryPos.y, secondaryPos.z));
//                     if (distance < minDistance) {
//                         minDistance = distance;
//                         tca = currentTime;
//                     }
//                 }
                
//                 if (minDistance < MISS_DISTANCE_THRESHOLD_KM) {
//                     const v1 = new Vector3D(primaryAsset.eci(tca).velocity);
//                     const v2 = new Vector3D(secondaryAsset.eci(tca).velocity);
//                     const relativeSpeed = v1.subtract(v2).magnitude();

//                     if (relativeSpeed < 0.0001) continue;

//                     log(`!!! Local conjunction found with ${candidate.name} (#${candidate.scc_number}) !!!`);
//                     log(`    -> TCA: ${tca.toISOString()}, Miss Distance: ${minDistance.toFixed(3)} km`);
                    
//                     await conjunctionInsertStmt.run(
//                         scc_number, candidate.scc_number, primaryAsset.name, candidate.name,
//                         tca.toISOString(), minDistance, relativeSpeed, startTimeForDb
//                     );
//                     conjunctionsFound++;
//                 }
//             } catch(e) { /* Skip bad TLEs */ }
//         }
//         await conjunctionInsertStmt.finalize();
//         log(`Local analysis complete. Added ${conjunctionsFound} potential conjunctions for satellite #${scc_number}.`);

//     } finally {
//         await primaryDb.close();
//         await debrisDb.close();
//     }
// }

// // --- CLI ---
// const scc_arg = process.argv[2];
// if (!scc_arg || isNaN(parseInt(scc_arg, 10))) {
//     console.error("Usage: node src/services/analyzeCustomSatellite.js <scc_number>");
//     process.exit(1);
// }
// runAnalysis(parseInt(scc_arg, 10)).catch(e => console.error("Analysis script failed:", e.message));
// */