import React from 'react';

//  styles for different object types 
const objectStyles = {
  satellite: { color: '#ffffff', size: 50 }, // White, larger
  debris: { color: '#ff4d4d', size: 25 },    // Red, smaller
};

export function Satellite({ position, type }) {
  // Dont render anything if the position isnt calculated yet
  if (!position) {
    return null;
  }

  // Get the appropriate style or default to debris style
  const { color, size } = objectStyles[type] || objectStyles.debris;

  return (
    <mesh position={[position.x, position.y, position.z]}>
      <sphereGeometry args={[size, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}