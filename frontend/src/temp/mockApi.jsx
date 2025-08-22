export const mockObjects = [
  { id: 'sat-01', name: 'My Satellite', type: 'satellite' },
  { id: 'deb-01', name: 'Debris A', type: 'debris' },
  { id: 'deb-02', name: 'Debris B', type: 'debris' },
];


export function getMockPositions(time = Date.now()) {
  const positions = {};
  const orbits = {
    'sat-01': { radius: 7000, speed: 0.001, offset: 0 },
    'deb-01': { radius: 7200, speed: 0.0009, offset: 1.5 },
    'deb-02': { radius: 6800, speed: 0.0011, offset: 3.0 },
  };

  for (const obj of mockObjects) {
    const orbit = orbits[obj.id];
    const angle = time * orbit.speed + orbit.offset;
    
    // Simple circular orbit calculation 
    positions[obj.id] = {
      x: Math.cos(angle) * orbit.radius,
      y: Math.sin(angle) * orbit.radius,
      z: 0, 
    };
  }
  return positions;
}
