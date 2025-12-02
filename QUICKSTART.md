# Quick Start Guide

## 🚀 First Time Setup

```bash
# 1. Stop any existing containers
docker-compose down

# 2. Build development images (first time only)
./dev.sh build

# 3. Start development environment
./dev.sh start
```

**That's it!** Your app is now running with hot reload enabled.

## 🌐 Access Your App

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Database**: localhost:5432
- **PgAdmin**: http://localhost:5050

## 💻 Daily Development Workflow

```bash
# Morning: Start your containers
./dev.sh start

# During the day: Just code! Changes auto-reload ✨
# Edit files in:
#   - frontend/src/
#   - backend/src/

# Evening: Stop containers
./dev.sh stop
# Or just press Ctrl+C in the terminal
```

## 🔧 Common Commands

```bash
./dev.sh start      # Start all services
./dev.sh stop       # Stop all services
./dev.sh restart    # Restart services
./dev.sh logs       # View logs
./dev.sh clean      # Remove all containers & volumes
./dev.sh rebuild    # Full rebuild (rarely needed)
```

## 🐛 Troubleshooting

### "Address already in use" error?

```bash
# Stop all Docker containers
docker-compose down
./dev.sh stop

# Then start again
./dev.sh start
```

### Frontend not updating?

```bash
# Restart just the frontend
docker-compose -f docker-compose.dev.yml restart frontend
```

### Need a fresh start?

```bash
# Clean everything and rebuild
./dev.sh clean
./dev.sh build
./dev.sh start
```

### Want to see what's happening?

```bash
# View logs (follows in real-time)
./dev.sh logs

# Or view logs for specific service
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f backend
```

## 📦 When Do I Need to Rebuild?

**Rebuild only when you:**
- ✅ Add or remove npm packages (package.json changes)
- ✅ Modify Dockerfiles
- ✅ Change environment variables

**Don't rebuild for:**
- ❌ Code changes in src/ folders (auto-reload handles this!)
- ❌ CSS or styling changes
- ❌ Adding new components
- ❌ Regular development

Just let hot reload do its magic! ✨

## 🎯 Tips

1. **Keep one terminal open** with `./dev.sh start` running to see logs
2. **Open another terminal** for git commands, npm installs, etc.
3. **Save your file** and watch the browser auto-refresh
4. **Backend changes** may take 1-2 seconds to reload

## 📖 Need More Help?

See `DEVELOPMENT.md` for detailed documentation.
