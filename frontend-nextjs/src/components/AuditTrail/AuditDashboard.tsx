import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
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
  TablePagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  VerifiedUser as VerifiedIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon
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
import { useAuditTrail } from '../../hooks/useAuditTrail';
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
      id={`audit-tabpanel-${index}`}
      aria-labelledby={`audit-tab-${index}`}
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

const AuditDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    end: new Date()
  });
  const [filters, setFilters] = useState({
    eventTypes: [] as string[],
    categories: [] as string[],
    severities: [] as string[],
    userId: '',
    searchQuery: ''
  });
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  const {
    events,
    analytics,
    alerts,
    loading,
    error,
    searchEvents,
    getAnalytics,
    getAlerts,
    verifyEventIntegrity,
    exportEvents
  } = useAuditTrail();

  useEffect(() => {
    // Load initial data
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        searchEvents({
          startDate: dateRange.start,
          endDate: dateRange.end,
          ...filters
        }),
        getAnalytics(dateRange.start, dateRange.end),
        getAlerts()
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleFilterChange = (filterType: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const handleVerifyIntegrity = async (eventId: string) => {
    try {
      const result = await verifyEventIntegrity(eventId);
      // Show verification result
      console.log('Integrity verification:', result);
    } catch (error) {
      console.error('Failed to verify integrity:', error);
    }
  };

  const handleExport = async (format: 'JSON' | 'CSV' | 'PDF') => {
    try {
      await exportEvents({
        format,
        startDate: dateRange.start,
        endDate: dateRange.end,
        filters
      });
    } catch (error) {
      console.error('Failed to export events:', error);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <ErrorIcon color="error" />;
      case 'HIGH':
        return <WarningIcon color="warning" />;
      case 'MEDIUM':
        return <InfoIcon color="info" />;
      case 'LOW':
        return <SecurityIcon color="success" />;
      default:
        return <InfoIcon />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '#f44336';
      case 'HIGH':
        return '#ff9800';
      case 'MEDIUM':
        return '#2196f3';
      case 'LOW':
        return '#4caf50';
      default:
        return '#9e9e9e';
    }
  };

  if (loading && !events.length) {
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
          Audit Trail & Compliance
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
            startIcon={<DownloadIcon />}
            onClick={() => handleExport('PDF')}
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

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TimelineIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{events.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Events
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
                  <Typography variant="h4">{alerts.length}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Alerts
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
                  <Typography variant="h4">
                    {analytics?.complianceScore ? `${Math.round(analytics.complianceScore)}%` : 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Compliance Score
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
                  <Typography variant="h4">
                    {analytics?.riskScore ? Math.round(analytics.riskScore) : 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Risk Score
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Date Range and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                label="Start Date"
                type="datetime-local"
                value={dateRange.start.toISOString().slice(0, 16)}
                onChange={(e) => setDateRange(prev => ({
                  ...prev,
                  start: new Date(e.target.value)
                }))}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="End Date"
                type="datetime-local"
                value={dateRange.end.toISOString().slice(0, 16)}
                onChange={(e) => setDateRange(prev => ({
                  ...prev,
                  end: new Date(e.target.value)
                }))}
                fullWidth
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Event Types</InputLabel>
                <Select
                  multiple
                  value={filters.eventTypes}
                  onChange={(e) => handleFilterChange('eventTypes', e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="USER_ACTION">User Action</MenuItem>
                  <MenuItem value="SYSTEM_EVENT">System Event</MenuItem>
                  <MenuItem value="SECURITY_EVENT">Security Event</MenuItem>
                  <MenuItem value="DATA_CHANGE">Data Change</MenuItem>
                  <MenuItem value="ACCESS_EVENT">Access Event</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                label="Search"
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                fullWidth
                size="small"
                placeholder="Search events..."
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="audit tabs">
          <Tab label="Events" id="audit-tab-0" />
          <Tab label="Analytics" id="audit-tab-1" />
          <Tab label="Alerts" id="audit-tab-2" />
          <Tab label="Compliance" id="audit-tab-3" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Event Type</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Resource</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.eventId} hover>
                  <TableCell>{formatDateTime(event.timestamp)}</TableCell>
                  <TableCell>
                    <Chip label={event.eventType} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{event.category}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getSeverityIcon(event.severity)}
                      {event.severity}
                    </Box>
                  </TableCell>
                  <TableCell>{event.action}</TableCell>
                  <TableCell>{event.userEmail || event.userId || 'System'}</TableCell>
                  <TableCell>{event.resourceName || event.resourceId || '-'}</TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleEventClick(event)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Verify Integrity">
                      <IconButton
                        size="small"
                        onClick={() => handleVerifyIntegrity(event.eventId)}
                      >
                        <VerifiedIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <Grid container spacing={3}>
          {/* Events Over Time Chart */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Events Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.eventsOverTime || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <RechartsTooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Event Types Distribution */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Event Types
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics?.eventTypes || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(analytics?.eventTypes || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={getSeverityColor(entry.name)} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Severity Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Severity Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics?.severities || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="severity" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Users */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Most Active Users
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analytics?.topUsers || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="user" />
                    <YAxis />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Typography variant="h6" gutterBottom>
          Security Alerts
        </Typography>
        <Grid container spacing={2}>
          {alerts.map((alert) => (
            <Grid item xs={12} key={alert.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {getSeverityIcon(alert.severity)}
                      <Box>
                        <Typography variant="h6">{alert.title}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          {alert.description}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatDateTime(alert.triggerTime)}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={alert.status}
                      color={alert.status === 'OPEN' ? 'error' : 'success'}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <Typography variant="h6" gutterBottom>
          Compliance Reports
        </Typography>
        <Typography variant="body1">
          Compliance reporting functionality will be displayed here.
        </Typography>
      </TabPanel>

      {/* Event Details Dialog */}
      <Dialog
        open={isEventDialogOpen}
        onClose={() => setIsEventDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Event Details</DialogTitle>
        <DialogContent>
          {selectedEvent && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Event ID</Typography>
                  <Typography variant="body2">{selectedEvent.eventId}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Timestamp</Typography>
                  <Typography variant="body2">{formatDateTime(selectedEvent.timestamp)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Event Type</Typography>
                  <Typography variant="body2">{selectedEvent.eventType}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Category</Typography>
                  <Typography variant="body2">{selectedEvent.category}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Description</Typography>
                  <Typography variant="body2">{selectedEvent.description}</Typography>
                </Grid>
                {selectedEvent.metadata && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Metadata</Typography>
                    <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                        {JSON.stringify(selectedEvent.metadata, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEventDialogOpen(false)}>
            Close
          </Button>
          {selectedEvent && (
            <Button
              variant="contained"
              onClick={() => handleVerifyIntegrity(selectedEvent.eventId)}
            >
              Verify Integrity
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AuditDashboard;
