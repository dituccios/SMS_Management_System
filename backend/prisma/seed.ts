import { PrismaClient, UserRole, CompanySize, DocumentStatus, DocumentCategory, DocumentType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SMS database seeding...');

  // Create demo company
  const company = await prisma.company.create({
    data: {
      name: 'Demo Safety Corp',
      industry: 'Manufacturing',
      country: 'United States',
      size: CompanySize.MEDIUM,
    },
  });

  console.log('✅ Created demo company');

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 12);

  const owner = await prisma.user.create({
    data: {
      email: 'owner@sms.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Owner',
      role: UserRole.OWNER,
      companyId: company.id,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@sms.com',
      password: hashedPassword,
      firstName: 'Jane',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      companyId: company.id,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@sms.com',
      password: hashedPassword,
      firstName: 'Bob',
      lastName: 'User',
      role: UserRole.USER,
      companyId: company.id,
    },
  });

  console.log('✅ Created demo users');

  // Create sample documents
  const documents = [
    {
      title: 'Safety Policy Manual',
      description: 'Comprehensive safety policy manual covering all workplace safety procedures',
      content: 'This manual outlines the safety policies and procedures for our organization...',
      category: DocumentCategory.POLICY,
      type: DocumentType.SAFETY_POLICY,
      status: DocumentStatus.APPROVED,
      tags: ['safety', 'policy', 'manual'],
      authorId: admin.id,
      companyId: company.id,
    },
    {
      title: 'Emergency Response Procedure',
      description: 'Step-by-step emergency response procedures for various scenarios',
      content: 'In case of emergency, follow these procedures...',
      category: DocumentCategory.PROCEDURE,
      type: DocumentType.EMERGENCY_PROCEDURE,
      status: DocumentStatus.APPROVED,
      tags: ['emergency', 'response', 'procedure'],
      authorId: admin.id,
      companyId: company.id,
    },
    {
      title: 'PPE Training Material',
      description: 'Personal Protective Equipment training materials and guidelines',
      content: 'Personal Protective Equipment (PPE) is essential for workplace safety...',
      category: DocumentCategory.MANUAL,
      type: DocumentType.TRAINING_MATERIAL,
      status: DocumentStatus.UNDER_REVIEW,
      tags: ['ppe', 'training', 'safety'],
      authorId: user.id,
      companyId: company.id,
    },
    {
      title: 'Incident Report Form',
      description: 'Standard form for reporting workplace incidents',
      content: 'Use this form to report any workplace incidents...',
      category: DocumentCategory.FORM,
      type: DocumentType.INCIDENT_REPORT,
      status: DocumentStatus.APPROVED,
      tags: ['incident', 'report', 'form'],
      authorId: admin.id,
      companyId: company.id,
    },
  ];

  for (const docData of documents) {
    await prisma.sMSDocument.create({ data: docData });
  }

  console.log('✅ Created sample documents');

  // Create sample workflows
  const workflow = await prisma.sMSWorkflow.create({
    data: {
      name: 'Document Review Workflow',
      description: 'Standard workflow for document review and approval',
      category: 'Document Management',
      steps: [
        { id: 1, name: 'Initial Review', description: 'Initial review by supervisor' },
        { id: 2, name: 'Technical Review', description: 'Technical review by subject matter expert' },
        { id: 3, name: 'Final Approval', description: 'Final approval by department head' },
      ],
      companyId: company.id,
      createdById: admin.id,
    },
  });

  console.log('✅ Created sample workflow');

  // Create sample incidents
  const incidents = [
    {
      title: 'Minor Slip and Fall',
      description: 'Employee slipped on wet floor in cafeteria area',
      severity: 'LOW' as const,
      category: 'Workplace Accident',
      location: 'Cafeteria',
      companyId: company.id,
      reporterId: user.id,
    },
    {
      title: 'Equipment Malfunction',
      description: 'Manufacturing equipment stopped working unexpectedly',
      severity: 'MEDIUM' as const,
      category: 'Equipment Failure',
      location: 'Production Floor A',
      companyId: company.id,
      reporterId: user.id,
    },
  ];

  for (const incidentData of incidents) {
    await prisma.sMSIncident.create({ data: incidentData });
  }

  console.log('✅ Created sample incidents');

  // Create sample trainings
  const trainings = [
    {
      title: 'Safety Orientation',
      description: 'Basic safety orientation for new employees',
      category: 'General Safety',
      duration: 120, // 2 hours
      companyId: company.id,
      createdById: admin.id,
    },
    {
      title: 'Fire Safety Training',
      description: 'Fire prevention and emergency response training',
      category: 'Emergency Response',
      duration: 90, // 1.5 hours
      companyId: company.id,
      createdById: admin.id,
    },
  ];

  for (const trainingData of trainings) {
    await prisma.sMSTraining.create({ data: trainingData });
  }

  console.log('✅ Created sample trainings');

  // Create sample risk assessments
  const riskAssessments = [
    {
      title: 'Chemical Storage Risk Assessment',
      description: 'Risk assessment for chemical storage area',
      riskLevel: 'HIGH' as const,
      probability: 0.3,
      impact: 0.8,
      mitigation: 'Implement proper ventilation and storage procedures',
      companyId: company.id,
      assessorId: admin.id,
    },
    {
      title: 'Machinery Operation Risk Assessment',
      description: 'Risk assessment for heavy machinery operation',
      riskLevel: 'MEDIUM' as const,
      probability: 0.4,
      impact: 0.6,
      mitigation: 'Provide comprehensive training and safety equipment',
      companyId: company.id,
      assessorId: admin.id,
    },
  ];

  for (const riskData of riskAssessments) {
    await prisma.sMSRiskAssessment.create({ data: riskData });
  }

  console.log('✅ Created sample risk assessments');

  console.log('🎉 SMS database seeding completed successfully!');
  console.log('\n📋 Demo Accounts:');
  console.log('Owner: owner@sms.com / password123');
  console.log('Admin: admin@sms.com / password123');
  console.log('User: user@sms.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
