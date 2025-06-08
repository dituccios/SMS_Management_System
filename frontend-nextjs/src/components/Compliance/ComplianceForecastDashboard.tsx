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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
  Badge
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Analytics as AnalyticsIcon,
  PredictiveText as PredictiveIcon,
  ScatterPlot as ScatterPlotIcon,
  ShowChart as ShowChartIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Brush,
  ComposedChart
} from 'recharts';
import { useComplianceForecasting } from '../../hooks/useComplianceForecasting';
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
      id={`forecast-tabpanel-${index}`}
      aria-labelledby={`forecast-tab-${index}`}
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

const ComplianceForecastDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedFramework, setSelectedFramework] = useState('ISO27001');
  const [selectedMetric, setSelectedMetric] = useState('overall_compliance');
  const [forecastHorizon, setForecastHorizon] = useState(90);
  const [isCreateForecastDialogOpen, setIsCreateForecastDialogOpen] = useState(false);
  const [isWhatIfDialogOpen, setIsWhatIfDialogOpen] = useState(false);
  const [isInterventionDialogOpen, setIsInterventionDialogOpen] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<any>(null);

  const {
    forecasts,
    currentForecast,
    scenarios,
    whatIfAnalysis,
    interventions,
    accuracyMetrics,
    loading,
    error,
    createTimeSeriesForecast,
    createScenarioForecast,
    performWhatIfAnalysis,
    calculateConfidenceIntervals,
    getForecasts,
    getForecastAccuracy,
    planIntervention
  } = useComplianceForecasting();

  useEffect(() => {
    loadDashboardData();
  }, [selectedFramework]);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        getForecasts(selectedFramework),
        getForecastAccuracy(selectedFramework)
      ]);
    } catch (error) {
      console.error('Failed to load forecast dashboard data:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleCreateForecast = async () => {
    try {
      await createTimeSeriesForecast(
        selectedFramework,
        selectedMetric,
        forecastHorizon,
        'ARIMA'
      );
      setIsCreateForecastDialogOpen(false);
    } catch (error) {
      console.error('Failed to create forecast:', error);
    }
  };

  const handleCreateScenarios = async () => {
    try {
      const scenarioSpecs = [
        {
          name: 'Optimistic Scenario',
          description: 'Best case compliance trajectory',
          probability: 0.3,
          assumptions: [
            {
              variable: 'compliance_rate',
              baseValue: 85,
              scenarioValue: 95,
              change: 10,
              changeType: 'ABSOLUTE' as const,
              rationale: 'Improved processes and training'
            }
          ]
        },
        {
          name: 'Pessimistic Scenario',
          description: 'Worst case compliance trajectory',
          probability: 0.2,
          assumptions: [
            {
              variable: 'compliance_rate',
              baseValue: 85,
              scenarioValue: 70,
              change: -15,
              changeType: 'ABSOLUTE' as const,
              rationale: 'Resource constraints and external pressures'
            }
          ]
        }
      ];

      await createScenarioForecast(
        selectedFramework,
        selectedMetric,
        scenarioSpecs
      );
    } catch (error) {
      console.error('Failed to create scenarios:', error);
    }
  };

  const handleWhatIfAnalysis = async () => {
    try {
      const variables = [
        {
          name: 'training_budget',
          baseValue: 100000,
          range: { min: 50000, max: 200000, step: 10000 },
          distribution: 'UNIFORM' as const,
          parameters: {}
        },
        {
          name: 'staff_count',
          baseValue: 50,
          range: { min: 30, max: 80, step: 5 },
          distribution: 'NORMAL' as const,
          parameters: { mean: 50, std: 10 }
        }
      ];

      await performWhatIfAnalysis(
        selectedFramework,
        selectedMetric,
        variables
      );
      setIsWhatIfDialogOpen(false);
    } catch (error) {
      console.error('Failed to perform what-if analysis:', error);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'warning';
    return 'error';
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'success';
      case 'MEDIUM':
        return 'warning';
      case 'HIGH':
        return 'error';
      case 'CRITICAL':
        return 'error';
      default:
        return 'default';
    }
  };

  const getAccuracyIcon = (accuracy: number) => {
    if (accuracy >= 90) return <CheckCircleIcon color="success" />;
    if (accuracy >= 70) return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  if (loading && !currentForecast) {
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
          Compliance Forecasting Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Framework</InputLabel>
            <Select
              value={selectedFramework}
              label="Framework"
              onChange={(e) => setSelectedFramework(e.target.value)}
            >
              <MenuItem value="ISO27001">ISO 27001</MenuItem>
              <MenuItem value="SOC2">SOC 2</MenuItem>
              <MenuItem value="GDPR">GDPR</MenuItem>
              <MenuItem value="HIPAA">HIPAA</MenuItem>
              <MenuItem value="PCI_DSS">PCI DSS</MenuItem>
            </Select>
          </FormControl>
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
            startIcon={<PredictiveIcon />}
            onClick={() => setIsCreateForecastDialogOpen(true)}
          >
            New Forecast
          </Button>
          <Button
            variant="outlined"
            startIcon={<AnalyticsIcon />}
            onClick={() => setIsWhatIfDialogOpen(true)}
          >
            What-If Analysis
          </Button>
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PredictiveIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6">Current Forecast</Typography>
                  <Typography variant="h4" color="primary">
                    {currentForecast?.predictions?.[0]?.predictedValue.toFixed(1) || 'N/A'}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Next 30 days
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
                <AssessmentIcon color="info" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6">Confidence</Typography>
                  <Typography variant="h4" color="info">
                    {currentForecast?.confidence?.level ?
                      (currentForecast.confidence.level * 100).toFixed(0) : 'N/A'}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Forecast Quality
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
                <TimelineIcon color="warning" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6">Accuracy</Typography>
                  <Typography variant="h4" color="warning">
                    {accuracyMetrics?.overallAccuracy?.toFixed(1) || 'N/A'}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Historical Performance
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
                <ScatterPlotIcon color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6">Scenarios</Typography>
                  <Typography variant="h4" color="success">
                    {scenarios?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Scenarios
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="forecast tabs">
          <Tab label="Forecast Trends" id="forecast-tab-0" />
          <Tab label="Scenarios" id="forecast-tab-1" />
          <Tab label="What-If Analysis" id="forecast-tab-2" />
          <Tab label="Interventions" id="forecast-tab-3" />
          <Tab label="Accuracy Tracking" id="forecast-tab-4" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <Grid container spacing={3}>
          {/* Main Forecast Chart */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Compliance Forecast - {selectedFramework}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={handleCreateScenarios}>
                      Add Scenarios
                    </Button>
                    <IconButton size="small">
                      <DownloadIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ height: 400 }}>
                  {currentForecast?.predictions && currentForecast.predictions.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={currentForecast.predictions.map(p => ({
                        date: formatDate(p.date),
                        predicted: p.predictedValue,
                        lower: p.lowerBound,
                        upper: p.upperBound,
                        confidence: p.confidence * 100
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <RechartsTooltip />
                        <Legend />

                        {/* Confidence band */}
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="upper"
                          stackId="1"
                          stroke="none"
                          fill="#e3f2fd"
                          fillOpacity={0.3}
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="lower"
                          stackId="1"
                          stroke="none"
                          fill="#ffffff"
                          fillOpacity={1}
                        />

                        {/* Main forecast line */}
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="predicted"
                          stroke="#1976d2"
                          strokeWidth={3}
                          dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                          name="Predicted Value"
                        />

                        {/* Confidence line */}
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="confidence"
                          stroke="#ff9800"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          name="Confidence %"
                        />

                        <Brush dataKey="date" height={30} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography color="textSecondary">No forecast data available</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Forecast Summary */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Forecast Summary
                </Typography>
                {currentForecast ? (
                  <Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        Model Type
                      </Typography>
                      <Typography variant="body1">
                        {currentForecast.model.modelType}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        Forecast Horizon
                      </Typography>
                      <Typography variant="body1">
                        {currentForecast.forecastHorizon} days
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        Model Performance
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          R² = {currentForecast.model.performance?.r2?.toFixed(3) || 'N/A'}
                        </Typography>
                        <Chip
                          size="small"
                          label={currentForecast.model.performance?.r2 > 0.8 ? 'Good' : 'Fair'}
                          color={currentForecast.model.performance?.r2 > 0.8 ? 'success' : 'warning'}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary">
                        Confidence Level
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(currentForecast.confidence?.level || 0) * 100}
                          color={getConfidenceColor(currentForecast.confidence?.level || 0) as any}
                          sx={{ flexGrow: 1 }}
                        />
                        <Typography variant="body2">
                          {((currentForecast.confidence?.level || 0) * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" gutterBottom>
                      Key Assumptions
                    </Typography>
                    <List dense>
                      {currentForecast.assumptions?.map((assumption, index) => (
                        <ListItem key={index} sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 24 }}>
                            <InfoIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={assumption}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : (
                  <Typography color="textSecondary">
                    No forecast available. Create a new forecast to get started.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Trend Analysis */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Trend Analysis & Insights
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <TrendingUpIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h6">Short-term Trend</Typography>
                      <Typography variant="h4" color="success.main">
                        +2.3%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Next 7 days
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <TimelineIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h6">Medium-term Trend</Typography>
                      <Typography variant="h4" color="warning.main">
                        +1.1%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Next 30 days
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <TrendingDownIcon color="error" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h6">Long-term Trend</Typography>
                      <Typography variant="h4" color="error.main">
                        -0.5%
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Next 90 days
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <Grid container spacing={3}>
          {/* Scenario Comparison Chart */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Scenario Comparison
                </Typography>
                <Box sx={{ height: 400 }}>
                  {scenarios && scenarios.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        {scenarios.map((scenario, index) => (
                          <Line
                            key={scenario.scenarioId}
                            type="monotone"
                            dataKey="predictedValue"
                            data={scenario.predictions?.map(p => ({
                              date: formatDate(p.date),
                              predictedValue: p.predictedValue
                            }))}
                            stroke={['#1976d2', '#388e3c', '#f57c00', '#d32f2f'][index % 4]}
                            strokeWidth={2}
                            name={scenario.name}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography color="textSecondary">No scenarios available</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Scenario List */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Scenarios
                </Typography>
                <List>
                  {scenarios?.map((scenario) => (
                    <ListItem
                      key={scenario.scenarioId}
                      button
                      onClick={() => setSelectedScenario(scenario)}
                      divider
                    >
                      <ListItemIcon>
                        <Badge
                          badgeContent={Math.round(scenario.probability * 100)}
                          color="primary"
                          max={100}
                        >
                          <ScatterPlotIcon />
                        </Badge>
                      </ListItemIcon>
                      <ListItemText
                        primary={scenario.name}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {scenario.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                              <Chip
                                label={`${(scenario.probability * 100).toFixed(0)}% probability`}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={scenario.impact?.complianceRisk || 'MEDIUM'}
                                size="small"
                                color={getRiskLevelColor(scenario.impact?.complianceRisk || 'MEDIUM') as any}
                              />
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                {(!scenarios || scenarios.length === 0) && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="textSecondary" gutterBottom>
                      No scenarios created yet
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={handleCreateScenarios}
                    >
                      Create Scenarios
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Scenario Impact Analysis */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Scenario Impact Analysis
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Scenario</TableCell>
                        <TableCell>Probability</TableCell>
                        <TableCell>Compliance Risk</TableCell>
                        <TableCell>Business Impact</TableCell>
                        <TableCell>Financial Impact</TableCell>
                        <TableCell>Time to Impact</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scenarios?.map((scenario) => (
                        <TableRow key={scenario.scenarioId}>
                          <TableCell>{scenario.name}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={scenario.probability * 100}
                                sx={{ width: 60 }}
                              />
                              <Typography variant="body2">
                                {(scenario.probability * 100).toFixed(0)}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={scenario.impact?.complianceRisk || 'MEDIUM'}
                              color={getRiskLevelColor(scenario.impact?.complianceRisk || 'MEDIUM') as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={scenario.impact?.businessImpact || 'MEDIUM'}
                              color={getRiskLevelColor(scenario.impact?.businessImpact || 'MEDIUM') as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {formatNumber(scenario.impact?.financialImpact || 0, { style: 'currency', currency: 'USD' })}
                          </TableCell>
                          <TableCell>
                            {scenario.impact?.timeToImpact || 0} days
                          </TableCell>
                          <TableCell>
                            <IconButton size="small">
                              <VisibilityIcon />
                            </IconButton>
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
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

      <TabPanel value={currentTab} index={2}>
        <Grid container spacing={3}>
          {/* What-If Analysis Controls */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  What-If Analysis
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Training Budget
                  </Typography>
                  <Slider
                    value={100000}
                    min={50000}
                    max={200000}
                    step={10000}
                    marks={[
                      { value: 50000, label: '$50K' },
                      { value: 125000, label: '$125K' },
                      { value: 200000, label: '$200K' }
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Staff Count
                  </Typography>
                  <Slider
                    value={50}
                    min={30}
                    max={80}
                    step={5}
                    marks={[
                      { value: 30, label: '30' },
                      { value: 55, label: '55' },
                      { value: 80, label: '80' }
                    ]}
                    valueLabelDisplay="auto"
                  />
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Automation Level
                  </Typography>
                  <Slider
                    value={60}
                    min={0}
                    max={100}
                    step={10}
                    marks={[
                      { value: 0, label: '0%' },
                      { value: 50, label: '50%' },
                      { value: 100, label: '100%' }
                    ]}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${value}%`}
                  />
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<AnalyticsIcon />}
                  onClick={handleWhatIfAnalysis}
                  disabled={loading}
                >
                  Run Analysis
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* What-If Results */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Analysis Results
                </Typography>
                <Box sx={{ height: 400 }}>
                  {whatIfAnalysis?.results && whatIfAnalysis.results.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart data={whatIfAnalysis.results.map(r => ({
                        x: r.variables.training_budget || 0,
                        y: r.outcome,
                        risk: r.risk,
                        scenario: r.scenario
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="x"
                          name="Training Budget"
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                        />
                        <YAxis
                          type="number"
                          dataKey="y"
                          name="Compliance Score"
                          tickFormatter={(value) => `${value.toFixed(1)}%`}
                        />
                        <RechartsTooltip
                          formatter={(value, name) => [
                            name === 'x' ? `$${(value as number / 1000).toFixed(0)}K` : `${(value as number).toFixed(1)}%`,
                            name === 'x' ? 'Training Budget' : 'Compliance Score'
                          ]}
                        />
                        <Scatter
                          dataKey="y"
                          fill="#1976d2"
                          name="Scenarios"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography color="textSecondary">
                        Run a what-if analysis to see results
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Sensitivity Analysis */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Sensitivity Analysis
                </Typography>
                {whatIfAnalysis?.sensitivity ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Variable</TableCell>
                          <TableCell>Sensitivity</TableCell>
                          <TableCell>Rank</TableCell>
                          <TableCell>Confidence</TableCell>
                          <TableCell>Range</TableCell>
                          <TableCell>Impact</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {whatIfAnalysis.sensitivity.variables?.map((variable) => (
                          <TableRow key={variable.variable}>
                            <TableCell>{variable.variable}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={variable.sensitivity * 100}
                                  sx={{ width: 100 }}
                                />
                                <Typography variant="body2">
                                  {(variable.sensitivity * 100).toFixed(1)}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`#${variable.rank}`}
                                color={variable.rank <= 2 ? 'error' : variable.rank <= 4 ? 'warning' : 'default'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {(variable.confidence * 100).toFixed(0)}%
                            </TableCell>
                            <TableCell>
                              {variable.range.min.toLocaleString()} - {variable.range.max.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={variable.rank <= 2 ? 'High' : variable.rank <= 4 ? 'Medium' : 'Low'}
                                color={variable.rank <= 2 ? 'error' : variable.rank <= 4 ? 'warning' : 'success'}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography color="textSecondary">
                    No sensitivity analysis available. Run a what-if analysis first.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <Grid container spacing={3}>
          {/* Intervention Planning */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Intervention Planning
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Predicted Risk Level
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <WarningIcon color="warning" />
                    <Typography variant="h6" color="warning.main">
                      Medium Risk
                    </Typography>
                    <Chip label="Intervention Recommended" color="warning" size="small" />
                  </Box>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Time to Intervention
                  </Typography>
                  <Typography variant="body1">
                    15 days (before compliance drops below threshold)
                  </Typography>
                </Box>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Recommended Actions
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Increase training frequency" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Deploy additional monitoring tools" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Review and update policies" />
                    </ListItem>
                  </List>
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<PlayIcon />}
                  onClick={() => setIsInterventionDialogOpen(true)}
                >
                  Plan Intervention
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Intervention Impact Simulation */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Intervention Impact Simulation
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { day: 0, baseline: 85, withIntervention: 85 },
                      { day: 7, baseline: 83, withIntervention: 86 },
                      { day: 14, baseline: 81, withIntervention: 88 },
                      { day: 21, baseline: 79, withIntervention: 90 },
                      { day: 30, baseline: 77, withIntervention: 92 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="baseline"
                        stroke="#f44336"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Without Intervention"
                      />
                      <Line
                        type="monotone"
                        dataKey="withIntervention"
                        stroke="#4caf50"
                        strokeWidth={3}
                        name="With Intervention"
                      />
                      <ReferenceLine y={80} stroke="#ff9800" strokeDasharray="3 3" label="Threshold" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Active Interventions */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Active Interventions
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Intervention</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Start Date</TableCell>
                        <TableCell>Expected Impact</TableCell>
                        <TableCell>Progress</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {interventions?.map((intervention, index) => (
                        <TableRow key={index}>
                          <TableCell>{intervention.name || `Intervention ${index + 1}`}</TableCell>
                          <TableCell>
                            <Chip label={intervention.type || 'Training'} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{formatDate(intervention.startDate || new Date())}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <TrendingUpIcon color="success" fontSize="small" />
                              <Typography variant="body2">
                                +{intervention.expectedImpact || 5}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={intervention.progress || 60}
                                sx={{ width: 80 }}
                              />
                              <Typography variant="body2">
                                {intervention.progress || 60}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={intervention.status || 'In Progress'}
                              color={intervention.status === 'Completed' ? 'success' : 'info'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small">
                              <VisibilityIcon />
                            </IconButton>
                            <IconButton size="small">
                              <EditIcon />
                            </IconButton>
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

      <TabPanel value={currentTab} index={4}>
        <Grid container spacing={3}>
          {/* Accuracy Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Forecast Accuracy Metrics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                        {getAccuracyIcon(accuracyMetrics?.overallAccuracy || 0)}
                        <Typography variant="h6" sx={{ ml: 1 }}>
                          Overall
                        </Typography>
                      </Box>
                      <Typography variant="h4">
                        {accuracyMetrics?.overallAccuracy?.toFixed(1) || 'N/A'}%
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                        {getAccuracyIcon(accuracyMetrics?.shortTermAccuracy || 0)}
                        <Typography variant="h6" sx={{ ml: 1 }}>
                          Short-term
                        </Typography>
                      </Box>
                      <Typography variant="h4">
                        {accuracyMetrics?.shortTermAccuracy?.toFixed(1) || 'N/A'}%
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                        {getAccuracyIcon(accuracyMetrics?.mediumTermAccuracy || 0)}
                        <Typography variant="h6" sx={{ ml: 1 }}>
                          Medium-term
                        </Typography>
                      </Box>
                      <Typography variant="h4">
                        {accuracyMetrics?.mediumTermAccuracy?.toFixed(1) || 'N/A'}%
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                        {getAccuracyIcon(accuracyMetrics?.longTermAccuracy || 0)}
                        <Typography variant="h6" sx={{ ml: 1 }}>
                          Long-term
                        </Typography>
                      </Box>
                      <Typography variant="h4">
                        {accuracyMetrics?.longTermAccuracy?.toFixed(1) || 'N/A'}%
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Accuracy Trends */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Accuracy Trends
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={accuracyMetrics?.historicalPerformance?.map(h => ({
                      date: formatDate(h.forecastDate),
                      accuracy: (1 - Math.abs(h.percentageError / 100)) * 100
                    })) || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <RechartsTooltip />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#1976d2"
                        strokeWidth={2}
                        dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                      />
                      <ReferenceLine y={80} stroke="#ff9800" strokeDasharray="3 3" label="Target" />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Model Performance Comparison */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Model Performance Comparison
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Model</TableCell>
                        <TableCell>MAPE</TableCell>
                        <TableCell>RMSE</TableCell>
                        <TableCell>R²</TableCell>
                        <TableCell>AIC</TableCell>
                        <TableCell>Cross-Validation</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>ARIMA</TableCell>
                        <TableCell>5.2%</TableCell>
                        <TableCell>2.1</TableCell>
                        <TableCell>0.85</TableCell>
                        <TableCell>206</TableCell>
                        <TableCell>82%</TableCell>
                        <TableCell>
                          <Chip label="Active" color="success" size="small" />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Exponential Smoothing</TableCell>
                        <TableCell>6.8%</TableCell>
                        <TableCell>2.5</TableCell>
                        <TableCell>0.78</TableCell>
                        <TableCell>218</TableCell>
                        <TableCell>76%</TableCell>
                        <TableCell>
                          <Chip label="Backup" color="default" size="small" />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Neural Network</TableCell>
                        <TableCell>4.9%</TableCell>
                        <TableCell>1.9</TableCell>
                        <TableCell>0.88</TableCell>
                        <TableCell>195</TableCell>
                        <TableCell>85%</TableCell>
                        <TableCell>
                          <Chip label="Testing" color="warning" size="small" />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Create Forecast Dialog */}
      <Dialog
        open={isCreateForecastDialogOpen}
        onClose={() => setIsCreateForecastDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Forecast</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Metric</InputLabel>
                <Select
                  value={selectedMetric}
                  label="Metric"
                  onChange={(e) => setSelectedMetric(e.target.value)}
                >
                  <MenuItem value="overall_compliance">Overall Compliance</MenuItem>
                  <MenuItem value="security_score">Security Score</MenuItem>
                  <MenuItem value="audit_readiness">Audit Readiness</MenuItem>
                  <MenuItem value="incident_rate">Incident Rate</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Forecast Horizon (days)"
                type="number"
                value={forecastHorizon}
                onChange={(e) => setForecastHorizon(parseInt(e.target.value))}
                inputProps={{ min: 7, max: 365 }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary">
                This will create a time series forecast for the selected metric using historical data
                and advanced forecasting algorithms. The forecast will include confidence intervals
                and trend analysis.
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateForecastDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateForecast}
            disabled={loading}
          >
            Create Forecast
          </Button>
        </DialogActions>
      </Dialog>

      {/* What-If Analysis Dialog */}
      <Dialog
        open={isWhatIfDialogOpen}
        onClose={() => setIsWhatIfDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>What-If Analysis</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Analyze how changes in key variables affect compliance forecasts.
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            This analysis will simulate different scenarios by varying input parameters
            and show their impact on compliance outcomes.
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Variables to analyze:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="Training Budget" secondary="$50K - $200K" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Staff Count" secondary="30 - 80 people" />
              </ListItem>
              <ListItem>
                <ListItemText primary="Automation Level" secondary="0% - 100%" />
              </ListItem>
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsWhatIfDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleWhatIfAnalysis}
            disabled={loading}
          >
            Run Analysis
          </Button>
        </DialogActions>
      </Dialog>

      {/* Intervention Planning Dialog */}
      <Dialog
        open={isInterventionDialogOpen}
        onClose={() => setIsInterventionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Plan Intervention</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Plan and schedule interventions to improve compliance forecasts.
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Intervention Name"
                placeholder="e.g., Enhanced Security Training Program"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Intervention Type</InputLabel>
                <Select defaultValue="training">
                  <MenuItem value="training">Training</MenuItem>
                  <MenuItem value="process">Process Improvement</MenuItem>
                  <MenuItem value="technology">Technology Upgrade</MenuItem>
                  <MenuItem value="policy">Policy Update</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Expected Impact (%)"
                type="number"
                defaultValue={5}
                inputProps={{ min: 0, max: 50 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                placeholder="Describe the intervention and its expected outcomes..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsInterventionDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => setIsInterventionDialogOpen(false)}
          >
            Plan Intervention
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComplianceForecastDashboard;