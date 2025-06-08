# **🤖 MACHINE LEARNING & AI API DOCUMENTATION**

## **Overview**

This document provides comprehensive API documentation for the Machine Learning and AI components of the SMS Management System. The ML/AI infrastructure provides predictive analytics, intelligent decision support, and automated optimization capabilities.

## **🏗️ Architecture Overview**

### **Core ML Services**
- **Time Series Forecasting Service** - ARIMA, Prophet, LSTM, and Ensemble models
- **Risk Classification Service** - Multi-algorithm risk assessment with explanations
- **Data Processing Pipeline Service** - ETL, feature engineering, and data quality
- **Optimization Algorithms Service** - Constraint satisfaction, genetic algorithms, multi-objective optimization
- **AI Service Layer** - Centralized model serving, monitoring, and management

### **Integration Components**
- **Cross-Application Data Flow** - Event-driven updates and shared data models
- **Feature Store** - Centralized feature management and serving
- **Model Registry** - Version control and deployment management
- **Monitoring & Alerting** - Performance tracking and drift detection

---

## **📊 TIME SERIES FORECASTING API**

### **Base URL**: `/api/ml/forecasting`

### **Create ARIMA Forecast**
```http
POST /api/ml/forecasting/arima
```

**Request Body:**
```json
{
  "data": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "value": 100.5,
      "features": {
        "temperature": 22.5,
        "humidity": 65
      }
    }
  ],
  "horizon": 7,
  "autoOrder": true,
  "confidence": 0.95,
  "includeSeasonality": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "forecastId": "forecast-123",
    "modelType": "ARIMA",
    "predictions": [
      {
        "timestamp": "2024-01-08T00:00:00Z",
        "value": 105.2,
        "confidence": 0.92,
        "upperBound": 110.5,
        "lowerBound": 99.8,
        "factors": [
          {
            "factor": "trend",
            "importance": 0.6,
            "direction": "POSITIVE",
            "confidence": 0.85
          }
        ]
      }
    ],
    "confidence": [
      {
        "timestamp": "2024-01-08T00:00:00Z",
        "level": 0.95,
        "lower": 99.8,
        "upper": 110.5
      }
    ],
    "metrics": {
      "mae": 2.3,
      "mse": 8.1,
      "rmse": 2.85,
      "mape": 4.2,
      "r2": 0.89,
      "aic": 156.2,
      "bic": 162.8
    },
    "metadata": {
      "trainingPeriod": {
        "start": "2024-01-01T00:00:00Z",
        "end": "2024-01-07T00:00:00Z"
      },
      "forecastHorizon": 7,
      "seasonality": {
        "detected": true,
        "period": 7,
        "strength": 0.7
      },
      "trend": {
        "direction": "INCREASING",
        "strength": 0.6
      }
    }
  }
}
```

### **Create Prophet Forecast**
```http
POST /api/ml/forecasting/prophet
```

**Request Body:**
```json
{
  "data": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "value": 100.5
    }
  ],
  "horizon": 30,
  "includeHolidays": true,
  "seasonalities": [
    {
      "name": "weekly",
      "period": 7,
      "fourierOrder": 3
    }
  ],
  "changepoints": ["2024-01-15T00:00:00Z"]
}
```

### **Create LSTM Forecast**
```http
POST /api/ml/forecasting/lstm
```

**Request Body:**
```json
{
  "data": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "value": 100.5,
      "features": {
        "external_factor_1": 0.5,
        "external_factor_2": 0.8
      }
    }
  ],
  "horizon": 14,
  "architecture": {
    "layers": [
      {
        "type": "LSTM",
        "units": 50,
        "returnSequences": true
      },
      {
        "type": "DROPOUT",
        "dropout": 0.2
      },
      {
        "type": "DENSE",
        "units": 1
      }
    ]
  },
  "hyperparameters": {
    "lookbackWindow": 60,
    "batchSize": 32,
    "epochs": 100,
    "learningRate": 0.001
  }
}
```

### **Create Ensemble Forecast**
```http
POST /api/ml/forecasting/ensemble
```

**Request Body:**
```json
{
  "data": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "value": 100.5
    }
  ],
  "horizon": 7,
  "models": ["ARIMA", "PROPHET", "LSTM"],
  "combiningMethod": "WEIGHTED_AVERAGE",
  "optimizeWeights": true
}
```

---

## **🎯 RISK CLASSIFICATION API**

### **Base URL**: `/api/ml/risk`

### **Classify Risk**
```http
POST /api/ml/risk/classify
```

**Request Body:**
```json
{
  "features": {
    "companySize": 5000,
    "industry": "Technology",
    "complianceHistory": 85,
    "incidentCount": 3,
    "trainingCompletion": 92,
    "auditScore": 88,
    "securityMaturity": 7,
    "processMaturity": 8,
    "technicalDebt": 25,
    "staffTurnover": 12,
    "budgetAllocation": 2000000,
    "geographicRisk": 4,
    "regulatoryComplexity": 6,
    "dataVolume": 500000,
    "systemComplexity": 7,
    "vendorRisk": 5,
    "changeFrequency": 15,
    "monitoringCoverage": 85,
    "incidentResponseTime": 4,
    "businessCriticality": 8
  },
  "includeExplanation": true,
  "includeRecommendations": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "classificationId": "risk-class-123",
    "riskLevel": "MEDIUM",
    "confidence": 0.87,
    "probability": {
      "low": 0.15,
      "medium": 0.65,
      "high": 0.18,
      "critical": 0.02
    },
    "factors": [
      {
        "factor": "Security Maturity",
        "importance": 0.25,
        "value": 7,
        "impact": "NEGATIVE",
        "confidence": 0.92,
        "description": "Security maturity level affects overall risk"
      }
    ],
    "recommendations": [
      {
        "recommendationId": "rec-123",
        "type": "SHORT_TERM",
        "priority": "HIGH",
        "action": "Improve Security Maturity",
        "description": "Enhance security controls and processes",
        "expectedImpact": 25,
        "effort": 8,
        "cost": 150000,
        "timeline": 90
      }
    ],
    "explanation": {
      "summary": "Risk classified as MEDIUM based on security and process maturity factors",
      "keyFactors": ["Security Maturity", "Process Maturity", "Incident Count"],
      "reasoning": "The assessment considers multiple risk dimensions with security maturity being the primary concern",
      "alternatives": [
        {
          "scenario": "Improved Security",
          "changes": {
            "securityMaturity": 9
          },
          "newRiskLevel": "LOW",
          "probability": 0.78
        }
      ]
    }
  }
}
```

### **Batch Risk Classification**
```http
POST /api/ml/risk/classify/batch
```

**Request Body:**
```json
{
  "features": [
    {
      "companySize": 1000,
      "industry": "Finance",
      // ... other features
    }
  ],
  "options": {
    "includeExplanation": false,
    "includeRecommendations": true,
    "outputFormat": "JSON"
  }
}
```

### **Explain Risk Prediction**
```http
POST /api/ml/risk/explain
```

**Request Body:**
```json
{
  "features": {
    "companySize": 5000,
    "industry": "Technology"
    // ... other features
  },
  "classificationId": "risk-class-123"
}
```

---

## **🔄 DATA PROCESSING PIPELINE API**

### **Base URL**: `/api/ml/pipeline`

### **Create Pipeline**
```http
POST /api/ml/pipeline
```

**Request Body:**
```json
{
  "name": "ML Data Pipeline",
  "description": "Pipeline for ML model training data",
  "stages": [
    {
      "name": "Extract Data",
      "type": "EXTRACT",
      "configuration": {
        "source": {
          "type": "DATABASE",
          "connection": {
            "host": "db.example.com",
            "database": "ml_data",
            "username": "ml_user"
          },
          "query": "SELECT * FROM training_data WHERE date >= '2024-01-01'"
        }
      },
      "dependencies": [],
      "outputs": ["raw_data"]
    },
    {
      "name": "Feature Engineering",
      "type": "FEATURE_ENGINEERING",
      "configuration": {
        "featureEngineering": {
          "features": [
            {
              "name": "risk_score_normalized",
              "type": "NUMERICAL",
              "source": "risk_score",
              "transformation": "min_max_scale"
            }
          ],
          "encoding": {
            "categorical": [
              {
                "field": "industry",
                "method": "ONE_HOT"
              }
            ]
          },
          "scaling": {
            "numerical": [
              {
                "field": "risk_score",
                "method": "STANDARD"
              }
            ]
          }
        }
      },
      "dependencies": ["raw_data"],
      "outputs": ["engineered_features"]
    }
  ],
  "configuration": {
    "parallelism": 2,
    "retryPolicy": {
      "maxRetries": 3,
      "backoffStrategy": "EXPONENTIAL"
    },
    "dataQuality": {
      "enableValidation": true,
      "validationRules": [
        {
          "ruleId": "completeness",
          "name": "Data Completeness",
          "type": "COMPLETENESS",
          "condition": "null_count < 0.05",
          "severity": "ERROR"
        }
      ]
    }
  }
}
```

### **Execute Pipeline**
```http
POST /api/ml/pipeline/{pipelineId}/execute
```

**Request Body:**
```json
{
  "parameters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "batchSize": 1000
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "exec-123",
    "pipelineId": "pipeline-456",
    "status": "RUNNING",
    "startTime": "2024-01-15T10:00:00Z",
    "stages": [
      {
        "stageId": "stage-1",
        "status": "COMPLETED",
        "metrics": {
          "runtime": 30000,
          "recordsProcessed": 10000,
          "bytesProcessed": 1048576,
          "qualityScore": 0.95
        }
      }
    ]
  }
}
```

---

## **⚡ OPTIMIZATION ALGORITHMS API**

### **Base URL**: `/api/ml/optimization`

### **Solve Constraint Satisfaction**
```http
POST /api/ml/optimization/constraint-satisfaction
```

**Request Body:**
```json
{
  "problem": {
    "name": "Resource Allocation",
    "description": "Optimize resource allocation with constraints",
    "objectives": [
      {
        "name": "Minimize Cost",
        "type": "MINIMIZE",
        "expression": "sum(cost * allocation)",
        "weight": 1.0
      }
    ],
    "constraints": [
      {
        "name": "Capacity Constraint",
        "type": "INEQUALITY",
        "expression": "sum(allocation) <= capacity",
        "operator": "LE",
        "value": 100
      }
    ],
    "variables": [
      {
        "name": "allocation_1",
        "type": "CONTINUOUS",
        "lowerBound": 0,
        "upperBound": 50
      }
    ],
    "parameters": {
      "algorithm": "BACKTRACKING",
      "maxIterations": 1000,
      "tolerance": 1e-6,
      "timeLimit": 60
    }
  }
}
```

### **Solve Genetic Algorithm**
```http
POST /api/ml/optimization/genetic-algorithm
```

**Request Body:**
```json
{
  "problem": {
    "name": "Multi-Objective Optimization",
    "objectives": [
      {
        "name": "Maximize Efficiency",
        "type": "MAXIMIZE",
        "weight": 0.6
      },
      {
        "name": "Minimize Cost",
        "type": "MINIMIZE",
        "weight": 0.4
      }
    ],
    "variables": [
      {
        "name": "parameter_1",
        "type": "CONTINUOUS",
        "lowerBound": 0,
        "upperBound": 100
      }
    ],
    "parameters": {
      "populationSize": 50,
      "crossoverRate": 0.8,
      "mutationRate": 0.1,
      "maxIterations": 100
    }
  }
}
```

### **Solve Resource Allocation**
```http
POST /api/ml/optimization/resource-allocation
```

**Request Body:**
```json
{
  "resources": [
    {
      "resourceId": "res-1",
      "name": "Technical Team",
      "type": "HUMAN",
      "capacity": 40,
      "cost": 1000,
      "skills": ["programming", "analysis"]
    }
  ],
  "demands": [
    {
      "demandId": "dem-1",
      "locationId": "loc-1",
      "quantity": 30,
      "priority": 1,
      "skills": ["programming"]
    }
  ],
  "objectives": [
    {
      "name": "Minimize Cost",
      "type": "MINIMIZE",
      "expression": "sum(cost * allocation)"
    }
  ]
}
```

---

## **🧠 AI SERVICE LAYER API**

### **Base URL**: `/api/ml/ai`

### **Deploy Model**
```http
POST /api/ml/ai/models/deploy
```

**Request Body:**
```json
{
  "model": {
    "name": "Risk Classification Model v2.0",
    "type": "CLASSIFICATION",
    "version": "2.0.0",
    "framework": "TENSORFLOW",
    "deployment": {
      "environment": "PRODUCTION",
      "infrastructure": {
        "provider": "AWS",
        "region": "us-east-1",
        "instanceType": "t3.medium"
      },
      "scaling": {
        "type": "AUTO",
        "minInstances": 1,
        "maxInstances": 5
      }
    }
  }
}
```

### **Make Prediction**
```http
POST /api/ml/ai/predict
```

**Request Body:**
```json
{
  "modelId": "model-123",
  "features": {
    "feature1": 0.5,
    "feature2": 0.8,
    "feature3": 0.3
  },
  "options": {
    "includeExplanation": true,
    "includeConfidence": true,
    "includeAlternatives": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "req-123",
    "modelId": "model-123",
    "prediction": {
      "class": "HIGH_RISK",
      "probability": 0.85
    },
    "confidence": 0.87,
    "explanation": {
      "method": "SHAP",
      "globalImportance": [
        {
          "feature": "feature1",
          "importance": 0.4,
          "rank": 1
        }
      ],
      "localImportance": [
        {
          "feature": "feature1",
          "value": 0.5,
          "importance": 0.3,
          "contribution": 0.15
        }
      ]
    },
    "alternatives": [
      {
        "prediction": {
          "class": "MEDIUM_RISK",
          "probability": 0.75
        },
        "scenario": "Improved security measures",
        "changes": {
          "feature1": 0.7
        }
      }
    ],
    "metadata": {
      "modelVersion": "2.0.0",
      "processingTime": 45,
      "features": ["feature1", "feature2", "feature3"]
    }
  }
}
```

### **Batch Prediction**
```http
POST /api/ml/ai/predict/batch
```

**Request Body:**
```json
{
  "modelId": "model-123",
  "data": [
    {
      "feature1": 0.5,
      "feature2": 0.8
    },
    {
      "feature1": 0.3,
      "feature2": 0.9
    }
  ],
  "options": {
    "includeConfidence": true,
    "outputFormat": "JSON"
  },
  "outputDestination": "s3://ml-results/batch-predictions/"
}
```

### **Monitor Model**
```http
GET /api/ml/ai/models/{modelId}/monitoring
```

**Response:**
```json
{
  "success": true,
  "data": {
    "modelId": "model-123",
    "health": {
      "status": "HEALTHY",
      "uptime": 99.9,
      "responseTime": 45,
      "throughput": 1000
    },
    "drift": {
      "dataDrift": {
        "detected": false,
        "severity": "LOW",
        "confidence": 0.95
      },
      "conceptDrift": {
        "detected": false,
        "severity": "LOW",
        "confidence": 0.95
      }
    },
    "performance": {
      "accuracy": 0.92,
      "precision": 0.89,
      "recall": 0.91,
      "f1Score": 0.90
    }
  }
}
```

---

## **🔐 Authentication & Security**

### **Authentication**
All API endpoints require authentication using JWT tokens:

```http
Authorization: Bearer <jwt_token>
```

### **Rate Limiting**
- **Standard endpoints**: 1000 requests/minute
- **Prediction endpoints**: 10000 requests/minute
- **Batch endpoints**: 100 requests/minute

### **Input Validation**
- All inputs are validated and sanitized
- SQL injection protection
- XSS prevention
- Input size limits enforced

---

## **📈 Response Codes**

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - Model not ready |

---

## **🔧 Error Handling**

### **Standard Error Response**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "companySize",
      "issue": "Must be a positive number"
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-123"
  }
}
```

### **Common Error Codes**
- `VALIDATION_ERROR` - Input validation failed
- `MODEL_NOT_FOUND` - Requested model doesn't exist
- `MODEL_NOT_READY` - Model is still training/deploying
- `INSUFFICIENT_DATA` - Not enough data for operation
- `PROCESSING_ERROR` - Error during ML processing
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `AUTHENTICATION_FAILED` - Invalid credentials
- `AUTHORIZATION_FAILED` - Insufficient permissions

---

## **📊 Monitoring & Metrics**

### **Available Metrics**
- Request count and rate
- Response times (p50, p95, p99)
- Error rates by endpoint
- Model accuracy and drift
- Resource utilization
- Data quality scores

### **Health Check**
```http
GET /api/ml/health
```

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "forecasting": "healthy",
    "classification": "healthy",
    "optimization": "healthy",
    "pipeline": "healthy"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

This API documentation provides comprehensive coverage of all ML/AI endpoints with detailed request/response examples, authentication requirements, and error handling guidelines.
