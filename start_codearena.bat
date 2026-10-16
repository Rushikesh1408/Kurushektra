@echo off
setlocal

:: ============================================================================
:: CodeArena - Windows Unified Platform Launcher
:: Supports both Innovation Demo Mode (standalone) and Live Sandbox Mode (Judge0).
:: ============================================================================

title CodeArena Launcher

:: Resolve project root directory from batch file location
set "PROJECT_ROOT=%~dp0"
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"

:: ----------------------------------------------------------------------------
:: 1. Parse Command Line Arguments or Show Interactive Menu
:: ----------------------------------------------------------------------------
set "ARG=%~1"
if /I "%ARG%"=="demo" goto :set_demo
if /I "%ARG%"=="--demo" goto :set_demo
if /I "%ARG%"=="live" goto :set_live
if /I "%ARG%"=="normal" goto :set_live
if /I "%ARG%"=="--live" goto :set_live
if /I "%ARG%"=="seed" goto :run_seed_only
if /I "%ARG%"=="reset" goto :run_reset_only
if /I "%ARG%"=="help" goto :show_help
if /I "%ARG%"=="--help" goto :show_help
if /I "%ARG%"=="-h" goto :show_help
if /I "%ARG%"=="/?" goto :show_help

:interactive_menu
cls
echo ============================================================================
echo                     CodeArena Platform - Launcher
echo ============================================================================
echo Project Root: "%PROJECT_ROOT%"
echo.
echo Select an option:
echo   [1] Innovation Demo Mode [Recommended for Presentation]
echo       - No Docker Desktop or Judge0 required.
echo       - Safe deterministic simulation engine.
echo       - Pre-seeded with 5 challenges, submissions, and Question Engine.
echo.
echo   [2] Live Sandbox Mode
echo       - Requires Docker Desktop and Judge0 running.
echo.
echo   [3] Seed Demo Dataset Only
echo       - Adds/refreshes the 5 demo challenges, submissions, and questions.
echo.
echo   [4] Reset Demo Records Only
echo       - Cleans up demo submissions/challenges without touching real data.
echo.
echo   [5] Exit
echo ============================================================================
set "USER_CHOICE=1"
set /p "USER_CHOICE=Enter selection [1-5, Default is 1]: "

if "%USER_CHOICE%"=="1" goto :set_demo
if "%USER_CHOICE%"=="2" goto :set_live
if "%USER_CHOICE%"=="3" goto :run_seed_only
if "%USER_CHOICE%"=="4" goto :run_reset_only
if "%USER_CHOICE%"=="5" exit /b 0

:: Default fallback is demo mode
goto :set_demo

:set_demo
set "RUN_MODE=demo"
set "DEMO_MODE=true"
goto :start_checks

:set_live
set "RUN_MODE=live"
set "DEMO_MODE=false"
goto :start_checks

:: ----------------------------------------------------------------------------
:: 2. Pre-flight Directory and Dependency Checks
:: ----------------------------------------------------------------------------
:start_checks
echo.
echo [*] Checking project structure...

if not exist "%PROJECT_ROOT%\backend" (
    echo [ERROR] Backend folder not found at "%PROJECT_ROOT%\backend".
    echo Please make sure this script is placed in the CodeArena project root.
    goto :error_exit
)

if not exist "%PROJECT_ROOT%\frontend" (
    echo [ERROR] Frontend folder not found at "%PROJECT_ROOT%\frontend".
    echo Please make sure this script is placed in the CodeArena project root.
    goto :error_exit
)

echo [*] Checking Python virtual environment...

set "PYTHON_EXE=%PROJECT_ROOT%\backend\.venv\Scripts\python.exe"

if not exist "%PYTHON_EXE%" (
    echo [ERROR] Python executable not found at:
    echo         "%PYTHON_EXE%"
    echo.
    echo Troubleshooting:
    echo 1. Verify that the virtual environment exists in "backend\.venv".
    echo 2. If missing, create it and install backend dependencies:
    echo      cd "%PROJECT_ROOT%\backend"
    echo      py -3.12 -m venv .venv
    echo      .\.venv\Scripts\pip.exe install -r requirements.txt
    goto :error_exit
)

"%PYTHON_EXE%" -c "import uvicorn" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 'uvicorn' is not installed in the backend virtual environment.
    echo Troubleshooting:
    echo Run: "%PROJECT_ROOT%\backend\.venv\Scripts\pip.exe" install -r "%PROJECT_ROOT%\backend\requirements.txt"
    goto :error_exit
)

echo [*] Checking frontend runtime and dependencies...

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 'npm' was not found in your PATH.
    echo Please install Node.js including npm from https://nodejs.org/ and restart your terminal.
    goto :error_exit
)

if not exist "%PROJECT_ROOT%\frontend\package.json" (
    echo [ERROR] "frontend\package.json" is missing.
    goto :error_exit
)

if not exist "%PROJECT_ROOT%\frontend\node_modules" (
    echo [ERROR] "frontend\node_modules" is missing.
    echo Troubleshooting:
    echo Please install frontend dependencies:
    echo      cd "%PROJECT_ROOT%\frontend"
    echo      npm install
    goto :error_exit
)

echo [*] Checking environment configuration...

if not exist "%PROJECT_ROOT%\backend\.env" (
    if exist "%PROJECT_ROOT%\.env" (
        copy /y "%PROJECT_ROOT%\.env" "%PROJECT_ROOT%\backend\.env" >nul 2>&1
    ) else (
        echo [*] Initializing backend\.env with development defaults...
        pushd "%PROJECT_ROOT%\backend"
        .\.venv\Scripts\python.exe -c "import secrets; open('.env', 'w').write(f'DATABASE_URL=sqlite:///./dev.db\nJWT_SECRET={secrets.token_hex(32)}\nCOOKIE_SECURE=false\n')" >nul 2>&1
        popd
    )
)

:: ----------------------------------------------------------------------------
:: 3. Database Migration and Language Setup
:: ----------------------------------------------------------------------------
if not exist "%PROJECT_ROOT%\backend\dev.db" (
    echo [*] Initializing SQLite database schema: alembic upgrade head...
    pushd "%PROJECT_ROOT%\backend"
    .\.venv\Scripts\alembic.exe upgrade head >nul 2>&1
    .\.venv\Scripts\python.exe -m app.seed languages >nul 2>&1
    popd
)

:: ----------------------------------------------------------------------------
:: Handle Seed-Only or Reset-Only operations
:: ----------------------------------------------------------------------------
if "%RUN_MODE%"=="seed_only" goto :do_seed_only
if "%RUN_MODE%"=="reset_only" goto :do_reset_only

:: Auto-seed demo dataset if Demo Mode is active
if "%DEMO_MODE%"=="true" (
    echo [*] Ensuring Innovation Demo dataset is seeded...
    pushd "%PROJECT_ROOT%\backend"
    .\.venv\Scripts\python.exe -m app.seed demo >nul 2>&1
    popd
)

goto :display_status_and_launch

:do_seed_only
echo.
echo [*] Seeding demo dataset into database...
pushd "%PROJECT_ROOT%\backend"
.\.venv\Scripts\python.exe -m app.seed demo
popd
echo.
echo [OK] Demo dataset seeded successfully.
echo Demo Credentials:
echo   Faculty: demo-teacher@codearena.local / demo-arena-2026!
echo   Student: demo-student@codearena.local / demo-arena-2026!
pause
exit /b 0

:do_reset_only
echo.
echo [*] Resetting demo records from database...
pushd "%PROJECT_ROOT%\backend"
.\.venv\Scripts\python.exe -c "from app.core.database import get_engine; from sqlalchemy.orm import Session; from sqlalchemy import select; from app.models import Challenge, Submission; from app.services.demo_data import DEMO_CHALLENGES; e = get_engine(); s = Session(e); slugs = [c['slug'] for c in DEMO_CHALLENGES]; chs = list(s.scalars(select(Challenge).where(Challenge.slug.in_(slugs))).all()); ch_ids = [c.id for c in chs]; subs = list(s.scalars(select(Submission).where(Submission.challenge_id.in_(ch_ids))).all()); [s.delete(sub) for sub in subs]; [s.delete(c) for c in chs]; s.commit(); print(f'Safely reset {len(chs)} demo challenges and {len(subs)} demo submissions.')"
popd
echo.
echo [OK] Demo records reset completed.
pause
exit /b 0

:: ----------------------------------------------------------------------------
:: 4. Services Status and Launching
:: ----------------------------------------------------------------------------
:display_status_and_launch
echo.
echo ============================================================================
echo Services and Execution Status:
echo - Backend API:  http://localhost:8000
echo - Frontend UI:  http://localhost:5173
if "%DEMO_MODE%"=="true" (
    echo - Mode:         INNOVATION DEMO SIMULATION [Active]
    echo - Notice:       Deterministic evaluation active [Judge0 and Docker bypassed]
    echo.
    echo Pre-configured Demo Accounts:
    echo - Faculty / Teacher: demo-teacher@codearena.local / demo-arena-2026!
    echo - Student:           demo-student@codearena.local / demo-arena-2026!
) else (
    echo - Mode:         LIVE PRODUCTION / SANDBOX
)
echo.

if "%DEMO_MODE%"=="true" (
    echo [OK] Demo mode enabled: Execution worker will run internal simulator.
) else (
    set "DOCKER_AVAILABLE=0"
    where docker >nul 2>&1
    if not errorlevel 1 (
        docker ps >nul 2>&1
        if not errorlevel 1 (
            set "DOCKER_AVAILABLE=1"
            echo [OK] Docker daemon is running.
        ) else (
            echo [!] Docker Desktop CLI found, but daemon is not running.
        )
    )
    if not "%JUDGE0_URL%"=="" (
        pushd "%PROJECT_ROOT%\backend"
        .\.venv\Scripts\python.exe -c "import httpx; httpx.get('%JUDGE0_URL%/about', timeout=2)" >nul 2>&1
        if not errorlevel 1 (
            set "JUDGE0_REACHABLE=1"
            echo [OK] Judge0 service at %JUDGE0_URL% is reachable.
        ) else (
            echo [!] Configured Judge0 service could not be reached.
        )
        popd
    ) else (
        echo [i] JUDGE0_URL is not set. Real sandbox runs require Judge0.
    )
)
echo ============================================================================
echo.

:: ----------------------------------------------------------------------------
:: 5. Launch FastAPI Backend
:: ----------------------------------------------------------------------------
netstat -ano | findstr /R /C:":8000 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [i] Backend appears to already be running on port 8000.
) else (
    echo [*] Launching FastAPI Backend on port 8000...
    start "CodeArena Backend API (Port 8000)" /D "%PROJECT_ROOT%\backend" cmd /k "set DEMO_MODE=%DEMO_MODE%&& .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
)

:: ----------------------------------------------------------------------------
:: 6. Launch Vite Frontend
:: ----------------------------------------------------------------------------
netstat -ano | findstr /R /C:":5173 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo [i] Frontend appears to already be running on port 5173.
) else (
    echo [*] Launching Vite Frontend on port 5173...
    start "CodeArena Frontend UI (Port 5173)" /D "%PROJECT_ROOT%\frontend" cmd /k "npm run dev"
)

:: ----------------------------------------------------------------------------
:: 7. Launch Execution Worker
:: ----------------------------------------------------------------------------
if "%DEMO_MODE%"=="true" (
    echo [*] Launching Execution Worker in DEMO SIMULATION mode...
    start "CodeArena Execution Worker (DEMO SIMULATION)" /D "%PROJECT_ROOT%\backend" cmd /k "set DEMO_MODE=true&& .\.venv\Scripts\python.exe -m app.worker"
) else if "%JUDGE0_REACHABLE%"=="1" (
    echo [*] Launching Execution Worker [connected to Judge0]...
    start "CodeArena Execution Worker" /D "%PROJECT_ROOT%\backend" cmd /k ".\.venv\Scripts\python.exe -m app.worker"
) else (
    echo [i] Worker not started: requires reachable Judge0 service or DEMO_MODE=true.
)

echo.
echo ============================================================================
echo [OK] CodeArena services have been launched successfully!
echo.
echo - Frontend URL: http://localhost:5173
echo - Backend API:  http://localhost:8000/docs
echo.
echo Opening CodeArena in your default browser...
start http://localhost:5173
echo.
echo Keep the separate console windows open while testing or presenting.
echo ============================================================================
echo.
pause
exit /b 0

:: ----------------------------------------------------------------------------
:: Helpers & Error Exit
:: ----------------------------------------------------------------------------
:show_help
echo ============================================================================
echo CodeArena Windows Launcher - Usage Guide
echo ============================================================================
echo Syntax:
echo   start_codearena.bat [option]
echo.
echo Options:
echo   demo          Launch in Innovation Demo Mode (standalone, no Docker/Judge0)
echo   live          Launch in Live Sandbox Mode (requires Docker and Judge0)
echo   seed          Seed the 5 demo challenges, submissions, and questions
echo   reset         Safely remove demo records (preserves real user data)
echo   help          Display this help message
echo.
echo If run without options, an interactive menu will be displayed.
echo ============================================================================
pause
exit /b 0

:error_exit
echo.
echo [ERROR] Launch aborted due to error above.
echo.
pause
exit /b 1
