import { useEffect, useState } from 'react';
import Header from './components/Header';
import GlobeCanvas from './components/GlobeCanvas';
import ControlDock from './components/ControlDock';
import InputDialog from './components/InputDialog';

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // Apply styles when the component mounts
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.getElementById('root').style.height = '100%';

    // Cleanup function: Reset styles when the component unmounts
    return () => {
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleSubmit = () => {
    console.log('Submitted value:', inputValue);
    setIsDialogOpen(false);
  };

  return (
    <div style={appContainerStyles}>
      <Header />
      <div style={mainContentStyles}>
        <GlobeCanvas isRotationEnabled={isRotationEnabled} />
        <ControlDock
          isRotationEnabled={isRotationEnabled}
          onRotationChange={() => setIsRotationEnabled((prev) => !prev)}
          onOpenDialog={() => setIsDialogOpen(true)}
        />
        <InputDialog
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSubmit={handleSubmit}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
      </div>
    </div>
  );
}

export default MainApp;