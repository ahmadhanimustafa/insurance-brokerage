#!/bin/bash

# Development helper script for Docker Compose

case "$1" in
  start)
    echo "Starting development environment..."
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
    echo "Showing logs..."
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
    docker-compose -f docker-compose.dev.yml up
    ;;
  *)
    echo "Usage: ./dev.sh {start|build|restart|stop|logs|clean|rebuild}"
    echo ""
    echo "Commands:"
    echo "  start    - Start development environment"
    echo "  build    - Build images (with cache)"
    echo "  restart  - Restart containers"
    echo "  stop     - Stop and remove containers"
    echo "  logs     - Show and follow logs"
    echo "  clean    - Remove containers and volumes"
    echo "  rebuild  - Rebuild from scratch (rarely needed)"
    exit 1
    ;;
esac
