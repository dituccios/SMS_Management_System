import express from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../../middleware/errorHandler';
import { AuthenticatedRequest } from '../../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get SMS dashboard overview
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId!;

  // Get document statistics
  const [
    totalDocuments,
    activeDocuments,
    expiredDocuments,
    documentsUnderReview,
    totalWorkflows,
    activeWorkflows,
    completedWorkflows,
    totalIncidents,
    openIncidents,
    resolvedIncidents,
    totalTrainings,
    activeTrainings,
    totalRiskAssessments,
    highRiskAssessments,
  ] = await Promise.all([
    // Document stats
    prisma.sMSDocument.count({
      where: { companyId },
    }),
    prisma.sMSDocument.count({
      where: { companyId, status: 'APPROVED' },
    }),
    prisma.sMSDocument.count({
      where: { 
        companyId, 
        OR: [
          { status: 'EXPIRED' },
          { 
            expiresAt: {
              lte: new Date(),
            },
          },
        ],
      },
    }),
    prisma.sMSDocument.count({
      where: { companyId, status: 'UNDER_REVIEW' },
    }),
    
    // Workflow stats
    prisma.sMSWorkflow.count({
      where: { companyId },
    }),
    prisma.sMSWorkflowInstance.count({
      where: { 
        workflow: { companyId },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    }),
    prisma.sMSWorkflowInstance.count({
      where: { 
        workflow: { companyId },
        status: 'COMPLETED',
      },
    }),
    
    // Incident stats
    prisma.sMSIncident.count({
      where: { companyId },
    }),
    prisma.sMSIncident.count({
      where: { companyId, status: 'OPEN' },
    }),
    prisma.sMSIncident.count({
      where: { companyId, status: { in: ['RESOLVED', 'CLOSED'] } },
    }),
    
    // Training stats
    prisma.sMSTraining.count({
      where: { companyId },
    }),
    prisma.sMSTraining.count({
      where: { companyId, status: 'ACTIVE' },
    }),
    
    // Risk assessment stats
    prisma.sMSRiskAssessment.count({
      where: { companyId },
    }),
    prisma.sMSRiskAssessment.count({
      where: { companyId, riskLevel: { in: ['HIGH', 'CRITICAL'] } },
    }),
  ]);

  // Get recent activities
  const recentDocuments = await prisma.sMSDocument.findMany({
    where: { companyId },
    select: {
      id: true,
      title: true,
      status: true,
      category: true,
      createdAt: true,
      author: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const recentIncidents = await prisma.sMSIncident.findMany({
    where: { companyId },
    select: {
      id: true,
      title: true,
      severity: true,
      status: true,
      reportedAt: true,
      reporter: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { reportedAt: 'desc' },
    take: 5,
  });

  // Get upcoming document reviews
  const upcomingReviews = await prisma.sMSDocument.findMany({
    where: {
      companyId,
      reviewDate: {
        gte: new Date(),
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
      },
    },
    select: {
      id: true,
      title: true,
      reviewDate: true,
      category: true,
    },
    orderBy: { reviewDate: 'asc' },
    take: 10,
  });

  // Get document expiration alerts
  const expiringDocuments = await prisma.sMSDocument.findMany({
    where: {
      companyId,
      expiresAt: {
        gte: new Date(),
        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next 30 days
      },
    },
    select: {
      id: true,
      title: true,
      expiresAt: true,
      category: true,
    },
    orderBy: { expiresAt: 'asc' },
    take: 10,
  });

  res.json({
    success: true,
    data: {
      statistics: {
        documents: {
          total: totalDocuments,
          active: activeDocuments,
          expired: expiredDocuments,
          underReview: documentsUnderReview,
        },
        workflows: {
          total: totalWorkflows,
          active: activeWorkflows,
          completed: completedWorkflows,
        },
        incidents: {
          total: totalIncidents,
          open: openIncidents,
          resolved: resolvedIncidents,
        },
        trainings: {
          total: totalTrainings,
          active: activeTrainings,
        },
        riskAssessments: {
          total: totalRiskAssessments,
          highRisk: highRiskAssessments,
        },
      },
      recentActivities: {
        documents: recentDocuments,
        incidents: recentIncidents,
      },
      alerts: {
        upcomingReviews,
        expiringDocuments,
      },
    },
  });
}));

// Get SMS metrics for charts
router.get('/metrics', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const companyId = req.user!.companyId!;
  const { period = '30' } = req.query;
  
  const days = parseInt(period as string);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get document creation trends
  const documentTrends = await prisma.sMSDocument.groupBy({
    by: ['createdAt'],
    where: {
      companyId,
      createdAt: {
        gte: startDate,
      },
    },
    _count: {
      id: true,
    },
  });

  // Get incident trends
  const incidentTrends = await prisma.sMSIncident.groupBy({
    by: ['reportedAt'],
    where: {
      companyId,
      reportedAt: {
        gte: startDate,
      },
    },
    _count: {
      id: true,
    },
  });

  // Get document status distribution
  const documentStatusDistribution = await prisma.sMSDocument.groupBy({
    by: ['status'],
    where: { companyId },
    _count: {
      id: true,
    },
  });

  // Get incident severity distribution
  const incidentSeverityDistribution = await prisma.sMSIncident.groupBy({
    by: ['severity'],
    where: { companyId },
    _count: {
      id: true,
    },
  });

  res.json({
    success: true,
    data: {
      trends: {
        documents: documentTrends,
        incidents: incidentTrends,
      },
      distributions: {
        documentStatus: documentStatusDistribution,
        incidentSeverity: incidentSeverityDistribution,
      },
      period: days,
    },
  });
}));

export default router;
