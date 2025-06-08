import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendingUpIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  BugReport as BugReportIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useSystemIntegration } from '../../hooks/useSystemIntegration';
import { formatDate, formatDateTime } from '../../utils/formatters';

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
      id={`compliance-tabpanel-${index}`}
      aria-labelledby={`compliance-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const ComplianceManagementDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isOptimizationDialogOpen, setIsOptimizationDialogOpen] = useState(false);

  const {
    systemHealth,
    complianceDashboard,
    testResults,
    optimizations,
    loading,
    error,
    performHealthCheck,
    getComplianceDashboard,
    executeE2ETests,
    performSecurityReview,
    optimizePerformance,
    validateIntegration
  } = useSystemIntegration();

  useEffect(() => {
    // Load initial data
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        performHealthCheck(),
        getComplianceDashboard()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleRunTests = async () => {
    try {
      await executeE2ETests();
      setIsTestDialogOpen(false);
    } catch (error) {
      console.error('Failed to run tests:', error);
    }
  };

  const handleOptimizeSystem = async () => {
    try {
      await optimizePerformance();
      setIsOptimizationDialogOpen(false);
    } catch (error) {
      console.error('Failed to optimize system:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY':
      case 'PASSED':
      case 'COMPLIANT':
        return 'success';
      case 'WARNING':
      case 'PARTIALLY_COMPLIANT':
        return 'warning';
      case 'CRITICAL':
      case 'FAILED':
      case 'NON_COMPLIANT':
        return 'error';
      case 'DOWN':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
      case 'PASSED':
      case 'COMPLIANT':
        return <CheckCircleIcon color="success" />;
      case 'WARNING':
      case 'PARTIALLY_COMPLIANT':
        return <WarningIcon color="warning" />;
      case 'CRITICAL':
      case 'FAILED':
      case 'NON_COMPLIANT':
      case 'DOWN':
        return <ErrorIcon color="error" />;
      default:
        return <ScheduleIcon />;
    }
  };

  if (loading && !systemHealth && !complianceDashboard) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Compliance Management System
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadDashboardData}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<PlayIcon />}
            onClick={() => setIsTestDialogOpen(true)}
          >
            Run Tests
          </Button>
          <Button
            variant="outlined"
            startIcon={<SpeedIcon />}
            onClick={() => setIsOptimizationDialogOpen(true)}
          >
            Optimize
          </Button>
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* System Status Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {systemHealth && getStatusIcon(systemHealth.overallStatus)}
                <Box>
                  <Typography variant="h6">System Health</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {systemHealth?.overallStatus || 'Unknown'}
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
                <AssessmentIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6">Compliance Score</Typography>
                  <Typography variant="h4" color="primary">
                    {complianceDashboard?.overallScore || 0}%
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
                <SecurityIcon color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6">Security Status</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {systemHealth?.security?.threatLevel || 'Unknown'}
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
                <TrendingUpIcon color="info" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6">Performance</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {systemHealth?.performance ? 
                      `${Math.round(systemHealth.performance.averageResponseTime)}ms avg` : 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="compliance tabs">
          <Tab label="Dashboard" id="compliance-tab-0" />
          <Tab label="System Health" id="compliance-tab-1" />
          <Tab label="Compliance" id="compliance-tab-2" />
          <Tab label="Testing" id="compliance-tab-3" />
          <Tab label="Performance" id="compliance-tab-4" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <Grid container spacing={3}>
          {/* Compliance Framework Scores */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance Framework Scores
                </Typography>
                {complianceDashboard?.frameworkScores?.map((framework) => (
                  <Box key={framework.framework} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">{framework.framework}</Typography>
                      <Typography variant="body2">{framework.score}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={framework.score}
                      color={framework.score >= 90 ? 'success' : framework.score >= 70 ? 'warning' : 'error'}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Risk Assessment */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Assessment
                </Typography>
                {complianceDashboard?.riskAssessment && (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      {getStatusIcon(complianceDashboard.riskAssessment.overallRiskLevel)}
                      <Box>
                        <Typography variant="body1">
                          Overall Risk Level: {complianceDashboard.riskAssessment.overallRiskLevel}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Risk Score: {complianceDashboard.riskAssessment.riskScore}
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={complianceDashboard.riskAssessment.riskScore}
                      color={complianceDashboard.riskAssessment.riskScore < 30 ? 'success' : 
                             complianceDashboard.riskAssessment.riskScore < 70 ? 'warning' : 'error'}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Upcoming Deadlines */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Upcoming Compliance Deadlines
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Title</TableCell>
                        <TableCell>Framework</TableCell>
                        <TableCell>Due Date</TableCell>
                        <TableCell>Assigned To</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {complianceDashboard?.upcomingDeadlines?.map((deadline) => (
                        <TableRow key={deadline.id}>
                          <TableCell>{deadline.title}</TableCell>
                          <TableCell>{deadline.framework}</TableCell>
                          <TableCell>{formatDate(deadline.dueDate)}</TableCell>
                          <TableCell>{deadline.assignedTo}</TableCell>
                          <TableCell>
                            <Chip
                              label={deadline.priority}
                              color={getStatusColor(deadline.priority) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={deadline.status}
                              color={getStatusColor(deadline.status) as any}
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
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <Grid container spacing={3}>
          {/* Service Health Status */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Service Health Status
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Service</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Response Time</TableCell>
                        <TableCell>Error Rate</TableCell>
                        <TableCell>Last Check</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {systemHealth?.services?.map((service) => (
                        <TableRow key={service.serviceName}>
                          <TableCell>{service.serviceName}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getStatusIcon(service.status)}
                              {service.status}
                            </Box>
                          </TableCell>
                          <TableCell>{Math.round(service.responseTime)}ms</TableCell>
                          <TableCell>{service.errorRate.toFixed(2)}%</TableCell>
                          <TableCell>{formatDateTime(service.lastCheck)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Performance Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Metrics
                </Typography>
                {systemHealth?.performance && (
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Average Response Time"
                        secondary={`${Math.round(systemHealth.performance.averageResponseTime)}ms`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Throughput"
                        secondary={`${Math.round(systemHealth.performance.throughput)} req/min`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Error Rate"
                        secondary={`${systemHealth.performance.errorRate.toFixed(2)}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Memory Usage"
                        secondary={`${Math.round(systemHealth.performance.memoryUsage)}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="CPU Usage"
                        secondary={`${Math.round(systemHealth.performance.cpuUsage)}%`}
                      />
                    </ListItem>
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* System Recommendations */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Recommendations
                </Typography>
                <List>
                  {systemHealth?.recommendations?.map((recommendation, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <BugReportIcon color="warning" />
                      </ListItemIcon>
                      <ListItemText primary={recommendation} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Grid container spacing={3}>
          {/* Compliance Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance Metrics
                </Typography>
                {complianceDashboard?.complianceMetrics && (
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Total Documents"
                        secondary={complianceDashboard.complianceMetrics.totalDocuments}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Compliant Documents"
                        secondary={complianceDashboard.complianceMetrics.compliantDocuments}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Expired Documents"
                        secondary={complianceDashboard.complianceMetrics.expiredDocuments}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Overdue Reviews"
                        secondary={complianceDashboard.complianceMetrics.overdueReviews}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Security Incidents"
                        secondary={complianceDashboard.complianceMetrics.securityIncidents}
                      />
                    </ListItem>
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Compliance Alerts */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance Alerts
                </Typography>
                <List>
                  {complianceDashboard?.alerts?.map((alert) => (
                    <ListItem key={alert.id}>
                      <ListItemIcon>
                        {getStatusIcon(alert.severity)}
                      </ListItemIcon>
                      <ListItemText
                        primary={alert.title}
                        secondary={alert.description}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <Grid container spacing={3}>
          {/* Test Results */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  End-to-End Test Results
                </Typography>
                {testResults && (
                  <Box>
                    <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
                      <Box>
                        <Typography variant="h4" color="success.main">
                          {testResults.results.passedTests}
                        </Typography>
                        <Typography variant="body2">Passed</Typography>
                      </Box>
                      <Box>
                        <Typography variant="h4" color="error.main">
                          {testResults.results.failedTests}
                        </Typography>
                        <Typography variant="body2">Failed</Typography>
                      </Box>
                      <Box>
                        <Typography variant="h4" color="warning.main">
                          {testResults.results.skippedTests}
                        </Typography>
                        <Typography variant="body2">Skipped</Typography>
                      </Box>
                      <Box>
                        <Typography variant="h4" color="primary.main">
                          {testResults.results.passRate.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2">Pass Rate</Typography>
                      </Box>
                    </Box>

                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Test Case</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>Priority</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Execution Time</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {testResults.testCases.map((testCase) => (
                            <TableRow key={testCase.testId}>
                              <TableCell>{testCase.name}</TableCell>
                              <TableCell>{testCase.category}</TableCell>
                              <TableCell>
                                <Chip
                                  label={testCase.priority}
                                  color={getStatusColor(testCase.priority) as any}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {getStatusIcon(testCase.status)}
                                  {testCase.status}
                                </Box>
                              </TableCell>
                              <TableCell>
                                {testCase.executionTime ? `${testCase.executionTime}ms` : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={4}>
        <Grid container spacing={3}>
          {/* Performance Optimizations */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Optimizations
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Optimization</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Current</TableCell>
                        <TableCell>Target</TableCell>
                        <TableCell>Priority</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {optimizations?.map((optimization, index) => (
                        <TableRow key={index}>
                          <TableCell>{optimization.description}</TableCell>
                          <TableCell>{optimization.optimizationType}</TableCell>
                          <TableCell>{optimization.currentMetric}</TableCell>
                          <TableCell>{optimization.targetMetric}</TableCell>
                          <TableCell>
                            <Chip
                              label={optimization.priority}
                              color={getStatusColor(optimization.priority) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={optimization.status}
                              color={getStatusColor(optimization.status) as any}
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
          </Grid>
        </Grid>
      </TabPanel>

      {/* Test Execution Dialog */}
      <Dialog
        open={isTestDialogOpen}
        onClose={() => setIsTestDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Execute End-to-End Tests</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            This will run comprehensive end-to-end tests across the entire SMS Management System.
            The tests will validate:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Incident management workflows" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Document management integration" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Audit trail functionality" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Compliance reporting" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Security controls" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTestDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRunTests}
            disabled={loading}
          >
            Run Tests
          </Button>
        </DialogActions>
      </Dialog>

      {/* Optimization Dialog */}
      <Dialog
        open={isOptimizationDialogOpen}
        onClose={() => setIsOptimizationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>System Performance Optimization</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            This will analyze system performance and generate optimization recommendations for:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Database query performance" />
            </ListItem>
            <ListItem>
              <ListItemText primary="API response times" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Memory and CPU usage" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Storage optimization" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Network performance" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOptimizationDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleOptimizeSystem}
            disabled={loading}
          >
            Optimize
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComplianceManagementDashboard;
