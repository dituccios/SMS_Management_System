'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
  Eye
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
      trainingTrend: 5
    },
    recentAlerts: [
      {
        id: 1,
        type: 'HIGH_RISK',
        title: 'Elevated Risk Level Detected',
        description: 'AI model detected increased risk in Manufacturing Unit A',
        timestamp: '2 minutes ago',
        severity: 'HIGH'
      },
      {
        id: 2,
        type: 'TRAINING_DUE',
        title: 'Training Compliance Alert',
        description: '15 employees have overdue safety training',
        timestamp: '2 hours ago',
        severity: 'MEDIUM'
      },
      {
        id: 3,
        type: 'PREDICTION',
        title: 'Incident Prediction',
        description: 'AI forecasts potential incident in next 7 days',
        timestamp: '4 hours ago',
        severity: 'HIGH'
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              AI-Powered SMS Dashboard
            </h1>
            <p className="text-gray-600">
              Intelligent safety management with predictive analytics
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge className="bg-green-100 text-green-800">
              <Activity className="h-3 w-3 mr-1" />
              System Healthy
            </Badge>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sms-intelligence">SMS Intelligence</TabsTrigger>
            <TabsTrigger value="ai-analytics">AI Analytics</TabsTrigger>
            <TabsTrigger value="decision-support">Decision Support</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.kpis.totalIncidents}</div>
                  <div className="flex items-center text-xs text-gray-600">
                    {getTrendIcon(dashboardData.kpis.incidentTrend)}
                    <span className="ml-1">{Math.abs(dashboardData.kpis.incidentTrend)}% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
                  <Shield className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.kpis.riskScore}/10</div>
                  <div className="flex items-center text-xs text-gray-600">
                    {getTrendIcon(dashboardData.kpis.riskTrend)}
                    <span className="ml-1">{Math.abs(dashboardData.kpis.riskTrend)}% improvement</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.kpis.complianceScore}%</div>
                  <div className="flex items-center text-xs text-gray-600">
                    {getTrendIcon(dashboardData.kpis.complianceTrend)}
                    <span className="ml-1">{Math.abs(dashboardData.kpis.complianceTrend)}% from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Training Completion</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.kpis.trainingCompletion}%</div>
                  <div className="flex items-center text-xs text-gray-600">
                    {getTrendIcon(dashboardData.kpis.trainingTrend)}
                    <span className="ml-1">{Math.abs(dashboardData.kpis.trainingTrend)}% from last month</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Alerts and AI Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                    Recent Alerts
                  </CardTitle>
                  <CardDescription>
                    Latest system alerts and notifications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.recentAlerts.map((alert) => (
                      <div key={alert.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">{alert.title}</h4>
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                          <div className="flex items-center text-xs text-gray-500 mt-2">
                            <Clock className="h-3 w-3 mr-1" />
                            {alert.timestamp}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* AI Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="h-5 w-5 text-purple-600 mr-2" />
                    AI Insights
                  </CardTitle>
                  <CardDescription>
                    Machine learning predictions and recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.aiInsights.map((insight) => (
                      <div key={insight.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">{insight.title}</h4>
                            <div className="flex items-center space-x-2">
                              {getImpactIcon(insight.impact)}
                              <span className="text-xs text-gray-500">{insight.confidence}%</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                          <div className="flex items-center text-xs text-gray-500 mt-2">
                            <Target className="h-3 w-3 mr-1" />
                            Confidence: {insight.confidence}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 text-yellow-600 mr-2" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                    <AlertTriangle className="h-6 w-6 mb-2" />
                    <span className="text-sm">Report Incident</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                    <Shield className="h-6 w-6 mb-2" />
                    <span className="text-sm">Risk Assessment</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                    <Users className="h-6 w-6 mb-2" />
                    <span className="text-sm">Assign Training</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center">
                    <FileText className="h-6 w-6 mb-2" />
                    <span className="text-sm">Generate Report</span>
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
      </div>
    </div>
  );
}
