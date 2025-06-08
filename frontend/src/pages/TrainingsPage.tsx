import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const TrainingsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Training Management
      </Typography>
      <Alert severity="info">
        Training management functionality will be implemented here. This will include training program creation, 
        scheduling, progress tracking, and certification management.
      </Alert>
    </Box>
  );
};

export default TrainingsPage;
