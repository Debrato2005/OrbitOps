import express from 'express';
import cors from 'cors';
import { connectDb, connectDebrisDb, connectRawTleDb, ingestLatestTles } from './services/dataManager.js';
import apiRoutes from './api/routes.js';
//import analysisRoutes from './api/analysisRoutes.js'; 

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Mount API Routes ---
app.use('/api', apiRoutes);
//app.use('/api', analysisRoutes); 

/**
 * Starts the server after initializing the databases and performing the initial data ingest.
 */
async function startServer() {
    try {
        // 1. Connect to all databases and ensure their schemas are created
        await connectDb();
        await connectDebrisDb();
        await connectRawTleDb();
        
        // 2. Perform the initial data load for the primary catalog on startup
        //    You might comment this out if you only want to ingest data manually
        await ingestLatestTles();

        // 3. Start the API server
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
