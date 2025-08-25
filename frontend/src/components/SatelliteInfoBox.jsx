import { useMemo } from 'react';
import * as satellite from 'satellite.js';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const infoBoxStyles = (isVisible) => ({
  position: 'absolute',
  top: '50%',
  left: isVisible ? '20px' : '-400px',
  transform: 'translateY(-50%)',
  width: '280px',
  backgroundColor: 'rgba(26, 26, 26, 0.9)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '0px',
  color: 'white',
  padding: '16px',
  zIndex: 10,
  transition: 'left 0.5s ease-in-out',
  fontFamily: '"Exo 2", sans-serif',
});

const headerStyles = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
};

const titleStyles = {
  fontSize: '1.1em',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
};

const dataGridStyles = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px',
};

const dataItemStyles = {
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  padding: '8px',
  borderRadius: '0px',
};

const labelStyles = {
  fontSize: '0.75em',
  color: '#aaa',
  textTransform: 'uppercase',
  letterSpacing: '1px',
};

const valueStyles = {
  fontSize: '1.0em',
  fontWeight: 600,
  color: '#64ffda',
  letterSpacing: '0.5px',
};

function SatelliteInfoBox({ satellite: selectedSatellite, time, onClear }) {
  const satelliteData = useMemo(() => {
    if (!selectedSatellite || !selectedSatellite.tleLine1 || !selectedSatellite.tleLine2) {
      return null;
    }

    try {
      const satrec = satellite.twoline2satrec(selectedSatellite.tleLine1, selectedSatellite.tleLine2);
      const positionAndVelocity = satellite.propagate(satrec, time);
      const gmst = satellite.gstime(time);

      if (!positionAndVelocity.position || !positionAndVelocity.velocity) {
        return null;
      }

      const geodetic = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
      const velocity = Math.sqrt(
        Math.pow(positionAndVelocity.velocity.x, 2) +
        Math.pow(positionAndVelocity.velocity.y, 2) +
        Math.pow(positionAndVelocity.velocity.z, 2)
      );

      return {
        lat: satellite.radiansToDegrees(geodetic.latitude),
        lng: satellite.radiansToDegrees(geodetic.longitude),
        alt: geodetic.height,
        velocity: velocity,
      };
    } catch (error) {
      console.warn("Error calculating satellite data:", error);
      return null;
    }
  }, [selectedSatellite, time]);

  const { details } = selectedSatellite || {};

  return (
    <Box sx={infoBoxStyles(!!selectedSatellite)}>
      {selectedSatellite && satelliteData && (
        <>
          <Box sx={headerStyles}>
            <Typography sx={titleStyles} variant="h6">
              {details?.NAME || selectedSatellite.name}
            </Typography>
            <IconButton onClick={onClear} size="small" sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={dataGridStyles}>
            <Box sx={dataItemStyles}>
              <Typography sx={labelStyles}>NORAD ID</Typography>
              <Typography sx={valueStyles}>{selectedSatellite.noradId}</Typography>
            </Box>
            <Box sx={dataItemStyles}>
              <Typography sx={labelStyles}>Type</Typography>
              <Typography sx={valueStyles}>{details?.OBJECT_TYPE || 'PAYLOAD'}</Typography>
            </Box>
            <Box sx={dataItemStyles}>
              <Typography sx={labelStyles}>Altitude</Typography>
              <Typography sx={valueStyles}>{satelliteData.alt.toFixed(2)} km</Typography>
            </Box>
            <Box sx={dataItemStyles}>
              <Typography sx={labelStyles}>Velocity</Typography>
              <Typography sx={valueStyles}>{satelliteData.velocity.toFixed(2)} km/s</Typography>
            </Box>
            <Box sx={dataItemStyles}>
              <Typography sx={labelStyles}>Latitude</Typography>
              <Typography sx={valueStyles}>{satelliteData.lat.toFixed(4)}°</Typography>
            </Box>
            <Box sx={dataItemStyles}>
              <Typography sx={labelStyles}>Longitude</Typography>
              <Typography sx={valueStyles}>{satelliteData.lng.toFixed(4)}°</Typography>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

export default SatelliteInfoBox;