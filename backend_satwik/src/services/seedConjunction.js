import { openPrimaryDbForScript } from './dataManager.js';

const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

// --- High-Quality Test Data ---
// This is a realistic conjunction event that requires a maneuver.
const TEST_CONJUNCTION = {
    primary_scc: 25544, // ISS
    secondary_scc: 90001, // A test object
    primary_name: 'ISS (ZARYA)',
    secondary_name: 'TEST DEBRIS',
    tca: '2025-08-25T12:00:00.000Z', // A predictable future time
    miss_distance_km: 1.25, // Close enough to require a maneuver
    relative_speed_km_s: 10.5, // High speed, typical of a crossing
    created_at: new Date().toISOString()
};

/**
 * The main seeding function.
 */
async function seedDatabase() {
    log('Starting conjunction seeder script...');
    let primaryDb;
    try {
        primaryDb = await openPrimaryDbForScript();
        log('Database connection opened.');

        // 1. Clean up any previous test entry for this specific event
        log(`Deleting any existing event for secondary SCC #${TEST_CONJUNCTION.secondary_scc}...`);
        await primaryDb.run(
            'DELETE FROM conjunctions WHERE primary_scc = ? AND secondary_scc = ?',
            [TEST_CONJUNCTION.primary_scc, TEST_CONJUNCTION.secondary_scc]
        );

        // 2. Prepare the INSERT statement
        const insertStmt = await primaryDb.prepare(
            `INSERT INTO conjunctions (
                primary_scc, secondary_scc, primary_name, secondary_name, 
                tca, miss_distance_km, relative_speed_km_s, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );

        // 3. Insert the single test record
        log('Inserting new test conjunction event...');
        await insertStmt.run(
            TEST_CONJUNCTION.primary_scc,
            TEST_CONJUNCTION.secondary_scc,
            TEST_CONJUNCTION.primary_name,
            TEST_CONJUNCTION.secondary_name,
            TEST_CONJUNCTION.tca,
            TEST_CONJUNCTION.miss_distance_km,
            TEST_CONJUNCTION.relative_speed_km_s,
            TEST_CONJUNCTION.created_at
        );
        log('Test data inserted successfully.');
        
        await insertStmt.finalize();

    } catch (e) {
        console.error("Seeding script failed:", e.message);
    } finally {
        await primaryDb?.close();
        log('Database connection closed.');
    }
}

seedDatabase();
