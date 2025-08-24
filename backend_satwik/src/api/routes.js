// src/api/routes.js

import { Router } from 'express';

const router = Router();
const API_BASE_URL = 'https://api.keeptrack.space/v2';

/**
 * A helper function to fetch data from the KeepTrack API and handle errors.
 * @param {string} endpoint The API endpoint to call (e.g., '/socrates/latest').
 * @returns {Promise<any>} The JSON response from the API.
 * @throws {Error} If the fetch operation fails.
 */
async function fetchFromKeepTrack(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) {
            // Log the error for debugging on the server
            const errorBody = await response.text();
            console.error(`KeepTrack API Error (${response.status}): ${errorBody}`);
            throw new Error(`Failed to fetch data from KeepTrack API. Status: ${response.status}`);
        }
        return await response.json();
    } catch (err) {
        console.error(`Network or parsing error when calling KeepTrack API: ${err.message}`);
        throw err; // Re-throw to be caught by the route's error handler
    }
}

/**
 * --- REWRITTEN ---
 * Fetches pre-computed conjunction data directly from the Socrates service via KeepTrack.
 * Implements server-side sorting and limiting as the API does not support it.
 */
router.get('/conjunctions', async (req, res) => {
    try {
        // 1. Fetch ALL latest conjunctions from the API
        const socratesData = await fetchFromKeepTrack('/socrates/latest');
        
        // The API returns an object with a single key which is an array, we need to extract it.
        // This is a quirk of the Socrates endpoint specifically.
        const conjunctions = Object.values(socratesData)[0] || [];

        // 2. Map the API response to our application's data structure
        let mappedConjunctions = conjunctions.map(c => ({
            id: c.ID,
            primary_scc: c.SAT1,
            secondary_scc: c.SAT2,
            primary_name: c.SAT1_NAME,
            secondary_name: c.SAT2_NAME,
            tca: c.TOCA,
            miss_distance_km: c.MIN_RNG,
            relative_speed_km_s: c.REL_SPEED,
            max_prob: c.MAX_PROB, // We can now use real probability!
        }));

        // 3. Apply sorting logic in our backend (since the API doesn't)
        const sortBy = req.query.sortBy || 'max_prob';
        const sortOrder = (req.query.sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;

        const sortFunctions = {
            'max_prob': (a, b) => (a.max_prob - b.max_prob) * sortOrder,
            'min_range': (a, b) => (a.miss_distance_km - b.miss_distance_km) * sortOrder,
            'tca': (a, b) => (new Date(a.tca) - new Date(b.tca)) * sortOrder,
            'rel_speed': (a, b) => (a.relative_speed_km_s - b.relative_speed_km_s) * sortOrder,
            'ssc': (a, b) => (a.primary_scc - b.primary_scc) * sortOrder,
        };
        
        if (sortFunctions[sortBy]) {
            mappedConjunctions.sort(sortFunctions[sortBy]);
        }

        // 4. Apply limit
        const limit = parseInt(req.query.limit, 10) || 100;
        const finalConjunctions = mappedConjunctions.slice(0, limit);

        res.json({ count: finalConjunctions.length, conjunctions: finalConjunctions });
    } catch (err) {
        console.error('API Error on /api/conjunctions:', err.message);
        res.status(500).json({ error: 'Failed to retrieve conjunction data from KeepTrack.' });
    }
});

/**
 * --- REWRITTEN ---
 * Fetches conjunctions for a SINGLE satellite by filtering the full Socrates list.
 */
router.get('/conjunctions/:scc_number', async (req, res) => {
    const scc_number = parseInt(req.params.scc_number, 10);
    if (isNaN(scc_number)) {
        return res.status(400).json({ error: 'Invalid SCC number provided.' });
    }

    try {
        const socratesData = await fetchFromKeepTrack('/socrates/latest');
        const allConjunctions = Object.values(socratesData)[0] || [];

        const satelliteConjunctions = allConjunctions
            .filter(c => c.SAT1 === scc_number || c.SAT2 === scc_number)
            .map(c => ({ // Map to our consistent format
                id: c.ID,
                primary_scc: c.SAT1,
                secondary_scc: c.SAT2,
                primary_name: c.SAT1_NAME,
                secondary_name: c.SAT2_NAME,
                tca: c.TOCA,
                miss_distance_km: c.MIN_RNG,
                relative_speed_km_s: c.REL_SPEED,
                max_prob: c.MAX_PROB,
            }))
            .sort((a, b) => new Date(a.tca) - new Date(b.tca)); // Always sort by time

        res.json({
            source: 'KeepTrack API',
            scc_number,
            count: satelliteConjunctions.length,
            conjunctions: satelliteConjunctions,
        });

    } catch (err) {
        console.error(`API Error on /api/conjunctions/${scc_number}:`, err.message);
        res.status(500).json({ error: 'Failed to retrieve conjunction data.' });
    }
});

/**
 * --- REWRITTEN & CONSOLIDATED ---
 * Replaces `/debris/sorted`, `/tles/debris`, and `/debris`.
 * Fetches satellite data from the Celestrak mirror and applies sorting/pagination.
 */
router.get('/debris', async (req, res) => {
    try {
        const objects = await fetchFromKeepTrack('/sats/celestrak');
        let sortedObjects = [...objects]; // Create a mutable copy

        // Apply sorting
        const sortBy = req.query.sortBy || 'name'; // Default to name
        const sortOrder = (req.query.sortOrder || 'asc').toLowerCase() === 'asc' ? 1 : -1;

        if (sortBy === 'rcs') {
            const rcsOrder = { 'LARGE': 1, 'MEDIUM': 2, 'SMALL': 3 };
            sortedObjects.sort((a, b) => {
                const orderA = rcsOrder[a.rcs] || 4;
                const orderB = rcsOrder[b.rcs] || 4;
                return (orderA - orderB) * sortOrder;
            });
        } else if (sortBy === 'scc_number') {
             // SCC number is inside the TLE line
            sortedObjects.sort((a, b) => {
                const sccA = parseInt(a.tle1.substring(2, 7), 10);
                const sccB = parseInt(b.tle1.substring(2, 7), 10);
                return (sccA - sccB) * sortOrder;
            });
        } else { // Default sort by name
            sortedObjects.sort((a, b) => a.name.localeCompare(b.name) * sortOrder);
        }

        // Apply pagination
        const limit = parseInt(req.query.limit, 10) || 100;
        const offset = parseInt(req.query.offset, 10) || 0;
        const paginatedObjects = sortedObjects.slice(offset, offset + limit);

        // Map to a final, clean structure
        const finalObjects = paginatedObjects.map(obj => ({
            scc_number: parseInt(obj.tle1.substring(2, 7), 10),
            name: obj.name,
            rcs_size: obj.rcs,
            country: obj.country,
        }));

        res.json({
            meta: { total: objects.length, limit, offset, count: finalObjects.length, sortBy, sortOrder },
            objects: finalObjects,
        });

    } catch (err) {
        console.error('API Error on /api/debris:', err.message);
        res.status(500).json({ error: 'Failed to retrieve satellite data.' });
    }
});

/**
 * --- REWRITTEN ---
 * Generates a snapshot by calling the KeepTrack API for each satellite's ECI position.
 * WARNING: This is VERY slow and makes thousands of API calls. It's not recommended
 * for production but fulfills the goal of relying solely on the API.
 * A `limit` parameter is added for practical testing.
 */
router.get('/snapshot', async (req, res) => {
    try {
        const now = new Date();
        const time_iso = now.toISOString().split('.')[0] + "Z"; // Format for API
        
        // Fetch the list of all satellites
        let allSats = await fetchFromKeepTrack('/sats/celestrak');
        
        // Add a limit for testing to prevent thousands of requests
        const limit = parseInt(req.query.limit, 10) || 200; // Limit to 200 by default
        allSats = allSats.slice(0, limit);

        const snapshotPromises = allSats.map(async (sat) => {
            const scc_number = parseInt(sat.tle1.substring(2, 7), 10);
            try {
                const eci = await fetchFromKeepTrack(`/sat/${scc_number}/eci/${time_iso}`);
                return {
                    scc_number,
                    name: sat.name,
                    r: [eci.position.x, eci.position.y, eci.position.z],
                    v: [eci.velocity.x, eci.velocity.y, eci.velocity.z],
                };
            } catch (e) {
                // Ignore satellites that fail to propagate via the API
                return null;
            }
        });

        const snapshot = (await Promise.all(snapshotPromises)).filter(Boolean);

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
 * --- REWRITTEN ---
 * Propagates an orbit by calling the KeepTrack ECI endpoint for each time step.
 * The route is now a GET request for simplicity.
 */
router.get('/propagate/:scc_number', async (req, res) => {
    try {
        const scc_number = req.params.scc_number;
        const { start_iso, duration_s = 3600, step_s = 60 } = req.query;

        const startDate = start_iso ? new Date(start_iso) : new Date();
        const steps = Math.max(1, Math.ceil(parseInt(duration_s, 10) / parseInt(step_s, 10)));
        
        const positions = [];
        for (let i = 0; i < steps; i++) {
            const time = new Date(startDate.getTime() + i * parseInt(step_s, 10) * 1000);
            const time_iso = time.toISOString().split('.')[0] + "Z";

            try {
                const eci = await fetchFromKeepTrack(`/sat/${scc_number}/eci/${time_iso}`);
                positions.push({
                    t: time.toISOString(),
                    r: [eci.position.x, eci.position.y, eci.position.z],
                    v: [eci.velocity.x, eci.velocity.y, eci.velocity.z],
                });
            } catch (e) {
                // Skip any steps that fail
                console.warn(`Could not propagate SCC ${scc_number} at time ${time_iso}`);
            }
        }
        
        res.json({ scc_number, positions });

    } catch (err) {
        console.error('/api/propagate error:', err.message);
        res.status(500).json({ error: 'An error occurred during propagation.' });
    }
});


export default router;