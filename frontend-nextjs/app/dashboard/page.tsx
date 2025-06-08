'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { KPICard } from '../../components/ui/kpi-card';
import { AlertCard } from '../../components/ui/alert-card';
import { MainLayout } from '../../components/layout/main-layout';
import {
  Brain,
  TrendingUp,
  Shield,
  Users,
  AlertTriangle,
  FileText,
  BarChart3,
  Activity,
  Target,
  Zap,
  CheckCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Eye,
  Award,
  BookOpen,
  Lightbulb,
  Gauge,
  TrendingDown,
  Calendar,
  ArrowRight,
  Sparkles
} from 'lucide-react';

// Import our AI components (commented out for now - will create simplified versions)
// import SMSIntelligenceDashboard from '../../src/components/SMS/SMSIntelligenceDashboard';
// import AdvancedVisualizationDashboard from '../../src/components/AI/AdvancedVisualizationDashboard';
// import DecisionSupportTools from '../../src/components/AI/DecisionSupportTools';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState({
    kpis: {
      totalIncidents: 23,
      incidentTrend: -12,
      riskScore: 7.2,
      riskTrend: -8,
      complianceScore: 94,
      complianceTrend: 3,
      trainingCompletion: 87,
      trainingTrend: 5,
      aiAccuracy: 95.8,
      aiTrend: 2.1,
      predictionsGenerated: 1247,
      predictionsTrend: 15.3
    },
    recentAlerts: [
      {
        id: 1,
        type: 'HIGH_RISK' as const,
        title: 'Elevated Risk Level Detected',
        description: 'AI model detected increased risk in Manufacturing Unit A based on recent incident patterns',
        timestamp: '2 minutes ago',
        severity: 'HIGH' as const
      },
      {
        id: 2,
        type: 'WARNING' as const,
        title: 'Training Compliance Alert',
        description: '15 employees have overdue safety training certifications',
        timestamp: '2 hours ago',
        severity: 'MEDIUM' as const
      },
      {
        id: 3,
        type: 'INFO' as const,
        title: 'AI Prediction Update',
        description: 'Machine learning model forecasts 12% reduction in incidents next quarter',
        timestamp: '4 hours ago',
        severity: 'LOW' as const
      },
      {
        id: 4,
        type: 'SUCCESS' as const,
        title: 'Compliance Target Achieved',
        description: 'Safety compliance score reached 94% - exceeding quarterly target',
        timestamp: '6 hours ago',
        severity: 'LOW' as const
      }
    ],
    aiInsights: [
      {
        id: 1,
        type: 'FORECAST',
        title: 'Safety Performance Forecast',
        description: 'Expected 15% improvement in safety metrics over next quarter',
        confidence: 92,
        impact: 'POSITIVE'
      },
      {
        id: 2,
        type: 'RECOMMENDATION',
        title: 'Training Optimization',
        description: 'Recommend focusing on equipment safety training for high-risk areas',
        confidence: 88,
        impact: 'POSITIVE'
      },
      {
        id: 3,
        type: 'RISK_ALERT',
        title: 'Risk Pattern Detected',
        description: 'Unusual pattern in incident reports suggests process review needed',
        confidence: 85,
        impact: 'NEGATIVE'
      }
    ]
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactIcon = (impact: string) => {
    return impact === 'POSITIVE' ? 
      <ArrowUp className="h-4 w-4 text-green-600" /> : 
      <ArrowDown className="h-4 w-4 text-red-600" />;
  };

  const getTrendIcon = (trend: number) => {
    return trend > 0 ? 
      <ArrowUp className="h-4 w-4 text-green-600" /> : 
      <ArrowDown className="h-4 w-4 text-red-600" />;
  };

  return (
    <MainLayout
      title="AI-Powered SMS Dashboard"
      subtitle="Intelligent safety management with predictive analytics and machine learning insights"
    >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sms-intelligence">SMS Intelligence</TabsTrigger>
            <TabsTrigger value="ai-analytics">AI Analytics</TabsTrigger>
            <TabsTrigger value="decision-support">Decision Support</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Enhanced KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              <KPICard
                title="Total Incidents"
                value={dashboardData.kpis.totalIncidents}
                change={dashboardData.kpis.incidentTrend}
                changeLabel="vs last month"
                icon={AlertTriangle}
                iconColor="text-red-600"
                trend={dashboardData.kpis.incidentTrend < 0 ? 'down' : 'up'}
                description="Safety incidents reported this month"
                badge="Critical"
                badgeVariant="destructive"
              />

              <KPICard
                title="Risk Score"
                value={`${dashboardData.kpis.riskScore}/10`}
                change={dashboardData.kpis.riskTrend}
                changeLabel="improvement"
                icon={Shield}
                iconColor="text-orange-600"
                trend={dashboardData.kpis.riskTrend < 0 ? 'down' : 'up'}
                description="Overall organizational risk level"
                badge="Monitored"
                badgeVariant="secondary"
              />

              <KPICard
                title="Compliance Score"
                value={`${dashboardData.kpis.complianceScore}%`}
                change={dashboardData.kpis.complianceTrend}
                changeLabel="vs target"
                icon={CheckCircle}
                iconColor="text-green-600"
                trend="up"
                description="Regulatory compliance achievement"
                badge="Excellent"
                badgeVariant="secondary"
              />

              <KPICard
                title="Training Completion"
                value={`${dashboardData.kpis.trainingCompletion}%`}
                change={dashboardData.kpis.trainingTrend}
                changeLabel="completion rate"
                icon={BookOpen}
                iconColor="text-blue-600"
                trend="up"
                description="Employee training progress"
                badge="On Track"
                badgeVariant="secondary"
              />

              <KPICard
                title="AI Accuracy"
                value={`${dashboardData.kpis.aiAccuracy}%`}
                change={dashboardData.kpis.aiTrend}
                changeLabel="model performance"
                icon={Brain}
                iconColor="text-purple-600"
                trend="up"
                description="Machine learning prediction accuracy"
                badge="AI"
                badgeVariant="secondary"
              />

              <KPICard
                title="Predictions Generated"
                value={dashboardData.kpis.predictionsGenerated.toLocaleString()}
                change={dashboardData.kpis.predictionsTrend}
                changeLabel="this month"
                icon={Sparkles}
                iconColor="text-indigo-600"
                trend="up"
                description="AI-powered insights delivered"
                badge="Active"
                badgeVariant="secondary"
              />
            </div>

            {/* Recent Alerts and AI Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Alerts */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground flex items-center">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                      Recent Alerts
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Latest system alerts and notifications
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </div>
                <div className="space-y-4">
                  {dashboardData.recentAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      id={alert.id}
                      type={alert.type}
                      title={alert.title}
                      description={alert.description}
                      timestamp={alert.timestamp}
                      severity={alert.severity}
                      actionable={alert.type === 'HIGH_RISK' || alert.type === 'WARNING'}
                      onAction={() => console.log('Action clicked for alert:', alert.id)}
                      onDismiss={() => console.log('Dismiss clicked for alert:', alert.id)}
                    />
                  ))}
                </div>
              </div>

              {/* AI Insights */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground flex items-center">
                      <Brain className="h-5 w-5 text-purple-600 mr-2" />
                      AI Insights
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Machine learning predictions and recommendations
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    More Insights
                  </Button>
                </div>
                <div className="space-y-4">
                  {dashboardData.aiInsights.map((insight) => (
                    <Card key={insight.id} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className={`p-2 rounded-lg ${insight.impact === 'POSITIVE' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                {insight.impact === 'POSITIVE' ?
                                  <TrendingUp className="h-4 w-4" /> :
                                  <TrendingDown className="h-4 w-4" />
                                }
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">{insight.title}</h3>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {insight.confidence}% Confidence
                                  </Badge>
                                  <Badge variant={insight.impact === 'POSITIVE' ? 'secondary' : 'outline'} className="text-xs">
                                    {insight.type}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                              {insight.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <Gauge className="h-3 w-3" />
                                <span>Confidence: {insight.confidence}%</span>
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 text-xs">
                                View Details
                                <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                      <div className={`absolute inset-0 bg-gradient-to-br from-transparent via-transparent ${insight.impact === 'POSITIVE' ? 'to-green-500/5' : 'to-orange-500/5'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 text-yellow-600 mr-2" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common tasks and AI-powered shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center hover:shadow-md transition-all duration-200 group">
                    <AlertTriangle className="h-6 w-6 mb-2 text-red-600 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Report Incident</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center hover:shadow-md transition-all duration-200 group">
                    <Shield className="h-6 w-6 mb-2 text-orange-600 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Risk Assessment</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center hover:shadow-md transition-all duration-200 group">
                    <BookOpen className="h-6 w-6 mb-2 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Assign Training</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center hover:shadow-md transition-all duration-200 group">
                    <FileText className="h-6 w-6 mb-2 text-green-600 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">Generate Report</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center hover:shadow-md transition-all duration-200 group">
                    <Brain className="h-6 w-6 mb-2 text-purple-600 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">AI Analysis</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex flex-col items-center justify-center hover:shadow-md transition-all duration-200 group">
                    <BarChart3 className="h-6 w-6 mb-2 text-indigo-600 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">View Analytics</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMS Intelligence Tab */}
          <TabsContent value="sms-intelligence">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 text-blue-600 mr-2" />
                  SMS Intelligence Dashboard
                </CardTitle>
                <CardDescription>
                  Intelligent SMS management with predictive capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-8 text-center">
                  <div className="mb-4">
                    <Brain className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">SMS Intelligence Dashboard</h3>
                    <p className="text-gray-600 mb-4">
                      AI-powered SMS management with predictive capabilities and intelligent insights.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800">Predictive Analytics</h4>
                      <p className="text-blue-600">95% accuracy in safety forecasting</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800">Risk Assessment</h4>
                      <p className="text-green-600">Real-time risk classification</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-800">Smart Recommendations</h4>
                      <p className="text-purple-600">AI-driven safety insights</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Analytics Tab */}
          <TabsContent value="ai-analytics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 text-green-600 mr-2" />
                  Advanced AI Analytics
                </CardTitle>
                <CardDescription>
                  Machine learning visualizations and predictive analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-8 text-center">
                  <div className="mb-4">
                    <BarChart3 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Advanced AI Analytics</h3>
                    <p className="text-gray-600 mb-4">
                      Machine learning visualizations and predictive analytics dashboard.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800">Time Series Forecasting</h4>
                      <p className="text-blue-600">ARIMA, Prophet, LSTM models</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800">Interactive Charts</h4>
                      <p className="text-green-600">Real-time data visualization</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-800">Risk Heatmaps</h4>
                      <p className="text-purple-600">Spatial risk analysis</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-orange-800">Performance Metrics</h4>
                      <p className="text-orange-600">KPI tracking and trends</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Decision Support Tab */}
          <TabsContent value="decision-support">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 text-purple-600 mr-2" />
                  AI Decision Support Tools
                </CardTitle>
                <CardDescription>
                  Intelligent recommendations and scenario analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-8 text-center">
                  <div className="mb-4">
                    <Target className="h-16 w-16 text-purple-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">AI Decision Support Tools</h3>
                    <p className="text-gray-600 mb-4">
                      Intelligent recommendations and scenario analysis for optimal decision making.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800">What-If Analysis</h4>
                      <p className="text-blue-600">Scenario modeling and simulation</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800">Smart Recommendations</h4>
                      <p className="text-green-600">AI-powered action suggestions</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-800">Risk Optimization</h4>
                      <p className="text-purple-600">Resource allocation optimization</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-orange-800">Alert Management</h4>
                      <p className="text-orange-600">Intelligent alert prioritization</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </MainLayout>
  );
}
