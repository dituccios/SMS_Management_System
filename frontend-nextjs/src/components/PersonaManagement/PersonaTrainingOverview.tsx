import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Badge,
  CircularProgress,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Certificate as CertificateIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { usePersonaTraining } from '../../hooks/useTrainingAnalytics';
import { formatDate, formatPercentage } from '../../utils/formatters';
import TrainingAssignmentDialog from './TrainingAssignmentDialog';
import ProgressUpdateDialog from './ProgressUpdateDialog';
import ComplianceStatusCard from './ComplianceStatusCard';

interface PersonaTrainingOverviewProps {
  personaId: string;
  onTrainingAssigned?: () => void;
  onProgressUpdated?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`training-tabpanel-${index}`}
      aria-labelledby={`training-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const PersonaTrainingOverview: React.FC<PersonaTrainingOverviewProps> = ({
  personaId,
  onTrainingAssigned,
  onProgressUpdated
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<any>(null);

  const {
    trainingStatus,
    complianceStatus,
    loading,
    error,
    assignTraining,
    updateProgress,
    refreshStatus
  } = usePersonaTraining(personaId);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleAssignTraining = async (trainingData: any) => {
    try {
      await assignTraining(trainingData);
      setIsAssignmentDialogOpen(false);
      if (onTrainingAssigned) onTrainingAssigned();
    } catch (error) {
      console.error('Failed to assign training:', error);
    }
  };

  const handleUpdateProgress = async (progressData: any) => {
    try {
      if (selectedTraining) {
        await updateProgress(selectedTraining.trainingId, progressData);
        setIsProgressDialogOpen(false);
        setSelectedTraining(null);
        if (onProgressUpdated) onProgressUpdated();
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'info';
      case 'OVERDUE': return 'error';
      case 'ENROLLED': return 'warning';
      default: return 'default';
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT': return 'success';
      case 'NON_COMPLIANT': return 'error';
      case 'AT_RISK': return 'warning';
      default: return 'default';
    }
  };

  if (loading && !trainingStatus) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  const stats = trainingStatus?.stats || {};
  const records = trainingStatus?.records || [];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Training & Compliance Overview
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsAssignmentDialogOpen(true)}
        >
          Assign Training
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SchoolIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{stats.total || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Training
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{stats.completed || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Completed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ScheduleIcon color="info" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{stats.inProgress || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    In Progress
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <WarningIcon color="error" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{stats.overdue || 0}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Overdue
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Compliance Status */}
      {complianceStatus && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <ComplianceStatusCard complianceStatus={complianceStatus} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance Score
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={complianceStatus.complianceScore}
                      sx={{ height: 10, borderRadius: 5 }}
                      color={getComplianceColor(complianceStatus.overallStatus) as any}
                    />
                  </Box>
                  <Typography variant="h6">
                    {complianceStatus.complianceScore}%
                  </Typography>
                </Box>
                <Chip
                  label={complianceStatus.overallStatus}
                  color={getComplianceColor(complianceStatus.overallStatus) as any}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="training tabs">
          <Tab 
            icon={<AssignmentIcon />} 
            label="Training Records" 
            id="training-tab-0"
            aria-controls="training-tabpanel-0"
          />
          <Tab 
            icon={<CertificateIcon />} 
            label="Certifications" 
            id="training-tab-1"
            aria-controls="training-tabpanel-1"
          />
          <Tab 
            icon={<AssessmentIcon />} 
            label="Compliance" 
            id="training-tab-2"
            aria-controls="training-tabpanel-2"
          />
        </Tabs>
      </Box>

      {/* Training Records Tab */}
      <TabPanel value={currentTab} index={0}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Training</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((record: any) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2">
                        {record.training.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {record.training.category}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.status}
                      color={getStatusColor(record.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={record.progress}
                        sx={{ flex: 1, height: 6 }}
                      />
                      <Typography variant="caption">
                        {record.progress}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {record.score ? `${record.score}%` : '-'}
                  </TableCell>
                  <TableCell>
                    {record.metadata?.dueDate 
                      ? formatDate(new Date(record.metadata.dueDate))
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Update Progress">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedTraining(record);
                          setIsProgressDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Details">
                      <IconButton size="small">
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Certifications Tab */}
      <TabPanel value={currentTab} index={1}>
        <Typography variant="body1">
          Certifications content will be displayed here
        </Typography>
      </TabPanel>

      {/* Compliance Tab */}
      <TabPanel value={currentTab} index={2}>
        {complianceStatus && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Compliance Violations
                  </Typography>
                  {complianceStatus.violations.length === 0 ? (
                    <Alert severity="success">
                      No compliance violations found
                    </Alert>
                  ) : (
                    complianceStatus.violations.map((violation: any, index: number) => (
                      <Alert 
                        key={index} 
                        severity={violation.severity === 'CRITICAL' ? 'error' : 'warning'}
                        sx={{ mb: 1 }}
                      >
                        {violation.description}
                      </Alert>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recommendations
                  </Typography>
                  {complianceStatus.recommendations.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">
                      No recommendations at this time
                    </Typography>
                  ) : (
                    complianceStatus.recommendations.map((recommendation: string, index: number) => (
                      <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                        • {recommendation}
                      </Typography>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      {/* Training Assignment Dialog */}
      <TrainingAssignmentDialog
        open={isAssignmentDialogOpen}
        onClose={() => setIsAssignmentDialogOpen(false)}
        onAssign={handleAssignTraining}
        personaId={personaId}
      />

      {/* Progress Update Dialog */}
      <ProgressUpdateDialog
        open={isProgressDialogOpen}
        onClose={() => {
          setIsProgressDialogOpen(false);
          setSelectedTraining(null);
        }}
        onUpdate={handleUpdateProgress}
        trainingRecord={selectedTraining}
      />
    </Box>
  );
};

export default PersonaTrainingOverview;
