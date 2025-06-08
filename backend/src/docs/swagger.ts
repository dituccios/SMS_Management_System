import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SMS Management System API',
      version: '1.0.0',
      description: 'Comprehensive Safety Management System API for managing safety documents, workflows, incidents, training, and compliance.',
      contact: {
        name: 'SMS Development Team',
        email: 'support@sms-management.com',
        url: 'https://sms-management.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Development server'
      },
      {
        url: 'https://api.sms.yourdomain.com/api/v1',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoint'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique user identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            firstName: {
              type: 'string',
              description: 'User first name'
            },
            lastName: {
              type: 'string',
              description: 'User last name'
            },
            role: {
              type: 'string',
              enum: ['OWNER', 'ADMIN', 'USER', 'VIEWER'],
              description: 'User role in the system'
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user account is active'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          },
          required: ['id', 'email', 'firstName', 'lastName', 'role']
        },
        Company: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique company identifier'
            },
            name: {
              type: 'string',
              description: 'Company name'
            },
            industry: {
              type: 'string',
              description: 'Company industry'
            },
            size: {
              type: 'string',
              enum: ['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'],
              description: 'Company size'
            },
            country: {
              type: 'string',
              description: 'Company country'
            }
          },
          required: ['id', 'name', 'industry', 'country']
        },
        SMSDocument: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique document identifier'
            },
            title: {
              type: 'string',
              description: 'Document title'
            },
            description: {
              type: 'string',
              description: 'Document description'
            },
            content: {
              type: 'string',
              description: 'Document content'
            },
            version: {
              type: 'string',
              description: 'Document version'
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'],
              description: 'Document status'
            },
            category: {
              type: 'string',
              enum: ['POLICY', 'PROCEDURE', 'MANUAL', 'FORM', 'CHECKLIST', 'REPORT'],
              description: 'Document category'
            },
            type: {
              type: 'string',
              enum: ['SAFETY_POLICY', 'EMERGENCY_PROCEDURE', 'TRAINING_MATERIAL', 'INCIDENT_REPORT', 'RISK_ASSESSMENT', 'AUDIT_REPORT'],
              description: 'Document type'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Document tags'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          },
          required: ['id', 'title', 'category', 'type', 'status']
        },
        SMSIncident: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique incident identifier'
            },
            title: {
              type: 'string',
              description: 'Incident title'
            },
            description: {
              type: 'string',
              description: 'Incident description'
            },
            severity: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
              description: 'Incident severity'
            },
            status: {
              type: 'string',
              enum: ['REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'],
              description: 'Incident status'
            },
            type: {
              type: 'string',
              enum: ['ACCIDENT', 'NEAR_MISS', 'HAZARD', 'ENVIRONMENTAL', 'SECURITY', 'QUALITY'],
              description: 'Incident type'
            },
            location: {
              type: 'string',
              description: 'Incident location'
            },
            reportedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Incident report timestamp'
            },
            occurredAt: {
              type: 'string',
              format: 'date-time',
              description: 'Incident occurrence timestamp'
            }
          },
          required: ['id', 'title', 'severity', 'status', 'type']
        },
        SMSTraining: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique training identifier'
            },
            title: {
              type: 'string',
              description: 'Training title'
            },
            description: {
              type: 'string',
              description: 'Training description'
            },
            type: {
              type: 'string',
              enum: ['SAFETY_ORIENTATION', 'EMERGENCY_RESPONSE', 'EQUIPMENT_TRAINING', 'COMPLIANCE_TRAINING', 'SKILLS_DEVELOPMENT'],
              description: 'Training type'
            },
            duration: {
              type: 'integer',
              description: 'Training duration in minutes'
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
              description: 'Training status'
            },
            isRequired: {
              type: 'boolean',
              description: 'Whether training is mandatory'
            },
            validityPeriod: {
              type: 'integer',
              description: 'Training validity period in days'
            }
          },
          required: ['id', 'title', 'type', 'duration', 'status']
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the request was successful'
            },
            message: {
              type: 'string',
              description: 'Response message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code'
                },
                message: {
                  type: 'string',
                  description: 'Error message'
                },
                details: {
                  type: 'object',
                  description: 'Error details'
                }
              }
            }
          },
          required: ['success']
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            data: {
              type: 'array',
              items: {
                type: 'object'
              }
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'integer',
                  description: 'Current page number'
                },
                limit: {
                  type: 'integer',
                  description: 'Items per page'
                },
                total: {
                  type: 'integer',
                  description: 'Total number of items'
                },
                pages: {
                  type: 'integer',
                  description: 'Total number of pages'
                }
              }
            }
          }
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  example: 'Validation failed'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string',
                        description: 'Field name that failed validation'
                      },
                      message: {
                        type: 'string',
                        description: 'Validation error message'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  error: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        example: 'UNAUTHORIZED'
                      },
                      message: {
                        type: 'string',
                        example: 'Authentication required'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions to access this resource',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  error: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        example: 'FORBIDDEN'
                      },
                      message: {
                        type: 'string',
                        example: 'Insufficient permissions'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        NotFoundError: {
          description: 'The requested resource was not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  error: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        example: 'NOT_FOUND'
                      },
                      message: {
                        type: 'string',
                        example: 'Resource not found'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ValidationError'
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  error: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string',
                        example: 'INTERNAL_ERROR'
                      },
                      message: {
                        type: 'string',
                        example: 'Internal server error'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          }
        },
        SortParam: {
          name: 'sort',
          in: 'query',
          description: 'Sort field and direction (e.g., "createdAt:desc")',
          required: false,
          schema: {
            type: 'string'
          }
        },
        SearchParam: {
          name: 'search',
          in: 'query',
          description: 'Search query string',
          required: false,
          schema: {
            type: 'string'
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Users',
        description: 'User management operations'
      },
      {
        name: 'Documents',
        description: 'SMS document management'
      },
      {
        name: 'Incidents',
        description: 'Safety incident management'
      },
      {
        name: 'Training',
        description: 'Training program management'
      },
      {
        name: 'Workflows',
        description: 'Workflow and task management'
      },
      {
        name: 'Risk Assessments',
        description: 'Risk assessment management'
      },
      {
        name: 'Reviews',
        description: 'Document review and approval'
      },
      {
        name: 'Audits',
        description: 'Audit logs and compliance'
      },
      {
        name: 'Dashboard',
        description: 'Dashboard and analytics'
      }
    ]
  },
  apis: [
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts'
  ]
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SMS Management API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  }));

  // JSON endpoint for the OpenAPI spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log('📚 API Documentation available at /api-docs');
};

export default specs;
