import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { openPrimaryDbForScript, openDebrisDbForScript } from '../services/dataManager.js';
import { Satellite } from 'ootk';

const app = express();
const PORT = process.env.ANALYSIS_PORT || 5001; 

const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5000'],
    credentials: true,
};

app.use(cors(corsOptions)); 
app.use(express.json());

const router = express.Router();

router.get('/conjunctions', async (req, res) => {
    try {
        const db = await openPrimaryDbForScript();
        const conjunctions = await db.all('SELECT * FROM conjunctions ORDER BY tca ASC');
        await db.close();
        res.json({ count: conjunctions.length, conjunctions });
    } catch (err) {
        log(`Error on /conjunctions: ${err.message}`);
        res.status(500).json({ error: "Failed to retrieve conjunction data." });
    }
});

router.get('/conjunctions/:scc_number', async (req, res) => {
    try {
        const { scc_number } = req.params;
        const db = await openPrimaryDbForScript();
        const conjunctions = await db.all(
            'SELECT * FROM conjunctions WHERE primary_scc = ? OR secondary_scc = ? ORDER BY tca ASC',
            [scc_number, scc_number]
        );
        await db.close();
        res.json({ count: conjunctions.length, conjunctions });
    } catch (err) {
        log(`Error on /conjunctions/${req.params.scc_number}: ${err.message}`);
        res.status(500).json({ error: "Failed to retrieve conjunction data for the specified satellite." });
    }
});

router.get('/conjunctions/check/:scc_number', async (req, res) => {
    try {
        const scc_number = parseInt(req.params.scc_number, 10);
        if (isNaN(scc_number)) { return res.status(400).json({ error: 'Invalid SCC number' }); }
        const db = await openPrimaryDbForScript();
        const results = await db.all('SELECT primary_scc, secondary_scc FROM conjunctions WHERE primary_scc = ? OR secondary_scc = ?', [scc_number, scc_number]);
        await db.close();
        const conjunctionCount = results.length;
        const exists = conjunctionCount > 0;
        const isPrimary = exists ? results.some(c => c.primary_scc === scc_number) : false;
        const isSecondary = exists ? results.some(c => c.secondary_scc === scc_number) : false;
        log(`[API Check] SCC #${scc_number}: Found ${conjunctionCount} conjunction(s). IsPrimary: ${isPrimary}, IsSecondary: ${isSecondary}.`);
        res.json({ exists, conjunctionCount, isPrimary, isSecondary });
    } catch (err) {
        log(`Error on /conjunctions/check/${req.params.scc_number}: ${err.message}`);
        res.status(500).json({ error: "Failed to check for conjunctions." });
    }
});


router.get('/satellites/check/:scc_number', async (req, res) => {
    try {
        const { scc_number } = req.params;
        const db = await openDebrisDbForScript();
        const result = await db.get(
            'SELECT COUNT(*) as count FROM satellites WHERE scc_number = ?',
            [scc_number]
        );
        await db.close();
        res.json({ exists: result.count > 0 });
    } catch (err) {
        log(`Error on /satellites/check/${req.params.scc_number}: ${err.message}`);
        res.status(500).json({ error: "Failed to check for satellite existence." });
    }
});

router.post('/satellites/add', async (req, res) => {
    const { noradId, name, tleLine1, tleLine2 } = req.body;
    if (!noradId || !name || !tleLine1 || !tleLine2) { return res.status(400).json({ error: 'Missing satellite data' }); }
    log(`[API Add Satellite] Received request to add/update satellite #${noradId} (${name}) in analysis DB.`);
    try {
        const sat = new Satellite({ name, tle1: tleLine1, tle2: tleLine2 });
        const satParams = [ parseInt(noradId, 10), sat.name, sat.tle1, sat.tle2, sat.toTle().epoch.toDateTime().toISOString(), sat.apogee, sat.perigee, sat.inclination, 1 ];
        const primaryDb = await openPrimaryDbForScript();
        const debrisDb = await openDebrisDbForScript();
        const primaryInsertStmt = `INSERT INTO satellites (scc_number, name, tle1, tle2, epoch, apogee_km, perigee_km, inclination_deg, is_custom) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(scc_number) DO UPDATE SET name=excluded.name, tle1=excluded.tle1, tle2=excluded.tle2, epoch=excluded.epoch, is_custom=excluded.is_custom;`;
        const debrisInsertStmt = `INSERT INTO satellites (scc_number, name, tle1, tle2, epoch, apogee_km, perigee_km, inclination_deg, rcs_size, country, object_type, is_custom) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(scc_number) DO UPDATE SET name=excluded.name, tle1=excluded.tle1, tle2=excluded.tle2, epoch=excluded.epoch, is_custom=excluded.is_custom;`;
        await primaryDb.run(primaryInsertStmt, satParams);
        await debrisDb.run(debrisInsertStmt, [...satParams.slice(0, 8), 'UNKNOWN', 'USER', 'payload', 1]);
        await primaryDb.close();
        await debrisDb.close();
        log(`[API Add Satellite] Successfully synced satellite #${noradId} to local databases.`);
        res.status(200).json({ success: true, message: `Satellite #${noradId} synced.` });
    } catch (err) {
        log(`[ERROR] Failed to sync satellite #${noradId}: ${err.message}`);
        res.status(500).json({ error: 'Failed to sync satellite to analysis database.' });
    }
});

router.post('/plan/:scc_number', (req, res) => {
    const { scc_number } = req.params;
    log(`[API Plan] Received request to plan maneuvers for satellite #${scc_number}.`);
    const planningProcess = spawn('node', ['src/services/planManeuvers.js', scc_number], { detached: true, stdio: 'ignore' });
    planningProcess.on('error', (err) => { log(`[ERROR] Failed to start maneuver planning script for #${scc_number}: ${err.message}`); });
    planningProcess.unref();
    res.status(202).json({ status: 'accepted', message: `Maneuver planning has been initiated for satellite #${scc_number}.` });
});

app.use('/api', router);
app.listen(PORT, () => { log(`🚀 Analysis Engine API Server is running on http://localhost:${PORT}`); });
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }