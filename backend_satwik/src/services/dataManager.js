import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const SATELLITES_DB_FILE = path.join(DATA_DIR, 'satellites.db');
const DEBRIS_DB_FILE = path.join(DATA_DIR, 'debris.db');


// --- Schema and Index Helper Functions ---

async function setupPrimaryDatabase(db) {
  const schema = `
    CREATE TABLE IF NOT EXISTS satellites (
      scc_number INTEGER PRIMARY KEY, name TEXT, tle1 TEXT NOT NULL, tle2 TEXT NOT NULL,
      epoch DATETIME NOT NULL, apogee_km REAL NOT NULL, perigee_km REAL NOT NULL,
      inclination_deg REAL NOT NULL,
      is_custom BOOLEAN DEFAULT 0
    );`;
  await db.exec(schema);
}

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
      max_prob REAL, -- Added to store the probability from Socrates
      required_burn_dv_mps REAL,
      new_apogee_km REAL,
      new_perigee_km REAL,
      created_at DATETIME NOT NULL,
      UNIQUE(primary_scc, secondary_scc, tca)
    );
  `;
  await db.exec(schema);
  // Index for faster lookups by a single satellite
  await db.exec('CREATE INDEX IF NOT EXISTS idx_conjunctions_scc ON conjunctions (primary_scc, secondary_scc);');
}

async function setupDebrisDatabase(db) {
    const schema = `
      CREATE TABLE IF NOT EXISTS satellites (
        scc_number INTEGER PRIMARY KEY, name TEXT, tle1 TEXT NOT NULL UNIQUE, tle2 TEXT NOT NULL UNIQUE,
        epoch DATETIME NOT NULL, apogee_km REAL NOT NULL, perigee_km REAL NOT NULL,
        inclination_deg REAL NOT NULL,
        rcs_size TEXT, country TEXT, object_type TEXT NOT NULL,
        is_custom BOOLEAN DEFAULT 0
      );`;
    await db.exec(schema);
    await db.exec('CREATE INDEX IF NOT EXISTS idx_satellites_orbit ON satellites (perigee_km, apogee_km);');
}


// --- SERVER-SAFE SINGLETON CONNECTIONS (For API Server) ---

let primaryDb;
let debrisDb;

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
    console.log('[Server] Debris database (debris.db) connection established.');
    return debrisDb;
}

// --- SCRIPT-SAFE INDEPENDENT CONNECTIONS (For Ingestion & Analysis Scripts) ---

export async function openPrimaryDbForScript() {
    const db = await open({ filename: SATELLITES_DB_FILE, driver: sqlite3.Database });
    await setupPrimaryDatabase(db);
    await setupConjunctionsDatabase(db);
    return db;
}

export async function openDebrisDbForScript() {
    const db = await open({ filename: DEBRIS_DB_FILE, driver: sqlite3.Database });
    await setupDebrisDatabase(db);
    return db;
}
