#!/bin/bash

# SMS Management System Startup Script
echo "🛡️ Starting SMS Management System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_status "Node.js version check passed: $(node -v)"

# Setup Backend
print_info "Setting up backend..."
cd backend

# Install backend dependencies
if [ ! -d "node_modules" ]; then
    print_info "Installing backend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install backend dependencies"
        exit 1
    fi
    print_status "Backend dependencies installed"
else
    print_status "Backend dependencies already installed"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Copying from .env.example..."
    cp .env.example .env
    print_warning "Please edit backend/.env with your database configuration"
fi

# Generate Prisma client
print_info "Generating Prisma client..."
npx prisma generate
if [ $? -ne 0 ]; then
    print_error "Failed to generate Prisma client"
    exit 1
fi
print_status "Prisma client generated"

# Run database migrations
print_info "Running database migrations..."
npx prisma migrate dev --name init
if [ $? -ne 0 ]; then
    print_warning "Database migration failed. Make sure PostgreSQL is running and configured correctly."
fi

# Seed database
print_info "Seeding database with demo data..."
npx prisma db seed
if [ $? -ne 0 ]; then
    print_warning "Database seeding failed. You can run 'npm run prisma:seed' later."
fi

# Setup Frontend
print_info "Setting up frontend..."
cd ../frontend

# Install frontend dependencies
if [ ! -d "node_modules" ]; then
    print_info "Installing frontend dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
    print_status "Frontend dependencies installed"
else
    print_status "Frontend dependencies already installed"
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    print_info "Creating frontend .env file..."
    echo "REACT_APP_API_URL=http://localhost:3001/api/v1" > .env
    print_status "Frontend .env file created"
fi

# Go back to root directory
cd ..

print_status "Setup completed successfully!"
print_info ""
print_info "🚀 To start the application:"
print_info ""
print_info "1. Start the backend:"
print_info "   cd backend && npm run dev"
print_info ""
print_info "2. Start the frontend (in a new terminal):"
print_info "   cd frontend && npm start"
print_info ""
print_info "3. Access the application:"
print_info "   Frontend: http://localhost:3000"
print_info "   Backend API: http://localhost:3001"
print_info ""
print_info "📋 Demo Accounts:"
print_info "   Owner: owner@sms.com / password123"
print_info "   Admin: admin@sms.com / password123"
print_info "   User: user@sms.com / password123"
print_info ""
print_status "Happy coding! 🎉"
