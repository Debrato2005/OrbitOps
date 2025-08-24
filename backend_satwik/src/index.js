

import express from 'express';
import cors from 'cors';

// Database connection functions now come from dataManager.js
import { connectDb, connectDebrisDb } from './services/dataManager.js';
import apiRoutes from './api/routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

//  Middleware 
app.use(cors());
app.use(express.json());

//  Mount API Routes 
app.use('/api', apiRoutes);

/**
 * Starts the server after ensuring database connections are established.
 * Data ingestion is now a separate, manual process.
 */
async function startServer() {
    try {
        // 1. Connect to all required databases and ensure their schemas are created.
        // The API server's only job is to serve data from these databases.
        await connectDb();
        await connectDebrisDb();
        
        // --- THIS IS THE FIX (Part 2) ---
        // The data ingestion call has been removed from the server startup.
        // To populate the database, you must now run `npm run db:ingest` from your terminal.
        // This decouples the server's operation from the data-fetching process, making it faster and more stable.

        // 2. Start the API server to listen for requests.
        app.listen(PORT, () => {
            console.log(`🚀 OrbitOps backend server is running on http://localhost:${PORT}`);
            console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
            console.log(`➡️ To populate or update the database, run "npm run db:ingest" in a separate terminal.`);
        });

    } catch (err)
     {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

// Start the application 
startServer();