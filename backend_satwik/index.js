import { DetailedSatellite, DetailedSensor, SpaceObjectType } from "ootk";
// Using api.keeptrack.space API
fetch('https://api.keeptrack.space/v1/sat/25544')
    .then((res) => res.json())
    .then((satData) => {
    const satellite = new DetailedSatellite({
        id: satData.id,
        tle1: satData.tle1,
        tle2: satData.tle2,
    });
    // Get the satellite's position at the current time
    const eci = satellite.eci();
    // Log the satellite's position - y component only
    // We must check if 'eci' is not null before accessing its properties.
    // The eci() method can return null if the position cannot be calculated.
    if (eci) {
        console.log(eci.position.y);
    }
    else {
        console.error("Could not compute ECI position for the satellite.");
    }
    // Access other satellite properties
    console.log(satellite.inclination); // inclination in degrees
    console.log(satellite.eccentricity); // eccentricity
    console.log(satellite.period); // period in minutes
    // Get LLA (Latitude, Longitude, Altitude)
    const lla = satellite.lla();
    console.log(lla); // { lat: degrees, lon: degrees, alt: kilometers }
    const sensor = new DetailedSensor({
        lat: 41.754785,
        lon: -70.539151,
        alt: 0.060966,
        minAz: 347,
        maxAz: 227,
        minEl: 3,
        maxEl: 85,
        minRng: 0,
        maxRng: 5556,
        name: 'Cape Cod',
        type: SpaceObjectType.PHASED_ARRAY_RADAR,
    });
    // Assuming we have a satellite object from the previous example
    const rae = sensor.rae(satellite);
    // Log the azimuth from sensor to satellite
    // We must also check if 'rae' is not null before accessing its properties.
    if (rae) {
        console.log(rae.az);
    }
    else {
        console.error("Could not compute RAE from sensor to satellite.");
    }
    // Check if a satellite is in the sensor's field of view right now
    const isSatInFov = sensor.isSatInFov(satellite);
    console.log(isSatInFov); // true or false
    // Calculate passes for a satellite (in 30 second intervals)
    const passes = sensor.calculatePasses(30, satellite);
    console.log(passes); // Array of pass information
    // Convert sensor position to J2000 coordinates
    const j2000 = sensor.toJ2000();
    console.log(j2000); // J2000 object with position and velocity
});
