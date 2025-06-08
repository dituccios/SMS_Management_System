import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const WorkflowDetailPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Workflow Details
      </Typography>
      <Alert severity="info">
        Workflow detail view will be implemented here.
      </Alert>
    </Box>
  );
};

export default WorkflowDetailPage;
