import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import Header from './components/Header';
import GlobeCanvas from './components/GlobeCanvas';
import ControlDock from './components/ControlDock';
import ImportSatelliteDialog from './components/ImportSatelliteDialog';
import { fetchSatellites } from './store/satelliteSlice';

const appContainerStyles = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  backgroundColor: '#000011',
  fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
};

const mainContentStyles = {
  flexGrow: 1,
  position: 'relative',
};

function MainApp() {
  const dispatch = useDispatch();
  const [isRotationEnabled, setIsRotationEnabled] = useState(true);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedSatellite, setSelectedSatellite] = useState(null);

  useEffect(() => {
    dispatch(fetchSatellites());

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.getElementById('root').style.height = '100%';

    return () => {
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    };
  }, [dispatch]);

  const handleSatelliteSelect = (satellite) => {
    setSelectedSatellite(prev => (prev && prev.noradId === satellite.noradId ? null : satellite));
  };

  return (
    <div style={appContainerStyles}>
      <Header />
      <div style={mainContentStyles}>
        <GlobeCanvas
          isRotationEnabled={isRotationEnabled}
          selectedSatellite={selectedSatellite}
          onSatelliteClick={handleSatelliteSelect}
        />
        <ControlDock
          isRotationEnabled={isRotationEnabled}
          onRotationChange={() => setIsRotationEnabled((prev) => !prev)}
          onOpenImportDialog={() => setIsImportDialogOpen(true)}
        />
        <ImportSatelliteDialog
          open={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
        />
      </div>
    </div>
  );
}

export default MainApp;