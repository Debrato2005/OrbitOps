// src/services/ingestFromApi.js
// --- FINAL CORRECTED VERSION ---

import { Satellite } from 'ootk';
import { openPrimaryDbForScript, openDebrisDbForScript } from './dataManager.js';

const API_BASE_URL = 'https://api.keeptrack.space/v2';
const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

async function ingestVisualSatellites(db) {
    log('Starting ingestion for Visual Satellite Catalog...');
    const response = await fetch(`${API_BASE_URL}/sats/celestrak`);
    if (!response.ok) throw new Error(`API returned status ${response.status}`);
    const satellites = await response.json();
    const insertStmt = await db.prepare(
        `INSERT INTO satellites (scc_number, name, tle1, tle2, epoch, apogee_km, perigee_km, inclination_deg)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(scc_number) DO UPDATE SET
           name=excluded.name, tle1=excluded.tle1, tle2=excluded.tle2, epoch=excluded.epoch,
           apogee_km=excluded.apogee_km, perigee_km=excluded.perigee_km, inclination_deg=excluded.inclination_deg
         WHERE is_custom = 0;`
    );
    await db.exec('BEGIN TRANSACTION;');
    for (const satData of satellites) {
        try {
            const sat = new Satellite({ name: satData.name, tle1: satData.tle1, tle2: satData.tle2 });
            await insertStmt.run(
                parseInt(sat.sccNum, 10), sat.name, sat.tle1, sat.tle2,
                sat.toTle().epoch.toDateTime().toISOString(), sat.apogee, sat.perigee, sat.inclination
            );
        } catch (e) { /* Skip invalid TLEs */ }
    }
    await db.exec('COMMIT;');
    await insertStmt.finalize();
    log(`Successfully ingested ${satellites.length} satellites into satellites.db.`);
}

/**
 * Ingests high-risk conjunction data from the Socrates service.
 * @param {import('sqlite').Database} db The database connection object.
 */
async function ingestConjunctions(db) {
    log('Starting ingestion for Socrates Conjunction Data...');
    const response = await fetch(`${API_BASE_URL}/socrates/latest`);
    if (!response.ok) throw new Error(`API returned status ${response.status}`);
    
    // --- THIS IS THE CORRECTED LOGIC ---
    // We expect the response to be the array directly.
    const conjunctions = await response.json();

    // The only check we need is if it's a valid array.
    if (!Array.isArray(conjunctions)) {
        log('Warning: Socrates API response was not a valid array. Skipping ingestion for this cycle.');
        return; // Exit gracefully
    }

    if (conjunctions.length === 0) {
        log('Socrates API reported 0 high-risk conjunction events at this time. Skipping ingestion.');
        return;
    }

    const result = await db.run(
        `DELETE FROM conjunctions WHERE primary_scc NOT IN (SELECT scc_number FROM satellites WHERE is_custom = 1)`
    );
    log(`Clearing ${result.changes} old public conjunctions.`);

    const insertStmt = await db.prepare(
        `INSERT OR REPLACE INTO conjunctions (primary_scc, secondary_scc, primary_name, secondary_name, tca, miss_distance_km, relative_speed_km_s, max_prob, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const now = new Date().toISOString();
    await db.exec('BEGIN TRANSACTION;');
    for (const c of conjunctions) {
        await insertStmt.run(
            c.SAT1, c.SAT2, c.SAT1_NAME, c.SAT2_NAME,
            c.TOCA, c.MIN_RNG, c.REL_SPEED, c.MAX_PROB, now
        );
    }
    await db.exec('COMMIT;');
    await insertStmt.finalize();
    log(`Successfully ingested ${conjunctions.length} public conjunction events into satellites.db.`);
}


function classifyObjectType(name) {
    const upperName = name.toUpperCase();
    if (upperName.includes(' DEB') || upperName.includes('OBJECT')) return 'debris';
    if (upperName.includes(' R/B')) return 'rocket_body';
    if (upperName.length > 0) return 'payload';
    return 'unknown';
}

async function ingestFullSatelliteCatalog(db) {
    log('Starting ingestion for Full Satellite Catalog (this may take a moment)...');
    const response = await fetch(`${API_BASE_URL}/sats`);
    if (!response.ok) throw new Error(`API returned status ${response.status}`);
    const satellites = await response.json();
    const insertStmt = await db.prepare(
        `INSERT INTO satellites (scc_number, name, tle1, tle2, epoch, apogee_km, perigee_km, inclination_deg, rcs_size, country, object_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(scc_number) DO UPDATE SET
           name=excluded.name, tle1=excluded.tle1, tle2=excluded.tle2, epoch=excluded.epoch,
           apogee_km=excluded.apogee_km, perigee_km=excluded.perigee_km, inclination_deg=excluded.inclination_deg,
           rcs_size=excluded.rcs_size, country=excluded.country, object_type=excluded.object_type
         WHERE is_custom = 0;`
    );
    await db.exec('BEGIN TRANSACTION;');
    for (const satData of satellites) {
        try {
            const sat = new Satellite({ name: satData.name, tle1: satData.tle1, tle2: satData.tle2 });
            const objectType = classifyObjectType(sat.name);
            await insertStmt.run(
                parseInt(sat.sccNum, 10), sat.name, sat.tle1, sat.tle2,
                sat.toTle().epoch.toDateTime().toISOString(), sat.apogee, sat.perigee, sat.inclination,
                satData.rcs, satData.country, objectType
            );
        } catch (e) { /* Skip invalid TLEs */ }
    }
    await db.exec('COMMIT;');
    await insertStmt.finalize();
    log(`Successfully ingested ${satellites.length} objects into debris.db.`);
}

async function main() {
    log('--- Starting OrbitOps Data Ingestion from KeepTrack API ---');
    let primaryDb, debrisDb;
    try {
        primaryDb = await openPrimaryDbForScript();
        debrisDb = await openDebrisDbForScript();
        await ingestVisualSatellites(primaryDb);
        await ingestConjunctions(primaryDb);
        await ingestFullSatelliteCatalog(debrisDb);
        log('--- Data Ingestion Complete ---');
    } catch (err) {
        console.error('An error occurred during the ingestion process:', err);
        process.exit(1);
    } finally {
        await primaryDb?.close();
        await debrisDb?.close();
        log('Database connections closed.');
    }
}

main();