import express from 'express';
import cors from 'cors';
import { connectDb, setupDatabase, ingestLatestTles } from './services/dataManager.js';
import apiRoutes from './api/routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Mount API Routes ---
// All routes defined in routes.js will be prefixed with /api
app.use('/api', apiRoutes);


/**
 * Starts the server after initializing the database and performing the initial data ingest.
 */
async function startServer() {
    try {
        // 1. Connect to the database
        const db = await connectDb();
        
        // 2. Ensure the database schema is created
        await setupDatabase(db);

        // 3. Perform the initial data load on startup
        await ingestLatestTles();

        // 4. Start the API server
        app.listen(PORT, () => {
            console.log(`🚀 OrbitOps backend server is running on http://localhost:${PORT}`);
            console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
        });

    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

// --- Start the application ---
startServer();
