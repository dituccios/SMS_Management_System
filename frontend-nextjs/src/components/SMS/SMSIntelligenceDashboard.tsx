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
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Analytics as AnalyticsIcon,
  PredictiveText as PredictiveIcon,
  AutoAwesome as AutoAwesomeIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  Psychology as PsychologyIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Download as DownloadIcon
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
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  Scatter,
  ScatterChart
} from 'recharts';
import { useSMSIntelligence } from '../../hooks/useSMSIntelligence';
import { formatDate, formatNumber, formatPercentage } from '../../utils/formatters';

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
      id={`sms-tabpanel-${index}`}
      aria-labelledby={`sms-tab-${index}`}
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

const SMSIntelligenceDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [isAutomationEnabled, setIsAutomationEnabled] = useState(true);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);

  const {
    smsSystem,
    intelligence,
    performance,
    automationStatus,
    alerts,
    recommendations,
    loading,
    error,
    initializeSystem,
    generateIntelligence,
    executeAutomation,
    monitorHealth,
    refreshDashboard
  } = useSMSIntelligence();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        initializeSystem(),
        generateIntelligence(),
        monitorHealth()
      ]);
    } catch (error) {
      console.error('Failed to load SMS Intelligence dashboard:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleAutomationToggle = async () => {
    try {
      if (isAutomationEnabled) {
        // Pause automation
        setIsAutomationEnabled(false);
      } else {
        // Resume automation
        await executeAutomation();
        setIsAutomationEnabled(true);
      }
    } catch (error) {
      console.error('Failed to toggle automation:', error);
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 95) return 'success';
    if (health >= 85) return 'warning';
    return 'error';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircleIcon color="success" />;
      case 'WARNING':
        return <WarningIcon color="warning" />;
      case 'ERROR':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  if (loading && !smsSystem) {
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
        <Box>
          <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PsychologyIcon color="primary" sx={{ fontSize: 40 }} />
            SMS Intelligence Dashboard
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Intelligent Safety Management with Predictive Capabilities
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={isAutomationEnabled}
                onChange={handleAutomationToggle}
                color="primary"
              />
            }
            label="Automation"
          />
          <Badge badgeContent={alerts?.length || 0} color="error">
            <IconButton>
              <NotificationsIcon />
            </IconButton>
          </Badge>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshDashboard}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setIsSettingsDialogOpen(true)}
          >
            Settings
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
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <SpeedIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">System Health</Typography>
                  <Typography variant="h4" color="primary">
                    {performance?.overallHealth?.toFixed(1) || 'N/A'}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={performance?.overallHealth || 0}
                    color={getHealthColor(performance?.overallHealth || 0) as any}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <SecurityIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">Risk Score</Typography>
                  <Typography variant="h4" color="success.main">
                    {intelligence?.insights?.filter(i => i.type === 'RISK')?.[0]?.confidence ? 
                      (100 - intelligence.insights.filter(i => i.type === 'RISK')[0].confidence * 100).toFixed(0) : 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Low Risk Level
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
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <SchoolIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">Training Effectiveness</Typography>
                  <Typography variant="h4" color="info.main">
                    {intelligence?.insights?.filter(i => i.type === 'TRAINING')?.[0]?.confidence ? 
                      (intelligence.insights.filter(i => i.type === 'TRAINING')[0].confidence * 100).toFixed(0) : 'N/A'}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    High Effectiveness
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
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <AssessmentIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">Compliance Score</Typography>
                  <Typography variant="h4" color="warning.main">
                    {intelligence?.insights?.filter(i => i.type === 'COMPLIANCE')?.[0]?.confidence ? 
                      (intelligence.insights.filter(i => i.type === 'COMPLIANCE')[0].confidence * 100).toFixed(0) : 'N/A'}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Good Compliance
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="SMS intelligence tabs">
          <Tab label="Intelligence Overview" id="sms-tab-0" />
          <Tab label="Risk Analytics" id="sms-tab-1" />
          <Tab label="Training Intelligence" id="sms-tab-2" />
          <Tab label="Compliance Forecasting" id="sms-tab-3" />
          <Tab label="Predictive Insights" id="sms-tab-4" />
          <Tab label="Automation & Alerts" id="sms-tab-5" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <Grid container spacing={3}>
          {/* Intelligence Insights */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Intelligence Insights
                </Typography>
                <Box sx={{ height: 400 }}>
                  {intelligence?.insights && intelligence.insights.length > 0 ? (
                    <List>
                      {intelligence.insights.slice(0, 5).map((insight, index) => (
                        <ListItem
                          key={insight.insightId}
                          button
                          onClick={() => setSelectedInsight(insight)}
                          divider
                        >
                          <ListItemIcon>
                            <Chip
                              label={insight.severity}
                              color={getSeverityColor(insight.severity) as any}
                              size="small"
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={insight.title}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="textSecondary">
                                  {insight.description}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  Confidence: {(insight.confidence * 100).toFixed(0)}% • 
                                  {insight.actionable ? ' Actionable' : ' Informational'}
                                </Typography>
                              </Box>
                            }
                          />
                          <IconButton size="small">
                            <VisibilityIcon />
                          </IconButton>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography color="textSecondary">No insights available</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* System Performance */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Performance
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="20%"
                      outerRadius="90%"
                      data={[
                        {
                          name: 'Health',
                          value: performance?.overallHealth || 0,
                          fill: '#4caf50'
                        },
                        {
                          name: 'Availability',
                          value: performance?.availability || 0,
                          fill: '#2196f3'
                        },
                        {
                          name: 'Performance',
                          value: 100 - (performance?.errorRate || 0) * 100,
                          fill: '#ff9800'
                        }
                      ]}
                    >
                      <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" />
                      <RechartsTooltip />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Intelligent Recommendations */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Intelligent Recommendations
                </Typography>
                <Grid container spacing={2}>
                  {recommendations?.slice(0, 3).map((rec, index) => (
                    <Grid item xs={12} md={4} key={index}>
                      <Paper sx={{ p: 2, height: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <AutoAwesomeIcon color="primary" />
                          <Chip
                            label={rec.priority || 'MEDIUM'}
                            color={getSeverityColor(rec.priority || 'MEDIUM') as any}
                            size="small"
                          />
                        </Box>
                        <Typography variant="subtitle1" gutterBottom>
                          {rec.title || `Recommendation ${index + 1}`}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" paragraph>
                          {rec.description || 'Optimize system performance through targeted improvements.'}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="textSecondary">
                            Impact: {rec.expectedImpact?.complianceImprovement || 15}%
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setSelectedRecommendation(rec)}
                          >
                            View Details
                          </Button>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <Grid container spacing={3}>
          {/* Risk Trends */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Trends & Analytics
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={[
                      { date: '2024-01', overall: 75, operational: 70, compliance: 80, training: 85 },
                      { date: '2024-02', overall: 72, operational: 68, compliance: 76, training: 82 },
                      { date: '2024-03', overall: 68, operational: 65, compliance: 72, training: 78 },
                      { date: '2024-04', overall: 65, operational: 62, compliance: 68, training: 75 },
                      { date: '2024-05', overall: 62, operational: 58, compliance: 65, training: 72 },
                      { date: '2024-06', overall: 58, operational: 55, compliance: 62, training: 68 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="overall"
                        fill="#ff9800"
                        fillOpacity={0.3}
                        stroke="#ff9800"
                        name="Overall Risk"
                      />
                      <Line
                        type="monotone"
                        dataKey="operational"
                        stroke="#f44336"
                        strokeWidth={2}
                        name="Operational Risk"
                      />
                      <Line
                        type="monotone"
                        dataKey="compliance"
                        stroke="#2196f3"
                        strokeWidth={2}
                        name="Compliance Risk"
                      />
                      <Line
                        type="monotone"
                        dataKey="training"
                        stroke="#4caf50"
                        strokeWidth={2}
                        name="Training Risk"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Risk Categories */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Categories
                </Typography>
                <Box sx={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Operational', value: 35, fill: '#f44336' },
                          { name: 'Compliance', value: 25, fill: '#2196f3' },
                          { name: 'Training', value: 20, fill: '#4caf50' },
                          { name: 'Technical', value: 15, fill: '#ff9800' },
                          { name: 'Other', value: 5, fill: '#9c27b0' }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      />
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Grid container spacing={3}>
          {/* Training Effectiveness */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Training Effectiveness Trends
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { month: 'Jan', completion: 85, satisfaction: 4.2, retention: 78 },
                      { month: 'Feb', completion: 88, satisfaction: 4.3, retention: 82 },
                      { month: 'Mar', completion: 92, satisfaction: 4.5, retention: 85 },
                      { month: 'Apr', completion: 89, satisfaction: 4.4, retention: 83 },
                      { month: 'May', completion: 94, satisfaction: 4.6, retention: 88 },
                      { month: 'Jun', completion: 96, satisfaction: 4.7, retention: 90 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="completion"
                        stroke="#4caf50"
                        strokeWidth={2}
                        name="Completion Rate %"
                      />
                      <Line
                        type="monotone"
                        dataKey="retention"
                        stroke="#2196f3"
                        strokeWidth={2}
                        name="Retention Rate %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Additional tabs and dialogs would continue here */}
        </Grid>
      </TabPanel>

      {/* Remaining tab panels would be implemented similarly */}
      <TabPanel value={currentTab} index={3}>
        <Typography>Compliance Forecasting content...</Typography>
      </TabPanel>

      <TabPanel value={currentTab} index={4}>
        <Typography>Predictive Insights content...</Typography>
      </TabPanel>

      <TabPanel value={currentTab} index={5}>
        <Typography>Automation & Alerts content...</Typography>
      </TabPanel>
    </Box>
  );
};

export default SMSIntelligenceDashboard;
