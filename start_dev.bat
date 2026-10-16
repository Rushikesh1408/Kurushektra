@echo off
echo ========================================================
echo Starting CogniCode / Kurushektra Local Development Server
echo ========================================================
echo.

start "Backend Server (FastAPI :8000)" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
start "Frontend Server (Vite :5173)" cmd /k "cd Kurushektra-main && npm run dev"

echo Backend started on http://127.0.0.1:8000
echo Frontend started on http://127.0.0.1:5173
echo.
pause
