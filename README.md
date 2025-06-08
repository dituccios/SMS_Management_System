# SMS Management System - Standalone Application

A comprehensive Safety Management System (SMS) built with modern web technologies for managing safety documents, workflows, incidents, training, and compliance.

## 🚀 Features

### Core Modules
- **📄 Document Management**: Create, version, and manage safety documents with approval workflows
- **🔄 Workflow Management**: Configurable workflows for document approval and process automation
- **⚠️ Incident Management**: Report, track, and investigate safety incidents
- **🎓 Training Management**: Manage safety training programs and track completion
- **📊 Risk Assessment**: Identify, assess, and mitigate workplace risks
- **👥 Review System**: Collaborative document review and approval processes
- **📋 Audit Trail**: Comprehensive logging of all system activities
- **👤 User Management**: Role-based access control and user administration

### Key Features
- **Role-Based Access Control**: Owner, Admin, User, and Viewer roles
- **Real-time Dashboard**: Overview of safety metrics and alerts
- **Document Versioning**: Track changes and maintain document history
- **Notification System**: Alerts for expiring documents and upcoming reviews
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **RESTful API**: Complete backend API for all functionality
- **Type Safety**: Full TypeScript implementation

## 🛠 Technology Stack

### Backend
- **Node.js** + **Express.js** - Server framework
- **TypeScript** - Type-safe development
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database
- **JWT** - Authentication
- **Winston** - Logging
- **Joi** - Data validation

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Material-UI (MUI)** - Component library
- **Zustand** - State management
- **React Router** - Navigation
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

## 📋 Prerequisites

- Node.js 18+ and npm 8+
- PostgreSQL 12+
- Git

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd SMS_Standalone
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials and configuration

# Setup database
npx prisma migrate dev
npx prisma generate

# Seed database with demo data
npx prisma db seed

# Start development server
npm run dev
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm start
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health

## 👤 Demo Accounts

| Role  | Email           | Password    | Access Level |
|-------|----------------|-------------|--------------|
| Owner | owner@sms.com  | password123 | Full Access  |
| Admin | admin@sms.com  | password123 | Management   |
| User  | user@sms.com   | password123 | Standard     |

## 📁 Project Structure

```
SMS_Standalone/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utilities
│   │   └── index.ts        # Main server file
│   ├── prisma/             # Database schema and migrations
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # State management
│   │   ├── types/          # TypeScript types
│   │   └── App.tsx         # Main app component
│   └── package.json
├── docs/                   # Documentation
├── docker/                 # Docker configuration
└── README.md
```

## 🔧 Development

### Backend Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm start              # Start production server

# Database
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Run database migrations
npm run prisma:studio   # Open Prisma Studio
npm run prisma:seed     # Seed database

# Testing
npm test               # Run tests
npm run test:coverage  # Run tests with coverage

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues
```

### Frontend Commands

```bash
# Development
npm start              # Start development server
npm run build          # Build for production
npm test              # Run tests

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues
npm run type-check     # TypeScript type checking
```

## 🌐 API Documentation

The API follows RESTful conventions and includes the following main endpoints:

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/auth/profile` - Get user profile

### SMS Modules
- `GET /api/v1/sms/dashboard` - Dashboard data
- `GET /api/v1/sms/documents` - Document management
- `GET /api/v1/sms/workflows` - Workflow management
- `GET /api/v1/sms/incidents` - Incident management
- `GET /api/v1/sms/trainings` - Training management
- `GET /api/v1/sms/risk-assessments` - Risk assessments
- `GET /api/v1/sms/reviews` - Review system
- `GET /api/v1/sms/audits` - Audit logs

### User Management
- `GET /api/v1/users` - User management (Admin only)

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Input validation and sanitization
- Audit logging
- Secure headers with Helmet

## 📊 Database Schema

The application uses PostgreSQL with Prisma ORM. Key entities include:

- **Users & Companies**: User management and organization structure
- **SMS Documents**: Document storage with versioning
- **Workflows**: Configurable business processes
- **Incidents**: Safety incident tracking
- **Training**: Training program management
- **Risk Assessments**: Risk identification and mitigation
- **Reviews**: Document review and approval
- **Audit Logs**: System activity tracking

## 🚀 Deployment

### Environment Variables

Create `.env` files for both backend and frontend:

**Backend (.env)**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/sms_db"
JWT_SECRET="your-secret-key"
PORT=3001
NODE_ENV="production"
```

**Frontend (.env)**:
```env
REACT_APP_API_URL="http://localhost:3001/api/v1"
```

### Production Build

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve build folder with your preferred web server
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in the `/docs` folder
- Review the API documentation at `/api/v1` endpoint

## 🎯 Roadmap

- [ ] Advanced reporting and analytics
- [ ] Mobile application
- [ ] Integration with external safety systems
- [ ] Advanced workflow designer
- [ ] Document templates
- [ ] Automated compliance checking
- [ ] Real-time notifications
- [ ] Multi-language support

---

**SMS Management System** - Comprehensive Safety Management for Modern Organizations
