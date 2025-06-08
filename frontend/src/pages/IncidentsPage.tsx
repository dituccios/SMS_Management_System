import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const IncidentsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Incident Management
      </Typography>
      <Alert severity="info">
        Incident management functionality will be implemented here. This will include incident reporting, 
        investigation tracking, corrective actions, and incident analytics.
      </Alert>
    </Box>
  );
};

export default IncidentsPage;
