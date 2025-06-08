import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  DatePicker,
  Chip,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Menu,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  MoreVert as MoreVertIcon
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
  ResponsiveContainer
} from 'recharts';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useTrainingAnalytics } from '../../hooks/useTrainingAnalytics';
import { formatDate, formatPercentage } from '../../utils/formatters';

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  departments: string[];
  positions: string[];
  trainingIds: string[];
  status: string[];
}

const TrainingAnalyticsDashboard: React.FC = () => {
  const [filters, setFilters] = useState<DashboardFilters>({
    departments: [],
    positions: [],
    trainingIds: [],
    status: []
  });
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  const {
    metrics,
    loading,
    error,
    refreshData,
    exportReport,
    getDashboardData
  } = useTrainingAnalytics();

  useEffect(() => {
    loadDashboardData();
  }, [filters, selectedTimeRange]);

  const loadDashboardData = async () => {
    try {
      const dateRange = getDateRangeFromSelection(selectedTimeRange);
      await getDashboardData({
        ...filters,
        ...dateRange
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const getDateRangeFromSelection = (range: string) => {
    const now = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    return { startDate, endDate: now };
  };

  const handleExportReport = async (format: string) => {
    try {
      const dateRange = getDateRangeFromSelection(selectedTimeRange);
      await exportReport({
        ...filters,
        ...dateRange
      }, {
        format: format as any,
        includeDetails: true,
        includeCharts: format === 'PDF'
      });
      setExportMenuAnchor(null);
    } catch (error) {
      console.error('Failed to export report:', error);
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

  const getComplianceColor = (rate: number) => {
    if (rate >= 95) return 'success';
    if (rate >= 80) return 'warning';
    return 'error';
  };

  if (loading && !metrics) {
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

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ width: '100%' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Training Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Comprehensive training performance and compliance analytics
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={selectedTimeRange}
                label="Time Range"
                onChange={(e) => setSelectedTimeRange(e.target.value)}
              >
                <MenuItem value="7d">Last 7 days</MenuItem>
                <MenuItem value="30d">Last 30 days</MenuItem>
                <MenuItem value="90d">Last 90 days</MenuItem>
                <MenuItem value="1y">Last year</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={refreshData}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={(e) => setExportMenuAnchor(e.currentTarget)}
            >
              Export
            </Button>
          </Box>
        </Box>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Key Metrics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <PeopleIcon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4">{metrics?.totalPersonas || 0}</Typography>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <SchoolIcon color="info" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4">{metrics?.totalTrainingRecords || 0}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Training Records
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
                    <Typography variant="h4">
                      {formatPercentage(metrics?.completionRate || 0)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Completion Rate
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
                  <AssessmentIcon 
                    color={getComplianceColor(metrics?.complianceRate || 0) as any} 
                    sx={{ fontSize: 40 }} 
                  />
                  <Box>
                    <Typography variant="h4">
                      {formatPercentage(metrics?.complianceRate || 0)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Compliance Rate
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Secondary Metrics */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{metrics?.averageScore?.toFixed(1) || 0}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Avg Score
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6">{metrics?.averageCompletionTime?.toFixed(1) || 0}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Avg Days
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="error">
                  {metrics?.overdueCount || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Overdue
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="warning.main">
                  {metrics?.upcomingDeadlines || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Due Soon
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="success.main">
                  {metrics?.certificationsIssued || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Certificates
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* Completion Trend */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Training Completion Trend
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics?.completionTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="completions" 
                      stroke="#4caf50" 
                      strokeWidth={2}
                      name="Completions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Status Distribution */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Status Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics?.statusDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, count }) => `${status}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(metrics?.statusDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Department Performance */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Department Performance
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics?.departmentBreakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="completionRate" fill="#4caf50" name="Completion Rate %" />
                    <Bar dataKey="complianceRate" fill="#2196f3" name="Compliance Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Training Popularity
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics?.trainingBreakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="trainingTitle" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Bar dataKey="enrollments" fill="#ff9800" name="Enrollments" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Compliance Trend */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Compliance Trend Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={metrics?.complianceTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="compliant" 
                      stackId="1" 
                      stroke="#4caf50" 
                      fill="#4caf50"
                      name="Compliant"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pending" 
                      stackId="1" 
                      stroke="#ff9800" 
                      fill="#ff9800"
                      name="Pending"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="nonCompliant" 
                      stackId="1" 
                      stroke="#f44336" 
                      fill="#f44336"
                      name="Non-Compliant"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Export Menu */}
        <Menu
          anchorEl={exportMenuAnchor}
          open={Boolean(exportMenuAnchor)}
          onClose={() => setExportMenuAnchor(null)}
        >
          <MenuItem onClick={() => handleExportReport('PDF')}>
            Export as PDF
          </MenuItem>
          <MenuItem onClick={() => handleExportReport('EXCEL')}>
            Export as Excel
          </MenuItem>
          <MenuItem onClick={() => handleExportReport('CSV')}>
            Export as CSV
          </MenuItem>
        </Menu>
      </Box>
    </LocalizationProvider>
  );
};

export default TrainingAnalyticsDashboard;
