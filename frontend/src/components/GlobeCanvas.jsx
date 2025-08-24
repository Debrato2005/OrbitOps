import { useRef, useEffect, useState, useLayoutEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Globe from 'react-globe.gl';
import * as satellite from 'satellite.js';
import * as THREE from 'three';
import { selectSatellites } from '../store/satelliteSlice';

const EARTH_RADIUS_KM = 6371;
const TIME_STEP = 1000;

const globeContainerStyles = {
  flexGrow: 1,
  position: 'relative',
  width: '100%',
  height: '100%',
};

function GlobeCanvas({ isRotationEnabled, selectedSatellite, onSatelliteClick }) {
  const globeEl = useRef();
  const globeContainerRef = useRef(null);
  const [globeSize, setGlobeSize] = useState({ width: 0, height: 0 });
  const [time, setTime] = useState(new Date());

  const allSatellites = useSelector(selectSatellites);

  useLayoutEffect(() => {
    function updateSize() {
      if (globeContainerRef.current) {
        setGlobeSize({
          width: globeContainerRef.current.offsetWidth,
          height: globeContainerRef.current.offsetHeight,
        });
      }
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, TIME_STEP);
    return () => clearInterval(interval);
  }, []);

  const satData = useMemo(() => {
    if (!allSatellites || allSatellites.length === 0) return [];

    const gmst = satellite.gstime(time);

    return allSatellites
      .map(sat => {
        if (!sat.tleLine1 || !sat.tleLine2) return null;
        try {
          const satrec = satellite.twoline2satrec(sat.tleLine1, sat.tleLine2);
          const eci = satellite.propagate(satrec, time);

          if (eci.position) {
            const geodetic = satellite.eciToGeodetic(eci.position, gmst);
            return {
              ...sat,
              satrec,
              lat: satellite.radiansToDegrees(geodetic.latitude),
              lng: satellite.radiansToDegrees(geodetic.longitude),
              alt: geodetic.height / EARTH_RADIUS_KM, // This is the key - altitude as ratio to Earth radius
              altKm: geodetic.height, // Keep the actual altitude in km for display
            };
          }
          return null;
        } catch (error) {
          console.warn('Error processing satellite:', sat.name, error);
          return null;
        }
      })
      .filter(Boolean);
  }, [time, allSatellites]);

  const orbitData = useMemo(() => {
    if (!selectedSatellite || !selectedSatellite.satrec) return [];

    const satrec = selectedSatellite.satrec;
    const period = (2 * Math.PI) / satrec.no;
    const points = [];
    const now = new Date();

    for (let i = 0; i <= period; i += 0.25) {
      const currentTime = new Date(now.getTime() + i * 60 * 1000);
      const gmst = satellite.gstime(currentTime);
      const eci = satellite.propagate(satrec, currentTime);
      if (eci.position) {
        const geodetic = satellite.eciToGeodetic(eci.position, gmst);
        points.push({
          lat: satellite.radiansToDegrees(geodetic.latitude),
          lng: satellite.radiansToDegrees(geodetic.longitude),
          alt: geodetic.height / EARTH_RADIUS_KM,
        });
      }
    }

    if (points.length > 0) {
      points.push(points[0]);
    }

    return [{
      ...selectedSatellite,
      points,
      color: 'orangered',
      stroke: 1.5
    }];
  }, [selectedSatellite]);

  const altitudeLineData = useMemo(() => {
    if (!selectedSatellite || !satData.length) return [];

    const currentSat = satData.find(s => s.noradId === selectedSatellite.noradId);
    if (!currentSat) return [];

    const points = [
      { lat: currentSat.lat, lng: currentSat.lng, alt: currentSat.alt }, // Satellite position
      { lat: currentSat.lat, lng: currentSat.lng, alt: 0 } // Earth surface
    ];

    return [{
      points,
      color: 'yellow',
      stroke: 1
    }];
  }, [selectedSatellite, satData]);

  // Labels data for satellite names (positioned at actual altitude)
  const labelsData = useMemo(() => {
    return satData.map(sat => ({
      ...sat,
      text: sat.name,
      color: selectedSatellite && sat.noradId === selectedSatellite.noradId ? '#ff4500' : '#ffffff',
      size: 1.0, // Constant size for all satellites
    }));
  }, [satData, selectedSatellite]);

  useEffect(() => {
    const globe = globeEl.current;
    if (globe) {
      const controls = globe.controls();
      controls.autoRotate = isRotationEnabled;
      controls.autoRotateSpeed = 0.2;
    }
  }, [isRotationEnabled]);

  // Handle satellite click
  const handleSatelliteClick = (satellite, event) => {
    console.log('Satellite clicked:', satellite.name);
    if (onSatelliteClick && typeof onSatelliteClick === 'function') {
      onSatelliteClick(satellite, event);
    }
  };

  const addCloudsOnReady = () => {
    const globe = globeEl.current;
    if (!globe) return;

    const CLOUDS_IMG_URL = '/clouds.png';
    const CLOUDS_ALT = 0.004;
    const CLOUDS_ROTATION_SPEED = -0.006;

    new THREE.TextureLoader().load(CLOUDS_IMG_URL, cloudsTexture => {
      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(globe.getGlobeRadius() * (1 + CLOUDS_ALT), 75, 75),
        new THREE.MeshBasicMaterial({ map: cloudsTexture, transparent: true })
      );
      globe.scene().add(clouds);

      (function rotateClouds() {
        if (clouds) {
          clouds.rotation.y += CLOUDS_ROTATION_SPEED * Math.PI / 180;
          requestAnimationFrame(rotateClouds);
        }
      })();
    });
  };

  return (
    <div ref={globeContainerRef} style={globeContainerStyles}>
      {globeSize.width > 0 && (
        <Globe
          ref={globeEl}
          width={globeSize.width}
          height={globeSize.height}
          globeImageUrl="/earth-blue-marble.jpg"
          bumpImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="/night-sky.jpg"
          onGlobeReady={addCloudsOnReady}

          // Use 3D objects for satellites at proper altitude
          objectsData={satData}
          objectLat="lat"
          objectLng="lng"
          objectAltitude="alt"
          objectThreeObject={sat => {
            const isSelected = selectedSatellite && sat.noradId === selectedSatellite.noradId;
            
            // Create a group to hold both the dot and label
            const group = new THREE.Group();
            
            // Create the satellite dot - increased size
            const dotGeometry = new THREE.SphereGeometry(1.5); // Increased from 0.5 to 1.5
            const dotMaterial = new THREE.MeshBasicMaterial({
              color: isSelected ? 0xff4500 : 0xff6b6b,
              transparent: true,
              opacity: 0.9
            });
            const dot = new THREE.Mesh(dotGeometry, dotMaterial);
            
            // Add glow effect - increased size proportionally
            const glowGeometry = new THREE.SphereGeometry(2.2); // Increased from 0.8 to 2.2
            const glowMaterial = new THREE.MeshBasicMaterial({
              color: isSelected ? 0xff4500 : 0xff6b6b,
              transparent: true,
              opacity: 0.2 // Reduced opacity for larger glow
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            
            group.add(dot);
            group.add(glow);
            
            // Store satellite data for click handling
            group.userData = sat;
            
            return group;
          }}
          onObjectClick={handleSatelliteClick}

          // Add labels for satellite names
          labelsData={labelsData}
          labelLat="lat"
          labelLng="lng"
          labelAltitude="alt"
          labelText="text"
          labelColor="color"
          labelSize="size"
          labelResolution={2}
          labelIncludeDot={false}

          // Paths for orbits and altitude lines
          pathsData={[...orbitData, ...altitudeLineData]}
          pathPoints="points"
          pathPointLat="lat"
          pathPointLng="lng"
          pathPointAlt="alt"
          pathColor={path => path.color}
          pathStroke={path => path.stroke}
          pathResolution={0.5}
        />
      )}
    </div>
  );
}

export default GlobeCanvas;