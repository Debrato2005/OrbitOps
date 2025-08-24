// backend/src/services/dataManager.js

import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { Satellite } from 'ootk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'satellites.db');
const CELESTRAK_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle';

let db;

export async function connectDb() {
    if (db) return db;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    db = await open({
        filename: DB_FILE,
        driver: sqlite3.Database,
    });
    return db;
}

export async function setupDatabase(db) {
    console.log('Setting up database schema...');
    const schema = `
      CREATE TABLE IF NOT EXISTS satellites (
        scc_number INTEGER PRIMARY KEY,
        name TEXT,
        tle1 TEXT NOT NULL,
        tle2 TEXT NOT NULL,
        epoch DATETIME NOT NULL,
        apogee_km REAL NOT NULL,
        perigee_km REAL NOT NULL,
        inclination_deg REAL NOT NULL
      );
    `;
    await db.exec(schema);
    console.log('Database schema is ready.');
}

async function fetchTleCatalog() {
  console.log(`Fetching TLE catalog from ${CELESTRAK_URL}...`);
  try {
    const response = await fetch(CELESTRAK_URL, { headers: { 'User-Agent': 'OrbitOps-Ingestion-Script/1.0' } });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const tleData = await response.text();
    return tleData.trim().split('\n');
  } catch (error) {
    console.error('Error fetching catalog:', error.message);
    return [];
  }
}

async function parseAndStoreTles(db, tleLines) {
    if (tleLines.length === 0) {
        console.log('No TLE lines to process. Exiting.');
        return;
    }
    console.log('Parsing and storing TLEs...');
    let processedCount = 0;
    let skippedCount = 0;
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
            if (!line.startsWith('1 ') && !line.startsWith('2 ')) {
                currentName = line;
                continue;
            }
            if (line.startsWith('1 ')) {
                const tle1 = line;
                const tle2 = tleLines[i + 1]?.trim();
                if (!tle2 || !tle2.startsWith('2 ')) { skippedCount++; continue; }
                i++;
                try {
                    const sat = new Satellite({ name: currentName, tle1, tle2 });
                    await insertStmt.run([
                        parseInt(sat.sccNum, 10), sat.name, sat.tle1, sat.tle2,
                        sat.toTle().epoch.toDateTime().toISOString(), sat.apogee, sat.perigee, sat.inclination,
                    ]);
                    processedCount++;
                } catch (error) { skippedCount++; }
            }
        }
        await db.exec('COMMIT;');
    } catch (error) {
        console.error('Error during database transaction, rolling back changes.', error);
        await db.exec('ROLLBACK;');
    } finally {
        await insertStmt.finalize();
    }
    console.log(`Ingestion complete. Processed and stored ${processedCount} satellites.`);
    if (skippedCount > 0) console.log(`Skipped ${skippedCount} malformed or incomplete TLEs.`);
}

/**
 * Main function to orchestrate the ingestion process.
 * Renamed from runIngestion to match the import in index.js.
 */
export async function ingestLatestTles() {
  const db = await connectDb();
  // We don't need to call setupDatabase here, as the main server will do it.
  const tleLines = await fetchTleCatalog();
  await parseAndStoreTles(db, tleLines);
}

// This block allows the script to be run directly from the command line
if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log("Running manual ingestion...");
  // Connect and setup DB if running standalone
  connectDb().then(db => setupDatabase(db)).then(ingestLatestTles).then(() => {
    console.log("Manual ingestion finished.");
    db?.close();
  }).catch(err => {
    console.error("Manual ingestion failed:", err);
    db?.close();
  });
}