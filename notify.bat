@echo off
REM
REM Claude Code Hook: Plan Reviewer Notifier (Windows)
REM
REM This hook notifies the Plan Reviewer browser UI when Claude Code
REM creates or updates plans, or when a session stops.
REM

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

REM Set port and URL
if not defined PLAN_REVIEWER_PORT set "PLAN_REVIEWER_PORT=3456"
set "REVIEWER_URL=http://localhost:%PLAN_REVIEWER_PORT%/api/hook-trigger"

REM Get event type from argument
set "EVENT_TYPE=%~1"
if "%EVENT_TYPE%"=="" set "EVENT_TYPE=unknown"

REM Read hook input from stdin (Claude Code sends JSON)
set "INPUT="
for /f "delims=" %%a in ('more') do set "INPUT=%%a"

REM Extract tool name if event type is "tool"
set "TOOL_NAME="
if "%EVENT_TYPE%"=="tool" (
    for /f "tokens=2 delims=:" %%a in ('echo %INPUT% ^| findstr /c:"tool_name"') do (
        for /f "tokens=1 delims=^"" %%b in ('echo %%a') do set "TOOL_NAME=%%b"
    )
)

REM Get current UTC timestamp
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do set "dt=%%a"
set "YEAR=%dt:~0,4%"
set "MONTH=%dt:~4,2%"
set "DAY=%dt:~6,2%"
set "HOUR=%dt:~8,2%"
set "MINUTE=%dt:~10,2%"
set "SECOND=%dt:~12,2%"
set "TIMESTAMP=%YEAR%-%MONTH%-%DAY%T%HOUR%:%MINUTE%:%SECOND%Z"

REM Send notification to the reviewer (non-blocking, ignore errors)
REM Using PowerShell for async HTTP request
start /b powershell -Command ^
    "$body = @{event='%EVENT_TYPE%';tool='%TOOL_NAME%';timestamp='%TIMESTAMP%'} | ConvertTo-Json; ^
    Invoke-RestMethod -Uri '%REVIEWER_URL%' -Method POST -ContentType 'application/json' -Body $body -TimeoutSec 2 ^
    | Out-Null" 2>nul

REM Output valid JSON for Claude Code hooks
echo {"continue": true}
