import React, { useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

import { Earth } from './earth';
import { Starfield } from './starField';
import { Satellite } from './satellite';
import { mockObjects, getMockPositions } from '../../temp/mockApi';

export function EarthScene() {
  // Initialize state with the static list of objects
  const [orbitalObjects, setOrbitalObjects] = useState(mockObjects);

  // useFrame runs on every rendered frame
  useFrame(({ clock }) => {
    // Get updated positions from the mock API based on elapsed time // mockApiCode // for easy ctrl+f
    const updatedPositions = getMockPositions(clock.getElapsedTime());
    
    // Update the state of our objects with their new positions
    setOrbitalObjects(currentObjects =>
      currentObjects.map(obj => ({
        ...obj,
        position: updatedPositions[obj.id],
      }))
    );
  });

  return (
    <>
      {/* Lighting */}
      <directionalLight color="white" position={[-20000, 5000, 15000]} intensity={2.0} />
      <ambientLight intensity={0.1} />

      {/* Components */}
      <Starfield />
      <Earth />

      {/* Render each satellite and piece of debris */}
      {orbitalObjects.map(obj => (
        <Satellite
          key={obj.id}
          type={obj.type}
          position={obj.position}
        />
      ))}

      {/* Controls */}
      <OrbitControls 
          minDistance={7000} 
          maxDistance={50000}
          enablePan={false}
      />
    </>
  );
}