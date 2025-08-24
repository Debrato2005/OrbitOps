import assert from 'assert';
import { Satellite, Vector3D } from 'ootk';
// --- THIS IS THE FIX (Part 1) ---
// We import the specific function we want to test.
import { simulateManeuver } from '../src/services/planManeuvers.js';

// --- Hardcoded Test Data ---
// A standard, real TLE for our test satellite (ISS)
const TEST_SATELLITE_DATA = {
    scc_number: 25544, name: 'TEST SATELLITE',
    tle1: '1 25544U 98067A   25235.50000000  .00016717  00000-0  30776-3 0  9999',
    tle2: '2 25544  51.6400 123.4567 0007135 123.4567 234.5678 15.49382498 12345'
};

// --- THE TEST SUITE ---
(async () => {
    console.log('Running MANEUVER SIMULATION unit test...');
    
    try {
        // --- 1. SETUP ---
        console.log('Setup: Creating satellite and defining test parameters...');
        const satellite = new Satellite(TEST_SATELLITE_DATA);
        
        // Define a predictable timeline
        const startTime = new Date('2025-08-25T12:00:00.000Z');
        const burnTime = new Date('2025-08-25T12:30:00.000Z'); // Burn occurs 30 mins after start
        const tca = new Date('2025-08-25T13:00:00.000Z');      // TCA is 30 mins after burn
        
        // Define the burn
        const testBurnMps = 1.0; // A simple 1.0 m/s burn

        // --- 2. EXECUTION ---
        console.log('Execution: Calculating original and post-maneuver positions...');
        
        // Get the original position at TCA if no burn occurs
        const originalState = satellite.eci(tca);
        assert.ok(originalState?.position, 'Test Failed: Could not propagate original satellite state.');
        const originalPos = new Vector3D(originalState.position.x, originalState.position.y, originalState.position.z);

        // Run our custom function to get the new position after the burn
        const newPos = simulateManeuver(satellite, burnTime, tca, testBurnMps);
        
        // --- 3. ASSERTION ---
        assert.ok(newPos, 'Test Failed: simulateManeuver function returned null.');
        console.log('✅ Passed: simulateManeuver function executed successfully.');

        // Calculate the distance between the old and new positions
        const separationGained = originalPos.distance(newPos);
        console.log(`--- TEST RESULTS ---`);
        console.log(`Original Position at TCA: { x: ${originalPos.x.toFixed(2)}, y: ${originalPos.y.toFixed(2)}, z: ${originalPos.z.toFixed(2)} }`);
        console.log(`New Position after Burn:  { x: ${newPos.x.toFixed(2)}, y: ${newPos.y.toFixed(2)}, z: ${newPos.z.toFixed(2)} }`);
        console.log(`Separation Gained by a ${testBurnMps} m/s burn: ${separationGained.toFixed(3)} km`);

        assert.ok(separationGained > 1, 'Test Failed: A 1 m/s burn did not create at least 1 km of separation over 30 minutes.');
        console.log('✅ Passed: Maneuver resulted in significant and plausible separation.');
        
        console.log('\n✅ All tests passed!');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        process.exit(1);
    }
})();