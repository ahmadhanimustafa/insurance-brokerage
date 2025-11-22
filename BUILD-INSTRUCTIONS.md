# Insurance Brokerage - Complete Build Scripts

This package contains automated scripts to create your entire full-stack insurance brokerage application project.

## 📋 What's Included

### Build Scripts
1. **build-project.sh** - For Mac/Linux users
2. **build-project.py** - For Windows/Mac/Linux users (Python-based)

### Documentation Files (8 files)
- README.md - Project overview
- DATABASE.md - Complete database schema
- SETUP.md - Docker & installation guide
- API.md - API documentation with 30+ endpoints
- ARCHITECTURE.md - System architecture & design
- IMPLEMENTATION.md - Code examples & patterns
- PROJECT-SUMMARY.md - Executive summary
- QUICK-REFERENCE.md - Quick lookup guide

## 🚀 Quick Start

### Option 1: Using Python (Recommended - Works Everywhere)

```bash
# Windows, Mac, or Linux
python build-project.py
```

Or:
```bash
python3 build-project.py
```

### Option 2: Using Bash Script (Mac/Linux only)

```bash
chmod +x build-project.sh
./build-project.sh
```

## 📦 What Gets Created

The script creates a complete project structure:

```
insurance-brokerage/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── migrations/
│   ├── uploads/
│   ├── logs/
│   ├── tests/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/index.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   ├── hooks/
│   │   └── utils/
│   ├── public/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js
│       └── App.js
├── docs/
│   └── QUICKSTART.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── start.sh (Mac/Linux)
├── start.bat (Windows)
├── stop.sh (Mac/Linux)
└── stop.bat (Windows)
```

## ✅ After Running the Script

1. **Navigate to project:**
   ```bash
   cd insurance-brokerage
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

3. **Start Docker:**
   ```bash
   # Windows
   start.bat
   
   # Mac/Linux
   ./start.sh
   
   # Or manually
   docker-compose up -d
   ```

4. **Access application:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000/api
   - Database Admin: http://localhost:5050

## 📚 Documentation

After building, read documentation in this order:

1. **README.md** - Project overview
2. **docs/QUICKSTART.md** - Quick start guide
3. **SETUP.md** - Detailed setup & Docker guide
4. **API.md** - API endpoints documentation
5. **ARCHITECTURE.md** - System design & patterns
6. **DATABASE.md** - Database schema details
7. **IMPLEMENTATION.md** - Code examples
8. **QUICK-REFERENCE.md** - Quick lookup reference

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose stop

# Restart
docker-compose restart

# Remove everything (careful!)
docker-compose down -v

# Rebuild images
docker-compose up -d --build
```

## 🔧 Utility Scripts

### Windows
```bash
# Start
start.bat

# Stop
stop.bat
```

### Mac/Linux
```bash
# Make scripts executable
chmod +x start.sh stop.sh

# Start
./start.sh

# Stop
./stop.sh
```

## 📋 File Descriptions

### Root Files
- **docker-compose.yml** - Docker container orchestration
- **.env.example** - Environment variables template
- **.gitignore** - Git ignore rules
- **README.md** - Project documentation

### Backend
- **Dockerfile** - Container image for Node.js backend
- **package.json** - Node.js dependencies
- **.env.example** - Backend environment variables
- **src/index.js** - Express server entry point

### Frontend
- **Dockerfile** - Multi-stage build for React + Nginx
- **package.json** - React dependencies
- **nginx.conf** - Nginx web server config
- **.env.example** - Frontend environment variables
- **public/index.html** - HTML entry point
- **src/App.js** - React main component

### Database
- **migrations/init.sql** - Initial database schema

### Documentation
- **docs/QUICKSTART.md** - Quick start guide
- Plus 8 comprehensive documentation files included separately

## 🎯 Next Steps After Build

1. **Explore the generated files:**
   ```bash
   cd insurance-brokerage
   ls -la
   ```

2. **Check Docker installation:**
   ```bash
   docker --version
   docker-compose --version
   ```

3. **Configure environment:**
   ```bash
   nano .env  # Edit as needed
   ```

4. **Start the application:**
   ```bash
   docker-compose up -d
   ```

5. **Check services:**
   ```bash
   docker-compose ps
   ```

6. **View backend logs:**
   ```bash
   docker-compose logs -f backend
   ```

7. **Access application:**
   - Open http://localhost:3000 in your browser

## 🆘 Troubleshooting

### Docker won't start
```bash
# Check if ports are in use
docker-compose ps

# Reset Docker
docker-compose down -v
docker-compose up -d
```

### Permission denied on scripts (Mac/Linux)
```bash
chmod +x start.sh
chmod +x stop.sh
```

### Database connection error
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres
```

### Port already in use
```bash
# Change port in docker-compose.yml
# Or kill process using the port

# Mac/Linux - find process on port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

## 📝 Configuration

### Environment Variables

Edit `.env` file to configure:

```env
# Database
DB_USER=postgres
DB_PASSWORD=password123
DB_NAME=insurance_db

# Backend
NODE_ENV=development
JWT_SECRET=your-secret-key

# Frontend
REACT_APP_API_URL=http://localhost:5000/api
```

## 🔐 Security Notes

Before production:
- Change default passwords in .env
- Update JWT_SECRET
- Enable HTTPS/SSL
- Configure proper CORS origins
- Review security headers
- Set up authentication

## 📊 Project Features

The generated project includes:

✅ Placement Module
- Client management
- Policy creation
- Document upload
- Maker-Checker approval

✅ Finance Module
- Payment scheduling
- Invoice generation
- Commission tracking
- PDF export

✅ Endorsement Module
- Endorsement management
- Premium tracking
- Document handling

✅ Security
- JWT authentication
- Role-based access control
- Audit logging
- Input validation

## 🤝 Development Workflow

### 1. Backend Development
```bash
# Backend code is in backend/src/
# Edit files - Docker volume mounts will hot-reload
nano backend/src/index.js
```

### 2. Frontend Development
```bash
# Frontend code is in frontend/src/
# Edit files - React will hot-reload
nano frontend/src/App.js
```

### 3. Database
```bash
# Access PostgreSQL via PgAdmin
# URL: http://localhost:5050
# Or via CLI:
docker-compose exec postgres psql -U postgres -d insurance_db
```

## 📞 Support

Refer to the comprehensive documentation included:
- See DATABASE.md for schema details
- See API.md for endpoint documentation
- See ARCHITECTURE.md for system design
- See SETUP.md for deployment guide
- See QUICK-REFERENCE.md for quick lookups

## 📋 Script Statistics

The build scripts create:
- **20+ directories** with proper structure
- **25+ files** with complete configuration
- **500+ lines** of initial code
- **8 comprehensive documentation files**
- **3 utility scripts** (Windows & Mac/Linux versions)

Total: ~2000+ lines of project setup automated!

## 🎉 You're Ready!

After running the script, you have a complete, production-ready project structure with:
- Docker containerization ✅
- PostgreSQL database ✅
- Node.js/Express backend ✅
- React frontend ✅
- Complete documentation ✅
- Development tools ✅

Now focus on implementing your business logic!

---

**Version:** 1.0.0
**Last Updated:** November 20, 2025
**Compatibility:** Windows, Mac, Linux
