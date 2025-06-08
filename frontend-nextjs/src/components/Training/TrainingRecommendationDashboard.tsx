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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Rating,
  Divider,
  Avatar,
  Badge
} from '@mui/material';
import {
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  PlayArrow as PlayIcon,
  Bookmark as BookmarkIcon,
  Share as ShareIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Lightbulb as LightbulbIcon,
  Target as TargetIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useTrainingRecommendations } from '../../hooks/useTrainingRecommendations';
import { formatDate, formatDuration } from '../../utils/formatters';

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
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const TrainingRecommendationDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isLearningPathDialogOpen, setIsLearningPathDialogOpen] = useState(false);

  const {
    recommendations,
    learningPaths,
    userProfile,
    skillGapAnalysis,
    learningHistory,
    loading,
    error,
    getRecommendations,
    generateLearningPath,
    updateRecommendationFeedback,
    trackLearningActivity,
    performSkillGapAnalysis
  } = useTrainingRecommendations();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        getRecommendations(),
        performSkillGapAnalysis()
      ]);
    } catch (error) {
      console.error('Failed to load training dashboard data:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleRecommendationClick = (recommendation: any) => {
    setSelectedRecommendation(recommendation);
    setIsDetailDialogOpen(true);
  };

  const handleEnrollInCourse = async (contentId: string) => {
    try {
      await trackLearningActivity({
        activityId: crypto.randomUUID(),
        type: 'COURSE_START',
        contentId,
        contentTitle: selectedRecommendation?.title || 'Unknown',
        timestamp: new Date(),
        duration: 0,
        context: {
          device: 'web',
          location: 'dashboard',
          timeOfDay: new Date().getHours().toString(),
          dayOfWeek: new Date().getDay().toString(),
          sessionId: crypto.randomUUID(),
          referrer: 'recommendation'
        }
      });
      setIsDetailDialogOpen(false);
    } catch (error) {
      console.error('Failed to enroll in course:', error);
    }
  };

  const handleFeedback = async (recommendationId: string, feedback: any) => {
    try {
      await updateRecommendationFeedback(recommendationId, feedback);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleGenerateLearningPath = async () => {
    try {
      const topSkillGaps = skillGapAnalysis?.prioritizedGaps.slice(0, 5).map(gap => gap.skillId) || [];
      
      await generateLearningPath(
        'Skill Development Path',
        topSkillGaps,
        {
          maxDuration: userProfile?.contextualFactors.availability * 4 || 20, // 4 weeks
          budget: userProfile?.contextualFactors.budget || 1000,
          preferredFormat: userProfile?.preferences.delivery || 'ONLINE'
        }
      );
      setIsLearningPathDialogOpen(false);
    } catch (error) {
      console.error('Failed to generate learning path:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SKILL_GAP':
        return <TargetIcon />;
      case 'CAREER_DEVELOPMENT':
        return <TrendingUpIcon />;
      case 'COMPLIANCE':
        return <AssessmentIcon />;
      case 'TRENDING':
        return <TimelineIcon />;
      case 'PEER_RECOMMENDED':
        return <PersonIcon />;
      default:
        return <SchoolIcon />;
    }
  };

  if (loading && !recommendations) {
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
          Training Recommendations
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
            startIcon={<LightbulbIcon />}
            onClick={() => setIsLearningPathDialogOpen(true)}
          >
            Generate Path
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
                <LightbulbIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6">Recommendations</Typography>
                  <Typography variant="h4" color="primary">
                    {recommendations?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Personalized for you
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
                <TargetIcon color="warning" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6">Skill Gaps</Typography>
                  <Typography variant="h4" color="warning">
                    {skillGapAnalysis?.criticalGaps || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Critical gaps identified
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
                <TimelineIcon color="info" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6">Learning Paths</Typography>
                  <Typography variant="h4" color="info">
                    {learningPaths?.length || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active paths
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
                <SpeedIcon color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h6">Progress</Typography>
                  <Typography variant="h4" color="success">
                    {skillGapAnalysis?.overallGapScore.toFixed(0) || 0}%
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Skill completion
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="training tabs">
          <Tab label="Recommendations" id="training-tab-0" />
          <Tab label="Learning Paths" id="training-tab-1" />
          <Tab label="Skill Analysis" id="training-tab-2" />
          <Tab label="Progress" id="training-tab-3" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <Grid container spacing={3}>
          {/* Recommendation Filters */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FilterIcon />
                <Typography variant="h6">Filter Recommendations</Typography>
                <Chip label="All" variant="outlined" />
                <Chip label="Skill Gap" variant="outlined" />
                <Chip label="Career" variant="outlined" />
                <Chip label="Compliance" variant="outlined" />
                <Chip label="Trending" variant="outlined" />
              </Box>
            </Paper>
          </Grid>

          {/* Recommendations List */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Personalized Recommendations
                </Typography>
                <List>
                  {recommendations?.slice(0, 10).map((recommendation, index) => (
                    <React.Fragment key={recommendation.id}>
                      <ListItem
                        button
                        onClick={() => handleRecommendationClick(recommendation)}
                      >
                        <ListItemIcon>
                          <Badge
                            badgeContent={recommendation.score.toFixed(0)}
                            color="primary"
                            max={100}
                          >
                            {getTypeIcon(recommendation.type)}
                          </Badge>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1">
                                {recommendation.title || `Content ${recommendation.contentId}`}
                              </Typography>
                              <Chip
                                label={recommendation.priority}
                                color={getPriorityColor(recommendation.priority) as any}
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="textSecondary">
                                {recommendation.reasoning?.explanation || 'Recommended based on your profile'}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Chip label={recommendation.category} size="small" variant="outlined" />
                                <Chip 
                                  label={`${recommendation.timeToComplete}h`} 
                                  size="small" 
                                  variant="outlined" 
                                  icon={<ScheduleIcon />}
                                />
                                <Chip 
                                  label={`${recommendation.confidence}% match`} 
                                  size="small" 
                                  variant="outlined" 
                                />
                              </Box>
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end">
                            <MoreVertIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < (recommendations?.length || 0) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Recommendation Insights */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recommendation Insights
                </Typography>
                <Box sx={{ height: 300 }}>
                  {recommendations && recommendations.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Skill Gap', value: recommendations.filter(r => r.type === 'SKILL_GAP').length },
                            { name: 'Career', value: recommendations.filter(r => r.type === 'CAREER_DEVELOPMENT').length },
                            { name: 'Compliance', value: recommendations.filter(r => r.type === 'COMPLIANCE').length },
                            { name: 'Trending', value: recommendations.filter(r => r.type === 'TRENDING').length },
                            { name: 'Other', value: recommendations.filter(r => !['SKILL_GAP', 'CAREER_DEVELOPMENT', 'COMPLIANCE', 'TRENDING'].includes(r.type)).length }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label
                        >
                          {[
                            { name: 'Skill Gap', value: recommendations.filter(r => r.type === 'SKILL_GAP').length },
                            { name: 'Career', value: recommendations.filter(r => r.type === 'CAREER_DEVELOPMENT').length },
                            { name: 'Compliance', value: recommendations.filter(r => r.type === 'COMPLIANCE').length },
                            { name: 'Trending', value: recommendations.filter(r => r.type === 'TRENDING').length },
                            { name: 'Other', value: recommendations.filter(r => !['SKILL_GAP', 'CAREER_DEVELOPMENT', 'COMPLIANCE', 'TRENDING'].includes(r.type)).length }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'][index]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography color="textSecondary">No recommendations available</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <Grid container spacing={3}>
          {/* Learning Paths */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Your Learning Paths
                </Typography>
                {learningPaths && learningPaths.length > 0 ? (
                  <Grid container spacing={2}>
                    {learningPaths.map((path) => (
                      <Grid item xs={12} md={6} lg={4} key={path.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {path.name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" paragraph>
                              {path.description}
                            </Typography>
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2">
                                Progress: {path.progress.overallProgress.toFixed(1)}%
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={path.progress.overallProgress}
                                sx={{ mt: 1 }}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Chip
                                label={path.status}
                                color={path.status === 'ACTIVE' ? 'success' : 'default'}
                                size="small"
                              />
                              <Typography variant="body2" color="textSecondary">
                                {path.progress.coursesCompleted}/{path.progress.totalCourses} courses
                              </Typography>
                            </Box>
                            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                              <Button size="small" variant="contained">
                                Continue
                              </Button>
                              <Button size="small" variant="outlined">
                                View Details
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="textSecondary" gutterBottom>
                      No learning paths created yet
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<LightbulbIcon />}
                      onClick={() => setIsLearningPathDialogOpen(true)}
                    >
                      Generate Learning Path
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Grid container spacing={3}>
          {/* Skill Gap Analysis */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Skill Gap Analysis
                </Typography>
                {skillGapAnalysis?.prioritizedGaps && skillGapAnalysis.prioritizedGaps.length > 0 ? (
                  <List>
                    {skillGapAnalysis.prioritizedGaps.slice(0, 10).map((gap, index) => (
                      <React.Fragment key={gap.skillId}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1">
                                  {gap.skillName}
                                </Typography>
                                <Chip
                                  label={gap.priority}
                                  color={getPriorityColor(gap.priority) as any}
                                  size="small"
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="textSecondary">
                                  Current: {gap.currentLevel}/10 → Target: {gap.targetLevel}/10
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                  <Typography variant="body2" sx={{ minWidth: 60 }}>
                                    Gap: {gap.gapSize}
                                  </Typography>
                                  <LinearProgress
                                    variant="determinate"
                                    value={(gap.currentLevel / gap.targetLevel) * 100}
                                    sx={{ flexGrow: 1 }}
                                  />
                                  <Typography variant="body2" color="textSecondary">
                                    {gap.estimatedEffort}h
                                  </Typography>
                                </Box>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < skillGapAnalysis.prioritizedGaps.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="textSecondary">
                      No skill gaps identified
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Skill Gap Summary */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Gap Summary
                </Typography>
                {skillGapAnalysis && (
                  <Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        Overall Score: {skillGapAnalysis.overallGapScore.toFixed(1)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={skillGapAnalysis.overallGapScore}
                        color="success"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        Critical Gaps: {skillGapAnalysis.criticalGaps}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        Time to Close: {Math.round(skillGapAnalysis.timeToClose)} hours
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<LightbulbIcon />}
                      onClick={() => setIsLearningPathDialogOpen(true)}
                    >
                      Create Development Plan
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <Grid container spacing={3}>
          {/* Learning Progress */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Learning Progress & Analytics
                </Typography>
                <Box sx={{ height: 400 }}>
                  {learningHistory?.performance ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={learningHistory.performance.trendsOverTime || []}>
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
                      <Typography color="textSecondary">No progress data available</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Recommendation Detail Dialog */}
      <Dialog
        open={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedRecommendation?.title || 'Course Details'}
        </DialogTitle>
        <DialogContent>
          {selectedRecommendation && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedRecommendation.reasoning?.explanation || 'This course is recommended based on your learning profile and goals.'}
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Estimated Benefit:</Typography>
                <Typography variant="body2">{selectedRecommendation.estimatedBenefit}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Time to Complete:</Typography>
                <Typography variant="body2">{selectedRecommendation.timeToComplete} hours</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Prerequisites:</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  {selectedRecommendation.prerequisites?.map((prereq: string, index: number) => (
                    <Chip key={index} label={prereq} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2">Rate this recommendation:</Typography>
                <Rating
                  value={0}
                  onChange={(event, newValue) => {
                    if (newValue) {
                      handleFeedback(selectedRecommendation.id, {
                        rating: newValue,
                        relevance: newValue,
                        timing: newValue,
                        quality: newValue,
                        action: 'RATED',
                        submittedAt: new Date()
                      });
                    }
                  }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDetailDialogOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayIcon />}
            onClick={() => handleEnrollInCourse(selectedRecommendation?.contentId)}
          >
            Enroll Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Learning Path Generation Dialog */}
      <Dialog
        open={isLearningPathDialogOpen}
        onClose={() => setIsLearningPathDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate Personalized Learning Path</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Create a personalized learning path based on your skill gaps and career goals.
          </Typography>
          <Typography variant="body2" color="textSecondary">
            This will analyze your current skills, identify gaps, and create a structured learning plan with recommended courses and milestones.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsLearningPathDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerateLearningPath}
            disabled={loading}
          >
            Generate Path
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrainingRecommendationDashboard;
