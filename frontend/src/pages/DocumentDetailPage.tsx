import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const DocumentDetailPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Document Details
      </Typography>
      <Alert severity="info">
        Document detail view will be implemented here.
      </Alert>
    </Box>
  );
};

export default DocumentDetailPage;
