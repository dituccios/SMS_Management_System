# SMS Management System - Installation Guide

## Prerequisites

Before installing the SMS Management System, ensure you have the following installed:

- **Node.js 18+** and **npm 8+**
- **PostgreSQL 12+**
- **Git**

## Quick Installation

### Option 1: Automated Setup (Recommended)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd SMS_Standalone
   ```

2. **Run the setup script:**
   ```bash
   ./start.sh
   ```

   This script will:
   - Check system requirements
   - Install all dependencies
   - Set up environment files
   - Generate Prisma client
   - Run database migrations
   - Seed the database with demo data

### Option 2: Manual Setup

#### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd SMS_Standalone/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database configuration
   ```

4. **Set up database:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   npx prisma db seed
   ```

#### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   echo "REACT_APP_API_URL=http://localhost:3001/api/v1" > .env
   ```

## Database Configuration

### PostgreSQL Setup

1. **Install PostgreSQL** (if not already installed)
2. **Create database and user:**
   ```sql
   CREATE DATABASE sms_management;
   CREATE USER sms_user WITH PASSWORD 'sms_password';
   GRANT ALL PRIVILEGES ON DATABASE sms_management TO sms_user;
   ```

3. **Update DATABASE_URL in backend/.env:**
   ```env
   DATABASE_URL="postgresql://sms_user:sms_password@localhost:5432/sms_management?schema=public"
   ```

## Running the Application

### Development Mode

1. **Start the backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend (in a new terminal):**
   ```bash
   cd frontend
   npm start
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

### Production Mode

1. **Build the backend:**
   ```bash
   cd backend
   npm run build
   npm start
   ```

2. **Build the frontend:**
   ```bash
   cd frontend
   npm run build
   # Serve the build folder with your preferred web server
   ```

## Docker Deployment

### Using Docker Compose

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Individual Docker Containers

1. **Build and run backend:**
   ```bash
   cd backend
   docker build -t sms-backend .
   docker run -p 3001:3001 sms-backend
   ```

2. **Build and run frontend:**
   ```bash
   cd frontend
   docker build -t sms-frontend .
   docker run -p 3000:80 sms-frontend
   ```

## Demo Accounts

After seeding the database, you can use these demo accounts:

| Role  | Email           | Password    | Access Level |
|-------|----------------|-------------|--------------|
| Owner | owner@sms.com  | password123 | Full Access  |
| Admin | admin@sms.com  | password123 | Management   |
| User  | user@sms.com   | password123 | Standard     |

## Troubleshooting

### Common Issues

1. **Database connection failed:**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Verify database credentials

2. **Port already in use:**
   - Change PORT in backend/.env
   - Update REACT_APP_API_URL in frontend/.env

3. **Prisma client not generated:**
   ```bash
   cd backend
   npx prisma generate
   ```

4. **Missing dependencies:**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd frontend && npm install
   ```

### Logs and Debugging

- **Backend logs:** Check `backend/logs/` directory
- **Frontend console:** Open browser developer tools
- **Database logs:** Check PostgreSQL logs

## Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/sms_db"
JWT_SECRET="your-secret-key"
PORT=3001
NODE_ENV="development"
CORS_ORIGIN="http://localhost:3000"
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3001/api/v1
```

## Next Steps

After successful installation:

1. **Explore the application** using the demo accounts
2. **Configure your company settings**
3. **Create your first safety documents**
4. **Set up workflows for your organization**
5. **Invite team members**

For more information, see the [User Guide](USER_GUIDE.md) and [API Documentation](API.md).
