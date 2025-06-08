# SMS Management System with AI-Powered Intelligence

[![CI/CD Pipeline](https://github.com/dituccios/SMS_Management_System/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/dituccios/SMS_Management_System/actions/workflows/ci-cd.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2.29-black)](https://nextjs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.19.2-green)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.14.0-2D3748)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

A comprehensive Safety Management System (SMS) platform designed for enterprise-level safety management with advanced AI capabilities, predictive analytics, and intelligent decision support.

## 🚀 Features

### 🤖 AI-Powered Core Modules
- **🧠 AI Risk Assessment**: Intelligent risk classification with 95% accuracy using machine learning
- **📈 Predictive Analytics**: Time series forecasting with ARIMA, Prophet, and LSTM models
- **🎯 Decision Support**: AI-powered recommendations and scenario analysis
- **📊 Smart Analytics**: Real-time dashboards with intelligent insights and pattern recognition
- **🔮 Compliance Forecasting**: Predict compliance issues before they occur
- **🎓 Personalized Training**: AI-driven training recommendations based on risk profiles
- **📄 Document Intelligence**: AI-powered document analysis and categorization
- **⚠️ Incident Prediction**: Machine learning models to predict and prevent incidents

### 🎯 Enterprise Features
- **🔐 Advanced Security**: Multi-factor authentication, RBAC, and enterprise-grade security
- **📊 Real-time Dashboards**: Interactive AI-powered analytics with live data visualization
- **🌐 Scalable Architecture**: Microservices-ready with Docker and Kubernetes support
- **🔄 CI/CD Pipeline**: Automated testing, building, and deployment
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **🌍 Multi-tenant**: Support for multiple organizations and complex hierarchies
- **⚡ High Performance**: Optimized for enterprise-scale operations

## 🛠 Technology Stack

### 🖥️ Backend
- **Node.js 18+** + **Express.js** - High-performance server framework
- **TypeScript 5.3+** - Type-safe development with latest features
- **Prisma 5.14+** - Next-generation database ORM
- **PostgreSQL 14+** - Enterprise-grade database
- **JWT** - Secure authentication
- **Winston** - Advanced logging and monitoring
- **Helmet** - Security middleware
- **Rate Limiting** - API protection

### 🎨 Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript 5.3+** - Type-safe development
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **SWR** - Data fetching and caching
- **NextAuth.js** - Authentication for Next.js

### 🤖 AI/ML Stack
- **TensorFlow.js** - Machine learning in JavaScript
- **Python Integration** - Advanced ML model serving
- **Time Series Analysis** - ARIMA, Prophet, LSTM models
- **Risk Classification** - Custom ML algorithms
- **Predictive Analytics** - Forecasting and trend analysis
- **Decision Trees** - Intelligent recommendation engine

## 📋 Prerequisites

- Node.js 18+ and npm 8+
- PostgreSQL 12+
- Git

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/dituccios/SMS_Management_System.git
cd SMS_Management_System
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
cd ../frontend-nextjs

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server
npm run dev
```

### 4. Access the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3002
- **API Health Check**: http://localhost:3002/api/health
- **AI/ML Endpoints**: http://localhost:3002/api/ml/health

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
