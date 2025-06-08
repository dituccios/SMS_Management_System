'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { KPICard } from '../../components/ui/kpi-card';
import { AdvancedKPICard } from '../../components/ui/advanced-kpi-card';
import { AlertCard } from '../../components/ui/alert-card';
import { MainLayout } from '../../components/layout/main-layout';
import { BentoGrid, BentoCard } from '../../components/ui/bento-grid';
import { AnimatedChart } from '../../components/ui/animated-chart';
import { ProgressRing } from '../../components/ui/progress-ring';
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
            {/* Stunning Bento Grid Layout */}
            <BentoGrid className="min-h-[600px]">
              {/* Large Featured AI Analytics Card */}
              <BentoCard size="lg" variant="featured" className="p-8">
                <div className="h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-sm">
                        <Brain className="h-8 w-8 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                          AI Analytics Hub
                        </h2>
                        <p className="text-muted-foreground">Real-time intelligence & predictions</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="text-center">
                        <ProgressRing
                          progress={dashboardData.kpis.aiAccuracy}
                          size={100}
                          color="#8b5cf6"
                          glowEffect={true}
                        >
                          <div className="text-center">
                            <div className="text-xl font-bold text-purple-600">{dashboardData.kpis.aiAccuracy}%</div>
                            <div className="text-xs text-muted-foreground">Accuracy</div>
                          </div>
                        </ProgressRing>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Predictions</span>
                          <span className="font-semibold">{dashboardData.kpis.predictionsGenerated}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Model Performance</span>
                          <span className="font-semibold text-green-600">+{dashboardData.kpis.aiTrend}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Status</span>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <AnimatedChart
                    title="AI Performance Trend"
                    data={[85, 88, 92, 89, 95, 96, 95.8]}
                    labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
                    color="#8b5cf6"
                    height={120}
                  />
                </div>
              </BentoCard>

              {/* Advanced KPI Cards */}
              <BentoCard size="sm">
                <AdvancedKPICard
                  title="Total Incidents"
                  value={dashboardData.kpis.totalIncidents}
                  change={dashboardData.kpis.incidentTrend}
                  changeLabel="vs last month"
                  icon={AlertTriangle}
                  iconColor="text-red-500"
                  trend={dashboardData.kpis.incidentTrend < 0 ? 'down' : 'up'}
                  description="Safety incidents reported"
                  badge="Critical"
                  badgeVariant="destructive"
                  variant="glassmorphic"
                  glowColor="rgba(239, 68, 68, 0.3)"
                />
              </BentoCard>

              <BentoCard size="sm">
                <AdvancedKPICard
                  title="Risk Score"
                  value={`${dashboardData.kpis.riskScore}/10`}
                  change={dashboardData.kpis.riskTrend}
                  changeLabel="improvement"
                  icon={Shield}
                  iconColor="text-orange-500"
                  trend={dashboardData.kpis.riskTrend < 0 ? 'down' : 'up'}
                  description="Overall risk level"
                  badge="Monitored"
                  badgeVariant="secondary"
                  variant="neumorphic"
                  glowColor="rgba(249, 115, 22, 0.3)"
                />
              </BentoCard>

              <BentoCard size="md" variant="accent">
                <div className="p-6 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Compliance Overview</h3>
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Overall Score</span>
                        <span className="text-2xl font-bold text-green-600">{dashboardData.kpis.complianceScore}%</span>
                      </div>

                      <ProgressRing
                        progress={dashboardData.kpis.complianceScore}
                        size={80}
                        color="#10b981"
                        className="mx-auto"
                      />

                      <div className="text-center">
                        <span className="text-xs text-muted-foreground">
                          +{dashboardData.kpis.complianceTrend}% vs target
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </BentoCard>

              <BentoCard size="sm">
                <AdvancedKPICard
                  title="Training Progress"
                  value={`${dashboardData.kpis.trainingCompletion}%`}
                  change={dashboardData.kpis.trainingTrend}
                  changeLabel="completion rate"
                  icon={BookOpen}
                  iconColor="text-blue-500"
                  trend="up"
                  description="Employee training"
                  badge="On Track"
                  badgeVariant="secondary"
                  variant="floating"
                  glowColor="rgba(59, 130, 246, 0.3)"
                />
              </BentoCard>
            </BentoGrid>

            {/* Advanced Alerts and Insights Grid */}
            <BentoGrid>
              {/* Real-time Alerts Section */}
              <BentoCard size="lg" className="p-8">
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-sm animate-pulse-glow">
                        <AlertTriangle className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-foreground">Real-time Alerts</h2>
                        <p className="text-sm text-muted-foreground">Live system monitoring & notifications</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="hover:shadow-lg transition-all duration-300">
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto max-h-96">
                    {dashboardData.recentAlerts.map((alert, index) => (
                      <div
                        key={alert.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <AlertCard
                          id={alert.id}
                          type={alert.type}
                          title={alert.title}
                          description={alert.description}
                          timestamp={alert.timestamp}
                          severity={alert.severity}
                          actionable={alert.type === 'HIGH_RISK' || alert.type === 'WARNING'}
                          onAction={() => console.log('Action clicked for alert:', alert.id)}
                          onDismiss={() => console.log('Dismiss clicked for alert:', alert.id)}
                          className="hover:scale-[1.02] transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </BentoCard>

              {/* AI Insights with Advanced Visualization */}
              <BentoCard size="lg" variant="featured" className="p-8">
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm animate-pulse-glow">
                        <Brain className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                          AI Insights Engine
                        </h2>
                        <p className="text-sm text-muted-foreground">Machine learning predictions & recommendations</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="hover:shadow-lg transition-all duration-300">
                      <Lightbulb className="h-4 w-4 mr-2" />
                      More Insights
                    </Button>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto max-h-96">
                    {dashboardData.aiInsights.map((insight, index) => (
                      <Card
                        key={insight.id}
                        className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 hover:-translate-y-1 animate-fade-in card-glassmorphic"
                        style={{ animationDelay: `${index * 0.15}s` }}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <div className={`p-3 rounded-xl transition-all duration-300 group-hover:scale-110 ${
                                  insight.impact === 'POSITIVE'
                                    ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-green-600'
                                    : 'bg-gradient-to-br from-orange-500/20 to-red-500/20 text-orange-600'
                                }`}>
                                  {insight.impact === 'POSITIVE' ?
                                    <TrendingUp className="h-5 w-5" /> :
                                    <TrendingDown className="h-5 w-5" />
                                  }
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground mb-2">{insight.title}</h3>
                                  <div className="flex items-center space-x-2">
                                    <ProgressRing
                                      progress={insight.confidence}
                                      size={40}
                                      strokeWidth={4}
                                      color={insight.impact === 'POSITIVE' ? '#10b981' : '#f59e0b'}
                                      animated={true}
                                    >
                                      <span className="text-xs font-bold">{insight.confidence}%</span>
                                    </ProgressRing>
                                    <div className="space-y-1">
                                      <Badge variant={insight.impact === 'POSITIVE' ? 'secondary' : 'outline'} className="text-xs">
                                        {insight.type}
                                      </Badge>
                                      <div className="text-xs text-muted-foreground">
                                        Confidence Level
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                                {insight.description}
                              </p>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                  <Gauge className="h-3 w-3" />
                                  <span>Impact: {insight.impact}</span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-7 text-xs hover:bg-primary/10 transition-all duration-300">
                                  View Details
                                  <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>

                        {/* Animated Background Effect */}
                        <div className={`absolute inset-0 bg-gradient-to-br from-transparent via-transparent ${
                          insight.impact === 'POSITIVE' ? 'to-green-500/5' : 'to-orange-500/5'
                        } opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                        {/* Floating Particles */}
                        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className={`absolute w-1 h-1 rounded-full animate-float ${
                                insight.impact === 'POSITIVE' ? 'bg-green-400/40' : 'bg-orange-400/40'
                              }`}
                              style={{
                                left: `${20 + i * 30}%`,
                                top: `${20 + i * 20}%`,
                                animationDelay: `${i * 0.5}s`,
                                animationDuration: `${3 + i}s`
                              }}
                            />
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </BentoCard>
            </BentoGrid>

            {/* Stunning Quick Actions Grid */}
            <BentoCard size="xl" className="p-8 gradient-mesh">
              <div className="mb-8">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm animate-pulse-glow">
                    <Zap className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                      Quick Actions Hub
                    </h2>
                    <p className="text-muted-foreground">AI-powered shortcuts and common tasks</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {[
                  { icon: AlertTriangle, label: 'Report Incident', color: 'from-red-500 to-red-600', textColor: 'text-red-600' },
                  { icon: Shield, label: 'Risk Assessment', color: 'from-orange-500 to-orange-600', textColor: 'text-orange-600' },
                  { icon: BookOpen, label: 'Assign Training', color: 'from-blue-500 to-blue-600', textColor: 'text-blue-600' },
                  { icon: FileText, label: 'Generate Report', color: 'from-green-500 to-green-600', textColor: 'text-green-600' },
                  { icon: Brain, label: 'AI Analysis', color: 'from-purple-500 to-purple-600', textColor: 'text-purple-600' },
                  { icon: BarChart3, label: 'View Analytics', color: 'from-indigo-500 to-indigo-600', textColor: 'text-indigo-600' }
                ].map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <div
                      key={index}
                      className="perspective-1000 animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <Button
                        variant="outline"
                        className="h-32 w-full flex flex-col items-center justify-center p-6 group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 transform-3d card-glassmorphic border-white/20"
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left - rect.width / 2;
                          const y = e.clientY - rect.top - rect.height / 2;
                          e.currentTarget.style.transform = `perspective(1000px) rotateX(${y / 10}deg) rotateY(${-x / 10}deg) translateZ(20px)`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
                        }}
                      >
                        {/* Animated Background */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

                        {/* Icon with 3D Effect */}
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${action.color} bg-opacity-10 mb-3 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500`}>
                          <Icon className={`h-8 w-8 ${action.textColor} group-hover:drop-shadow-lg transition-all duration-500`} />
                        </div>

                        {/* Label */}
                        <span className="text-sm font-medium text-center leading-tight group-hover:text-foreground transition-colors duration-300">
                          {action.label}
                        </span>

                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <div
                            className="absolute inset-0 animate-shimmer"
                            style={{
                              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                              backgroundSize: '200% 100%'
                            }}
                          />
                        </div>

                        {/* Floating Particles */}
                        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className={`absolute w-1 h-1 bg-gradient-to-r ${action.color} rounded-full animate-float`}
                              style={{
                                left: `${20 + i * 30}%`,
                                top: `${20 + i * 20}%`,
                                animationDelay: `${i * 0.3}s`,
                                animationDuration: `${2 + i * 0.5}s`
                              }}
                            />
                          ))}
                        </div>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </BentoCard>
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
