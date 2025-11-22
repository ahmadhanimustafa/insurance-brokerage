#!/usr/bin/env python3
"""
Insurance Brokerage - Complete Build Script
Creates entire project structure with all necessary files
Works on Windows, Mac, and Linux
"""

import os
import sys
import json
from pathlib import Path

PROJECT_NAME = "insurance-brokerage"

class ProjectBuilder:
    def __init__(self, project_name):
        self.project_name = project_name
        self.base_path = Path(project_name)
        self.files_created = 0
        self.dirs_created = 0

    def create_directory(self, path):
        """Create directory if it doesn't exist"""
        path.mkdir(parents=True, exist_ok=True)
        self.dirs_created += 1

    def create_file(self, path, content):
        """Create file with content"""
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        self.files_created += 1
        print(f"  ✓ {path}")

    def build(self):
        """Build entire project"""
        print("=" * 50)
        print("Insurance Brokerage App Builder")
        print("=" * 50)
        print()

        # Check if project exists
        if self.base_path.exists():
            response = input(f"Directory '{self.project_name}' exists. Proceed? (y/n): ")
            if response.lower() != 'y':
                print("Aborted.")
                return False

        print("📁 Creating project structure...")
        self._create_directories()
        
        print("📝 Creating configuration files...")
        self._create_root_files()
        
        print("📝 Creating backend files...")
        self._create_backend_files()
        
        print("📝 Creating frontend files...")
        self._create_frontend_files()
        
        print("📝 Creating database files...")
        self._create_database_files()
        
        print("📝 Creating documentation...")
        self._create_documentation()
        
        print("📝 Creating utility scripts...")
        self._create_utility_scripts()
        
        print()
        print("=" * 50)
        print("✅ PROJECT BUILD COMPLETE!")
        print("=" * 50)
        print(f"📁 Project location: {self.base_path.absolute()}")
        print()
        print("🚀 Next Steps:")
        print(f"  1. cd {self.project_name}")
        print("  2. copy .env.example .env (Windows) or cp .env.example .env (Mac/Linux)")
        print("  3. docker-compose up -d")
        print()
        print("📍 Access application at:")
        print("  Frontend:  http://localhost:3000")
        print("  Backend:   http://localhost:5000/api")
        print("  PgAdmin:   http://localhost:5050")
        print()
        print(f"📊 Created: {self.dirs_created} directories, {self.files_created} files")
        print()
        return True

    def _create_directories(self):
        """Create all necessary directories"""
        dirs = [
            "backend/src/config",
            "backend/src/middleware",
            "backend/src/routes",
            "backend/src/controllers",
            "backend/src/models",
            "backend/src/services",
            "backend/src/utils",
            "backend/migrations",
            "backend/uploads",
            "backend/logs",
            "backend/tests",
            "frontend/src/components",
            "frontend/src/pages",
            "frontend/src/services",
            "frontend/src/context",
            "frontend/src/hooks",
            "frontend/src/utils",
            "frontend/public",
            "docs",
        ]
        
        for dir_path in dirs:
            self.create_directory(self.base_path / dir_path)

    def _create_root_files(self):
        """Create root level files"""
        # .env.example
        env_content = """# Database Configuration
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
"""
        self.create_file(self.base_path / ".env.example", env_content)

        # .gitignore
        gitignore_content = """# Dependencies
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

# Build
/build
/dist

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
"""
        self.create_file(self.base_path / ".gitignore", gitignore_content)

        # docker-compose.yml - simplified version
        docker_compose = """version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    container_name: insurance_postgres
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password123}
      POSTGRES_DB: ${DB_NAME:-insurance_db}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/migrations/init.sql:/docker-entrypoint-initdb.d/01-init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
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
    ports:
      - "5050:80"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - insurance_network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: insurance_backend
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: 5000
      DATABASE_URL: postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-password123}@postgres:5432/${DB_NAME:-insurance_db}
      JWT_SECRET: ${JWT_SECRET:-secret}
      CORS_ORIGIN: ${CORS_ORIGIN:-http://localhost:3000}
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend/src:/app/src
      - ./backend/uploads:/app/uploads
    networks:
      - insurance_network
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: insurance_frontend
    environment:
      REACT_APP_API_URL: http://localhost:5000/api
    ports:
      - "3000:3000"
    depends_on:
      - backend
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/public:/app/public
    networks:
      - insurance_network
    stdin_open: true

volumes:
  postgres_data:

networks:
  insurance_network:
    driver: bridge
"""
        self.create_file(self.base_path / "docker-compose.yml", docker_compose)

    def _create_backend_files(self):
        """Create backend files"""
        # Backend .env.example
        backend_env = """NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:password123@postgres:5432/insurance_db
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=24h
CORS_ORIGIN=http://localhost:3000
FILE_UPLOAD_PATH=/app/uploads
MAX_FILE_SIZE=52428800
LOG_LEVEL=info
"""
        self.create_file(self.base_path / "backend/.env.example", backend_env)

        # Dockerfile
        dockerfile = """FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN mkdir -p uploads logs

EXPOSE 5000
CMD ["npm", "start"]
"""
        self.create_file(self.base_path / "backend/Dockerfile", dockerfile)

        # package.json
        package_json = """{
  "name": "insurance-brokerage-backend",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "sequelize": "^6.32.2",
    "pg": "^8.10.0",
    "dotenv": "^16.0.3",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "pdfkit": "^0.13.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
"""
        self.create_file(self.base_path / "backend/package.json", package_json)

        # src/index.js
        index_js = """require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
"""
        self.create_file(self.base_path / "backend/src/index.js", index_js)

    def _create_frontend_files(self):
        """Create frontend files"""
        # Frontend .env.example
        frontend_env = """REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
"""
        self.create_file(self.base_path / "frontend/.env.example", frontend_env)

        # Dockerfile
        dockerfile = """FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
"""
        self.create_file(self.base_path / "frontend/Dockerfile", dockerfile)

        # nginx.conf
        nginx_conf = """server {
    listen 3000;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:5000/api;
    }
}
"""
        self.create_file(self.base_path / "frontend/nginx.conf", nginx_conf)

        # package.json
        package_json = """{
  "name": "insurance-brokerage-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "axios": "^1.3.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  }
}
"""
        self.create_file(self.base_path / "frontend/package.json", package_json)

        # public/index.html
        index_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Insurance Brokerage</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
"""
        self.create_file(self.base_path / "frontend/public/index.html", index_html)

        # src/index.js
        index_js = """import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
"""
        self.create_file(self.base_path / "frontend/src/index.js", index_js)

        # src/App.js
        app_js = """import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Insurance Brokerage System</h1>
      <p>Application is ready for development.</p>
    </div>
  );
}

export default App;
"""
        self.create_file(self.base_path / "frontend/src/App.js", app_js)

    def _create_database_files(self):
        """Create database migration files"""
        init_sql = """-- Create tables
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    permissions JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL,
    department_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Insert default data
INSERT INTO departments (name, description) VALUES
('Placement', 'Sales team'),
('Finance', 'Finance team'),
('Aftersales', 'Aftersales team'),
('Admin', 'Admin team')
ON CONFLICT DO NOTHING;

INSERT INTO roles (name) VALUES
('Admin'),
('Placement_Maker'),
('Placement_Checker'),
('Finance_Maker'),
('Finance_Checker'),
('Aftersales_Maker'),
('Aftersales_Checker')
ON CONFLICT DO NOTHING;
"""
        self.create_file(self.base_path / "backend/migrations/init.sql", init_sql)

    def _create_documentation(self):
        """Create documentation files"""
        readme = """# Insurance Brokerage Management System

Full-stack web application for insurance brokerage management.

## Quick Start

```bash
cd insurance-brokerage
cp .env.example .env
docker-compose up -d
```

## Access

- Frontend: http://localhost:3000
- Backend: http://localhost:5000/api
- PgAdmin: http://localhost:5050

## Structure

- `backend/` - Node.js/Express API
- `frontend/` - React application
- `docs/` - Documentation

## Features

- Placement Module (Clients, Policies, Documents)
- Finance Module (Payments, Invoices, Commissions)
- Endorsement Module (Policy Changes)
- Role-Based Access Control
- Maker-Checker Workflow
"""
        self.create_file(self.base_path / "README.md", readme)

        # Quick start guide
        quickstart = """# Quick Start Guide

## Prerequisites
- Docker & Docker Compose
- Git

## Setup

1. Clone repository
2. Copy `.env.example` to `.env`
3. Run `docker-compose up -d`
4. Access at http://localhost:3000

## Services

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Database Admin: http://localhost:5050

## Commands

```bash
# View logs
docker-compose logs -f backend

# Stop services
docker-compose stop

# Restart
docker-compose restart
```
"""
        self.create_file(self.base_path / "docs/QUICKSTART.md", quickstart)

    def _create_utility_scripts(self):
        """Create utility scripts"""
        # For Windows
        start_bat = """@echo off
echo Starting Insurance Brokerage Application...

if not exist .env (
    echo .env file not found!
    copy .env.example .env
    echo Created .env file. Please edit it with your configuration.
    exit /b 1
)

docker-compose up -d

echo.
echo Services starting...
echo.
echo Access your application at:
echo   Frontend:  http://localhost:3000
echo   Backend:   http://localhost:5000/api
echo   PgAdmin:   http://localhost:5050
echo.
"""
        self.create_file(self.base_path / "start.bat", start_bat)

        stop_bat = """@echo off
echo Stopping Insurance Brokerage Application...
docker-compose stop
echo Services stopped
"""
        self.create_file(self.base_path / "stop.bat", stop_bat)

        # For Mac/Linux
        start_sh = """#!/bin/bash
echo "Starting Insurance Brokerage Application..."

if [ ! -f .env ]; then
    echo ".env file not found!"
    cp .env.example .env
    echo "Created .env file."
    exit 1
fi

docker-compose up -d

echo ""
echo "Services starting..."
echo ""
echo "Access at:"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:5000/api"
echo "  PgAdmin:   http://localhost:5050"
"""
        self.create_file(self.base_path / "start.sh", start_sh)

        stop_sh = """#!/bin/bash
echo "Stopping application..."
docker-compose stop
echo "Stopped"
"""
        self.create_file(self.base_path / "stop.sh", stop_sh)

        # Create .gitkeep files
        self.create_file(self.base_path / "backend/uploads/.gitkeep", "")
        self.create_file(self.base_path / "backend/logs/.gitkeep", "")

if __name__ == "__main__":
    builder = ProjectBuilder(PROJECT_NAME)
    success = builder.build()
    sys.exit(0 if success else 1)
