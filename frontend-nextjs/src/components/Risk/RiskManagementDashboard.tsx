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
  Divider,
  IconButton,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  Dashboard as DashboardIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
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
  Heatmap
} from 'recharts';
import { useRiskManagement } from '../../hooks/useRiskManagement';
import { formatDate, formatDateTime, formatNumber } from '../../utils/formatters';

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
      id={`risk-tabpanel-${index}`}
      aria-labelledby={`risk-tab-${index}`}
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

const RiskManagementDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(null);
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const {
    riskAssessments,
    currentAssessment,
    riskCategories,
    riskTrends,
    riskCorrelations,
    riskScenarios,
    recommendations,
    loading,
    error,
    executeRiskAssessment,
    getRiskAssessments,
    getRiskTrends,
    getRiskCorrelations,
    generateRiskReport,
    updateRiskMitigation
  } = useRiskManagement();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        getRiskAssessments(),
        getRiskTrends(),
        getRiskCorrelations()
      ]);
    } catch (error) {
      console.error('Failed to load risk dashboard data:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleRunAssessment = async () => {
    try {
      await executeRiskAssessment({
        assessmentType: 'COMPREHENSIVE',
        scope: {
          categories: riskCategories?.map(c => c.id) || [],
          timeframe: {
            start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
            end: new Date()
          },
          includeHistoricalData: true,
          includeExternalThreats: true,
          includeComplianceFactors: true
        },
        methodology: {
          scoringAlgorithm: 'HYBRID',
          weightingScheme: {
            categoryWeights: new Map(),
            factorWeights: new Map(),
            temporalWeights: new Map(),
            contextualWeights: new Map()
          },
          confidenceLevel: 95,
          uncertaintyHandling: 'REALISTIC',
          correlationAnalysis: true,
          trendAnalysis: true
        }
      });
      setIsAssessmentDialogOpen(false);
    } catch (error) {
      console.error('Failed to run risk assessment:', error);
    }
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

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'LOW':
        return <SecurityIcon color="success" />;
      case 'MEDIUM':
        return <WarningIcon color="warning" />;
      case 'HIGH':
        return <WarningIcon color="error" />;
      case 'CRITICAL':
        return <WarningIcon color="error" />;
      default:
        return <AssessmentIcon />;
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'INCREASING':
        return <TrendingUpIcon color="error" />;
      case 'DECREASING':
        return <TrendingDownIcon color="success" />;
      case 'STABLE':
        return <TimelineIcon color="info" />;
      default:
        return <TimelineIcon />;
    }
  };

  if (loading && !currentAssessment) {
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
          Risk Management Dashboard
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
            onClick={() => setIsAssessmentDialogOpen(true)}
          >
            Run Assessment
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => generateRiskReport('COMPREHENSIVE')}
          >
            Export Report
          </Button>
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Risk Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {currentAssessment && getRiskLevelIcon(currentAssessment.results.riskLevel)}
                <Box>
                  <Typography variant="h6">Overall Risk</Typography>
                  <Typography variant="h4" color="primary">
                    {currentAssessment?.results.overallRiskScore.toFixed(1) || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {currentAssessment?.results.riskLevel || 'Unknown'}
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
                    {currentAssessment?.results.confidenceScore.toFixed(1) || 'N/A'}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Assessment Quality
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
                <WarningIcon color="warning" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6">High Risk Items</Typography>
                  <Typography variant="h4" color="warning">
                    {currentAssessment?.results.categoryScores.filter(c => 
                      c.level === 'HIGH' || c.level === 'CRITICAL').length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Require Attention
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
                <TimelineIcon color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6">Recommendations</Typography>
                  <Typography variant="h4" color="success">
                    {recommendations?.filter(r => r.status === 'PENDING').length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Pending Actions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="risk management tabs">
          <Tab label="Overview" id="risk-tab-0" />
          <Tab label="Risk Categories" id="risk-tab-1" />
          <Tab label="Trends & Analysis" id="risk-tab-2" />
          <Tab label="Scenarios" id="risk-tab-3" />
          <Tab label="Mitigation" id="risk-tab-4" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <Grid container spacing={3}>
          {/* Risk Heatmap */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Heatmap
                </Typography>
                <Box sx={{ height: 400 }}>
                  {currentAssessment?.results.heatmap ? (
                    <ResponsiveContainer width="100%" height="100%">
                      {/* Heatmap visualization would go here */}
                      <BarChart data={currentAssessment.results.categoryScores}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="categoryName" />
                        <YAxis />
                        <RechartsTooltip />
                        <Bar dataKey="score" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography color="textSecondary">No assessment data available</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Assessments */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Assessments
                </Typography>
                <List>
                  {riskAssessments?.slice(0, 5).map((assessment) => (
                    <ListItem key={assessment.id} divider>
                      <ListItemIcon>
                        {getRiskLevelIcon(assessment.results?.riskLevel || 'UNKNOWN')}
                      </ListItemIcon>
                      <ListItemText
                        primary={assessment.assessmentType}
                        secondary={formatDateTime(assessment.executedAt)}
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setSelectedAssessment(assessment.id);
                          setAnchorEl(e.currentTarget);
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Recommendations */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Priority Recommendations
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Priority</TableCell>
                        <TableCell>Title</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Expected Impact</TableCell>
                        <TableCell>Timeframe</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recommendations?.slice(0, 10).map((recommendation) => (
                        <TableRow key={recommendation.id}>
                          <TableCell>
                            <Chip
                              label={recommendation.priority}
                              color={getRiskLevelColor(recommendation.priority) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{recommendation.title}</TableCell>
                          <TableCell>{recommendation.category}</TableCell>
                          <TableCell>{recommendation.expectedImpact}</TableCell>
                          <TableCell>{recommendation.timeframe}</TableCell>
                          <TableCell>
                            <Chip
                              label={recommendation.status}
                              variant="outlined"
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

      <TabPanel value={currentTab} index={1}>
        <Grid container spacing={3}>
          {/* Risk Categories */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Categories Assessment
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Category</TableCell>
                        <TableCell>Risk Score</TableCell>
                        <TableCell>Risk Level</TableCell>
                        <TableCell>Confidence</TableCell>
                        <TableCell>Trend</TableCell>
                        <TableCell>Contributing Factors</TableCell>
                        <TableCell>Last Assessment</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentAssessment?.results.categoryScores.map((category) => (
                        <TableRow key={category.categoryId}>
                          <TableCell>{category.categoryName}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2">
                                {category.score.toFixed(1)}
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={category.score}
                                color={getRiskLevelColor(category.level) as any}
                                sx={{ width: 100 }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={category.level}
                              color={getRiskLevelColor(category.level) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{category.confidence.toFixed(1)}%</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getTrendIcon(category.trend)}
                              {category.trend}
                            </Box>
                          </TableCell>
                          <TableCell>{category.contributingFactors.length}</TableCell>
                          <TableCell>{formatDate(category.lastAssessment!)}</TableCell>
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
          {/* Risk Trends Chart */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Trends Over Time
                </Typography>
                <Box sx={{ height: 400 }}>
                  {riskTrends && riskTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={riskTrends[0]?.dataPoints || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Line type="monotone" dataKey="value" stroke="#8884d8" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography color="textSecondary">No trend data available</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Risk Correlations */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Correlations
                </Typography>
                <List>
                  {riskCorrelations?.slice(0, 10).map((correlation, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={`${correlation.factor1} ↔ ${correlation.factor2}`}
                        secondary={
                          <Box>
                            <Typography variant="body2">
                              Correlation: {correlation.correlationCoefficient.toFixed(3)}
                            </Typography>
                            <Chip
                              label={correlation.strength}
                              size="small"
                              color={correlation.type === 'POSITIVE' ? 'success' : 'warning'}
                            />
                          </Box>
                        }
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
          {/* Risk Scenarios */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Scenarios
                </Typography>
                <Grid container spacing={2}>
                  {riskScenarios?.map((scenario) => (
                    <Grid item xs={12} md={6} lg={4} key={scenario.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {scenario.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" paragraph>
                            {scenario.description}
                          </Typography>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2">
                              Probability: {scenario.probability.toFixed(1)}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={scenario.probability}
                              color="warning"
                              sx={{ mt: 1 }}
                            />
                          </Box>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2">
                              Impact: {scenario.impact.toFixed(1)}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={scenario.impact}
                              color="error"
                              sx={{ mt: 1 }}
                            />
                          </Box>
                          <Typography variant="body2" color="textSecondary">
                            Timeframe: {scenario.timeframe}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={4}>
        <Grid container spacing={3}>
          {/* Mitigation Planning */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Risk Mitigation Planning
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Risk Factor</TableCell>
                        <TableCell>Current Score</TableCell>
                        <TableCell>Target Score</TableCell>
                        <TableCell>Mitigation Strategy</TableCell>
                        <TableCell>Owner</TableCell>
                        <TableCell>Due Date</TableCell>
                        <TableCell>Progress</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentAssessment?.results.factorScores
                        .filter(f => f.score > 60)
                        .map((factor) => (
                        <TableRow key={factor.factorId}>
                          <TableCell>{factor.factorName}</TableCell>
                          <TableCell>
                            <Chip
                              label={factor.score.toFixed(1)}
                              color={getRiskLevelColor(factor.score > 80 ? 'CRITICAL' : factor.score > 60 ? 'HIGH' : 'MEDIUM') as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="success.main">
                              {'< 40'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              Implement enhanced controls
                            </Typography>
                          </TableCell>
                          <TableCell>Risk Manager</TableCell>
                          <TableCell>{formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))}</TableCell>
                          <TableCell>
                            <LinearProgress
                              variant="determinate"
                              value={25}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
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

      {/* Assessment Dialog */}
      <Dialog
        open={isAssessmentDialogOpen}
        onClose={() => setIsAssessmentDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Run Risk Assessment</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            This will execute a comprehensive risk assessment including:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="Data collection from all configured sources" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Risk scoring using hybrid algorithms" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Trend and correlation analysis" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Scenario generation and modeling" />
            </ListItem>
            <ListItem>
              <ListItemText primary="Recommendation generation" />
            </ListItem>
          </List>
          <Typography variant="body2" color="textSecondary">
            Assessment typically takes 5-10 minutes to complete.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAssessmentDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRunAssessment}
            disabled={loading}
          >
            Run Assessment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => setAnchorEl(null)}>
          <VisibilityIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <DownloadIcon sx={{ mr: 1 }} />
          Export Report
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default RiskManagementDashboard;
