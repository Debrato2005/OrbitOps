import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Tabs, Tab,
  TextField, CircularProgress, Alert, Typography, Divider
} from '@mui/material';
import SatelliteIcon from '../assets/satellite.svg?react';
import satelliteService from '../services/satelliteService';
import { addSatellite, selectSatellitesLoading } from '../store/satelliteSlice';

const dialogStyles = {
  '& .MuiDialog-paper': {
    backgroundColor: '#1a1a1a',
    color: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
    width: '100%',
    maxWidth: '520px',
    fontFamily: '"Exo 2", sans-serif',
    border: '1px solid rgba(74, 158, 255, 0.2)',
    overflowX: 'hidden',
  }
};

const titleStyles = {
  textAlign: 'center',
  fontSize: '1.4em',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  padding: '32px 32px 20px',
  background: 'linear-gradient(135deg, #4a9eff 0%, #357abd 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const tabsStyles = {
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  marginBottom: '24px',
  '& .MuiTabs-indicator': {
    backgroundColor: '#4a9eff',
    height: '3px',
    borderRadius: '2px',
  },
};

const tabStyles = {
  color: '#999',
  fontFamily: '"Exo 2", sans-serif',
  textTransform: 'none',
  fontSize: '0.95em',
  fontWeight: 500,
  padding: '16px 24px',
  minHeight: '48px',
  transition: 'all 0.2s ease',
  '&.Mui-selected': {
    color: '#4a9eff',
    fontWeight: 600,
  },
  '&:hover': {
    color: '#ccc',
  },
};

const contentStyles = {
  padding: '0 32px 32px',
  minHeight: '200px',
  overflowX: 'hidden',
};

const sectionStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
};

const inputGroupStyles = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyles = {
  fontSize: '0.9em',
  fontWeight: 600,
  color: '#e0e0e0',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const descriptionStyles = {
  color: '#aaa',
  fontSize: '0.9em',
  lineHeight: '1.5',
  marginBottom: '20px',
  padding: '16px',
  backgroundColor: 'rgba(74, 158, 255, 0.05)',
  borderRadius: '8px',
  border: '1px solid rgba(74, 158, 255, 0.2)',
};

const inputStyles = {
  '& .MuiInputBase-root': {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: 'white',
    borderRadius: '8px',
    fontFamily: '"Exo 2", sans-serif',
    fontSize: '0.95em',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    '&.Mui-focused': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 0.2)',
    transition: 'border-color 0.2s ease',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#4a9eff',
    borderWidth: '2px',
  },
  '& .MuiInputLabel-root': {
    color: '#999',
    fontSize: '0.9em',
  },
  '& .Mui-focused .MuiInputLabel-root': {
    color: '#4a9eff',
  },
};

const fetchButtonContainerStyles = {
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-end',
};

const fetchButtonStyles = {
  minWidth: '100px',
  height: '56px',
  backgroundColor: '#4a9eff',
  color: 'white',
  fontFamily: '"Exo 2", sans-serif',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderRadius: '8px',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: '#3a8eef',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(74, 158, 255, 0.4)',
  },
  '&:disabled': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#666',
    transform: 'none',
    boxShadow: 'none',
  }
};

const actionButtonStyles = {
  color: '#ccc',
  fontFamily: '"Exo 2", sans-serif',
  fontWeight: 500,
  padding: '12px 24px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderRadius: '8px',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
  },
};

const primaryButtonStyles = {
  backgroundColor: '#4a9eff',
  color: 'white',
  fontFamily: '"Exo 2", sans-serif',
  fontWeight: 600,
  padding: '12px 32px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderRadius: '8px',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: '#3a8eef',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(74, 158, 255, 0.4)',
  },
  '&:disabled': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#666',
    transform: 'none',
    boxShadow: 'none',
  }
};

const fetchedDataStyles = {
  padding: '20px',
  backgroundColor: 'rgba(74, 158, 255, 0.1)',
  borderRadius: '12px',
  border: '1px solid rgba(74, 158, 255, 0.3)',
  backdropFilter: 'blur(10px)',
};

const fetchedDataTitleStyles = {
  fontSize: '1.1em',
  fontWeight: 600,
  marginBottom: '16px',
  color: '#4a9eff',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const fetchedDataContentStyles = {
  fontFamily: '"JetBrains Mono", "Consolas", monospace',
  fontSize: '0.85em',
  color: '#e0e0e0',
  lineHeight: '1.6',
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  padding: '16px',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  overflowX: 'hidden',
  wordWrap: 'break-word',
  wordBreak: 'break-all',
  '& strong': {
    color: '#4a9eff',
    fontWeight: 600,
  },
};

const alertStyles = {
  backgroundColor: 'rgba(255, 107, 107, 0.1)',
  color: '#ff6b6b',
  border: '1px solid rgba(255, 107, 107, 0.3)',
  borderRadius: '8px',
  '& .MuiAlert-icon': {
    color: '#ff6b6b',
  },
};

const dividerStyles = {
  borderColor: 'rgba(255, 255, 255, 0.1)',
  margin: '0 -32px',
};

function ImportSatelliteDialog({ open, onClose }) {
  const dispatch = useDispatch();
  const isSubmitting = useSelector(selectSatellitesLoading);

  const [activeTab, setActiveTab] = useState(0);
  const [noradId, setNoradId] = useState('');
  const [customName, setCustomName] = useState('');
  const [tle1, setTle1] = useState('');
  const [tle2, setTle2] = useState('');

  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [fetchedData, setFetchedData] = useState(null);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    setFetchError(null);
    setIsFetching(false);
    setFetchedData(null);
  };

  const handleClose = () => {
    setActiveTab(0);
    setNoradId('');
    setCustomName('');
    setTle1('');
    setTle2('');
    setIsFetching(false);
    setFetchError(null);
    setFetchedData(null);
    onClose();
  };

  const handleFetchNorad = async () => {
    setIsFetching(true);
    setFetchError(null);
    setFetchedData(null);
    try {
      const data = await satelliteService.lookupNoradId(noradId);
      setFetchedData(data);
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setIsFetching(false);
    }
  };
  
  const handleSubmit = async () => {
    let result;
    if (activeTab === 0 && fetchedData) {
      result = await dispatch(addSatellite({ noradId }));
    } else if (activeTab === 1) {
      result = await dispatch(addSatellite({
        name: customName,
        tleLine1: tle1,
        tleLine2: tle2,
      }));
    }
    
    if (addSatellite.fulfilled.match(result)) {
      handleClose();
    }
  };

  const isNoradSubmitDisabled = !fetchedData || isSubmitting;
  const isCustomSubmitDisabled = !customName || !tle1 || !tle2 || isSubmitting;

  return (
    <Dialog open={open} onClose={handleClose} sx={dialogStyles}>
      <DialogTitle sx={titleStyles}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <SatelliteIcon style={{ width: 32, height: 32 }} />
          Import Satellite
        </Box>
      </DialogTitle>
      
      <Tabs value={activeTab} onChange={handleTabChange} centered sx={tabsStyles}>
        <Tab label="Import with NORAD ID" sx={tabStyles} />
        <Tab label="Import Custom Satellite" sx={tabStyles} />
      </Tabs>
      
      <DialogContent sx={contentStyles}>
        {activeTab === 0 && (
          <Box sx={sectionStyles}>
            <Typography sx={descriptionStyles}>
              Enter the NORAD Catalog Number to automatically fetch satellite TLE data from our database.
            </Typography>
            
            <Box sx={inputGroupStyles}>
              <Typography sx={labelStyles}>NORAD Catalog ID</Typography>
              <Box sx={fetchButtonContainerStyles}>
                <TextField
                  variant="outlined"
                  fullWidth
                  value={noradId}
                  onChange={(e) => setNoradId(e.target.value)}
                  sx={inputStyles}
                  disabled={isFetching}
                  placeholder="e.g., 25544 (ISS)"
                />
                <Button 
                  onClick={handleFetchNorad} 
                  disabled={isFetching || !noradId} 
                  sx={fetchButtonStyles}
                >
                  {isFetching ? <CircularProgress size={20} color="inherit" /> : 'Fetch'}
                </Button>
              </Box>
            </Box>

            {fetchError && (
              <Alert severity="error" sx={alertStyles}>
                {fetchError}
              </Alert>
            )}
            
            {fetchedData && (
              <Box sx={fetchedDataStyles}>
                <Typography sx={fetchedDataTitleStyles}>
                  ✓ Satellite Data Retrieved
                </Typography>
                <Box sx={fetchedDataContentStyles}>
                  <strong>Name:</strong> {fetchedData.name}<br />
                  <strong>TLE Line 1:</strong> {fetchedData.tleLine1}<br />
                  <strong>TLE Line 2:</strong> {fetchedData.tleLine2}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={sectionStyles}>
            <Typography sx={descriptionStyles}>
              Manually enter satellite orbital data using Two-Line Element (TLE) format.
            </Typography>
            
            <Box sx={inputGroupStyles}>
              <Typography sx={labelStyles}>Satellite Name</Typography>
              <TextField
                variant="outlined"
                fullWidth
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                sx={inputStyles}
                placeholder="Enter satellite name"
              />
            </Box>
            
            <Box sx={inputGroupStyles}>
              <Typography sx={labelStyles}>TLE Line 1</Typography>
              <TextField
                variant="outlined"
                fullWidth
                value={tle1}
                onChange={(e) => setTle1(e.target.value)}
                sx={inputStyles}
                multiline
                rows={2}
                placeholder="1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927"
              />
            </Box>
            
            <Box sx={inputGroupStyles}>
              <Typography sx={labelStyles}>TLE Line 2</Typography>
              <TextField
                variant="outlined"
                fullWidth
                value={tle2}
                onChange={(e) => setTle2(e.target.value)}
                sx={inputStyles}
                multiline
                rows={2}
                placeholder="2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537"
              />
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <Divider sx={dividerStyles} />
      
      <DialogActions sx={{ padding: '24px 32px' }}>
        <Button onClick={handleClose} sx={actionButtonStyles} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          sx={primaryButtonStyles}
          disabled={activeTab === 0 ? isNoradSubmitDisabled : isCustomSubmitDisabled}
        >
          {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Import Satellite'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ImportSatelliteDialog;