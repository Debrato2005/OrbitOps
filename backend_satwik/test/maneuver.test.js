import assert from 'assert';
import { Satellite, Vector3D } from 'ootk';
import { simulateManeuver } from '../src/services/planManeuvers.js';

// --- Hardcoded Test Data ---
const TEST_SATELLITE_DATA = {
    scc_number: 25544,
    name: 'TEST SATELLITE',
    tle1: '1 25544U 98067A   25235.50000000  .00016717  00000-0  30776-3 0  9999',
    tle2: '2 25544  51.6400 123.4567 0007135 123.4567 234.5678 15.49382498 12345'
};

(async () => {
    console.log('Running MANEUVER SIMULATION unit test...');

    try {
        // --- SETUP ---
        console.log('Setup: Creating satellite and defining test parameters...');
        const satellite = new Satellite(TEST_SATELLITE_DATA);
        const burnTime = new Date('2025-08-25T12:30:00.000Z');
        const tca = new Date('2025-08-25T13:00:00.000Z');
        const testBurnMps = 1.0;

        // --- EXECUTION ---
        console.log('Execution: Calculating original and post-maneuver positions...');
        const originalState = satellite.eci(tca);
        const satWithBurn = simulateManeuver(satellite, burnTime, tca, testBurnMps);

        assert.ok(satWithBurn, 'Test Failed: simulateManeuver returned null');
        assert.ok(originalState?.position, 'Test Failed: original satellite position missing');

        console.log('--- TEST RESULTS ---');

        // Helper to safely print vectors
        const safeVector = (vec) => {
            if (!vec) return 'unavailable';
            return {
                x: (vec.x ?? 0).toFixed(2),
                y: (vec.y ?? 0).toFixed(2),
                z: (vec.z ?? 0).toFixed(2)
            };
        };

        // --- LOG ORIGINAL ---
        console.log('Original Position at TCA:', safeVector(originalState.position));

        // --- LOG NEW POSITION ---
        console.log('New Position after Burn:', safeVector(satWithBurn?.position));

        // --- LOG NEW ORBIT ---
        if (satWithBurn?.perigee != null && satWithBurn?.apogee != null) {
            console.log(
                `New Orbit: ${satWithBurn.perigee.toFixed(1)} x ${satWithBurn.apogee.toFixed(1)} km`
            );
        } else {
            console.log('New Orbit elements unavailable');
        }

        // --- SEPARATION ---
        if (satWithBurn?.position) {
            const originalPos = new Vector3D(
                originalState.position.x,
                originalState.position.y,
                originalState.position.z
            );
            const newPos = new Vector3D(
                satWithBurn.position.x,
                satWithBurn.position.y,
                satWithBurn.position.z
            );
            const separation = originalPos.distance(newPos);
            console.log(
                `Separation Gained by a ${testBurnMps} m/s burn: ${separation.toFixed(3)} km`
            );
            assert.ok(separation > 0, 'Test Failed: Burn did not create separation');
        }

        console.log('\n✅ All tests passed!');
    } catch (error) {
        console.error('\n❌ UNIT TEST FAILED:', error.message);
        process.exit(1);
    }
})();
