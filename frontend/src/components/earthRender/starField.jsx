import React, { useMemo } from 'react';
import * as THREE from 'three';


function createStarfield({ numStars = 5000 } = {}) {
 
  function randomSpherePoint() {
    const radius = Math.random() * 45000 + 35000; // Increased radius for a larger scene
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    let x = radius * Math.sin(phi) * Math.cos(theta);
    let y = radius * Math.sin(phi) * Math.sin(theta);
    let z = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
  }

  const verts = [];
  for (let i = 0; i < numStars; i += 1) {
    verts.push(randomSpherePoint());
  }

  const geo = new THREE.BufferGeometry().setFromPoints(verts);
  return geo;
}

export function Starfield() {
  // useMemo ensures that the starfield is only created once
  const starGeo = useMemo(() => createStarfield({ numStars: 5000 }), []);

  return (
    <points geometry={starGeo}>
      <pointsMaterial color="white" size={35} />
    </points>
  );
}
