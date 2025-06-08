import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const prisma = new PrismaClient();

export interface AnalyticsFilter {
  companyId: string;
  startDate?: Date;
  endDate?: Date;
  departments?: string[];
  positions?: string[];
  trainingIds?: string[];
  status?: string[];
  complianceStatus?: string[];
}

export interface TrainingMetrics {
  totalPersonas: number;
  totalTrainingRecords: number;
  completionRate: number;
  complianceRate: number;
  averageCompletionTime: number;
  averageScore: number;
  overdueCount: number;
  upcomingDeadlines: number;
  certificationsIssued: number;
  
  // Trend data
  completionTrend: any[];
  complianceTrend: any[];
  departmentBreakdown: any[];
  trainingBreakdown: any[];
  statusDistribution: any[];
}

export interface ReportOptions {
  format: 'JSON' | 'PDF' | 'EXCEL' | 'CSV';
  includeCharts?: boolean;
  includeDetails?: boolean;
  groupBy?: 'DEPARTMENT' | 'POSITION' | 'TRAINING' | 'MONTH';
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export class TrainingAnalyticsService {
  
  // Core Analytics Methods
  async getTrainingMetrics(filter: AnalyticsFilter): Promise<TrainingMetrics> {
    try {
      const whereClause = this.buildWhereClause(filter);
      
      // Get all training records
      const trainingRecords = await prisma.trainingRecord.findMany({
        where: whereClause,
        include: {
          training: true,
          persona: true
        }
      });

      // Get unique personas
      const uniquePersonas = new Set(trainingRecords.map(tr => tr.personaId));
      const totalPersonas = uniquePersonas.size;
      const totalTrainingRecords = trainingRecords.length;

      // Calculate completion rate
      const completedRecords = trainingRecords.filter(tr => tr.status === 'COMPLETED');
      const completionRate = totalTrainingRecords > 0 
        ? (completedRecords.length / totalTrainingRecords) * 100 
        : 0;

      // Calculate compliance rate
      const compliantRecords = trainingRecords.filter(tr => tr.complianceStatus === 'COMPLIANT');
      const complianceRate = totalTrainingRecords > 0 
        ? (compliantRecords.length / totalTrainingRecords) * 100 
        : 0;

      // Calculate average completion time
      const completedWithTime = completedRecords.filter(tr => 
        tr.enrollmentDate && tr.completionDate
      );
      const averageCompletionTime = completedWithTime.length > 0
        ? completedWithTime.reduce((sum, tr) => {
            const enrollDate = new Date(tr.enrollmentDate!);
            const completeDate = new Date(tr.completionDate!);
            return sum + (completeDate.getTime() - enrollDate.getTime());
          }, 0) / completedWithTime.length / (24 * 60 * 60 * 1000) // Convert to days
        : 0;

      // Calculate average score
      const recordsWithScore = trainingRecords.filter(tr => tr.score !== null);
      const averageScore = recordsWithScore.length > 0
        ? recordsWithScore.reduce((sum, tr) => sum + (tr.score || 0), 0) / recordsWithScore.length
        : 0;

      // Count overdue and upcoming deadlines
      const overdueCount = trainingRecords.filter(tr => tr.complianceStatus === 'OVERDUE').length;
      const upcomingDeadlines = await this.getUpcomingDeadlines(filter);

      // Count certifications issued
      const certificationsIssued = completedRecords.filter(tr => tr.certificateNumber).length;

      // Generate trend data
      const completionTrend = await this.getCompletionTrend(filter);
      const complianceTrend = await this.getComplianceTrend(filter);
      const departmentBreakdown = await this.getDepartmentBreakdown(filter);
      const trainingBreakdown = await this.getTrainingBreakdown(filter);
      const statusDistribution = await this.getStatusDistribution(filter);

      return {
        totalPersonas,
        totalTrainingRecords,
        completionRate: Math.round(completionRate * 100) / 100,
        complianceRate: Math.round(complianceRate * 100) / 100,
        averageCompletionTime: Math.round(averageCompletionTime * 100) / 100,
        averageScore: Math.round(averageScore * 100) / 100,
        overdueCount,
        upcomingDeadlines: upcomingDeadlines.length,
        certificationsIssued,
        completionTrend,
        complianceTrend,
        departmentBreakdown,
        trainingBreakdown,
        statusDistribution
      };
    } catch (error) {
      logger.error('Failed to get training metrics:', error);
      throw error;
    }
  }

  async getDetailedReport(filter: AnalyticsFilter, options: ReportOptions): Promise<any> {
    try {
      const metrics = await this.getTrainingMetrics(filter);
      
      // Get detailed records
      const whereClause = this.buildWhereClause(filter);
      const trainingRecords = await prisma.trainingRecord.findMany({
        where: whereClause,
        include: {
          training: true,
          persona: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
              position: true,
              employmentType: true
            }
          }
        },
        orderBy: options.sortBy ? { [options.sortBy]: options.sortOrder || 'ASC' } : { enrollmentDate: 'desc' }
      });

      // Group data if requested
      let groupedData = null;
      if (options.groupBy) {
        groupedData = await this.groupData(trainingRecords, options.groupBy);
      }

      const report = {
        metadata: {
          generatedAt: new Date(),
          filter,
          options,
          recordCount: trainingRecords.length
        },
        metrics,
        records: options.includeDetails ? trainingRecords : null,
        groupedData
      };

      // Generate formatted report based on format
      switch (options.format) {
        case 'PDF':
          return await this.generatePDFReport(report);
        case 'EXCEL':
          return await this.generateExcelReport(report);
        case 'CSV':
          return await this.generateCSVReport(report);
        default:
          return report;
      }
    } catch (error) {
      logger.error('Failed to generate detailed report:', error);
      throw error;
    }
  }

  // Trend Analysis
  private async getCompletionTrend(filter: AnalyticsFilter): Promise<any[]> {
    try {
      const whereClause = this.buildWhereClause(filter);
      
      // Get completion data grouped by month
      const completions = await prisma.trainingRecord.groupBy({
        by: ['completionDate'],
        where: {
          ...whereClause,
          status: 'COMPLETED',
          completionDate: { not: null }
        },
        _count: true
      });

      // Group by month
      const monthlyData = new Map();
      completions.forEach(completion => {
        if (completion.completionDate) {
          const month = completion.completionDate.toISOString().substring(0, 7); // YYYY-MM
          monthlyData.set(month, (monthlyData.get(month) || 0) + completion._count);
        }
      });

      return Array.from(monthlyData.entries()).map(([month, count]) => ({
        month,
        completions: count
      })).sort((a, b) => a.month.localeCompare(b.month));
    } catch (error) {
      logger.error('Failed to get completion trend:', error);
      return [];
    }
  }

  private async getComplianceTrend(filter: AnalyticsFilter): Promise<any[]> {
    try {
      const whereClause = this.buildWhereClause(filter);
      
      const complianceData = await prisma.trainingRecord.groupBy({
        by: ['complianceStatus', 'enrollmentDate'],
        where: whereClause,
        _count: true
      });

      // Group by month and compliance status
      const monthlyCompliance = new Map();
      complianceData.forEach(data => {
        const month = data.enrollmentDate.toISOString().substring(0, 7);
        if (!monthlyCompliance.has(month)) {
          monthlyCompliance.set(month, { compliant: 0, nonCompliant: 0, pending: 0 });
        }
        
        const monthData = monthlyCompliance.get(month);
        switch (data.complianceStatus) {
          case 'COMPLIANT':
            monthData.compliant += data._count;
            break;
          case 'OVERDUE':
          case 'NON_COMPLIANT':
            monthData.nonCompliant += data._count;
            break;
          default:
            monthData.pending += data._count;
        }
      });

      return Array.from(monthlyCompliance.entries()).map(([month, data]) => ({
        month,
        ...data
      })).sort((a, b) => a.month.localeCompare(b.month));
    } catch (error) {
      logger.error('Failed to get compliance trend:', error);
      return [];
    }
  }

  private async getDepartmentBreakdown(filter: AnalyticsFilter): Promise<any[]> {
    try {
      const whereClause = this.buildWhereClause(filter);
      
      const departmentData = await prisma.trainingRecord.findMany({
        where: whereClause,
        include: {
          persona: {
            select: { department: true }
          }
        }
      });

      // Group by department
      const deptMap = new Map();
      departmentData.forEach(record => {
        const dept = record.persona.department || 'Unknown';
        if (!deptMap.has(dept)) {
          deptMap.set(dept, { 
            total: 0, 
            completed: 0, 
            compliant: 0, 
            overdue: 0 
          });
        }
        
        const deptStats = deptMap.get(dept);
        deptStats.total++;
        
        if (record.status === 'COMPLETED') deptStats.completed++;
        if (record.complianceStatus === 'COMPLIANT') deptStats.compliant++;
        if (record.complianceStatus === 'OVERDUE') deptStats.overdue++;
      });

      return Array.from(deptMap.entries()).map(([department, stats]) => ({
        department,
        ...stats,
        completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
        complianceRate: stats.total > 0 ? (stats.compliant / stats.total) * 100 : 0
      }));
    } catch (error) {
      logger.error('Failed to get department breakdown:', error);
      return [];
    }
  }

  private async getTrainingBreakdown(filter: AnalyticsFilter): Promise<any[]> {
    try {
      const whereClause = this.buildWhereClause(filter);
      
      const trainingData = await prisma.trainingRecord.groupBy({
        by: ['trainingId'],
        where: whereClause,
        _count: true,
        _avg: { score: true }
      });

      // Get training details
      const trainingIds = trainingData.map(td => td.trainingId);
      const trainings = await prisma.sMSTraining.findMany({
        where: { id: { in: trainingIds } }
      });

      const trainingMap = new Map(trainings.map(t => [t.id, t]));

      return trainingData.map(data => {
        const training = trainingMap.get(data.trainingId);
        return {
          trainingId: data.trainingId,
          trainingTitle: training?.title || 'Unknown',
          enrollments: data._count,
          averageScore: data._avg.score || 0
        };
      });
    } catch (error) {
      logger.error('Failed to get training breakdown:', error);
      return [];
    }
  }

  private async getStatusDistribution(filter: AnalyticsFilter): Promise<any[]> {
    try {
      const whereClause = this.buildWhereClause(filter);
      
      const statusData = await prisma.trainingRecord.groupBy({
        by: ['status'],
        where: whereClause,
        _count: true
      });

      return statusData.map(data => ({
        status: data.status,
        count: data._count
      }));
    } catch (error) {
      logger.error('Failed to get status distribution:', error);
      return [];
    }
  }

  private async getUpcomingDeadlines(filter: AnalyticsFilter): Promise<any[]> {
    try {
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const whereClause = this.buildWhereClause(filter);
      const upcomingRecords = await prisma.trainingRecord.findMany({
        where: {
          ...whereClause,
          status: { not: 'COMPLETED' },
          // This would need to be adjusted based on how due dates are stored
        },
        include: {
          training: true,
          persona: {
            select: {
              firstName: true,
              lastName: true,
              department: true
            }
          }
        }
      });

      return upcomingRecords.filter(record => {
        // Extract due date from metadata or calculate based on enrollment
        const dueDate = record.metadata?.dueDate 
          ? new Date(record.metadata.dueDate)
          : null;
        
        return dueDate && dueDate <= thirtyDaysFromNow && dueDate > new Date();
      });
    } catch (error) {
      logger.error('Failed to get upcoming deadlines:', error);
      return [];
    }
  }

  // Report Generation
  private async generatePDFReport(report: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(20).text('Training Analytics Report', 50, 50);
        doc.fontSize(12).text(`Generated: ${report.metadata.generatedAt.toLocaleString()}`, 50, 80);

        // Metrics Summary
        doc.fontSize(16).text('Summary Metrics', 50, 120);
        let yPos = 150;
        
        const metrics = report.metrics;
        doc.fontSize(12)
           .text(`Total Personnel: ${metrics.totalPersonas}`, 50, yPos)
           .text(`Total Training Records: ${metrics.totalTrainingRecords}`, 50, yPos + 20)
           .text(`Completion Rate: ${metrics.completionRate}%`, 50, yPos + 40)
           .text(`Compliance Rate: ${metrics.complianceRate}%`, 50, yPos + 60)
           .text(`Average Score: ${metrics.averageScore}`, 50, yPos + 80)
           .text(`Overdue Count: ${metrics.overdueCount}`, 50, yPos + 100);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async generateExcelReport(report: any): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Summary sheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.addRow(['Metric', 'Value']);
      summarySheet.addRow(['Total Personnel', report.metrics.totalPersonas]);
      summarySheet.addRow(['Total Training Records', report.metrics.totalTrainingRecords]);
      summarySheet.addRow(['Completion Rate (%)', report.metrics.completionRate]);
      summarySheet.addRow(['Compliance Rate (%)', report.metrics.complianceRate]);
      summarySheet.addRow(['Average Score', report.metrics.averageScore]);
      summarySheet.addRow(['Overdue Count', report.metrics.overdueCount]);

      // Details sheet
      if (report.records) {
        const detailsSheet = workbook.addWorksheet('Training Records');
        detailsSheet.addRow([
          'Personnel Name', 'Department', 'Training Title', 'Status', 
          'Compliance Status', 'Enrollment Date', 'Completion Date', 'Score'
        ]);

        report.records.forEach((record: any) => {
          detailsSheet.addRow([
            `${record.persona.firstName} ${record.persona.lastName}`,
            record.persona.department,
            record.training.title,
            record.status,
            record.complianceStatus,
            record.enrollmentDate,
            record.completionDate,
            record.score
          ]);
        });
      }

      return await workbook.xlsx.writeBuffer() as Buffer;
    } catch (error) {
      logger.error('Failed to generate Excel report:', error);
      throw error;
    }
  }

  private async generateCSVReport(report: any): Promise<string> {
    try {
      if (!report.records) {
        throw new Error('No detailed records available for CSV export');
      }

      const headers = [
        'Personnel Name', 'Department', 'Training Title', 'Status', 
        'Compliance Status', 'Enrollment Date', 'Completion Date', 'Score'
      ];

      const rows = report.records.map((record: any) => [
        `${record.persona.firstName} ${record.persona.lastName}`,
        record.persona.department || '',
        record.training.title,
        record.status,
        record.complianceStatus,
        record.enrollmentDate?.toISOString() || '',
        record.completionDate?.toISOString() || '',
        record.score || ''
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return csvContent;
    } catch (error) {
      logger.error('Failed to generate CSV report:', error);
      throw error;
    }
  }

  // Utility Methods
  private buildWhereClause(filter: AnalyticsFilter): any {
    const where: any = { companyId: filter.companyId };

    if (filter.startDate || filter.endDate) {
      where.enrollmentDate = {};
      if (filter.startDate) where.enrollmentDate.gte = filter.startDate;
      if (filter.endDate) where.enrollmentDate.lte = filter.endDate;
    }

    if (filter.departments?.length) {
      where.persona = { department: { in: filter.departments } };
    }

    if (filter.positions?.length) {
      where.persona = { ...where.persona, position: { in: filter.positions } };
    }

    if (filter.trainingIds?.length) {
      where.trainingId = { in: filter.trainingIds };
    }

    if (filter.status?.length) {
      where.status = { in: filter.status };
    }

    if (filter.complianceStatus?.length) {
      where.complianceStatus = { in: filter.complianceStatus };
    }

    return where;
  }

  private async groupData(records: any[], groupBy: string): Promise<any> {
    const grouped = new Map();

    records.forEach(record => {
      let key;
      switch (groupBy) {
        case 'DEPARTMENT':
          key = record.persona.department || 'Unknown';
          break;
        case 'POSITION':
          key = record.persona.position || 'Unknown';
          break;
        case 'TRAINING':
          key = record.training.title;
          break;
        case 'MONTH':
          key = record.enrollmentDate.toISOString().substring(0, 7);
          break;
        default:
          key = 'All';
      }

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(record);
    });

    return Object.fromEntries(grouped);
  }

  // Public API Methods
  async getDashboardData(companyId: string): Promise<any> {
    try {
      const filter: AnalyticsFilter = { companyId };
      const metrics = await this.getTrainingMetrics(filter);
      
      return {
        metrics,
        lastUpdated: new Date()
      };
    } catch (error) {
      logger.error('Failed to get dashboard data:', error);
      throw error;
    }
  }

  async exportReport(filter: AnalyticsFilter, options: ReportOptions): Promise<any> {
    try {
      return await this.getDetailedReport(filter, options);
    } catch (error) {
      logger.error('Failed to export report:', error);
      throw error;
    }
  }
}

export default new TrainingAnalyticsService();
