import { openPrimaryDbForScript } from './dataManager.js';
import { planManeuvers } from './planManeuvers.js';

const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

async function runForAllSocratesSatellites() {
    log('--- Starting Scheduled Maneuver Planner ---');
    let primaryDb;
    try {
        primaryDb = await openPrimaryDbForScript();
        
        // Fetch all unique satellite SCC numbers that are part of a public conjunction event.
        // We exclude custom satellites, as they should be planned on-demand.
        const records = await primaryDb.all(`
            SELECT DISTINCT scc
            FROM (
                SELECT primary_scc AS scc FROM conjunctions WHERE max_prob IS NOT NULL
                UNION
                SELECT secondary_scc AS scc FROM conjunctions WHERE max_prob IS NOT NULL
            )
            WHERE scc NOT IN (SELECT scc_number FROM satellites WHERE is_custom = 1)
        `);
        
        const sccNumbers = records.map(r => r.scc);
        log(`Found ${sccNumbers.length} unique satellites from Socrates data to process.`);

        for (const scc of sccNumbers) {
            try {
                log(`-> Planning maneuvers for satellite #${scc}...`);
                // We directly call the exported function now, which is more efficient.
                await planManeuvers(scc);
            } catch (err) {
                console.error(`  [ERROR] Failed to plan maneuvers for #${scc}:`, err.message);
                // Continue to the next satellite even if one fails.
            }
        }
        
        log('--- Scheduled Maneuver Planner Finished ---');
    } catch (err) {
        console.error('A critical error occurred during the maneuver planning process:', err);
        process.exit(1);
    } finally {
        await primaryDb?.close();
        log('Database connection closed.');
    }
}

runForAllSocratesSatellites();