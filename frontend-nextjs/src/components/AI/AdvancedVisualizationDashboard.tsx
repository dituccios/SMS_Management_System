import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Button,
  IconButton,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Map as MapIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  FilterList as FilterListIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ComposedChart,
  Heatmap,
  RadialBarChart,
  RadialBar,
  Treemap,
  Sankey,
  FunnelChart,
  Funnel
} from 'recharts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`visualization-tabpanel-${index}`}
      aria-labelledby={`visualization-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface ForecastData {
  timestamp: string;
  actual?: number;
  predicted: number;
  upperBound: number;
  lowerBound: number;
  confidence: number;
}

interface RiskHeatmapData {
  category: string;
  subcategory: string;
  riskLevel: number;
  impact: number;
  probability: number;
  mitigation: string;
}

interface OptimizationData {
  scenario: string;
  cost: number;
  efficiency: number;
  resources: number;
  timeline: number;
  feasibility: number;
}

interface WeatherImpactData {
  location: string;
  lat: number;
  lng: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impact: number;
}

interface MaintenanceTask {
  taskId: string;
  name: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scheduledDate: string;
  estimatedDuration: number;
  assignedTo: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  dependencies: string[];
}

const AdvancedVisualizationDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['all']);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sample data
  const [forecastData] = useState<ForecastData[]>([
    { timestamp: '2024-01-01', actual: 85, predicted: 87, upperBound: 92, lowerBound: 82, confidence: 0.95 },
    { timestamp: '2024-01-02', actual: 88, predicted: 89, upperBound: 94, lowerBound: 84, confidence: 0.93 },
    { timestamp: '2024-01-03', actual: 92, predicted: 91, upperBound: 96, lowerBound: 86, confidence: 0.91 },
    { timestamp: '2024-01-04', predicted: 93, upperBound: 98, lowerBound: 88, confidence: 0.89 },
    { timestamp: '2024-01-05', predicted: 95, upperBound: 100, lowerBound: 90, confidence: 0.87 },
    { timestamp: '2024-01-06', predicted: 97, upperBound: 102, lowerBound: 92, confidence: 0.85 },
    { timestamp: '2024-01-07', predicted: 99, upperBound: 104, lowerBound: 94, confidence: 0.83 }
  ]);

  const [riskHeatmapData] = useState<RiskHeatmapData[]>([
    { category: 'Operational', subcategory: 'Equipment Failure', riskLevel: 8, impact: 9, probability: 7, mitigation: 'Preventive Maintenance' },
    { category: 'Operational', subcategory: 'Human Error', riskLevel: 6, impact: 7, probability: 8, mitigation: 'Training Programs' },
    { category: 'Operational', subcategory: 'Process Deviation', riskLevel: 7, impact: 8, probability: 6, mitigation: 'Process Controls' },
    { category: 'Environmental', subcategory: 'Weather Events', riskLevel: 5, impact: 8, probability: 4, mitigation: 'Weather Monitoring' },
    { category: 'Environmental', subcategory: 'Natural Disasters', riskLevel: 9, impact: 10, probability: 2, mitigation: 'Emergency Planning' },
    { category: 'Security', subcategory: 'Cyber Attacks', riskLevel: 7, impact: 9, probability: 6, mitigation: 'Security Protocols' },
    { category: 'Security', subcategory: 'Physical Security', riskLevel: 4, impact: 6, probability: 5, mitigation: 'Access Controls' },
    { category: 'Compliance', subcategory: 'Regulatory Changes', riskLevel: 6, impact: 7, probability: 7, mitigation: 'Compliance Monitoring' },
    { category: 'Compliance', subcategory: 'Audit Findings', riskLevel: 5, impact: 6, probability: 6, mitigation: 'Corrective Actions' }
  ]);

  const [optimizationData] = useState<OptimizationData[]>([
    { scenario: 'Current State', cost: 100, efficiency: 75, resources: 80, timeline: 90, feasibility: 95 },
    { scenario: 'Optimized A', cost: 85, efficiency: 88, resources: 75, timeline: 85, feasibility: 90 },
    { scenario: 'Optimized B', cost: 78, efficiency: 92, resources: 70, timeline: 80, feasibility: 85 },
    { scenario: 'Optimized C', cost: 72, efficiency: 95, resources: 65, timeline: 75, feasibility: 80 },
    { scenario: 'Aggressive', cost: 65, efficiency: 98, resources: 60, timeline: 70, feasibility: 70 }
  ]);

  const [weatherImpactData] = useState<WeatherImpactData[]>([
    { location: 'Site A', lat: 40.7128, lng: -74.0060, temperature: 22, humidity: 65, windSpeed: 15, riskLevel: 'LOW', impact: 2 },
    { location: 'Site B', lat: 34.0522, lng: -118.2437, temperature: 28, humidity: 45, windSpeed: 25, riskLevel: 'MEDIUM', impact: 5 },
    { location: 'Site C', lat: 41.8781, lng: -87.6298, temperature: 18, humidity: 75, windSpeed: 35, riskLevel: 'HIGH', impact: 8 },
    { location: 'Site D', lat: 29.7604, lng: -95.3698, temperature: 32, humidity: 85, windSpeed: 45, riskLevel: 'CRITICAL', impact: 9 }
  ]);

  const [maintenanceTasks] = useState<MaintenanceTask[]>([
    {
      taskId: 'MT001',
      name: 'Pump Inspection',
      priority: 'HIGH',
      scheduledDate: '2024-01-15',
      estimatedDuration: 4,
      assignedTo: 'John Smith',
      status: 'SCHEDULED',
      dependencies: []
    },
    {
      taskId: 'MT002',
      name: 'Valve Replacement',
      priority: 'CRITICAL',
      scheduledDate: '2024-01-16',
      estimatedDuration: 8,
      assignedTo: 'Jane Doe',
      status: 'IN_PROGRESS',
      dependencies: ['MT001']
    },
    {
      taskId: 'MT003',
      name: 'Safety System Check',
      priority: 'MEDIUM',
      scheduledDate: '2024-01-18',
      estimatedDuration: 6,
      assignedTo: 'Bob Johnson',
      status: 'SCHEDULED',
      dependencies: ['MT002']
    }
  ]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleRefresh = useCallback(() => {
    // Refresh data logic
    console.log('Refreshing visualization data...');
  }, []);

  const handleExport = useCallback((format: 'PNG' | 'PDF' | 'CSV') => {
    // Export logic
    console.log(`Exporting as ${format}...`);
  }, []);

  const getRiskColor = (level: number): string => {
    if (level >= 8) return '#f44336'; // Red
    if (level >= 6) return '#ff9800'; // Orange
    if (level >= 4) return '#ffeb3b'; // Yellow
    return '#4caf50'; // Green
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'COMPLETED': return '#4caf50';
      case 'IN_PROGRESS': return '#2196f3';
      case 'SCHEDULED': return '#ff9800';
      case 'OVERDUE': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return <ErrorIcon color="error" />;
      case 'HIGH': return <WarningIcon color="warning" />;
      case 'MEDIUM': return <InfoIcon color="info" />;
      case 'LOW': return <CheckCircleIcon color="success" />;
      default: return <InfoIcon />;
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoRefresh) {
      interval = setInterval(handleRefresh, refreshInterval * 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, refreshInterval, handleRefresh]);

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 2,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Typography variant="h5" component="h1">
          Advanced AI Visualization Dashboard
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={selectedTimeRange}
              label="Time Range"
              onChange={(e) => setSelectedTimeRange(e.target.value)}
            >
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 90 Days</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Export">
            <IconButton onClick={() => handleExport('PNG')} color="primary">
              <DownloadIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Fullscreen">
            <IconButton onClick={() => setIsFullscreen(!isFullscreen)} color="primary">
              <FullscreenIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings">
            <IconButton onClick={() => setIsSettingsOpen(true)} color="primary">
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <LinearProgress
          variant="determinate"
          value={(refreshInterval * 1000 - (Date.now() % (refreshInterval * 1000))) / (refreshInterval * 1000) * 100}
          sx={{ height: 2 }}
        />
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="visualization tabs">
          <Tab icon={<TimelineIcon />} label="Forecasting" />
          <Tab icon={<AssessmentIcon />} label="Risk Heatmaps" />
          <Tab icon={<TrendingUpIcon />} label="Optimization" />
          <Tab icon={<MapIcon />} label="Weather Impact" />
          <Tab icon={<ScheduleIcon />} label="Maintenance" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {/* Interactive Forecasting Charts */}
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Interactive Forecasting with Confidence Intervals
                  </Typography>
                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={forecastData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />

                        {/* Confidence interval area */}
                        <Area
                          type="monotone"
                          dataKey="upperBound"
                          stackId="1"
                          stroke="none"
                          fill="#e3f2fd"
                          fillOpacity={0.3}
                        />
                        <Area
                          type="monotone"
                          dataKey="lowerBound"
                          stackId="1"
                          stroke="none"
                          fill="#ffffff"
                          fillOpacity={1}
                        />

                        {/* Actual values */}
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="#4caf50"
                          strokeWidth={3}
                          dot={{ fill: '#4caf50', strokeWidth: 2, r: 4 }}
                          name="Actual"
                        />

                        {/* Predicted values */}
                        <Line
                          type="monotone"
                          dataKey="predicted"
                          stroke="#2196f3"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ fill: '#2196f3', strokeWidth: 2, r: 3 }}
                          name="Predicted"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Forecast Accuracy Metrics
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { metric: 'MAE', value: 2.3, target: 2.0 },
                        { metric: 'RMSE', value: 3.1, target: 2.5 },
                        { metric: 'MAPE', value: 4.2, target: 3.5 },
                        { metric: 'R²', value: 0.92, target: 0.90 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="metric" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#2196f3" name="Current" />
                        <Bar dataKey="target" fill="#4caf50" name="Target" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Model Confidence Over Time
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecastData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" />
                        <YAxis domain={[0, 1]} />
                        <RechartsTooltip formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, 'Confidence']} />
                        <Area
                          type="monotone"
                          dataKey="confidence"
                          stroke="#ff9800"
                          fill="#fff3e0"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Risk Heatmaps and Dashboards */}
        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Risk Assessment Heatmap
                  </Typography>
                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart data={riskHeatmapData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="probability"
                          name="Probability"
                          domain={[0, 10]}
                          label={{ value: 'Probability', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          type="number"
                          dataKey="impact"
                          name="Impact"
                          domain={[0, 10]}
                          label={{ value: 'Impact', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartsTooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <Paper sx={{ p: 2 }}>
                                  <Typography variant="subtitle2">{data.category} - {data.subcategory}</Typography>
                                  <Typography variant="body2">Risk Level: {data.riskLevel}/10</Typography>
                                  <Typography variant="body2">Impact: {data.impact}/10</Typography>
                                  <Typography variant="body2">Probability: {data.probability}/10</Typography>
                                  <Typography variant="body2">Mitigation: {data.mitigation}</Typography>
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                        <Scatter
                          dataKey="riskLevel"
                          fill={(entry: any) => getRiskColor(entry.riskLevel)}
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Risk Distribution by Category
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Operational', value: 35, fill: '#f44336' },
                            { name: 'Environmental', value: 25, fill: '#ff9800' },
                            { name: 'Security', value: 20, fill: '#2196f3' },
                            { name: 'Compliance', value: 20, fill: '#4caf50' }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
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

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Risk Trends Over Time
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { month: 'Jan', operational: 7, environmental: 5, security: 6, compliance: 4 },
                        { month: 'Feb', operational: 6, environmental: 4, security: 7, compliance: 5 },
                        { month: 'Mar', operational: 8, environmental: 6, security: 5, compliance: 4 },
                        { month: 'Apr', operational: 7, environmental: 5, security: 6, compliance: 6 },
                        { month: 'May', operational: 6, environmental: 4, security: 7, compliance: 5 },
                        { month: 'Jun', operational: 5, environmental: 3, security: 6, compliance: 4 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="operational" stroke="#f44336" strokeWidth={2} />
                        <Line type="monotone" dataKey="environmental" stroke="#ff9800" strokeWidth={2} />
                        <Line type="monotone" dataKey="security" stroke="#2196f3" strokeWidth={2} />
                        <Line type="monotone" dataKey="compliance" stroke="#4caf50" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Resource Optimization Visualizations */}
        <TabPanel value={currentTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Multi-Objective Optimization Results
                  </Typography>
                  <Box sx={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="20%"
                        outerRadius="90%"
                        data={optimizationData}
                      >
                        <RadialBar
                          dataKey="efficiency"
                          cornerRadius={10}
                          fill="#4caf50"
                          label={{ position: 'insideStart', fill: '#fff' }}
                        />
                        <Legend />
                        <RechartsTooltip />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Pareto Front Analysis
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart data={optimizationData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="cost"
                          name="Cost"
                          label={{ value: 'Cost', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          dataKey="efficiency"
                          name="Efficiency"
                          label={{ value: 'Efficiency', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartsTooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <Paper sx={{ p: 2 }}>
                                  <Typography variant="subtitle2">{data.scenario}</Typography>
                                  <Typography variant="body2">Cost: {data.cost}</Typography>
                                  <Typography variant="body2">Efficiency: {data.efficiency}%</Typography>
                                  <Typography variant="body2">Feasibility: {data.feasibility}%</Typography>
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                        <Scatter
                          dataKey="feasibility"
                          fill="#2196f3"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Resource Allocation Comparison
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={optimizationData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="scenario" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="cost" fill="#f44336" name="Cost" />
                        <Bar dataKey="resources" fill="#ff9800" name="Resources" />
                        <Bar dataKey="timeline" fill="#2196f3" name="Timeline" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Weather Impact Maps */}
        <TabPanel value={currentTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Weather Impact Assessment
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Interactive map showing weather conditions and their impact on operations across different sites.
                  </Alert>

                  {/* Simplified weather impact visualization */}
                  <Box sx={{ height: 400, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {weatherImpactData.map((site, index) => (
                      <Paper
                        key={index}
                        sx={{
                          p: 2,
                          minWidth: 200,
                          bgcolor: site.riskLevel === 'CRITICAL' ? '#ffebee' :
                                   site.riskLevel === 'HIGH' ? '#fff3e0' :
                                   site.riskLevel === 'MEDIUM' ? '#f3e5f5' : '#e8f5e8'
                        }}
                      >
                        <Typography variant="h6" gutterBottom>
                          {site.location}
                        </Typography>
                        <Chip
                          label={site.riskLevel}
                          color={
                            site.riskLevel === 'CRITICAL' ? 'error' :
                            site.riskLevel === 'HIGH' ? 'warning' :
                            site.riskLevel === 'MEDIUM' ? 'info' : 'success'
                          }
                          size="small"
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="body2">Temperature: {site.temperature}°C</Typography>
                        <Typography variant="body2">Humidity: {site.humidity}%</Typography>
                        <Typography variant="body2">Wind Speed: {site.windSpeed} km/h</Typography>
                        <Typography variant="body2">Impact Score: {site.impact}/10</Typography>
                      </Paper>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Weather Impact Correlation
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart data={weatherImpactData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="temperature"
                          name="Temperature"
                          label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          dataKey="impact"
                          name="Impact"
                          label={{ value: 'Impact Score', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartsTooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <Paper sx={{ p: 2 }}>
                                  <Typography variant="subtitle2">{data.location}</Typography>
                                  <Typography variant="body2">Temperature: {data.temperature}°C</Typography>
                                  <Typography variant="body2">Impact: {data.impact}/10</Typography>
                                  <Typography variant="body2">Risk Level: {data.riskLevel}</Typography>
                                </Paper>
                              );
                            }
                            return null;
                          }}
                        />
                        <Scatter
                          dataKey="windSpeed"
                          fill="#2196f3"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Risk Level Distribution
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Low Risk', value: 1, fill: '#4caf50' },
                            { name: 'Medium Risk', value: 1, fill: '#2196f3' },
                            { name: 'High Risk', value: 1, fill: '#ff9800' },
                            { name: 'Critical Risk', value: 1, fill: '#f44336' }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name }) => name}
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

        {/* Maintenance Scheduling Calendars */}
        <TabPanel value={currentTab} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Maintenance Schedule Overview
                  </Typography>
                  <List>
                    {maintenanceTasks.map((task) => (
                      <ListItem key={task.taskId} divider>
                        <ListItemIcon>
                          {getPriorityIcon(task.priority)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1">{task.name}</Typography>
                              <Chip
                                label={task.status}
                                color={
                                  task.status === 'COMPLETED' ? 'success' :
                                  task.status === 'IN_PROGRESS' ? 'primary' :
                                  task.status === 'OVERDUE' ? 'error' : 'default'
                                }
                                size="small"
                              />
                              <Chip
                                label={task.priority}
                                variant="outlined"
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="textSecondary">
                                Scheduled: {task.scheduledDate} • Duration: {task.estimatedDuration}h • Assigned: {task.assignedTo}
                              </Typography>
                              {task.dependencies.length > 0 && (
                                <Typography variant="caption" color="textSecondary">
                                  Dependencies: {task.dependencies.join(', ')}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Task Priority Distribution
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Critical', value: 1, fill: '#f44336' },
                            { name: 'High', value: 1, fill: '#ff9800' },
                            { name: 'Medium', value: 1, fill: '#2196f3' },
                            { name: 'Low', value: 0, fill: '#4caf50' }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, value }) => value > 0 ? name : ''}
                        />
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Resource Utilization Timeline
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { date: '2024-01-15', utilization: 75, capacity: 100 },
                        { date: '2024-01-16', utilization: 90, capacity: 100 },
                        { date: '2024-01-17', utilization: 60, capacity: 100 },
                        { date: '2024-01-18', utilization: 85, capacity: 100 },
                        { date: '2024-01-19', utilization: 70, capacity: 100 },
                        { date: '2024-01-20', utilization: 55, capacity: 100 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="utilization" fill="#2196f3" name="Utilization %" />
                        <Bar dataKey="capacity" fill="#e0e0e0" name="Capacity %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Box>

      {/* Settings Dialog */}
      <Dialog
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Visualization Settings</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                }
                label="Auto Refresh"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Refresh Interval (seconds)</Typography>
              <Slider
                value={refreshInterval}
                onChange={(e, value) => setRefreshInterval(value as number)}
                min={10}
                max={300}
                step={10}
                marks={[
                  { value: 10, label: '10s' },
                  { value: 60, label: '1m' },
                  { value: 300, label: '5m' }
                ]}
                valueLabelDisplay="auto"
                disabled={!autoRefresh}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Visible Metrics</InputLabel>
                <Select
                  multiple
                  value={selectedMetrics}
                  onChange={(e) => setSelectedMetrics(e.target.value as string[])}
                  label="Visible Metrics"
                >
                  <MenuItem value="all">All Metrics</MenuItem>
                  <MenuItem value="forecasting">Forecasting</MenuItem>
                  <MenuItem value="risk">Risk Assessment</MenuItem>
                  <MenuItem value="optimization">Optimization</MenuItem>
                  <MenuItem value="weather">Weather Impact</MenuItem>
                  <MenuItem value="maintenance">Maintenance</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Export Options
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => handleExport('PNG')}
                  startIcon={<DownloadIcon />}
                >
                  Export PNG
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleExport('PDF')}
                  startIcon={<DownloadIcon />}
                >
                  Export PDF
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleExport('CSV')}
                  startIcon={<DownloadIcon />}
                >
                  Export CSV
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSettingsOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => setIsSettingsOpen(false)}>
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvancedVisualizationDashboard;