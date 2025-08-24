import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { Satellite } from 'ootk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'debris.db');

// Space-Track API URLs
const SPACETRACK_LOGIN_URL = 'https://www.space-track.org/ajaxauth/login';
const SPACETRACK_TLE_URL = 'https://www.space-track.org/basicspacedata/query/class/tle_latest/ORDINAL/1/FORMAT/tle';

let db;

/**
 * Logs in to Space-Track.org and returns the session cookie.
 * @returns {Promise<string>} The session cookie required for subsequent requests.
 */
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
    });

    if (!response.ok) {
        throw new Error(`Space-Track login failed: ${response.status} ${response.statusText}`);
    }

    // The session cookie is what we need for authentication
    const cookie = response.headers.get('set-cookie');
    if (!cookie) {
        throw new Error('Login successful, but no session cookie received.');
    }
    
    console.log('Authentication successful.');
    return cookie;
}


/**
 * Fetches the full TLE catalog from Space-Track.
 * @param {string} cookie The session cookie from login.
 * @returns {Promise<string[]>} An array of strings from the TLE file.
 */
async function fetchFullTleCatalog(cookie) {
  console.log(`Fetching full TLE catalog from Space-Track...`);
  try {
    const response = await fetch(SPACETRACK_TLE_URL, {
      headers: { 
        'User-Agent': 'OrbitOps-Debris-Ingestion/1.0',
        'Cookie': cookie 
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch TLE catalog: ${response.status} ${response.statusText}`);
    }
    const tleData = await response.text();
    return tleData.trim().split('\n');
  } catch (error) {
    console.error('Error fetching catalog:', error.message);
    return [];
  }
}

// --- The rest of the script is the same as before ---

export async function connectDb() {
    if (db) return db;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    db = await open({ filename: DB_FILE, driver: sqlite3.Database });
    return db;
}

export async function setupDatabase(db) {
  console.log('Setting up debris database schema...');
  const schema = `
    CREATE TABLE IF NOT EXISTS satellites (
      scc_number INTEGER PRIMARY KEY, name TEXT, tle1 TEXT NOT NULL, tle2 TEXT NOT NULL,
      epoch DATETIME NOT NULL, apogee_km REAL NOT NULL, perigee_km REAL NOT NULL,
      inclination_deg REAL NOT NULL, object_type TEXT NOT NULL
    );`;
  await db.exec(schema);
  console.log('Debris database schema is ready.');
}

function classifyObjectType(name) {
    const upperName = name.toUpperCase();
    if (upperName.includes(' DEB') || upperName.includes('OBJECT')) return 'debris';
    if (upperName.includes(' R/B')) return 'rocket_body';
    if (upperName.length > 0) return 'payload';
    return 'unknown';
}

async function parseAndStoreAllTles(db, tleLines) {
    if (tleLines.length === 0) { console.log('No TLE lines to process.'); return; }
    console.log(`Parsing and storing approximately ${Math.floor(tleLines.length / 2)} objects...`);
    let processedCount = 0;
    const insertStmt = await db.prepare(
        `INSERT INTO satellites (scc_number, name, tle1, tle2, epoch, apogee_km, perigee_km, inclination_deg, object_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(scc_number) DO UPDATE SET
           name=excluded.name, tle1=excluded.tle1, tle2=excluded.tle2, epoch=excluded.epoch,
           apogee_km=excluded.apogee_km, perigee_km=excluded.perigee_km, inclination_deg=excluded.inclination_deg,
           object_type=excluded.object_type;`
    );
    try {
        await db.exec('BEGIN TRANSACTION;');
        // Space-Track TLEs do not have a name line, so we process every two lines
        for (let i = 0; i < tleLines.length; i += 2) {
            const tle1 = tleLines[i]?.trim();
            const tle2 = tleLines[i + 1]?.trim();
            if (!tle1 || !tle2 || !tle1.startsWith('1 ') || !tle2.startsWith('2 ')) continue;
            try {
                // The name is not included in the Space-Track file, so we'll leave it blank for now
                const sat = new Satellite({ tle1, tle2, name: 'UNKNOWN' });
                const objectType = classifyObjectType(sat.name); // Will be 'payload' or 'unknown'
                await insertStmt.run([
                    parseInt(sat.sccNum, 10), sat.name, sat.tle1, sat.tle2,
                    sat.toTle().epoch.toDateTime().toISOString(), sat.apogee, sat.perigee, sat.inclination,
                    objectType
                ]);
                processedCount++;
            } catch (error) { /* Skip invalid TLEs */ }
        }
        await db.exec('COMMIT;');
    } catch (error) {
        console.error('Error during database transaction, rolling back.', error);
        await db.exec('ROLLBACK;');
    } finally {
        await insertStmt.finalize();
    }
    console.log(`Ingestion complete. Processed and stored ${processedCount} objects into debris.db.`);
}

/**
 * Main function to orchestrate the full catalog ingestion from Space-Track.
 */
async function main() {
  let dbConnection;
  try {
    const cookie = await loginToSpaceTrack();
    dbConnection = await connectDb();
    await setupDatabase(dbConnection);
    const tleLines = await fetchFullTleCatalog(cookie);
    await parseAndStoreAllTles(dbConnection, tleLines);
  } catch (err) {
    console.error('An error occurred during the Space-Track ingestion process:', err);
  } finally {
    await dbConnection?.close();
    console.log('Debris database connection closed.');
  }
}

// Run the main function
main();
