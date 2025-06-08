import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  TextField,
  Slider,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Compare as CompareIcon,
  Lightbulb as LightbulbIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

interface WhatIfScenario {
  scenarioId: string;
  name: string;
  description: string;
  parameters: Record<string, number>;
  results: ScenarioResults;
  confidence: number;
  feasibility: number;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface ScenarioResults {
  metrics: Record<string, number>;
  risks: RiskAssessment[];
  costs: CostAnalysis;
  timeline: TimelineEvent[];
  recommendations: string[];
}

interface RiskAssessment {
  riskId: string;
  category: string;
  description: string;
  probability: number;
  impact: number;
  mitigation: string;
}

interface CostAnalysis {
  initial: number;
  operational: number;
  maintenance: number;
  total: number;
  roi: number;
  paybackPeriod: number;
}

interface TimelineEvent {
  date: string;
  event: string;
  type: 'MILESTONE' | 'RISK' | 'DECISION' | 'COMPLETION';
  impact: number;
}

interface Recommendation {
  recommendationId: string;
  title: string;
  description: string;
  category: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  evidence: Evidence[];
  implementation: ImplementationPlan;
  alternatives: Alternative[];
}

interface Evidence {
  type: 'DATA' | 'EXPERT' | 'HISTORICAL' | 'SIMULATION';
  source: string;
  reliability: number;
  description: string;
}

interface ImplementationPlan {
  steps: ImplementationStep[];
  resources: ResourceRequirement[];
  timeline: number;
  cost: number;
  risks: string[];
}

interface ImplementationStep {
  stepId: string;
  description: string;
  duration: number;
  dependencies: string[];
  resources: string[];
}

interface ResourceRequirement {
  type: 'HUMAN' | 'FINANCIAL' | 'TECHNICAL' | 'MATERIAL';
  description: string;
  quantity: number;
  cost: number;
}

interface Alternative {
  alternativeId: string;
  description: string;
  pros: string[];
  cons: string[];
  cost: number;
  feasibility: number;
}

interface Alert {
  alertId: string;
  title: string;
  description: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category: string;
  timestamp: Date;
  acknowledged: boolean;
  actions: AlertAction[];
}

interface AlertAction {
  actionId: string;
  description: string;
  type: 'IMMEDIATE' | 'SCHEDULED' | 'CONDITIONAL';
  automated: boolean;
}

const DecisionSupportTools: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<WhatIfScenario[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
  const [selectedParameters, setSelectedParameters] = useState<Record<string, number>>({});
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);

  // Sample data
  useEffect(() => {
    setScenarios([
      {
        scenarioId: 'scenario-1',
        name: 'Current State',
        description: 'Baseline scenario with current parameters',
        parameters: {
          budget: 1000000,
          timeline: 12,
          resources: 10,
          riskTolerance: 5
        },
        results: {
          metrics: {
            efficiency: 75,
            cost: 1000000,
            risk: 6,
            satisfaction: 80
          },
          risks: [
            {
              riskId: 'risk-1',
              category: 'Operational',
              description: 'Resource constraints',
              probability: 0.7,
              impact: 6,
              mitigation: 'Increase resource allocation'
            }
          ],
          costs: {
            initial: 800000,
            operational: 150000,
            maintenance: 50000,
            total: 1000000,
            roi: 15,
            paybackPeriod: 24
          },
          timeline: [
            { date: '2024-03-01', event: 'Project Start', type: 'MILESTONE', impact: 0 },
            { date: '2024-06-01', event: 'Phase 1 Complete', type: 'MILESTONE', impact: 25 },
            { date: '2024-09-01', event: 'Phase 2 Complete', type: 'MILESTONE', impact: 50 },
            { date: '2024-12-01', event: 'Project Complete', type: 'COMPLETION', impact: 100 }
          ],
          recommendations: [
            'Consider increasing budget allocation',
            'Implement risk mitigation strategies',
            'Monitor resource utilization closely'
          ]
        },
        confidence: 0.85,
        feasibility: 0.90,
        impact: 'MEDIUM'
      },
      {
        scenarioId: 'scenario-2',
        name: 'Optimized Approach',
        description: 'Enhanced scenario with improved parameters',
        parameters: {
          budget: 1200000,
          timeline: 10,
          resources: 12,
          riskTolerance: 3
        },
        results: {
          metrics: {
            efficiency: 88,
            cost: 1200000,
            risk: 4,
            satisfaction: 92
          },
          risks: [
            {
              riskId: 'risk-2',
              category: 'Financial',
              description: 'Budget overrun',
              probability: 0.3,
              impact: 4,
              mitigation: 'Implement strict budget controls'
            }
          ],
          costs: {
            initial: 950000,
            operational: 180000,
            maintenance: 70000,
            total: 1200000,
            roi: 22,
            paybackPeriod: 18
          },
          timeline: [
            { date: '2024-03-01', event: 'Project Start', type: 'MILESTONE', impact: 0 },
            { date: '2024-05-01', event: 'Phase 1 Complete', type: 'MILESTONE', impact: 30 },
            { date: '2024-07-01', event: 'Phase 2 Complete', type: 'MILESTONE', impact: 65 },
            { date: '2024-10-01', event: 'Project Complete', type: 'COMPLETION', impact: 100 }
          ],
          recommendations: [
            'Proceed with enhanced approach',
            'Monitor budget closely',
            'Implement quality controls'
          ]
        },
        confidence: 0.78,
        feasibility: 0.85,
        impact: 'HIGH'
      }
    ]);

    setRecommendations([
      {
        recommendationId: 'rec-1',
        title: 'Implement Predictive Maintenance',
        description: 'Deploy AI-powered predictive maintenance to reduce equipment failures',
        category: 'SHORT_TERM',
        priority: 'HIGH',
        confidence: 0.92,
        evidence: [
          {
            type: 'DATA',
            source: 'Historical maintenance records',
            reliability: 0.95,
            description: 'Analysis of 2 years of maintenance data shows 40% reduction potential'
          },
          {
            type: 'EXPERT',
            source: 'Industry experts',
            reliability: 0.85,
            description: 'Expert consensus on predictive maintenance benefits'
          }
        ],
        implementation: {
          steps: [
            {
              stepId: 'step-1',
              description: 'Install IoT sensors',
              duration: 30,
              dependencies: [],
              resources: ['Technical team', 'IoT equipment']
            },
            {
              stepId: 'step-2',
              description: 'Deploy ML models',
              duration: 45,
              dependencies: ['step-1'],
              resources: ['Data scientists', 'ML platform']
            }
          ],
          resources: [
            {
              type: 'FINANCIAL',
              description: 'Initial investment',
              quantity: 1,
              cost: 250000
            },
            {
              type: 'HUMAN',
              description: 'Technical specialists',
              quantity: 3,
              cost: 150000
            }
          ],
          timeline: 90,
          cost: 400000,
          risks: ['Technology adoption challenges', 'Data quality issues']
        },
        alternatives: [
          {
            alternativeId: 'alt-1',
            description: 'Traditional scheduled maintenance',
            pros: ['Lower initial cost', 'Proven approach'],
            cons: ['Higher long-term costs', 'More downtime'],
            cost: 200000,
            feasibility: 0.95
          }
        ]
      }
    ]);

    setAlerts([
      {
        alertId: 'alert-1',
        title: 'High Risk Threshold Exceeded',
        description: 'Current risk level has exceeded the acceptable threshold',
        severity: 'WARNING',
        category: 'Risk Management',
        timestamp: new Date(),
        acknowledged: false,
        actions: [
          {
            actionId: 'action-1',
            description: 'Review risk mitigation strategies',
            type: 'IMMEDIATE',
            automated: false
          },
          {
            actionId: 'action-2',
            description: 'Notify risk management team',
            type: 'IMMEDIATE',
            automated: true
          }
        ]
      }
    ]);
  }, []);

  const runWhatIfAnalysis = useCallback(async (parameters: Record<string, number>) => {
    setIsAnalysisRunning(true);
    
    // Simulate analysis
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newScenario: WhatIfScenario = {
      scenarioId: `scenario-${Date.now()}`,
      name: `Custom Scenario ${scenarios.length + 1}`,
      description: 'User-defined scenario analysis',
      parameters,
      results: {
        metrics: {
          efficiency: 70 + Math.random() * 30,
          cost: parameters.budget * (0.8 + Math.random() * 0.4),
          risk: Math.max(1, 10 - parameters.riskTolerance + Math.random() * 3),
          satisfaction: 60 + Math.random() * 40
        },
        risks: [],
        costs: {
          initial: parameters.budget * 0.8,
          operational: parameters.budget * 0.15,
          maintenance: parameters.budget * 0.05,
          total: parameters.budget,
          roi: 10 + Math.random() * 20,
          paybackPeriod: 12 + Math.random() * 24
        },
        timeline: [],
        recommendations: ['Monitor implementation progress', 'Adjust parameters as needed']
      },
      confidence: 0.7 + Math.random() * 0.25,
      feasibility: 0.6 + Math.random() * 0.35,
      impact: Math.random() > 0.5 ? 'HIGH' : 'MEDIUM'
    };
    
    setScenarios(prev => [...prev, newScenario]);
    setActiveScenario(newScenario.scenarioId);
    setIsAnalysisRunning(false);
  }, [scenarios.length]);

  const compareScenarios = useCallback((scenarioIds: string[]) => {
    const selectedScenarios = scenarios.filter(s => scenarioIds.includes(s.scenarioId));
    // Comparison logic would go here
    console.log('Comparing scenarios:', selectedScenarios);
  }, [scenarios]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.alertId === alertId 
        ? { ...alert, acknowledged: true }
        : alert
    ));
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'WARNING': return 'warning';
      case 'INFO': return 'info';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return '#f44336';
      case 'HIGH': return '#ff9800';
      case 'MEDIUM': return '#2196f3';
      case 'LOW': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        AI-Powered Decision Support Tools
      </Typography>

      <Grid container spacing={3}>
        {/* What-If Analysis */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  What-If Analysis
                </Typography>
                <Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={comparisonMode}
                        onChange={(e) => setComparisonMode(e.target.checked)}
                      />
                    }
                    label="Comparison Mode"
                  />
                  <Button
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => runWhatIfAnalysis(selectedParameters)}
                    disabled={isAnalysisRunning}
                    sx={{ ml: 1 }}
                  >
                    {isAnalysisRunning ? 'Running...' : 'Run Analysis'}
                  </Button>
                </Box>
              </Box>

              {/* Parameter Controls */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                  <Typography gutterBottom>Budget ($)</Typography>
                  <Slider
                    value={selectedParameters.budget || 1000000}
                    onChange={(e, value) => setSelectedParameters(prev => ({ ...prev, budget: value as number }))}
                    min={500000}
                    max={2000000}
                    step={50000}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `$${(value / 1000000).toFixed(1)}M`}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography gutterBottom>Timeline (months)</Typography>
                  <Slider
                    value={selectedParameters.timeline || 12}
                    onChange={(e, value) => setSelectedParameters(prev => ({ ...prev, timeline: value as number }))}
                    min={6}
                    max={24}
                    step={1}
                    valueLabelDisplay="auto"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography gutterBottom>Resources</Typography>
                  <Slider
                    value={selectedParameters.resources || 10}
                    onChange={(e, value) => setSelectedParameters(prev => ({ ...prev, resources: value as number }))}
                    min={5}
                    max={20}
                    step={1}
                    valueLabelDisplay="auto"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography gutterBottom>Risk Tolerance</Typography>
                  <Slider
                    value={selectedParameters.riskTolerance || 5}
                    onChange={(e, value) => setSelectedParameters(prev => ({ ...prev, riskTolerance: value as number }))}
                    min={1}
                    max={10}
                    step={1}
                    valueLabelDisplay="auto"
                  />
                </Grid>
              </Grid>

              {/* Scenario Results */}
              {scenarios.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Scenario Results
                  </Typography>
                  
                  {comparisonMode ? (
                    <Box>
                      <FormControl sx={{ mb: 2, minWidth: 200 }}>
                        <InputLabel>Select Scenarios</InputLabel>
                        <Select
                          multiple
                          value={selectedScenarios}
                          onChange={(e) => setSelectedScenarios(e.target.value as string[])}
                          label="Select Scenarios"
                        >
                          {scenarios.map((scenario) => (
                            <MenuItem key={scenario.scenarioId} value={scenario.scenarioId}>
                              {scenario.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      {selectedScenarios.length > 1 && (
                        <Box sx={{ height: 300 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={[
                              {
                                metric: 'Efficiency',
                                ...Object.fromEntries(
                                  selectedScenarios.map(id => {
                                    const scenario = scenarios.find(s => s.scenarioId === id);
                                    return [scenario?.name || id, scenario?.results.metrics.efficiency || 0];
                                  })
                                )
                              },
                              {
                                metric: 'Cost Efficiency',
                                ...Object.fromEntries(
                                  selectedScenarios.map(id => {
                                    const scenario = scenarios.find(s => s.scenarioId === id);
                                    return [scenario?.name || id, 100 - (scenario?.results.metrics.cost || 0) / 20000];
                                  })
                                )
                              },
                              {
                                metric: 'Risk Level',
                                ...Object.fromEntries(
                                  selectedScenarios.map(id => {
                                    const scenario = scenarios.find(s => s.scenarioId === id);
                                    return [scenario?.name || id, 100 - (scenario?.results.metrics.risk || 0) * 10];
                                  })
                                )
                              },
                              {
                                metric: 'Satisfaction',
                                ...Object.fromEntries(
                                  selectedScenarios.map(id => {
                                    const scenario = scenarios.find(s => s.scenarioId === id);
                                    return [scenario?.name || id, scenario?.results.metrics.satisfaction || 0];
                                  })
                                )
                              }
                            ]}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="metric" />
                              <PolarRadiusAxis angle={90} domain={[0, 100]} />
                              {selectedScenarios.map((id, index) => {
                                const scenario = scenarios.find(s => s.scenarioId === id);
                                const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];
                                return (
                                  <Radar
                                    key={id}
                                    name={scenario?.name || id}
                                    dataKey={scenario?.name || id}
                                    stroke={colors[index % colors.length]}
                                    fill={colors[index % colors.length]}
                                    fillOpacity={0.1}
                                  />
                                );
                              })}
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      {scenarios.map((scenario) => (
                        <Grid item xs={12} md={6} key={scenario.scenarioId}>
                          <Paper 
                            sx={{ 
                              p: 2, 
                              cursor: 'pointer',
                              border: activeScenario === scenario.scenarioId ? 2 : 1,
                              borderColor: activeScenario === scenario.scenarioId ? 'primary.main' : 'divider'
                            }}
                            onClick={() => setActiveScenario(scenario.scenarioId)}
                          >
                            <Typography variant="subtitle1" gutterBottom>
                              {scenario.name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              {scenario.description}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                              <Chip 
                                label={`${scenario.impact} Impact`} 
                                color={scenario.impact === 'HIGH' ? 'error' : scenario.impact === 'MEDIUM' ? 'warning' : 'success'}
                                size="small"
                              />
                              <Chip 
                                label={`${(scenario.confidence * 100).toFixed(0)}% Confidence`} 
                                variant="outlined"
                                size="small"
                              />
                            </Box>
                            
                            <Grid container spacing={1}>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Efficiency</Typography>
                                <Typography variant="body2">{scenario.results.metrics.efficiency.toFixed(0)}%</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Risk Level</Typography>
                                <Typography variant="body2">{scenario.results.metrics.risk.toFixed(1)}/10</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Cost</Typography>
                                <Typography variant="body2">${(scenario.results.metrics.cost / 1000000).toFixed(1)}M</Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">ROI</Typography>
                                <Typography variant="body2">{scenario.results.costs.roi.toFixed(0)}%</Typography>
                              </Grid>
                            </Grid>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations Panel */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Intelligent Recommendations
              </Typography>
              
              {recommendations.map((rec) => (
                <Accordion key={rec.recommendationId}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <LightbulbIcon color="primary" />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2">{rec.title}</Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip 
                            label={rec.priority} 
                            size="small"
                            sx={{ bgcolor: getPriorityColor(rec.priority), color: 'white' }}
                          />
                          <Chip 
                            label={rec.category} 
                            variant="outlined"
                            size="small"
                          />
                        </Box>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" paragraph>
                      {rec.description}
                    </Typography>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Implementation Timeline: {rec.implementation.timeline} days
                    </Typography>
                    <Typography variant="subtitle2" gutterBottom>
                      Estimated Cost: ${rec.implementation.cost.toLocaleString()}
                    </Typography>
                    <Typography variant="subtitle2" gutterBottom>
                      Confidence: {(rec.confidence * 100).toFixed(0)}%
                    </Typography>
                    
                    <Box sx={{ mt: 2 }}>
                      <Button variant="outlined" size="small" sx={{ mr: 1 }}>
                        View Details
                      </Button>
                      <Button variant="contained" size="small">
                        Implement
                      </Button>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Alert Management */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Alert Management & Prioritization
              </Typography>
              
              <List>
                {alerts.map((alert) => (
                  <ListItem 
                    key={alert.alertId}
                    sx={{ 
                      border: 1, 
                      borderColor: 'divider', 
                      borderRadius: 1, 
                      mb: 1,
                      bgcolor: alert.acknowledged ? 'action.hover' : 'background.paper'
                    }}
                  >
                    <ListItemIcon>
                      <WarningIcon color={getSeverityColor(alert.severity) as any} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1">{alert.title}</Typography>
                          <Chip 
                            label={alert.severity} 
                            color={getSeverityColor(alert.severity) as any}
                            size="small"
                          />
                          {alert.acknowledged && (
                            <Chip label="Acknowledged" color="success" size="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {alert.description}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {alert.category} • {alert.timestamp.toLocaleString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {!alert.acknowledged && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => acknowledgeAlert(alert.alertId)}
                        >
                          Acknowledge
                        </Button>
                      )}
                      <Button variant="contained" size="small">
                        Take Action
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DecisionSupportTools;
