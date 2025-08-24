import { Router } from 'express';
import { Satellite } from 'ootk';
import { connectDb, connectDebrisDb } from '../services/dataManager.js';

const router = Router();

router.get('/debris', async (req, res) => {
    try {
        const db = await connectDebrisDb(); // Use the new connection function
        const limit = parseInt(req.query.limit, 10) || 1000;
        const offset = parseInt(req.query.offset, 10) || 0;

        const objects = await db.all(
            `SELECT scc_number, name, epoch, apogee_km, perigee_km, inclination_deg, object_type
             FROM satellites
             ORDER BY scc_number
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        
        const { total } = await db.get('SELECT COUNT(*) as total FROM satellites');

        res.json({
            meta: {
                total,
                limit,
                offset,
                count: objects.length,
            },
            objects,
        });
    } catch (err) {
        console.error('API Error on /api/debris:', err.message);
        res.status(500).json({ error: 'Failed to retrieve debris data.' });
    }
});


/**
 * Propagates every satellite in the database to the current time and returns
 * a snapshot of their positions and velocities. This is for initial scene loading.
 */
router.get('/snapshot', async (req, res) => {
    try {
        const db = await connectDb();
        // Fetch all TLEs from the database
        const allRecords = await db.all('SELECT scc_number, name, tle1, tle2 FROM satellites');

        const now = new Date();
        
        const snapshot = allRecords.map(record => {
            try {
                const sat = new Satellite({ tle1: record.tle1, tle2: record.tle2, name: record.name });
                const eci = sat.eci(now);

                if (!eci || !eci.position) {
                    return null; // Handle propagation failure
                }

                return {
                    scc_number: record.scc_number,
                    name: record.name,
                    r: [eci.position.x, eci.position.y, eci.position.z], // Position vector
                    v: [eci.velocity.x, eci.velocity.y, eci.velocity.z], // Velocity vector
                };
            } catch (e) {
                // Ignore satellites that fail to parse or propagate
                return null;
            }
        }).filter(Boolean); // Filter out any null results from failed propagations

        res.json({
            timestamp: now.toISOString(),
            count: snapshot.length,
            objects: snapshot,
        });

    } catch (err) {
        console.error('API Error on /api/snapshot:', err.message);
        res.status(500).json({ error: 'Failed to generate satellite snapshot.' });
    }
});


/**
 * GET /objects
 * Retrieves a list of all satellites from the database.
 * Supports pagination with `limit` and `offset` query parameters.
 */
router.get('/objects', async (req, res) => {
    try {
        const db = await connectDb();
        const limit = parseInt(req.query.limit, 10) || 1000;
        const offset = parseInt(req.query.offset, 10) || 0;

        const objects = await db.all(
            `SELECT scc_number, name, epoch, apogee_km, perigee_km, inclination_deg
             FROM satellites
             ORDER BY scc_number
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        
        const { total } = await db.get('SELECT COUNT(*) as total FROM satellites');

        res.json({
            meta: {
                total,
                limit,
                offset,
                count: objects.length,
            },
            objects,
        });
    } catch (err) {
        console.error('API Error on /api/objects:', err.message);
        res.status(500).json({ error: 'Failed to retrieve satellite data.' });
    }
});

/**
 * POST /propagate
 * Propagates the orbit for a given satellite and returns its ephemeris.
 * Body: { scc_number, start_iso, duration_s, step_s }
 */
router.post('/propagate', async (req, res) => {
    try {
        const { scc_number, start_iso, duration_s = 3600, step_s = 60 } = req.body;

        if (!scc_number) {
            return res.status(400).json({ error: 'scc_number is required.' });
        }

        const db = await connectDb();
        const record = await db.get('SELECT tle1, tle2 FROM satellites WHERE scc_number = ?', [scc_number]);

        if (!record) {
            return res.status(404).json({ error: `Satellite with SCC number ${scc_number} not found.` });
        }

        const sat = new Satellite({ tle1: record.tle1, tle2: record.tle2 });
        const startDate = start_iso ? new Date(start_iso) : new Date();
        const steps = Math.max(1, Math.ceil(duration_s / step_s));
        
        const positions = [];
        for (let i = 0; i < steps; i++) {
            const time = new Date(startDate.getTime() + i * step_s * 1000);
            const eci = sat.eci(time);
            if (eci && eci.position) {
                positions.push({
                    t: time.toISOString(),
                    r: [eci.position.x, eci.position.y, eci.position.z],
                    v: [eci.velocity.x, eci.velocity.y, eci.velocity.z],
                });
            }
        }
        
        res.json({ scc_number, positions });

    } catch (err) {
        console.error('/api/propagate error:', err.message);
        res.status(500).json({ error: 'An error occurred during propagation.' });
    }
});

export default router;