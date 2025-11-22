# Quick Start Guide

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
