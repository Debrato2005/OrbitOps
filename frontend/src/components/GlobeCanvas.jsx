import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import Globe from 'react-globe.gl';

const globeContainerStyles = {
  flexGrow: 1,
  position: 'relative',
  width: '100%',
  height: '100%',
};

function GlobeCanvas({ isRotationEnabled }) {
  const globeEl = useRef();
  const globeContainerRef = useRef(null);
  const [globeSize, setGlobeSize] = useState({ width: 0, height: 0 });

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
    const globe = globeEl.current;
    if (!globe) return;

    const controls = globe.controls();
    controls.autoRotate = false;
    controls.enableRotate = true;
    controls.enableZoom = true;

    let globeMesh;
    globe.scene().traverse(obj => {
      if (obj.isMesh && obj.material && obj.material.map) {
        globeMesh = obj;
      }
    });

    if (!globeMesh) return;

    let isAnimatingByUser = false;
    let animationFrameId;

    const animate = () => {
      if (!isAnimatingByUser && isRotationEnabled && globeMesh) {
        globeMesh.rotation.y += 0.002;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleInteractionStart = () => { isAnimatingByUser = true; };
    const handleInteractionEnd = () => { isAnimatingByUser = false; };

    controls.addEventListener('start', handleInteractionStart);
    controls.addEventListener('end', handleInteractionEnd);

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      controls.removeEventListener('start', handleInteractionStart);
      controls.removeEventListener('end', handleInteractionEnd);
    };
  }, [globeSize, isRotationEnabled]);

  return (
    <div ref={globeContainerRef} style={globeContainerStyles}>
      {globeSize.width > 0 && (
        <Globe
          ref={globeEl}
          width={globeSize.width}
          height={globeSize.height}
          globeImageUrl="/earth-day1.jpg"
          backgroundImageUrl="/night-sky.jpg"
        />
      )}
    </div>
  );
}

export default GlobeCanvas;