import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Description,
  AccountTree,
  ReportProblem,
  School,
  Assessment,
  Warning,
  Schedule,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { apiService } from '../services/api';
import { DashboardStats } from '../types';

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useAuthStore();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiService.sms.getDashboard();
      
      if (response.data.success) {
        const { statistics, recentActivities, alerts } = response.data.data;
        setStats(statistics);
        setRecentActivities(recentActivities);
        setAlerts(alerts);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  const StatCard = ({ title, value, icon, color = 'primary' }: any) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" component="div" fontWeight="bold">
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}.main`,
              borderRadius: '50%',
              width: 56,
              height: 56,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {React.cloneElement(icon, { sx: { color: 'white', fontSize: 28 } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Welcome back, {user?.firstName}!
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Here's an overview of your Safety Management System
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Documents"
            value={stats?.documents.total || 0}
            icon={<Description />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Workflows"
            value={stats?.workflows.active || 0}
            icon={<AccountTree />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Open Incidents"
            value={stats?.incidents.open || 0}
            icon={<ReportProblem />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Trainings"
            value={stats?.trainings.active || 0}
            icon={<School />}
            color="success"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent Activities */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Recent Documents
              </Typography>
              {recentActivities?.documents?.length > 0 ? (
                <List>
                  {recentActivities.documents.map((doc: any, index: number) => (
                    <React.Fragment key={doc.id}>
                      <ListItem>
                        <ListItemIcon>
                          <Description color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={doc.title}
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Chip
                                label={doc.status}
                                size="small"
                                color={doc.status === 'APPROVED' ? 'success' : 'default'}
                              />
                              <Typography variant="caption" color="text.secondary">
                                by {doc.author.firstName} {doc.author.lastName}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < recentActivities.documents.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">No recent documents</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts and Notifications */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Alerts & Notifications
              </Typography>
              
              {/* Expiring Documents */}
              {alerts?.expiringDocuments?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="warning.main" gutterBottom>
                    <Warning sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    Documents Expiring Soon
                  </Typography>
                  <List dense>
                    {alerts.expiringDocuments.slice(0, 3).map((doc: any) => (
                      <ListItem key={doc.id} sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={doc.title}
                          secondary={`Expires: ${new Date(doc.expiresAt).toLocaleDateString()}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {/* Upcoming Reviews */}
              {alerts?.upcomingReviews?.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="info.main" gutterBottom>
                    <Schedule sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    Upcoming Reviews
                  </Typography>
                  <List dense>
                    {alerts.upcomingReviews.slice(0, 3).map((doc: any) => (
                      <ListItem key={doc.id} sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={doc.title}
                          secondary={`Review: ${new Date(doc.reviewDate).toLocaleDateString()}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {(!alerts?.expiringDocuments?.length && !alerts?.upcomingReviews?.length) && (
                <Typography color="text.secondary">No alerts at this time</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
