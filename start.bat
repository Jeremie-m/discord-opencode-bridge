@echo off
setlocal enabledelayedexpansion

REM Discord-OpenCode Bridge Startup Script
REM Reads config from .env and starts both services

echo ========================================
echo   Discord-OpenCode Bridge
echo ========================================
echo.

REM Check if .env exists
if not exist ".env" (
    echo ERROR: .env file not found!
    echo Please copy .env.example to .env and configure it.
    pause
    exit /b 1
)

REM Read OPENCODE_DEFAULT_PROJECT_PATH from .env
set "PROJECT_PATH="
for /f "tokens=1,2 delims==" %%a in ('findstr /r "^OPENCODE_DEFAULT_PROJECT_PATH=" .env') do (
    set "PROJECT_PATH=%%b"
)

REM Check if project path is set
if "%PROJECT_PATH%"=="" (
    echo ERROR: OPENCODE_DEFAULT_PROJECT_PATH is not set in .env
    echo.
    echo Please add this line to your .env file:
    echo OPENCODE_DEFAULT_PROJECT_PATH=C:/path/to/your/projects
    echo.
    pause
    exit /b 1
)

REM Check if project path exists
if not exist "%PROJECT_PATH%" (
    echo ERROR: Project path does not exist: %PROJECT_PATH%
    echo Please check OPENCODE_DEFAULT_PROJECT_PATH in .env
    pause
    exit /b 1
)

echo OpenCode will run from: %PROJECT_PATH%
echo.

REM Start OpenCode server in a new window from the project directory
echo [opencode] Starting server...
start "OpenCode Server" cmd /k "cd /d %PROJECT_PATH% && opencode serve --port 4096"

REM Wait for OpenCode to start
echo Waiting for OpenCode server to start...
timeout /t 3 /nobreak >nul

REM Start the bridge
echo [bridge] Starting Discord bridge...
echo.
npm run dev

REM When bridge exits, remind user to close OpenCode window
echo.
echo Bridge stopped. Please close the OpenCode Server window manually.
pause
