// backend/src/scripts/ingestDebris.js

import { Satellite } from 'ootk';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { connectDebrisDb } from './dataManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const SPACETRACK_LOGIN_URL = 'https://www.space-track.org/ajaxauth/login';
const SPACETRACK_TLE_URL = 'https://www.space-track.org/basicspacedata/query/class/gp/orderby/NORAD_CAT_ID/format/tle';
const SPACETRACK_SATCAT_URL = 'https://www.space-track.org/basicspacedata/query/class/satcat/orderby/NORAD_CAT_ID/format/json';


async function loginToSpaceTrack() {
    console.log('Authenticating with Space-Track.org...');
    const identity = process.env.SPACETRACK_IDENTITY;
    const password = process.env.SPACETRACK_PASSWORD;

    if (!identity || !password) {
        throw new Error('SPACETRACK_IDENTITY and SPACETRACK_PASSWORD must be set in the .env file.');
    }

    const response = await fetch(SPACETRACK_LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `identity=${encodeURIComponent(identity)}&password=${encodeURIComponent(password)}`,
        signal: AbortSignal.timeout(30000), 
    });

    if (!response.ok) {
        throw new Error(`Space-Track login failed: ${response.status} ${response.statusText}`);
    }
    const cookie = response.headers.get('set-cookie');
    if (!cookie) {
        throw new Error('Login successful, but no session cookie received.');
    }
    console.log('Authentication successful.');
    return cookie;
}


async function fetchSatcatData(cookie) {
    console.log('Fetching Satellite Catalog (SATCAT) from Space-Track...');
    const response = await fetch(SPACETRACK_SATCAT_URL, {
        headers: { 'User-Agent': 'OrbitOps-Debris-Ingestion/1.0', 'Cookie': cookie },
        signal: AbortSignal.timeout(120000), 
    });
    if (!response.ok) throw new Error(`SATCAT fetch failed: ${response.status}`);
    const satcatData = await response.json();
    const satcatMap = new Map();
    for (const entry of satcatData) {
        satcatMap.set(parseInt(entry.NORAD_CAT_ID, 10), {
            rcs_size: entry.RCS_SIZE || 'UNKNOWN',
            country: entry.COUNTRY_CODE || 'N/A'
        });
    }
    console.log(`Successfully fetched metadata for ${satcatMap.size} objects.`);
    return satcatMap;
}


async function fetchFullTleCatalog(cookie) {
    console.log(`Fetching full TLE catalog from Space-Track...`);
    const response = await fetch(SPACETRACK_TLE_URL, {
        headers: { 'User-Agent': 'OrbitOps-Debris-Ingestion/1.0', 'Cookie': cookie },
        signal: AbortSignal.timeout(300000),
    });
    if (!response.ok) throw new Error(`TLE catalog fetch failed: ${response.status}`);
    const tleData = await response.text();
    return tleData.trim().split('\n');
}

function classifyObjectType(name) {
    const upperName = name.toUpperCase();
    if (upperName.includes(' DEB') || upperName.includes('OBJECT')) return 'debris';
    if (upperName.includes(' R/B')) return 'rocket_body';
    if (upperName.length > 0) return 'payload';
    return 'unknown';
}

// --- THIS IS THE FIX --- Updated the function to handle the new column
async function parseAndStoreAllTles(db, tleLines, satcatMap) {
    if (tleLines.length === 0) { console.log('No TLE lines to process.'); return; }
    console.log(`Parsing and storing approximately ${Math.floor(tleLines.length / 2)} objects...`);
    let processedCount = 0;

    const insertStmt = await db.prepare(
        `INSERT INTO satellites (scc_number, name, tle1, tle2, epoch, apogee_km, perigee_km, inclination_deg, rcs_size, country, object_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(scc_number) DO UPDATE SET
           name=excluded.name, tle1=excluded.tle1, tle2=excluded.tle2, epoch=excluded.epoch,
           apogee_km=excluded.apogee_km, perigee_km=excluded.perigee_km, inclination_deg=excluded.inclination_deg,
           rcs_size=excluded.rcs_size, country=excluded.country, object_type=excluded.object_type;`
    );

    let currentName = 'UNKNOWN'; // Placeholder, as raw TLE dumps often lack names
    try {
        await db.exec('BEGIN TRANSACTION;');
        for (let i = 0; i < tleLines.length; i += 2) {
            const tle1 = tleLines[i].trim();
            const tle2 = tleLines[i + 1]?.trim();

            if (tle1.startsWith('1 ') && tle2 && tle2.startsWith('2 ')) {
                try {
                    const scc_number = parseInt(tle1.substring(2, 7), 10);
                    const sat = new Satellite({ name: `OBJECT ${scc_number}`, tle1, tle2 });
                    const satcatEntry = satcatMap.get(scc_number) || { rcs_size: 'UNKNOWN', country: 'N/A' };
                    const objectType = classifyObjectType(currentName); // Simple classification
                    
                    await insertStmt.run([
                        scc_number, currentName, tle1, tle2, 
                        sat.toTle().epoch.toDateTime().toISOString(), sat.apogee, sat.perigee, 
                        sat.inclination, // <-- PASSING THE NEW DATA
                        satcatEntry.rcs_size, satcatEntry.country, objectType
                    ]);
                    processedCount++;
                } catch (error) { /* Skip invalid TLEs */ }
            }
        }
        await db.exec('COMMIT;');
    } catch (error) {
        console.error('Error during database transaction, rolling back.', error);
        await db.exec('ROLLBACK;');
    } finally {
        await insertStmt.finalize();
    }
    console.log(`Ingestion complete. Stored ${processedCount} objects into debris.db.`);
}


async function main() {
  let db;
  try {
    db = await connectDebrisDb(); 
    const cookie = await loginToSpaceTrack();
    
    const [satcatMap, tleLines] = await Promise.all([
        fetchSatcatData(cookie),
        fetchFullTleCatalog(cookie)
    ]);

    await parseAndStoreAllTles(db, tleLines, satcatMap);

  } catch (err) {
    console.error('An error occurred during the debris ingestion process:', err);
  } finally {
    console.log('Debris ingestion script finished.');
  }
}

main();