@echo off
echo Starting Backend...
start "Backend" cmd /k "cd backend && gradlew.bat bootRun"
timeout /t 3 /nobreak > nul

echo Starting ML Service...
start "ML Service" cmd /k "cd ml-service && python -m flask --app app run --port 5001"
timeout /t 3 /nobreak > nul

echo Starting Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo All services started!
pause