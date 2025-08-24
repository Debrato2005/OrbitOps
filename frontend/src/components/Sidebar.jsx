import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  fetchTrackedRisks,
  fetchAllSocratesRisks,
  startManeuverPlanning,
  selectAnalysis,
} from '../store/analysisSlice';

// --- STYLES ---

const sidebarStyles = (isOpen) => ({
  width: isOpen ? '450px' : '0px',
  flexShrink: 0,
  backgroundColor: 'rgba(26, 26, 26, 0.9)',
  backdropFilter: 'blur(10px)',
  color: 'white',
  transition: 'width 0.5s ease',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
  fontFamily: '"Exo 2", sans-serif',
});

const headerStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
  flexShrink: 0,
};

const titleStyles = {
  fontSize: '1.2em',
  fontWeight: 600,
};

const contentStyles = {
  padding: '20px',
  flexGrow: 1,
  overflowY: 'auto',
};

const footerStyles = {
  padding: '20px',
  borderTop: '1px solid rgba(255, 255, 255, 0.2)',
  flexShrink: 0,
};

const riskButtonStyles = {
  backgroundColor: '#4a9eff',
  color: 'white',
  fontFamily: '"Exo 2", sans-serif',
  fontWeight: 600,
  textTransform: 'uppercase',
  width: '100%',
  padding: '12px',
  '&:hover': {
    backgroundColor: '#3a8eef',
  },
  '&:disabled': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#666',
  },
};

const toggleGroupStyles = {
  marginBottom: '16px',
  '.MuiToggleButton-root': {
    color: '#ccc',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    flex: 1,
    '&.Mui-selected': {
      backgroundColor: 'rgba(74, 158, 255, 0.2)',
      color: '#4a9eff',
      borderColor: '#4a9eff',
    },
    '&.Mui-selected:hover': {
      backgroundColor: 'rgba(74, 158, 255, 0.3)',
    },
  },
};

// --- COMPONENT ---

function Sidebar({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const {
    riskySatellites,
    allSocratesRisks,
    loading,
    error,
    planningInProgress,
  } = useSelector(selectAnalysis);
  const [view, setView] = useState('tracked'); // 'tracked' or 'all'

  useEffect(() => {
    if (isOpen) {
      if (view === 'tracked') {
        dispatch(fetchTrackedRisks());
      } else {
        dispatch(fetchAllSocratesRisks());
      }
    }
  }, [isOpen, view, dispatch]);

  const handleRefresh = () => {
    if (view === 'tracked') {
      dispatch(fetchTrackedRisks());
    } else {
      dispatch(fetchAllSocratesRisks());
    }
  };

  const handlePlanManeuver = (scc_number) => {
    dispatch(startManeuverPlanning(scc_number));
  };

  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setView(newView);
    }
  };

  const renderTrackedRisks = () => {
    if (riskySatellites.length === 0) {
      return (
        <Typography sx={{ mt: 2, textAlign: 'center', color: '#ccc' }}>
          No high-risk conjunctions found for your tracked assets.
        </Typography>
      );
    }
    return (
      <List sx={{ padding: 0 }}>
        {riskySatellites.map((sat) =>
          sat.riskEvents.map((event) => {
            const isPlanning = planningInProgress[sat.noradId];
            const hasPlan = event.required_burn_dv_mps != null;

            return (
              <div key={event.id}>
                <ListItem sx={{ paddingX: 0 }}>
                  <ListItemText
                    primary={`${event.primary_name} ↔ ${event.secondary_name}`}
                    secondary={`Miss Distance: ${event.miss_distance_km.toFixed(
                      2
                    )} km`}
                    primaryTypographyProps={{
                      fontWeight: '500',
                      fontSize: '0.9em',
                    }}
                    secondaryTypographyProps={{
                      color: '#ccc',
                      fontSize: '0.8em',
                    }}
                  />
                  <Box textAlign="right" sx={{ ml: 2 }}>
                    <Typography variant="body2" sx={{ color: '#ff6b6b' }}>
                      Risk:{' '}
                      {event.max_prob
                        ? event.max_prob.toExponential(2)
                        : 'N/A'}
                    </Typography>

                    {hasPlan ? (
                      <Tooltip
                        title={`New Orbit: ${event.new_perigee_km?.toFixed(
                          1
                        )} x ${event.new_apogee_km?.toFixed(1)} km`}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#64ffda',
                            fontWeight: 'bold',
                            mt: 0.5,
                          }}
                        >
                          Burn: {event.required_burn_dv_mps.toFixed(2)} m/s
                        </Typography>
                      </Tooltip>
                    ) : (
                      <Button
                        size="small"
                        sx={{
                          mt: 0.5,
                          p: '2px 8px',
                          fontSize: '0.7rem',
                          minWidth: '100px',
                        }}
                        onClick={() => handlePlanManeuver(sat.noradId)}
                        disabled={isPlanning}
                      >
                        {isPlanning ? (
                          <>
                            <CircularProgress size={12} sx={{ mr: 1 }} />
                            Planning...
                          </>
                        ) : (
                          'Plan Maneuver'
                        )}
                      </Button>
                    )}
                  </Box>
                </ListItem>
                <Divider
                  sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                />
              </div>
            );
          })
        )}
      </List>
    );
  };

  const renderAllSocratesRisks = () => {
    if (allSocratesRisks.length === 0) {
      return (
        <Typography sx={{ mt: 2, textAlign: 'center', color: '#ccc' }}>
          No high-risk conjunctions reported by Socrates.
        </Typography>
      );
    }
    return (
      <List sx={{ padding: 0 }}>
        {allSocratesRisks.map((event) => (
          <div key={event.id}>
            <ListItem sx={{ paddingX: 0 }}>
              <ListItemText
                primary={`${event.primary_name} ↔ ${event.secondary_name}`}
                secondary={`Miss Distance: ${event.miss_distance_km.toFixed(
                  2
                )} km`}
                primaryTypographyProps={{
                  fontWeight: '500',
                  fontSize: '0.9em',
                }}
                secondaryTypographyProps={{ color: '#ccc', fontSize: '0.8em' }}
              />
              <Box textAlign="right" sx={{ ml: 2, minWidth: '120px' }}>
                <Typography variant="body2" sx={{ color: '#ff6b6b' }}>
                  Risk:{' '}
                  {event.max_prob ? event.max_prob.toExponential(2) : 'N/A'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#ccc', mt: 0.5 }}>
                  TCA: {new Date(event.tca).toLocaleDateString()}
                </Typography>
              </Box>
            </ListItem>
            <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
          </div>
        ))}
      </List>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (error) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      );
    }

    return view === 'tracked'
      ? renderTrackedRisks()
      : renderAllSocratesRisks();
  };

  return (
    <Box sx={sidebarStyles(isOpen)}>
      <Box sx={headerStyles}>
        <Typography sx={titleStyles} variant="h6">
          Risk Analysis
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={contentStyles}>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={handleViewChange}
          aria-label="risk view"
          fullWidth
          sx={toggleGroupStyles}
        >
          <ToggleButton value="tracked" aria-label="tracked risks">
            Tracked Risks
          </ToggleButton>
          <ToggleButton value="all" aria-label="all socrates risks">
            All Risks
          </ToggleButton>
        </ToggleButtonGroup>

        {renderContent()}
      </Box>

      <Box sx={footerStyles}>
        <Button onClick={handleRefresh} sx={riskButtonStyles} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh View'}
        </Button>
      </Box>
    </Box>
  );
}

export default Sidebar;