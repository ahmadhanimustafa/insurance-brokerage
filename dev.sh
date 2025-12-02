#!/bin/bash

# Development helper script for Docker Compose

case "$1" in
  start)
    echo "Starting development environment in background..."
    docker-compose -f docker-compose.dev.yml up -d
    echo "✅ Containers started!"
    echo "📋 View logs: ./dev.sh logs"
    echo "🛑 Stop: ./dev.sh stop"
    ;;
  up)
    echo "Starting development environment (foreground with logs)..."
    docker-compose -f docker-compose.dev.yml up
    ;;
  build)
    echo "Building development environment..."
    docker-compose -f docker-compose.dev.yml build
    ;;
  restart)
    echo "Restarting development environment..."
    docker-compose -f docker-compose.dev.yml restart
    ;;
  stop)
    echo "Stopping development environment..."
    docker-compose -f docker-compose.dev.yml down
    ;;
  logs)
    echo "Showing logs (Ctrl+C to exit)..."
    docker-compose -f docker-compose.dev.yml logs -f
    ;;
  clean)
    echo "Cleaning up containers and volumes..."
    docker-compose -f docker-compose.dev.yml down -v
    ;;
  rebuild)
    echo "Rebuilding and restarting..."
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.dev.yml build
    docker-compose -f docker-compose.dev.yml up -d
    echo "✅ Rebuild complete! Containers running in background."
    ;;
  status)
    echo "Checking container status..."
    docker-compose -f docker-compose.dev.yml ps
    ;;
  *)
    echo "Usage: ./dev.sh {start|up|build|restart|stop|logs|status|clean|rebuild}"
    echo ""
    echo "Commands:"
    echo "  start    - Start in background (detached mode)"
    echo "  up       - Start in foreground with logs"
    echo "  build    - Build images (with cache)"
    echo "  restart  - Restart containers"
    echo "  stop     - Stop and remove containers"
    echo "  logs     - Show and follow logs"
    echo "  status   - Check container status"
    echo "  clean    - Remove containers and volumes"
    echo "  rebuild  - Rebuild from scratch (rarely needed)"
    exit 1
    ;;
esac
