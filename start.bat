@echo off
chcp 65001 >nul
title IELTS Speaking - Launcher

echo ============================================
echo   IELTS Speaking Practice - Launcher
echo ============================================
echo.

:: ── Check Python ──────────────────────────────
echo [1/4] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.9+
    echo         https://www.python.org/downloads/
    pause
    exit /b 1
)
for /f "tokens=2" %%v in ('python --version 2^>^&1') do echo         Found Python %%v

:: ── Check Node.js ─────────────────────────────
echo [2/4] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    echo         https://nodejs.org/
    pause
    exit /b 1
)
for /f %%v in ('node --version') do echo         Found Node.js %%v

:: ── Install backend deps ─────────────────────
echo [3/4] Installing backend dependencies...
cd /d "%~dp0backend"
if not exist "venv\" (
    echo         Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)
echo         Done.

:: ── Install frontend deps ────────────────────
echo [4/4] Installing frontend dependencies...
cd /d "%~dp0frontend"
if not exist "node_modules\" (
    echo         Installing (this may take a minute)...
    call npm install
)
echo         Done.

:: ── Check .env ───────────────────────────────
cd /d "%~dp0"
if not exist ".env" (
    echo.
    echo [NOTE] No .env file found. Creating from template...
    echo         Edit .env to add your API key, or configure via Settings page.
    echo DEEPSEEK_API_KEY=your_api_key_here> .env
    echo DEEPSEEK_BASE_URL=https://api.deepseek.com>> .env
    echo DEEPSEEK_MODEL=deepseek-v4-pro>> .env
)

:: ── Launch ───────────────────────────────────
echo.
echo ============================================
echo   Starting services...
echo ============================================
echo.
echo   Backend  → http://localhost:8000
echo   Frontend → http://localhost:5173
echo.
echo   Close this window to stop all services.
echo ============================================

:: Start backend
cd /d "%~dp0backend"
start "IELTS Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Start frontend
cd /d "%~dp0frontend"
start "IELTS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Wait for backend to be ready
echo.
echo Waiting for backend to start...
:wait_backend
timeout /t 2 /nobreak >nul
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% neq 0 goto wait_backend

:: Open browser
echo Opening browser...
start http://localhost:5173

echo.
echo All services are running. Press any key to stop...
pause >nul

:: Cleanup
taskkill /FI "WINDOWTITLE eq IELTS Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq IELTS Frontend*" /T /F >nul 2>&1
echo Services stopped.
