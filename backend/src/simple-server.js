const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      database: 'pending',
      cache: 'pending',
      ml: 'ready',
      api: 'ready'
    }
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'SMS Management System API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: {
      'AI-Powered Analytics': 'available',
      'Risk Assessment': 'available',
      'Training Management': 'available',
      'Compliance Monitoring': 'available',
      'Document Management': 'available'
    }
  });
});

// Mock ML/AI endpoints
app.get('/api/ml/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      services: {
        forecasting: 'healthy',
        classification: 'healthy',
        optimization: 'healthy',
        pipeline: 'healthy',
        aiService: 'healthy'
      },
      timestamp: new Date().toISOString()
    }
  });
});

// Mock forecasting endpoint
app.post('/api/ml/forecasting/arima', (req, res) => {
  const { data, horizon } = req.body;

  // Mock forecast data
  const forecast = {
    model: 'ARIMA',
    horizon: horizon || 30,
    predictions: Array.from({ length: horizon || 30 }, (_, i) => ({
      timestamp: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
      value: Math.random() * 100 + 50,
      confidence: {
        lower: Math.random() * 40 + 30,
        upper: Math.random() * 40 + 70
      }
    })),
    accuracy: 0.95,
    metadata: {
      modelParams: { p: 1, d: 1, q: 1 },
      trainingData: data?.length || 100,
      generatedAt: new Date().toISOString()
    }
  };

  res.json({
    success: true,
    data: forecast
  });
});

// Mock risk classification endpoint
app.post('/api/ml/risk/classify', (req, res) => {
  const { features } = req.body;

  const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const randomRisk = riskLevels[Math.floor(Math.random() * riskLevels.length)];

  const classification = {
    riskLevel: randomRisk,
    confidence: Math.random() * 0.3 + 0.7, // 0.7 - 1.0
    probability: {
      LOW: Math.random() * 0.3,
      MEDIUM: Math.random() * 0.3,
      HIGH: Math.random() * 0.3,
      CRITICAL: Math.random() * 0.3
    },
    factors: {
      companySize: features?.companySize || 'MEDIUM',
      industry: features?.industry || 'MANUFACTURING',
      historicalIncidents: Math.floor(Math.random() * 10),
      complianceScore: Math.random() * 100
    },
    recommendations: [
      'Implement additional safety training',
      'Review current risk mitigation procedures',
      'Increase monitoring frequency',
      'Update emergency response protocols'
    ],
    explanation: {
      topFactors: [
        { factor: 'Historical Incidents', impact: 0.35 },
        { factor: 'Compliance Score', impact: 0.28 },
        { factor: 'Industry Risk', impact: 0.22 },
        { factor: 'Company Size', impact: 0.15 }
      ]
    }
  };

  res.json({
    success: true,
    data: classification
  });
});

// Mock dashboard data endpoint
app.get('/api/dashboard/data', (req, res) => {
  const dashboardData = {
    kpis: {
      totalIncidents: Math.floor(Math.random() * 50) + 10,
      incidentTrend: (Math.random() - 0.5) * 20,
      riskScore: Math.random() * 3 + 7,
      riskTrend: (Math.random() - 0.5) * 20,
      complianceScore: Math.random() * 20 + 80,
      complianceTrend: (Math.random() - 0.5) * 10,
      trainingCompletion: Math.random() * 30 + 70,
      trainingTrend: (Math.random() - 0.5) * 15
    },
    recentAlerts: [
      {
        id: 1,
        type: 'HIGH_RISK',
        title: 'Elevated Risk Level Detected',
        description: 'AI model detected increased risk in Manufacturing Unit A',
        timestamp: new Date(),
        severity: 'HIGH'
      },
      {
        id: 2,
        type: 'TRAINING_DUE',
        title: 'Training Compliance Alert',
        description: '15 employees have overdue safety training',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        severity: 'MEDIUM'
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
      }
    ]
  };

  res.json({
    success: true,
    data: dashboardData
  });
});

// Catch-all for undefined routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `API endpoint ${req.path} not found`,
      availableEndpoints: [
        'GET /api/health',
        'GET /api/status',
        'GET /api/ml/health',
        'POST /api/ml/forecasting/arima',
        'POST /api/ml/risk/classify',
        'GET /api/dashboard/data'
      ]
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An internal server error occurred',
      timestamp: new Date().toISOString()
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SMS Management System API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📈 API status: http://localhost:${PORT}/api/status`);
  console.log(`🤖 ML health: http://localhost:${PORT}/api/ml/health`);
  console.log(`⚡ Ready to serve AI-powered SMS management requests!`);
});

module.exports = app;