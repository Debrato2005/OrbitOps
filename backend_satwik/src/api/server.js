// server.js
// This is the dedicated API server for the Analysis Engine.
// It listens for on-demand requests from the main application backend.

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { openPrimaryDbForScript } from '../services/dataManager.js';

const app = express();
// Use a different port to avoid conflict with your other backend
const PORT = process.env.ANALYSIS_PORT || 5001; 

app.use(cors({
    origin: 'http://localhost:5173', // Allow frontend origin
    credentials: true
})); 
app.use(express.json());

const router = express.Router();

// --- API Endpoints ---

// API 1: Get ALL conjunction data
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

// API 2: Get conjunction data for a SPECIFIC satellite
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

// // API 3: The ON-DEMAND ANALYSIS TRIGGER
// router.post('/analyze/:scc_number', async (req, res) => {
//     try {
//         const { scc_number } = req.params;
//         const db = await openPrimaryDbForScript();

//         const existingEvents = await db.get(
//             'SELECT COUNT(*) as count FROM conjunctions WHERE (primary_scc = ? OR secondary_scc = ?) AND max_prob IS NOT NULL',
//             [scc_number, scc_number]
//         );
//         await db.close();

//         if (existingEvents.count === 0) {
//             log(`[API] No Socrates data for #${scc_number}. Triggering on-demand local analysis...`);
            
//             const analysisProcess = spawn('node', [
//                 'src/services/analyzeCustomSatellite.js',
//                 scc_number
//             ], { detached: true, stdio: 'ignore' });
//             analysisProcess.unref();

//             res.status(202).json({ 
//                 status: 'accepted', 
//                 message: `No public conjunction data found. On-demand analysis started for satellite #${scc_number}. Results will be available shortly.`
//             });
//         } else {
//             log(`[API] Socrates data already exists for #${scc_number}. No on-demand analysis needed.`);
//             res.status(200).json({ 
//                 status: 'ok', 
//                 message: 'Public conjunction data is already available for this satellite.'
//             });
//         }
//     } catch (err) {
//         log(`Error on /analyze/${req.params.scc_number}: ${err.message}`);
//         res.status(500).json({ error: "An error occurred while triggering the analysis." });
//     }
// });

// API 4: The ON-DEMAND MANEUVER PLANNING TRIGGER
router.post('/plan/:scc_number', (req, res) => {
    const { scc_number } = req.params;
    log(`[API] Received request to plan maneuvers for satellite #${scc_number}.`);

    const planningProcess = spawn('node', [
        'src/services/planManeuvers.js',
        scc_number
    ], { detached: true, stdio: 'ignore' });

    planningProcess.on('error', (err) => {
        log(`[ERROR] Failed to start maneuver planning script for #${scc_number}: ${err.message}`);
    });
    
    planningProcess.unref();

    res.status(202).json({
        status: 'accepted',
        message: `Maneuver planning has been initiated for satellite #${scc_number}. Conjunction data will be updated with results.`
    });
});


// --- Server Setup ---
app.use('/api', router);

app.listen(PORT, () => {
    log(`🚀 Analysis Engine API Server is running on http://localhost:${PORT}`);
});

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
