@echo off
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
