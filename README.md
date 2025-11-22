# Insurance Brokerage Management System

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
