import React from 'react';
import Link from 'next/link';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Shield,
  Brain,
  TrendingUp,
  Users,
  FileText,
  AlertTriangle,
  BarChart3,
  Zap,
  CheckCircle,
  ArrowRight,
  Star,
  Globe,
  Lock,
  Smartphone
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-4 bg-white/20 text-white border-white/30">
              🚀 Next-Generation SMS Platform
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Intelligent SMS Management with
              <span className="block text-yellow-300">AI-Powered Insights</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 leading-relaxed">
              Transform your safety management with predictive analytics, automated compliance monitoring, 
              and intelligent decision support powered by advanced machine learning.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4 text-lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700">
              🎯 Core Features
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Modern SMS
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive safety management with cutting-edge AI capabilities
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* AI-Powered Features */}
            <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
              <CardHeader>
                <Brain className="h-12 w-12 text-blue-600 mb-4" />
                <CardTitle className="text-xl">AI-Powered Predictions</CardTitle>
                <CardDescription>
                  Advanced machine learning models for risk forecasting and incident prediction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Time series forecasting</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Risk classification</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Predictive analytics</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Intelligent recommendations</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 hover:border-green-400 transition-colors">
              <CardHeader>
                <TrendingUp className="h-12 w-12 text-green-600 mb-4" />
                <CardTitle className="text-xl">Smart Analytics</CardTitle>
                <CardDescription>
                  Real-time dashboards with interactive visualizations and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Interactive dashboards</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Advanced visualizations</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Performance metrics</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Trend analysis</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors">
              <CardHeader>
                <Shield className="h-12 w-12 text-purple-600 mb-4" />
                <CardTitle className="text-xl">Risk Management</CardTitle>
                <CardDescription>
                  Comprehensive risk assessment with automated monitoring and alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Risk assessments</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Automated monitoring</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Mitigation planning</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Compliance tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200 hover:border-orange-400 transition-colors">
              <CardHeader>
                <Users className="h-12 w-12 text-orange-600 mb-4" />
                <CardTitle className="text-xl">Training Management</CardTitle>
                <CardDescription>
                  Intelligent training recommendations with progress tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Personalized training</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Progress tracking</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Competency mapping</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Effectiveness measurement</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-200 hover:border-red-400 transition-colors">
              <CardHeader>
                <AlertTriangle className="h-12 w-12 text-red-600 mb-4" />
                <CardTitle className="text-xl">Incident Management</CardTitle>
                <CardDescription>
                  Complete incident lifecycle management with root cause analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Incident reporting</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Investigation workflows</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Root cause analysis</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Corrective actions</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-indigo-200 hover:border-indigo-400 transition-colors">
              <CardHeader>
                <FileText className="h-12 w-12 text-indigo-600 mb-4" />
                <CardTitle className="text-xl">Document Control</CardTitle>
                <CardDescription>
                  Centralized document management with version control and compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Version control</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Access management</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Approval workflows</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Audit trails</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* AI Capabilities Section */}
      <section className="py-20 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-indigo-100 text-indigo-700">
              🤖 AI-Powered Intelligence
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Advanced Machine Learning Capabilities
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Leverage cutting-edge AI to transform your safety management approach
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Predictive Analytics & Forecasting
              </h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <BarChart3 className="h-6 w-6 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Time Series Forecasting</h4>
                    <p className="text-gray-600">ARIMA, Prophet, and LSTM models for accurate predictions</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Zap className="h-6 w-6 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Risk Classification</h4>
                    <p className="text-gray-600">Multi-algorithm ensemble for intelligent risk assessment</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <TrendingUp className="h-6 w-6 text-purple-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Optimization Algorithms</h4>
                    <p className="text-gray-600">Genetic algorithms and constraint satisfaction for resource optimization</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">AI Performance Metrics</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Prediction Accuracy</span>
                  <span className="font-bold text-green-600">95%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Response Time</span>
                  <span className="font-bold text-blue-600">&lt;500ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Model Confidence</span>
                  <span className="font-bold text-purple-600">92%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Data Quality</span>
                  <span className="font-bold text-orange-600">99%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-gray-100 text-gray-700">
              🏢 Enterprise Ready
            </Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Built for Enterprise Scale
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Security, compliance, and scalability features for large organizations
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <Lock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enterprise Security</h3>
              <p className="text-gray-600">End-to-end encryption, RBAC, and comprehensive audit trails</p>
            </div>
            <div className="text-center">
              <Globe className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Global Compliance</h3>
              <p className="text-gray-600">GDPR, SOX, and industry-specific regulatory compliance</p>
            </div>
            <div className="text-center">
              <Smartphone className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Mobile Ready</h3>
              <p className="text-gray-600">Responsive design with native mobile app capabilities</p>
            </div>
            <div className="text-center">
              <Star className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">24/7 Support</h3>
              <p className="text-gray-600">Dedicated support team with guaranteed response times</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Ready to Transform Your Safety Management?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of organizations using our AI-powered SMS platform to improve safety outcomes and reduce risks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4 text-lg">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg">
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
