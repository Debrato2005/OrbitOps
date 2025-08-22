import React from 'react';
import { Canvas } from '@react-three/fiber';
import { EarthScene } from '../../components/earthRender/EarthScene';

function EarthPage() {
  return (
    <div style={{ height: '100vh', width: '100vw', background: 'black' }}>
      <Canvas 
        camera={{ 
          fov: 75, 
          position: [0, 0, 15000],
          near: 10,
          far: 100000
        }}
      >
        <EarthScene />
      </Canvas>
    </div>
  );
}

export default EarthPage;