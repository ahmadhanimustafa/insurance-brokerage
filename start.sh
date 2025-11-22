#!/bin/bash
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
