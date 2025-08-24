import assert from 'assert';
import { Satellite, Vector3D } from 'ootk';
import { simulateManeuver } from '../src/services/planManeuvers.js';

// --- Hardcoded Test Data ---
const TEST_SATELLITE_DATA = {
    scc_number: 25544, name: 'TEST SATELLITE',
    tle1: '1 25544U 98067A   25235.50000000  .00016717  00000-0  30776-3 0  9999',
    tle2: '2 25544  51.6400 123.4567 0007135 123.4567 234.5678 15.49382498 12345'
};

// --- THE UNIT TEST ---
(async () => {
    console.log('Running MANEUVER SIMULATION unit test...');
    
    try {
        // 1. ARRANGE: Create satellite and test parameters
        console.log('Setup: Creating satellite and defining test parameters...');
        const satellite = new Satellite(TEST_SATELLITE_DATA);
        const burnTime = new Date('2025-08-25T12:30:00.000Z');
        const tca = new Date('2025-08-25T13:00:00.000Z'); // 30 mins after burn
        const testBurnMps = 1.0; // 1 m/s burn

        // 2. ACT: Run simulation
        console.log('Execution: Calculating original and post-maneuver states...');
        const originalState = satellite.eci(tca);
        const newPosAtTca = simulateManeuver(satellite, burnTime, tca, testBurnMps);

        // 3. ASSERT: Results are not null
        assert.ok(newPosAtTca, 'Test Failed: simulateManeuver function returned null.');
        assert.ok(originalState?.position, 'Test Failed: Could not propagate original satellite state.');

        // 4. Measure separation
        const originalPos = new Vector3D(
            originalState.position.x,
            originalState.position.y,
            originalState.position.z
        );

        const separationGained = originalPos.distance(newPosAtTca);

        console.log(`--- VALIDATION RESULTS ---`);
        console.log(`Separation Gained by a ${testBurnMps} m/s burn over 30 mins: ${separationGained.toFixed(3)} km`);

        // Expect plausible range for 1 m/s burn over 30 mins
        assert.ok(separationGained > 1.5, 'Test Failed: A 1 m/s burn did not create enough separation (expected > 1.5 km).');
        assert.ok(separationGained < 3.0, 'Test Failed: A 1 m/s burn created too much separation (expected < 3.0 km).');

        console.log('✅ Passed: Maneuver resulted in a physically plausible separation.');
        console.log('\n✅ All unit tests passed!');

    } catch (error) {
        console.error('\n❌ UNIT TEST FAILED:', error.message);
        process.exit(1);
    }
})();
