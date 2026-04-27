#!/bin/bash

# Exit on error
set -e

cleanup() {
    echo "Stopping services..."
    kill $BACKEND_PID $CELERY_PID 2>/dev/null || true
    docker-compose stop db redis
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "Starting Database and Redis via Docker Compose..."
docker-compose up -d db redis

echo "Waiting for database to be ready..."
sleep 5

echo "Building Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
npm run build
cd ..

echo "Starting Backend Server..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi
python manage.py migrate
python manage.py runserver &
BACKEND_PID=$!
cd ..

echo "Starting Celery Worker..."
cd backend
source venv/bin/activate
celery -A config worker -l info &
CELERY_PID=$!
cd ..

echo "========================================="
echo "All services started successfully!"
echo "Main App: http://localhost:8000"
echo "API Docs: http://localhost:8000/api/v1/"
echo "Press Ctrl+C to stop all services."
echo "========================================="

wait
