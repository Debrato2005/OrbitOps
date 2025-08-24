import express from 'express';
import cors from 'cors';
import { connectDb, connectDebrisDb } from './services/dataManager.js';
import apiRoutes from './api/routes.js';

const app = express();
// --- FIX ---
// The ANALYSIS_BACKEND_URL in the frontend is 'http://localhost:5001', so we set that here.
const PORT = process.env.ANALYSIS_PORT || 5001;

// --- FIX ---
// Define specific CORS options to allow your frontend to connect.
const corsOptions = {
    origin: 'http://localhost:5173', // This is the address of your React frontend
    credentials: true,               // This allows the browser to send cookies
};

// Middleware 
app.use(cors(corsOptions)); // Use the specific options
app.use(express.json());

// Mount API Routes 
app.use('/api', apiRoutes);

/**
 * Initializes asynchronous services before starting the server.
 */
async function initializeServices() {
    try {
        await connectDb();
        await connectDebrisDb();
        console.log('✅ Databases connected successfully.');
        
    } catch (err) {
        console.error('❌ Failed to initialize critical services:', err);
        process.exit(1);
    }
}

// Start the server after services are ready.
initializeServices().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 OrbitOps Analysis Server is running on http://localhost:${PORT}`);
        console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
        console.log(`➡️ To populate or update the database, run "npm run db:ingest" in a separate terminal.`);
    });
}).catch(err => {
    console.error("❌ Server could not start due to initialization errors.", err);
});
