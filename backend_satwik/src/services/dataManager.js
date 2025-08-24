// backend/src/services/dataManager.js

import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { Satellite } from 'ootk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const SATELLITES_DB_FILE = path.join(DATA_DIR, 'satellites.db');
const DEBRIS_DB_FILE = path.join(DATA_DIR, 'debris.db'); // Path to the new DB

const CELESTRAK_VISUAL_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle';

let primaryDb;
let debrisDb;

/**
 * Connects to the PRIMARY SQLite database (satellites.db).
 */
export async function connectDb() {
    if (primaryDb) return primaryDb;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    primaryDb = await open({
        filename: SATELLITES_DB_FILE,
        driver: sqlite3.Database,
    });
    return primaryDb;
}

/**
 * --- THIS IS THE MISSING FUNCTION ---
 * Connects to the DEBRIS SQLite database (debris.db).
 */
export async function connectDebrisDb() {
    if (debrisDb) return debrisDb;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    debrisDb = await open({
        filename: DEBRIS_DB_FILE,
        driver: sqlite3.Database,
    });
    return debrisDb;
}

/**
 * Sets up the database schema for the primary satellite catalog.
 */
export async function setupDatabase(db) {
  console.log('Setting up primary database schema...');
  const schema = `
    CREATE TABLE IF NOT EXISTS satellites (
      scc_number INTEGER PRIMARY KEY, name TEXT, tle1 TEXT NOT NULL, tle2 TEXT NOT NULL,
      epoch DATETIME NOT NULL, apogee_km REAL NOT NULL, perigee_km REAL NOT NULL,
      inclination_deg REAL NOT NULL
    );`;
  await db.exec(schema);
  console.log('Primary database schema is ready.');
}

async function fetchVisualTleCatalog() {
  console.log(`Fetching TLE catalog from ${CELESTRAK_VISUAL_URL}...`);
  try {
    const response = await fetch(CELESTRAK_VISUAL_URL, { headers: { 'User-Agent': 'OrbitOps-Ingestion-Script/1.0' } });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const tleData = await response.text();
    return tleData.trim().split('\n');
  } catch (error) {
    console.error('Error fetching visual catalog:', error.message);
    return [];
  }
}

async function parseAndStoreTles(db, tleLines) {
    if (tleLines.length === 0) { console.log('No TLE lines to process.'); return; }
    console.log('Parsing and storing TLEs for primary database...');
    let processedCount = 0;
    const insertStmt = await db.prepare(
        `INSERT INTO satellites (scc_number, name, tle1, tle2, epoch, apogee_km, perigee_km, inclination_deg)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(scc_number) DO UPDATE SET
           name=excluded.name, tle1=excluded.tle1, tle2=excluded.tle2, epoch=excluded.epoch,
           apogee_km=excluded.apogee_km, perigee_km=excluded.perigee_km, inclination_deg=excluded.inclination_deg;`
    );
    let currentName = 'UNKNOWN';
    try {
        await db.exec('BEGIN TRANSACTION;');
        for (let i = 0; i < tleLines.length; i++) {
            const line = tleLines[i].trim();
            if (!line.startsWith('1 ') && !line.startsWith('2 ')) { currentName = line; continue; }
            if (line.startsWith('1 ')) {
                const tle1 = line;
                const tle2 = tleLines[i + 1]?.trim();
                if (!tle2 || !tle2.startsWith('2 ')) continue;
                i++;
                try {
                    const sat = new Satellite({ name: currentName, tle1, tle2 });
                    await insertStmt.run([
                        parseInt(sat.sccNum, 10), sat.name, sat.tle1, sat.tle2,
                        sat.toTle().epoch.toDateTime().toISOString(), sat.apogee, sat.perigee, sat.inclination,
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
    console.log(`Ingestion complete. Processed and stored ${processedCount} satellites.`);
}

/**
 * Main function to orchestrate the ingestion process for the primary visual satellite catalog.
 */
export async function ingestLatestTles() {
  const db = await connectDb();
  const tleLines = await fetchVisualTleCatalog();
  await parseAndStoreTles(db, tleLines);
}