import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const IncidentDetailPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Incident Details
      </Typography>
      <Alert severity="info">
        Incident detail view will be implemented here.
      </Alert>
    </Box>
  );
};

export default IncidentDetailPage;
