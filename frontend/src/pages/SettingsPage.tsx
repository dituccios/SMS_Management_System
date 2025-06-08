import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const SettingsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        System Settings
      </Typography>
      <Alert severity="info">
        System settings functionality will be implemented here. This will include company settings, 
        system configuration, integration settings, and administrative controls.
      </Alert>
    </Box>
  );
};

export default SettingsPage;
