import { useEffect, useState } from 'react';
import Header from './components/Header';
import GlobeCanvas from './components/GlobeCanvas';
import ControlDock from './components/ControlDock';
import ImportSatelliteDialog from './components/ImportSatelliteDialog';

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
  const [isRotationEnabled, setIsRotationEnabled] = useState(true);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.getElementById('root').style.height = '100%';

    return () => {
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div style={appContainerStyles}>
      <Header />
      <div style={mainContentStyles}>
        <GlobeCanvas isRotationEnabled={isRotationEnabled} />
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