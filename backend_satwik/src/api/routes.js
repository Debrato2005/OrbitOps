import { Router } from 'express';
import { Satellite } from 'ootk';
import { connectDb, connectDebrisDb, connectRawTleDb } from '../services/dataManager.js';


const router = Router();

router.get('/conjunctions', async (req, res) => {
    try {
        const db = await connectDb();
        const limit = parseInt(req.query.limit, 10) || 100;

        const sortBy = req.query.sortBy || 'max_prob'; // Default sort
        const sortOrder = (req.query.sortOrder || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const allowedSorts = {
            'max_prob': 'max_prob',
            'min_range': 'miss_distance_km',
            'tca': 'tca',
            'rel_speed': 'relative_speed_km_s',
            'ssc': 'primary_scc'
        };

        const orderByColumn = allowedSorts[sortBy] || 'max_prob';
        let orderByClause = `ORDER BY ${orderByColumn} ${sortOrder}`;

        if (sortBy === 'min_range' && sortOrder === 'DESC') {
             orderByClause = `ORDER BY miss_distance_km DESC`;
        } else if (sortBy === 'min_range') {
             orderByClause = `ORDER BY miss_distance_km ASC`;
        }


        if (sortBy === 'ssc') {
            orderByClause = `ORDER BY primary_scc ASC, secondary_scc ASC`;
        }

        const conjunctions = await db.all(
            `SELECT * FROM conjunctions ${orderByClause} LIMIT ?`,
            [limit]
        );

        res.json({ count: conjunctions.length, conjunctions });
    } catch (err) {
        console.error('API Error on /api/conjunctions:', err.message);
        res.status(500).json({ error: 'Failed to retrieve conjunction data.' });
    }
});

/**
 * --- THIS IS THE UPGRADE (Part 2) ---
 * An endpoint to get conjunctions for a SINGLE specified satellite.
 * Perfect for when a user clicks on a specific satellite to get its details.
 */
router.get('/conjunctions/:scc_number', async (req, res) => {
    const scc_number = parseInt(req.params.scc_number, 10);
    if (isNaN(scc_number)) {
        return res.status(400).json({ error: 'Invalid SCC number provided.' });
    }

    try {
        const db = await connectDb();
        
        // This query finds events where the satellite is either primary OR secondary
        const conjunctions = await db.all(
            `SELECT * FROM conjunctions 
             WHERE primary_scc = ? OR secondary_scc = ? 
             ORDER BY tca ASC`, // Always sort a single satellite's events by time
            [scc_number, scc_number]
        );

        res.json({
            source: 'database',
            scc_number,
            count: conjunctions.length,
            conjunctions,
        });

    } catch (err) {
        console.error(`API Error on /api/conjunctions/${scc_number}:`, err.message);
        res.status(500).json({ error: 'Failed to retrieve pre-computed conjunction data.' });
    }
});

router.get('/debris/sorted', async (req, res) => {
    try {
        const db = await connectRawTleDb();
        const limit = parseInt(req.query.limit, 10) || 100;
        const offset = parseInt(req.query.offset, 10) || 0;
        const sortBy = req.query.sortBy || 'scc_number'; // Default sort
        const sortOrder = (req.query.sortOrder || 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

        let orderByClause;

        // Whitelist allowed columns to prevent SQL injection
        switch (sortBy) {
            case 'scc_number':
                orderByClause = `ORDER BY scc_number ${sortOrder}`;
                break;
            case 'rcs':
                // Use a CASE statement for logical sorting of text categories
                orderByClause = `
                    ORDER BY
                        CASE rcs_size
                            WHEN 'LARGE' THEN 1
                            WHEN 'MEDIUM' THEN 2
                            WHEN 'SMALL' THEN 3
                            ELSE 4
                        END ${sortOrder}, scc_number ASC
                `;
                break;
            default:
                orderByClause = `ORDER BY scc_number ${sortOrder}`;
        }
        
        const objects = await db.all(
            `SELECT scc_number, name, rcs_size, country, updated_at FROM tles ${orderByClause} LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        
        const { total } = await db.get('SELECT COUNT(*) as total FROM tles');

        res.json({
            meta: { total, limit, offset, count: objects.length, sortBy, sortOrder },
            objects,
        });
    } catch (err) {
        console.error('API Error on /api/debris/sorted:', err.message);
        res.status(500).json({ error: 'Failed to retrieve sorted debris data.' });
    }
});


router.get('/tles/debris', async (req, res) => {
    try {
        const db = await connectRawTleDb(); // Use the new connection function
        const limit = parseInt(req.query.limit, 10) || 1000;
        const offset = parseInt(req.query.offset, 10) || 0;

        const tles = await db.all(
            `SELECT scc_number, name, tle1, tle2, updated_at
             FROM tles
             ORDER BY scc_number
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        
        const { total } = await db.get('SELECT COUNT(*) as total FROM tles');

        res.json({
            meta: { total, limit, offset, count: tles.length },
            tles,
        });
    } catch (err) {
        console.error('API Error on /api/tles/debris:', err.message);
        res.status(500).json({ error: 'Failed to retrieve raw TLE data.' });
    }
});



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