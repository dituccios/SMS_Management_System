import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const UsersPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        User Management
      </Typography>
      <Alert severity="info">
        User management functionality will be implemented here. This will include user creation, 
        role assignment, permission management, and user activity monitoring.
      </Alert>
    </Box>
  );
};

export default UsersPage;
