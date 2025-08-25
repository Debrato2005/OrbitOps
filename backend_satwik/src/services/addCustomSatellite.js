import { Satellite } from 'ootk';
import { openPrimaryDbForScript, openDebrisDbForScript } from './dataManager.js';

const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);

async function addSatellite() {
    const args = process.argv.slice(2);
    if (args.length !== 3) {
        console.error("Usage: node addCustomSatellite.js \"<NAME>\" \"<TLE_LINE_1>\" \"<TLE_LINE_2>\"");
        process.exit(1);
    }

    const [name, tle1, tle2] = args;
    let sat;
    try {
        sat = new Satellite({ name, tle1, tle2 });
    } catch (e) {
        console.error("Error: Invalid TLE data provided.", e.message);
        process.exit(1);
    }

    const scc_number = parseInt(sat.sccNum, 10);
    log(`Processing custom satellite: ${name} (#${scc_number})`);

    const primaryDb = await openPrimaryDbForScript();
    const debrisDb = await openDebrisDbForScript();

    try {
        const satParams = [
            scc_number, sat.name, sat.tle1, sat.tle2,
            sat.toTle().epoch.toDateTime().toISOString(),
            sat.apogee, sat.perigee, sat.inclination,
            1 // is_custom = true
        ];

        // Insert into primary database (for visual list)
        const primaryInsertStmt = await primaryDb.prepare(
            `INSERT INTO satellites (scc_number, name, tle1, tle2, epoch, apogee_km, perigee_km, inclination_deg, is_custom)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(scc_number) DO UPDATE SET
               name=excluded.name, tle1=excluded.tle1, tle2=excluded.tle2, epoch=excluded.epoch,
               is_custom=excluded.is_custom;`
        );
        await primaryInsertStmt.run(satParams);
        await primaryInsertStmt.finalize();
        log(`Successfully added/updated satellite in satellites.db.`);

        // Insert into debris database (for analysis)
        const debrisInsertStmt = await debrisDb.prepare(
            `INSERT INTO satellites (scc_number, name, tle1, tle2, epoch, apogee_km, perigee_km, inclination_deg, rcs_size, country, object_type, is_custom)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(scc_number) DO UPDATE SET
               name=excluded.name, tle1=excluded.tle1, tle2=excluded.tle2, epoch=excluded.epoch,
               is_custom=excluded.is_custom;`
        );
        await debrisInsertStmt.run([...satParams.slice(0, 8), 'UNKNOWN', 'CUSTOM', 'payload', 1]);
        await debrisInsertStmt.finalize();
        log(`Successfully added/updated satellite in debris.db.`);

    } catch (err) {
        console.error("Failed to insert custom satellite into databases:", err);
    } finally {
        await primaryDb.close();
        await debrisDb.close();
        log("Database connections closed.");
    }
}

addSatellite();
