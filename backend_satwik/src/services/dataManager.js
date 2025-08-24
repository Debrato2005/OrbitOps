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
const DEBRIS_DB_FILE = path.join(DATA_DIR, 'debris.db');
const RAW_TLES_DB_FILE = path.join(DATA_DIR, 'raw_tles.db');

const CELESTRAK_VISUAL_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle';

let primaryDb;
let debrisDb;
let rawTleDb;


// --- Helper Functions for schema and indexes ---

async function setupPrimaryDatabase(db) {
  const schema = `
    CREATE TABLE IF NOT EXISTS satellites (
      scc_number INTEGER PRIMARY KEY, name TEXT, tle1 TEXT NOT NULL, tle2 TEXT NOT NULL,
      epoch DATETIME NOT NULL, apogee_km REAL NOT NULL, perigee_km REAL NOT NULL,
      inclination_deg REAL NOT NULL
    );`;
  await db.exec(schema);
}

/**
 * --- THIS IS THE FIX (Part 1) ---
 * The schema is now simplified to only store the data from the fast analysis.
 */
async function setupConjunctionsDatabase(db) {
  const schema = `
    CREATE TABLE IF NOT EXISTS conjunctions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      primary_scc INTEGER NOT NULL,
      secondary_scc INTEGER NOT NULL,
      primary_name TEXT,
      secondary_name TEXT,
      tca DATETIME NOT NULL,
      miss_distance_km REAL NOT NULL,
      relative_speed_km_s REAL,
      -- --- THIS IS THE FIX ---
      -- We now store the required burn and the resulting safe orbit parameters.
      required_burn_dv_mps REAL,
      new_apogee_km REAL,
      new_perigee_km REAL,
      created_at DATETIME NOT NULL,
      UNIQUE(primary_scc, secondary_scc, tca)
    );
  `;
  await db.exec(schema);
}



async function setupDebrisDatabase(db) {
    const schema = `
      CREATE TABLE IF NOT EXISTS satellites (
        scc_number INTEGER PRIMARY KEY, name TEXT, tle1 TEXT NOT NULL UNIQUE, tle2 TEXT NOT NULL UNIQUE,
        epoch DATETIME NOT NULL, apogee_km REAL NOT NULL, perigee_km REAL NOT NULL,
        inclination_deg REAL NOT NULL,
        rcs_size TEXT, country TEXT, object_type TEXT NOT NULL
      );`;
    await db.exec(schema);
}

async function setupRawTleDatabase(db) {
    const schema = `
    CREATE TABLE IF NOT EXISTS tles (
      scc_number INTEGER PRIMARY KEY,
      name TEXT,
      tle1 TEXT NOT NULL UNIQUE,
      tle2 TEXT NOT NULL UNIQUE,
      rcs_size TEXT,
      country TEXT,
      updated_at DATETIME NOT NULL
    );`;
  await db.exec(schema);
}

/**
 * --- THIS IS THE FIX (Part 2) ---
 * The missing function is now correctly defined.
 */
async function createDbIndexes(db) {
    await db.exec('CREATE INDEX IF NOT EXISTS idx_satellites_orbit ON satellites (perigee_km, apogee_km);');
}


// --- SERVER-SAFE SINGLETON CONNECTIONS ---

export async function connectDb() {
    if (primaryDb) return primaryDb;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    primaryDb = await open({ filename: SATELLITES_DB_FILE, driver: sqlite3.Database });
    await setupPrimaryDatabase(primaryDb);
    await setupConjunctionsDatabase(primaryDb);
    console.log('[Server] Primary database (satellites.db) connection established.');
    return primaryDb;
}

export async function connectDebrisDb() {
    if (debrisDb) return debrisDb;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    debrisDb = await open({ filename: DEBRIS_DB_FILE, driver: sqlite3.Database });
    await setupDebrisDatabase(debrisDb);
    await createDbIndexes(debrisDb);
    console.log('[Server] Debris database (debris.db) connection established.');
    return debrisDb;
}

export async function connectRawTleDb() {
    if (rawTleDb) return rawTleDb;
    fs.mkdirSync(DATA_DIR, { recursive: true });
    rawTleDb = await open({ filename: RAW_TLES_DB_FILE, driver: sqlite3.Database });
    await setupRawTleDatabase(rawTleDb);
    console.log('[Server] Raw TLE database (raw_tles.db) connection established.');
    return rawTleDb;
}


// --- SCRIPT-SAFE INDEPENDENT CONNECTIONS ---

export async function openPrimaryDbForScript() {
    const db = await open({ filename: SATELLITES_DB_FILE, driver: sqlite3.Database });
    await setupPrimaryDatabase(db);
    await setupConjunctionsDatabase(db);
    return db;
}

export async function openDebrisDbForScript() {
    const db = await open({ filename: DEBRIS_DB_FILE, driver: sqlite3.Database });
    await setupDebrisDatabase(db);
    await createDbIndexes(db);
    return db;
}

// --- DATA INGESTION SCRIPT LOGIC ---

async function fetchVisualTleCatalog() {
  console.log(`[Ingest] Fetching TLE catalog from ${CELESTRAK_VISUAL_URL}...`);
  try {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36'
    };
    const response = await fetch(CELESTRAK_VISUAL_URL, { headers });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const tleData = await response.text();
    return tleData.trim().split('\n');
  } catch (error) {
    console.error(`[Ingest] Error fetching visual catalog: ${error.message}`);
    return [];
  }
}

async function parseAndStoreTles(db, tleLines) {
    if (tleLines.length === 0) { console.log('[Ingest] No TLE lines to process for primary DB.'); return; }
    console.log('[Ingest] Parsing and storing TLEs for primary database...');
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
        console.error('[Ingest] Error during primary DB transaction, rolling back.', error);
        await db.exec('ROLLBACK;');
    } finally {
        await insertStmt.finalize();
    }
    console.log(`[Ingest] Ingestion complete. Stored ${processedCount} satellites.`);
}

export async function ingestLatestTles() {
  const db = await connectDb();
  const tleLines = await fetchVisualTleCatalog();
  await parseAndStoreTles(db, tleLines);
}