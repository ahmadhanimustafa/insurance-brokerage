# Development Guide

## Quick Start (Recommended)

### For Development (with Hot Reload)

```bash
# First time setup
./dev.sh build

# Start development environment
./dev.sh start

# Or combine both
docker-compose -f docker-compose.dev.yml up --build
```

**Benefits:**
- ✅ Frontend and backend auto-reload on code changes
- ✅ No need to rebuild after every change
- ✅ Much faster iteration cycle
- ✅ Uses Docker layer caching

### Available Commands

```bash
./dev.sh start    # Start development environment
./dev.sh stop     # Stop containers
./dev.sh restart  # Restart containers
./dev.sh logs     # View logs
./dev.sh clean    # Clean up everything
./dev.sh rebuild  # Full rebuild (rarely needed)
```

## What Changed?

### Development Setup (`docker-compose.dev.yml`)
- **Frontend**: Now runs React dev server (port 3000) with hot reload
- **Backend**: Already had hot reload, no changes needed
- **Source code mounted as volumes**: Changes reflect immediately

### Production Setup (`docker-compose.yml`)
- Kept as-is for production builds
- Uses optimized nginx serving

## Common Workflows

### Daily Development
```bash
# Start containers (first time or after stopping)
./dev.sh start

# Make code changes → auto-reloads automatically ✨

# View logs if needed
./dev.sh logs

# Stop when done
./dev.sh stop
```

### When to Rebuild

You only need to rebuild when:
1. **Package.json changes** (added/removed npm packages)
2. **Dockerfile changes**
3. **Environment variables change**

```bash
# Quick rebuild (uses cache)
docker-compose -f docker-compose.dev.yml build

# Or use helper
./dev.sh build
```

### When NOT to Rebuild

**DON'T rebuild for:**
- ❌ Code changes in `src/` folders (auto-reload handles this)
- ❌ CSS/HTML changes
- ❌ Component updates
- ❌ Route changes
- ❌ Regular development work

## Troubleshooting

### Frontend not hot reloading?
```bash
# Restart frontend container
docker-compose -f docker-compose.dev.yml restart frontend
```

### Need to clear everything?
```bash
./dev.sh clean  # Removes containers and volumes
./dev.sh build  # Rebuild
./dev.sh start  # Start fresh
```

### Port conflicts?
```bash
# Stop all containers first
./dev.sh stop

# Or check what's using the ports
lsof -i :3000
lsof -i :5000
```

## Performance Comparison

### Before (Production Build)
```bash
docker-compose build --no-cache  # 5-10 minutes
docker-compose up                 # Every code change requires rebuild
```

### After (Development Mode)
```bash
./dev.sh start                    # 30 seconds first time
# Code changes → Instant reload ✨  # No rebuild needed!
```

## URLs

- **Frontend**: http://localhost:3000 (dev server with hot reload)
- **Backend**: http://localhost:5000
- **Database**: localhost:5432
- **PgAdmin**: http://localhost:5050

## For Production

When deploying to production, use the original docker-compose:

```bash
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d
```

Or simply:
```bash
docker-compose up -d
```
