import { Tooltip, ToggleButton, ToggleButtonGroup } from '@mui/material';
import GlobeIcon from '../assets/globe.svg?react';
import SatelliteIcon from '../assets/satellite.svg?react'; 
import AnalyticsIcon from '@mui/icons-material/Analytics';

const groupStyles = {
  position: 'absolute',
  bottom: '20px',
  left: '20px',
  zIndex: 10,
  backgroundColor: 'rgba(40, 40, 40, 0.8)',
  backdropFilter: 'blur(5px)',
  borderRadius: 0,
  overflow: 'hidden',
};

const buttonStyles = {
  width: '56px',
  height: '56px',
  color: 'white',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 0,
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  '&.Mui-selected, &.Mui-selected:hover': {
    backgroundColor: 'rgba(100, 255, 218, 0.2)',
    color: '#64ffda',
  },
  '&:not(:first-of-type)': {
    borderLeft: 0,
  },
};

function ControlDock({ isRotationEnabled, onRotationChange, onOpenImportDialog, isSidebarOpen, onToggleSidebar }) {
  return (
    <ToggleButtonGroup sx={groupStyles} aria-label="globe controls">
      <Tooltip title="Toggle Rotation">
        <ToggleButton
          value="spin"
          selected={isRotationEnabled}
          onChange={onRotationChange}
          sx={buttonStyles}
          aria-label="toggle globe rotation"
        >
          <GlobeIcon />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Add Satellite">
        <ToggleButton
          value="add"
          onClick={onOpenImportDialog}
          sx={buttonStyles}
          aria-label="add satellite"
        >
          <SatelliteIcon />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="View Risks">
        <ToggleButton
          value="risks"
          selected={isSidebarOpen}
          onClick={onToggleSidebar}
          sx={buttonStyles}
          aria-label="view risks"
        >
          <AnalyticsIcon />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );
}

export default ControlDock;