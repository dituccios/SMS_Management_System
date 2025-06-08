import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const ReviewsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Review Management
      </Typography>
      <Alert severity="info">
        Review management functionality will be implemented here. This will include document reviews, 
        approval workflows, review scheduling, and review analytics.
      </Alert>
    </Box>
  );
};

export default ReviewsPage;
