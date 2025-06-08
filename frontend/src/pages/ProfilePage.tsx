import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const ProfilePage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        User Profile
      </Typography>
      <Alert severity="info">
        User profile functionality will be implemented here. This will include profile editing, 
        password changes, notification preferences, and account settings.
      </Alert>
    </Box>
  );
};

export default ProfilePage;
