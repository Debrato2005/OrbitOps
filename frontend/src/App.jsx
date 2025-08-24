import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import Globe from 'react-globe.gl';
import Header from './Header';

const appContainerStyles = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  backgroundColor: '#000011',
  fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
};

const globeContainerStyles = {
  flexGrow: 1,
  position: 'relative',
  width: '100%',
};

function App() {
  const globeEl = useRef();
  const globeContainerRef = useRef(null);
  const [globeSize, setGlobeSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.getElementById('root').style.height = '100%';
  }, []);

  useLayoutEffect(() => {
    function updateSize() {
      if (globeContainerRef.current) {
        setGlobeSize({
          width: globeContainerRef.current.offsetWidth,
          height: globeContainerRef.current.offsetHeight
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

    let isAnimating = true;
    let animationFrameId;

    const animate = () => {
      if (isAnimating && globeMesh) {
        globeMesh.rotation.y += 0.002; // Adjust for spin speed
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleInteractionStart = () => {
      isAnimating = false;
    };

    const handleInteractionEnd = () => {
      isAnimating = true;
    };

    controls.addEventListener('start', handleInteractionStart);
    controls.addEventListener('end', handleInteractionEnd);
    
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      controls.removeEventListener('start', handleInteractionStart);
      controls.removeEventListener('end', handleInteractionEnd);
    };
  }, [globeSize]);

  return (
    <div style={appContainerStyles}>
      <Header />
      <div ref={globeContainerRef} style={globeContainerStyles}>
        {globeSize.width > 0 && (
          <Globe
            ref={globeEl}
            width={globeSize.width}
            height={globeSize.height}
            globeImageUrl="/earth-day.jpg"
            backgroundImageUrl="/night-sky.jpg"
          />
        )}
      </div>
    </div>
  );
}

export default App;