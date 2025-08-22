import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Earth } from './components/earthRender/earth';
import { Starfield } from './components/earthRender/starField';

function App() {
  return (
    <div style={{ height: '100vh', width: '100vw', background: 'black' }}>
      <Canvas 
        camera={{ 
          fov: 75, 
          position: [0, 0, 15000],
          
          near: 0.1,
          far: 100000 // increase the far plane to see our distant objects
        }}
      >
        {/* Lighting */}
        <directionalLight color="white" position={[-20000, 5000, 15000]} intensity={2.0} />
        <ambientLight intensity={0.1} />

        {/* Components */}
        <Starfield />
        <Earth />

        {/* Controls */}
        <OrbitControls 
            minDistance={7000} 
            maxDistance={50000} // Increased max distance
            enablePan={false}
        />
      </Canvas>
    </div>
  );
}

export default App;