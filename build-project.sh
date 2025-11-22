#!/bin/bash

# Insurance Brokerage - Complete Build & Setup Script
# This script creates the entire project structure with all files

set -e  # Exit on error

PROJECT_NAME="insurance-brokerage"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "================================"
echo "Insurance Brokerage App Builder"
echo "================================"
echo ""

# Create project directory
if [ -d "$PROJECT_NAME" ]; then
    echo "⚠️  Directory '$PROJECT_NAME' already exists!"
    read -p "Do you want to proceed and overwrite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborting..."
        exit 1
    fi
fi

echo "📁 Creating project structure..."
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Create main directories
mkdir -p backend/{src,migrations,uploads,logs,tests}
mkdir -p backend/src/{config,middleware,routes,controllers,models,services,utils}
mkdir -p frontend/{src,public}
mkdir -p frontend/src/{components,pages,services,context,hooks,utils}
mkdir -p docs

echo "✅ Project structure created"

# ==========================================
# ROOT LEVEL FILES
# ==========================================

echo "📝 Creating root configuration files..."

# .env.example (Root)
cat > .env.example << 'EOF'
# Database Configuration
DB_USER=postgres
DB_PASSWORD=password123
DB_NAME=insurance_db
DB_HOST=postgres
DB_PORT=5432

# Backend Configuration
NODE_ENV=development
BACKEND_PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h
CORS_ORIGIN=http://localhost:3000

# Frontend Configuration
REACT_APP_API_URL=http://localhost:5000/api

# PgAdmin
PGADMIN_EMAIL=admin@insurance.local
PGADMIN_PASSWORD=admin

# File Upload
FILE_UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=52428800

# Logging
LOG_LEVEL=info
EOF

# docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    container_name: insurance_postgres
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password123}
      POSTGRES_DB: ${DB_NAME:-insurance_db}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/migrations/init.sql:/docker-entrypoint-initdb.d/01-init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - insurance_network

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: insurance_pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL:-admin@insurance.local}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD:-admin}
      PGADMIN_CONFIG_SERVER_MODE: 'False'
    ports:
      - "5050:80"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - insurance_network
    volumes:
      - pgadmin_data:/var/lib/pgadmin

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: insurance_backend
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: 5000
      DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-password123}@postgres:5432/${DB_NAME:-insurance_db}
      JWT_SECRET: ${JWT_SECRET:-your-super-secret-jwt-key-change-in-production}
      JWT_EXPIRATION: ${JWT_EXPIRATION:-24h}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:3000}
      LOG_LEVEL: ${LOG_LEVEL:-info}
      FILE_UPLOAD_PATH: /app/uploads
      MAX_FILE_SIZE: 52428800
      ALLOWED_FILE_TYPES: pdf,doc,docx,xlsx,xls,jpg,jpeg,png
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend/src:/app/src
      - ./backend/uploads:/app/uploads
      - backend_node_modules:/app/node_modules
    networks:
      - insurance_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: insurance_frontend
    environment:
      REACT_APP_API_URL: ${REACT_APP_API_URL:-http://localhost:5000/api}
      REACT_APP_ENV: ${NODE_ENV:-development}
    ports:
      - "3000:3000"
    depends_on:
      - backend
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
      - frontend_node_modules:/app/node_modules
    networks:
      - insurance_network
    stdin_open: true
    tty: true

volumes:
  postgres_data:
  pgadmin_data:
  backend_node_modules:
  frontend_node_modules:

networks:
  insurance_network:
    driver: bridge
EOF

# .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
/npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.*.local

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*.sublime-project
*.sublime-workspace

# Build
/build
/dist
.next
out/

# Logs
logs/
*.log

# Database
*.sqlite3
*.db

# Docker
.dockerignore

# Uploads
backend/uploads/*
!backend/uploads/.gitkeep
EOF

echo "✅ Root configuration files created"

# ==========================================
# BACKEND FILES
# ==========================================

echo "📝 Creating backend files..."

# Backend .env.example
cat > backend/.env.example << 'EOF'
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:password123@postgres:5432/insurance_db
DB_POOL_MIN=2
DB_POOL_MAX=10
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=24h
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRATION=7d
CORS_ORIGIN=http://localhost:3000
CORS_METHODS=GET,POST,PUT,DELETE,PATCH
CORS_CREDENTIALS=true
FILE_UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=pdf,doc,docx,xlsx,xls,jpg,jpeg,png
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@insurance-brokerage.com
PDF_FONT_PATH=/app/fonts
PDF_LOGO_PATH=/app/public/logo.png
API_RATE_LIMIT=100
API_RATE_WINDOW=15
LOG_LEVEL=info
LOG_PATH=/app/logs
EOF

# Backend Dockerfile
cat > backend/Dockerfile << 'EOF'
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine

WORKDIR /app
RUN apk add --no-cache dumb-init
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN mkdir -p uploads && chmod 755 uploads

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 5000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
EOF

# Backend package.json
cat > backend/package.json << 'EOF'
{
  "name": "insurance-brokerage-backend",
  "version": "1.0.0",
  "description": "Insurance Brokerage Management System - Backend",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "migrate": "sequelize-cli db:migrate",
    "seed": "sequelize-cli db:seed:all",
    "test": "jest --detectOpenHandles",
    "test:watch": "jest --watch"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "sequelize": "^6.32.2",
    "pg": "^8.10.0",
    "dotenv": "^16.0.3",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "pdfkit": "^0.13.0",
    "joi": "^17.9.1",
    "express-rate-limit": "^6.7.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "sequelize-cli": "^6.6.0"
  }
}
EOF

# Backend src/index.js
cat > backend/src/index.js << 'EOF'
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes (to be implemented)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/placement', require('./routes/placement'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/endorsement', require('./routes/endorsement'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
EOF

# Placeholder route files
for route in auth placement finance endorsement; do
  cat > backend/src/routes/$route.js << EOF
const express = require('express');
const router = express.Router();

// $route routes - to be implemented

module.exports = router;
EOF
done

echo "✅ Backend files created"

# ==========================================
# FRONTEND FILES
# ==========================================

echo "📝 Creating frontend files..."

# Frontend .env.example
cat > frontend/.env.example << 'EOF'
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
REACT_APP_VERSION=1.0.0
REACT_APP_APP_NAME=Insurance Brokerage
EOF

# Frontend Dockerfile
cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY public ./public
COPY src ./src
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
EOF

# Frontend nginx.conf
cat > frontend/nginx.conf << 'EOF'
server {
    listen 3000;
    server_name _;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    root /usr/share/nginx/html;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ /index.html;
        expires -1;
        add_header Cache-Control "public, max-age=0";
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api {
        proxy_pass http://backend:5000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~ /\. {
        deny all;
    }
}
EOF

# Frontend package.json
cat > frontend/package.json << 'EOF'
{
  "name": "insurance-brokerage-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "axios": "^1.3.0",
    "@reduxjs/toolkit": "^1.9.1",
    "react-redux": "^8.0.5",
    "@mui/material": "^5.11.0",
    "@mui/icons-material": "^5.11.0",
    "react-hook-form": "^7.42.0",
    "date-fns": "^2.29.1"
  },
  "devDependencies": {
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
EOF

# Frontend public/index.html
cat > frontend/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Insurance Brokerage Management System" />
    <title>Insurance Brokerage</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
EOF

# Frontend src/index.js
cat > frontend/src/index.js << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

# Frontend src/App.js
cat > frontend/src/App.js << 'EOF'
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="App">
        <h1>Insurance Brokerage System</h1>
        <p>Welcome! Application is ready for development.</p>
      </div>
    </Router>
  );
}

export default App;
EOF

# Frontend src/index.css
cat > frontend/src/index.css << 'EOF'
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
}

.App {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}
EOF

echo "✅ Frontend files created"

# ==========================================
# DATABASE MIGRATIONS
# ==========================================

echo "📝 Creating database migration files..."

cat > backend/migrations/init.sql << 'EOF'
-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL,
    department_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_department_id ON users(department_id);

-- Insert default data
INSERT INTO departments (name, description) VALUES
('Placement', 'Sales and client onboarding'),
('Finance', 'Payment and commission management'),
('Aftersales', 'Policy endorsements and modifications'),
('Admin', 'System administration')
ON CONFLICT DO NOTHING;

INSERT INTO roles (name, description, permissions) VALUES
('Admin', 'Full system access', '{"all": true}'),
('Placement_Maker', 'Create and edit placements', '{"placement": ["create", "edit"], "read": true}'),
('Placement_Checker', 'Approve placements', '{"placement": ["approve"], "read": true}'),
('Finance_Maker', 'Create financial records', '{"finance": ["create", "edit"], "read": true}'),
('Finance_Checker', 'Approve financial records', '{"finance": ["approve"], "read": true}'),
('Aftersales_Maker', 'Create endorsements', '{"endorsement": ["create", "edit"], "read": true}'),
('Aftersales_Checker', 'Approve endorsements', '{"endorsement": ["approve"], "read": true}')
ON CONFLICT DO NOTHING;
EOF

echo "✅ Database migration files created"

# ==========================================
# DOCUMENTATION FILES
# ==========================================

echo "📝 Creating documentation files..."

cat > README.md << 'EOF'
# Insurance Brokerage Web Application

A comprehensive full-stack insurance brokerage management system with Docker containerization, PostgreSQL database, Node.js/Express backend, and React frontend.

## Quick Start

```bash
# 1. Clone or navigate to project
cd insurance-brokerage

# 2. Configure environment
cp .env.example .env

# 3. Start Docker
docker-compose up -d

# 4. Access application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000/api
# PgAdmin: http://localhost:5050
```

## Project Structure

```
insurance-brokerage/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   └── services/
│   ├── migrations/
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   ├── public/
│   ├── Dockerfile
│   └── package.json
├── docs/
└── docker-compose.yml
```

## Features

- ✅ Placement Module (Clients, Policies, Documents)
- ✅ Finance Module (Payments, Invoices, Commissions)
- ✅ Endorsement Module (Policy Changes)
- ✅ Role-Based Access Control
- ✅ Maker-Checker Workflow
- ✅ Docker Containerization

## Documentation

See the `docs/` folder for detailed guides:
- Setup Guide
- API Documentation
- Database Schema
- Architecture Overview
EOF

cat > docs/QUICK_START.md << 'EOF'
# Quick Start Guide

## Prerequisites

- Docker & Docker Compose
- Git

## Installation

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Run `docker-compose up -d`
4. Access the application

## Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Database Admin**: http://localhost:5050
- **Database**: localhost:5432

## Common Commands

```bash
# View logs
docker-compose logs -f backend

# Stop services
docker-compose stop

# Remove everything
docker-compose down -v

# Rebuild
docker-compose up -d --build
```
EOF

echo "✅ Documentation files created"

# ==========================================
# UTILITY SCRIPTS
# ==========================================

echo "📝 Creating utility scripts..."

# Create development startup script
cat > start.sh << 'EOF'
#!/bin/bash

echo "Starting Insurance Brokerage Application..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env created. Please edit it with your configuration."
    exit 1
fi

# Check Docker
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed!"
    exit 1
fi

echo "🐳 Starting Docker services..."
docker-compose up -d

echo ""
echo "✅ Services starting..."
echo ""
echo "📍 Access your application at:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:5000/api"
echo "   PgAdmin:   http://localhost:5050"
echo ""
echo "📜 View logs with: docker-compose logs -f"
EOF

chmod +x start.sh

# Create stop script
cat > stop.sh << 'EOF'
#!/bin/bash

echo "Stopping Insurance Brokerage Application..."
docker-compose stop

echo "✅ Services stopped"
EOF

chmod +x stop.sh

# Create reset script
cat > reset.sh << 'EOF'
#!/bin/bash

echo "⚠️  WARNING: This will delete all data!"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo "Resetting application..."
docker-compose down -v
docker-compose up -d

echo "✅ Application reset"
EOF

chmod +x reset.sh

echo "✅ Utility scripts created"

# ==========================================
# CREATE .gitkeep FILES
# ==========================================

echo "📝 Creating .gitkeep files..."

touch backend/uploads/.gitkeep
touch backend/logs/.gitkeep
touch frontend/src/components/.gitkeep
touch frontend/src/pages/.gitkeep
touch frontend/src/services/.gitkeep

echo "✅ .gitkeep files created"

# ==========================================
# COMPLETION
# ==========================================

cd ..

echo ""
echo "================================"
echo "✅ PROJECT BUILD COMPLETE!"
echo "================================"
echo ""
echo "📁 Project location: $(pwd)/$PROJECT_NAME"
echo ""
echo "🚀 Next Steps:"
echo "   1. cd $PROJECT_NAME"
echo "   2. cp .env.example .env"
echo "   3. ./start.sh"
echo ""
echo "📍 Access application at:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:5000/api"
echo "   PgAdmin:   http://localhost:5050"
echo ""
echo "📚 Documentation:"
echo "   - README.md"
echo "   - docs/QUICK_START.md"
echo ""
echo "🛑 To stop: ./stop.sh"
echo "🔄 To reset: ./reset.sh"
echo ""
