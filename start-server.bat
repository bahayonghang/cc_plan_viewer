@echo off
REM
REM Start Plan Reviewer Server (Windows)
REM
REM Quick script to start the Plan Reviewer server without running full setup
REM

setlocal EnableDelayedExpansion

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

REM Get port from environment or use default
if not defined PLAN_REVIEWER_PORT set "PLAN_REVIEWER_PORT=3456"
set "PORT=%PLAN_REVIEWER_PORT%"

echo ╔══════════════════════════════════════════════════════╗
echo ║  📋 Plan Reviewer Server                            ║
echo ╚══════════════════════════════════════════════════════╝
echo.
echo    Starting server on port %PORT%...
echo    URL: http://localhost:%PORT%
echo.
echo    Press Ctrl+C to stop the server.
echo.

python "%SCRIPT_DIR%\server.py" --port %PORT%
