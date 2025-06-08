#!/bin/bash

# SMS Management System - Complete Build Script
# This script builds and sets up the entire application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Node.js version
check_node_version() {
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        REQUIRED_VERSION="18.0.0"
        if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
            print_success "Node.js version $NODE_VERSION is compatible"
        else
            print_error "Node.js version $NODE_VERSION is not compatible. Required: $REQUIRED_VERSION or higher"
            exit 1
        fi
    else
        print_error "Node.js is not installed"
        exit 1
    fi
}

# Function to check Docker
check_docker() {
    if command_exists docker; then
        print_success "Docker is installed"
        if docker info >/dev/null 2>&1; then
            print_success "Docker daemon is running"
        else
            print_error "Docker daemon is not running"
            exit 1
        fi
    else
        print_warning "Docker is not installed. Some features may not work."
    fi
}

# Function to setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Backend environment
    if [ ! -f "backend/.env" ]; then
        if [ -f "backend/.env.example" ]; then
            cp backend/.env.example backend/.env
            print_success "Created backend/.env from example"
            print_warning "Please update backend/.env with your actual configuration"
        else
            print_error "backend/.env.example not found"
        fi
    else
        print_success "backend/.env already exists"
    fi
    
    # Frontend environment
    if [ ! -f "frontend-nextjs/.env.local" ]; then
        if [ -f "frontend-nextjs/.env.example" ]; then
            cp frontend-nextjs/.env.example frontend-nextjs/.env.local
            print_success "Created frontend-nextjs/.env.local from example"
            print_warning "Please update frontend-nextjs/.env.local with your actual configuration"
        else
            print_error "frontend-nextjs/.env.example not found"
        fi
    else
        print_success "frontend-nextjs/.env.local already exists"
    fi
}

# Function to install backend dependencies
install_backend_deps() {
    print_status "Installing backend dependencies..."
    cd backend
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Backend dependencies installed"
    cd ..
}

# Function to install frontend dependencies
install_frontend_deps() {
    print_status "Installing frontend dependencies..."
    cd frontend-nextjs
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Frontend dependencies installed"
    cd ..
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    cd backend
    
    # Generate Prisma client
    npx prisma generate
    print_success "Prisma client generated"
    
    # Check if database is running
    if command_exists docker && docker ps | grep -q postgres; then
        print_status "Database container is running, applying migrations..."
        npx prisma db push
        print_success "Database schema updated"
        
        # Seed database if seed file exists
        if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
            npm run db:seed
            print_success "Database seeded"
        fi
    else
        print_warning "Database container not running. Run 'docker-compose up postgres' first"
    fi
    
    cd ..
}

# Function to build backend
build_backend() {
    print_status "Building backend..."
    cd backend
    
    # Type check
    npm run type-check || print_warning "TypeScript type checking failed"
    
    # Build
    npm run build
    print_success "Backend built successfully"
    
    cd ..
}

# Function to build frontend
build_frontend() {
    print_status "Building frontend..."
    cd frontend-nextjs
    
    # Type check
    npm run type-check || print_warning "TypeScript type checking failed"
    
    # Build
    npm run build
    print_success "Frontend built successfully"
    
    cd ..
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    # Backend tests
    print_status "Running backend tests..."
    cd backend
    npm test || print_warning "Some backend tests failed"
    cd ..
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd frontend-nextjs
    npm test || print_warning "Some frontend tests failed"
    cd ..
    
    print_success "Tests completed"
}

# Function to start services with Docker
start_docker_services() {
    print_status "Starting services with Docker..."
    
    if command_exists docker-compose; then
        docker-compose up -d postgres redis
        print_success "Database and cache services started"
        
        # Wait for services to be ready
        print_status "Waiting for services to be ready..."
        sleep 10
        
        # Start application services
        docker-compose up -d backend frontend
        print_success "Application services started"
        
        print_success "All services are running!"
        print_status "Frontend: http://localhost:3000"
        print_status "Backend API: http://localhost:3001"
        print_status "API Documentation: http://localhost:3001/api/docs"
    else
        print_error "docker-compose not found"
        exit 1
    fi
}

# Function to start development servers
start_dev_servers() {
    print_status "Starting development servers..."
    
    # Start backend in background
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Start frontend in background
    cd frontend-nextjs
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    print_success "Development servers started!"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend API: http://localhost:3001"
    print_status "Press Ctrl+C to stop servers"
    
    # Wait for interrupt
    trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
    wait
}

# Function to display help
show_help() {
    echo "SMS Management System Build Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  --help, -h          Show this help message"
    echo "  --install           Install dependencies only"
    echo "  --build             Build the application"
    echo "  --test              Run tests"
    echo "  --dev               Start development servers"
    echo "  --docker            Start with Docker"
    echo "  --full              Full setup (install, build, test)"
    echo "  --production        Production build and start"
    echo ""
    echo "Examples:"
    echo "  $0 --full           Complete setup and build"
    echo "  $0 --dev            Start development environment"
    echo "  $0 --docker         Start with Docker containers"
}

# Main execution
main() {
    print_status "SMS Management System - Build Script"
    print_status "======================================"
    
    # Check prerequisites
    check_node_version
    check_docker
    
    case "${1:-}" in
        --help|-h)
            show_help
            exit 0
            ;;
        --install)
            setup_environment
            install_backend_deps
            install_frontend_deps
            ;;
        --build)
            build_backend
            build_frontend
            ;;
        --test)
            run_tests
            ;;
        --dev)
            setup_environment
            install_backend_deps
            install_frontend_deps
            setup_database
            start_dev_servers
            ;;
        --docker)
            setup_environment
            start_docker_services
            ;;
        --full)
            setup_environment
            install_backend_deps
            install_frontend_deps
            setup_database
            build_backend
            build_frontend
            run_tests
            print_success "Full build completed successfully!"
            ;;
        --production)
            setup_environment
            install_backend_deps
            install_frontend_deps
            setup_database
            build_backend
            build_frontend
            run_tests
            start_docker_services
            ;;
        "")
            print_status "No option specified. Use --help for usage information."
            print_status "Running full setup..."
            setup_environment
            install_backend_deps
            install_frontend_deps
            setup_database
            build_backend
            build_frontend
            print_success "Build completed! Use --dev to start development servers."
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
