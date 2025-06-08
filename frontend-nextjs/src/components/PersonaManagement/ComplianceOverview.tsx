import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Alert,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Security as SecurityIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { useComplianceOverview } from '../../hooks/useComplianceOverview';
import { formatDate, formatPercentage } from '../../utils/formatters';

const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0'];

const ComplianceOverview: React.FC = () => {
  const {
    complianceData,
    loading,
    error,
    refreshData,
    generateComplianceReport,
    getComplianceAlerts
  } = useComplianceOverview();

  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const alertsData = await getComplianceAlerts();
      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to load compliance alerts:', error);
    }
  };

  const handleGenerateReport = async () => {
    try {
      await generateComplianceReport();
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
    }
  };

  const getComplianceScore = () => {
    if (!complianceData) return 0;
    const { training, certifications, gdpr } = complianceData;
    
    const trainingScore = training.compliant / (training.total || 1) * 100;
    const certificationScore = certifications.active / (certifications.total || 1) * 100;
    const gdprScore = gdpr.consentRate * 100;
    
    return Math.round((trainingScore + certificationScore + gdprScore) / 3);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircleIcon color="success" />;
    if (score >= 70) return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  const trainingComplianceData = complianceData ? [
    { name: 'Compliant', value: complianceData.training.compliant, color: '#4caf50' },
    { name: 'Overdue', value: complianceData.training.overdue, color: '#f44336' },
    { name: 'Pending', value: complianceData.training.pending, color: '#ff9800' },
    { name: 'Exempt', value: complianceData.training.exempt, color: '#2196f3' }
  ] : [];

  const certificationStatusData = complianceData ? [
    { name: 'Active', value: complianceData.certifications.active, color: '#4caf50' },
    { name: 'Expired', value: complianceData.certifications.expired, color: '#f44336' },
    { name: 'Expiring Soon', value: complianceData.certifications.expiringSoon, color: '#ff9800' },
    { name: 'Pending Renewal', value: complianceData.certifications.pendingRenewal, color: '#2196f3' }
  ] : [];

  const departmentComplianceData = complianceData?.departmentBreakdown || [];

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
          Loading compliance data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!complianceData) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        No compliance data available.
      </Alert>
    );
  }

  const complianceScore = getComplianceScore();

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Compliance Overview
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<WarningIcon />}
            onClick={() => setAlertsOpen(true)}
            color={alerts.length > 0 ? 'error' : 'primary'}
          >
            Alerts ({alerts.length})
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleGenerateReport}
          >
            Generate Report
          </Button>
        </Box>
      </Box>

      {/* Overall Compliance Score */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
            {getScoreIcon(complianceScore)}
            <Typography variant="h3" sx={{ ml: 2, color: getScoreColor(complianceScore) === 'success' ? 'success.main' : getScoreColor(complianceScore) === 'warning' ? 'warning.main' : 'error.main' }}>
              {complianceScore}%
            </Typography>
          </Box>
          <Typography variant="h6" align="center" gutterBottom>
            Overall Compliance Score
          </Typography>
          <LinearProgress
            variant="determinate"
            value={complianceScore}
            color={getScoreColor(complianceScore) as any}
            sx={{ height: 10, borderRadius: 5 }}
          />
          <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
            Last updated: {formatDate(complianceData.lastUpdated)}
          </Typography>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PeopleIcon color="primary" />
                <Box>
                  <Typography variant="h6">{complianceData.personnel.total}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Personnel
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SchoolIcon color="success" />
                <Box>
                  <Typography variant="h6">{complianceData.training.compliant}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Training Compliant
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentIcon color="info" />
                <Box>
                  <Typography variant="h6">{complianceData.certifications.active}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Certifications
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon color="warning" />
                <Box>
                  <Typography variant="h6">{formatPercentage(complianceData.gdpr.consentRate)}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    GDPR Consent Rate
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Training Compliance Status
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={trainingComplianceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {trainingComplianceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Certification Status
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={certificationStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {certificationStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Department Breakdown */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Compliance by Department
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={departmentComplianceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="department" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="compliant" fill="#4caf50" name="Compliant" />
              <Bar dataKey="nonCompliant" fill="#f44336" name="Non-Compliant" />
              <Bar dataKey="pending" fill="#ff9800" name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Critical Issues */}
      {complianceData.criticalIssues && complianceData.criticalIssues.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="error">
              Critical Compliance Issues
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Issue</TableCell>
                    <TableCell>Personnel</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell>Priority</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {complianceData.criticalIssues.map((issue: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{issue.description}</TableCell>
                      <TableCell>{issue.personnelName}</TableCell>
                      <TableCell>{issue.department}</TableCell>
                      <TableCell>{formatDate(issue.dueDate)}</TableCell>
                      <TableCell>
                        <Chip
                          label={issue.priority}
                          color={issue.priority === 'CRITICAL' ? 'error' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Alerts Dialog */}
      <Dialog open={alertsOpen} onClose={() => setAlertsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Compliance Alerts
        </DialogTitle>
        <DialogContent>
          {alerts.length === 0 ? (
            <Alert severity="success">
              No compliance alerts at this time.
            </Alert>
          ) : (
            <List>
              {alerts.map((alert, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>
                      {alert.severity === 'CRITICAL' ? (
                        <ErrorIcon color="error" />
                      ) : alert.severity === 'HIGH' ? (
                        <WarningIcon color="warning" />
                      ) : (
                        <InfoIcon color="info" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={alert.title}
                      secondary={
                        <Box>
                          <Typography variant="body2">{alert.description}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {formatDate(alert.createdAt)}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < alerts.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComplianceOverview;
