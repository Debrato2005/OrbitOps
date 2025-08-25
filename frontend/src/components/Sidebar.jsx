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
import { clearLastPlan } from '../store/analysisSlice';

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
    lastPlan,
  } = useSelector(selectAnalysis);
  const [view, setView] = useState('tracked'); // 'tracked' or 'all'
  const [openEventIds, setOpenEventIds] = useState({});
  const [openSatIds, setOpenSatIds] = useState({});

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

  const toggleEventOpen = (eventId) => {
    setOpenEventIds(prev => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const toggleSatOpen = (noradId) => {
    setOpenSatIds(prev => ({ ...prev, [noradId]: !prev[noradId] }));
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
        {riskySatellites.map((sat) => (
          <div key={sat.noradId}>
            <ListItem sx={{ paddingX: 0 }}>
              <ListItemText
                primary={`${sat.name || 'Satellite'} (#${sat.noradId})`}
                secondary={`${(sat.riskEvents || []).length} event(s)`}
                primaryTypographyProps={{ fontWeight: '600', fontSize: '1.0em' }}
                secondaryTypographyProps={{ color: '#ccc', fontSize: '0.8em' }}
              />
              <Box textAlign="right" sx={{ ml: 2 }}>
                <Button
                  size="small"
                  sx={{ p: '2px 8px', fontSize: '0.7rem', minWidth: '110px' }}
                  onClick={() => toggleSatOpen(sat.noradId)}
                >
                  {openSatIds[sat.noradId] ? 'Hide Planned Data' : 'Show Planned Data'}
                </Button>
              </Box>
            </ListItem>
            <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

            {openSatIds[sat.noradId] && (sat.riskEvents || []).map((event) => {
            const isPlanning = planningInProgress[sat.noradId];
            const hasPlan = event.required_burn_dv_mps != null;
            const isZeroBurn = hasPlan && Math.abs(Number(event.required_burn_dv_mps)) < 1e-3;

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
                      <>
                        {event.new_perigee_km != null && event.new_apogee_km != null && (
                          <>
                            <Button
                              size="small"
                              sx={{ mt: 0.5, p: '2px 8px', fontSize: '0.7rem', minWidth: '100px' }}
                              onClick={() => toggleEventOpen(event.id)}
                            >
                              {openEventIds[event.id] ? 'Hide Orbit' : 'Show Orbit'}
                            </Button>
                            {openEventIds[event.id] && (
                              <Typography variant="caption" sx={{ color: '#ccc', display: 'block' }}>
                                Orbit: {event.new_perigee_km.toFixed(1)} x {event.new_apogee_km.toFixed(1)} km
                              </Typography>
                            )}
                          </>
                        )}
                        {isZeroBurn ? (
                          <Typography variant="body2" sx={{ color: '#9be7ff', fontWeight: 'bold', mt: 0.5 }}>
                            Avoidance not needed (Δv 0.00 m/s)
                          </Typography>
                        ) : (
                          <Tooltip
                            title={
                              event.new_perigee_km != null && event.new_apogee_km != null
                                ? `New Orbit: ${event.new_perigee_km.toFixed(1)} x ${event.new_apogee_km.toFixed(1)} km`
                                : ''
                            }
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
                        )}
                      </>
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
            })}
          </div>
        ))}
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

    return (
      <>
        {lastPlan?.results?.length > 0 && (
          <Box sx={{ mb: 2, p: 2, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 600 }}>Latest Plan</Typography>
              <Button size="small" onClick={() => dispatch(clearLastPlan())} sx={{ color: '#ccc' }}>
                Dismiss
              </Button>
            </Box>
            {lastPlan.summary && (
              <Typography variant="caption" sx={{ color: '#ccc', display: 'block', mt: 1 }}>
                {`Planned ${lastPlan.summary.plannedManeuvers} maneuvers, total Δv ${lastPlan.summary.totalDeltaV.toFixed(2)} m/s`}
              </Typography>
            )}
            <List sx={{ mt: 1, p: 0 }}>
              {lastPlan.results.map((r) => (
                <ListItem key={r.id} sx={{ p: 0 }}>
                  <ListItemText
                    primary={`${r.primary_name} ↔ ${r.secondary_name}`}
                    secondary={`Δv: ${r.required_burn_dv_mps?.toFixed(2) ?? 'N/A'} m/s · Orbit: ${r.new_perigee_km?.toFixed(1) ?? '-'} x ${r.new_apogee_km?.toFixed(1) ?? '-'} km`}
                    primaryTypographyProps={{ fontWeight: '500', fontSize: '0.9em' }}
                    secondaryTypographyProps={{ color: '#ccc', fontSize: '0.8em' }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
        {view === 'tracked' ? renderTrackedRisks() : renderAllSocratesRisks()}
      </>
    );
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