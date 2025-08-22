import React, { useRef } from 'react';
import { useFrame } from "@react-three/fiber";
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';


import { getFresnelMat } from '../../common/getFresnelMat'; 

const EARTH_RADIUS_KM = 6371;
const detail = 12; 

export function Earth() {
  // The useTexture hook from drei makes loading textures a breeze
  const [dayMap, specularMap, bumpMap, lightsMap, cloudsMap, cloudsAlphaMap] = useTexture([
    '/textures/00_earthmap1k.jpg',
    '/textures/02_earthspec1k.jpg',
    '/textures/01_earthbump1k.jpg',
    '/textures/03_earthlights1k.jpg',
    '/textures/04_earthcloudmap.jpg',
    '/textures/05_earthcloudmaptrans.jpg',
  ]);

  const earthRef = useRef();
  const cloudsRef = useRef();

  
  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    earthRef.current.rotation.y = elapsedTime * 0.1;
    cloudsRef.current.rotation.y = elapsedTime * 0.12; // Slightly faster for parallax
  });

  
  const fresnelMat = getFresnelMat();

  return (
    
    <group ref={earthRef} rotation={[0, 0, -23.4 * Math.PI / 180]}>

      {/* Earth Surface Mesh */}
      <mesh>
        <icosahedronGeometry args={[EARTH_RADIUS_KM, detail]} />
        <meshPhongMaterial
          map={dayMap}
          specularMap={specularMap}
          bumpMap={bumpMap}
          bumpScale={25} // Adjusted for our larger radius
        />
      </mesh>

      {/* City Lights Mesh */}
      <mesh>
        <icosahedronGeometry args={[EARTH_RADIUS_KM, detail]} />
        <meshBasicMaterial 
          map={lightsMap} 
          blending={THREE.AdditiveBlending} 
        />
      </mesh>

      {/* Clouds Mesh */}
      <mesh ref={cloudsRef} scale={[1.003, 1.003, 1.003]}>
        <icosahedronGeometry args={[EARTH_RADIUS_KM, detail]} />
        <meshStandardMaterial
          map={cloudsMap}
          transparent={true}
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          alphaMap={cloudsAlphaMap}
        />
      </mesh>

      {/*Atmospheric Glow Mesh */}
      <mesh scale={[1.01, 1.01, 1.01]}>
        <icosahedronGeometry args={[EARTH_RADIUS_KM, detail]} />
       
        <primitive object={fresnelMat} />
      </mesh>

    </group>
  );
}
