@echo off
REM
REM Uninstall Plan Reviewer Hooks (Windows)
REM
REM This script removes the Plan Reviewer hooks from Claude Code settings
REM

setlocal EnableDelayedExpansion

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

echo ╔══════════════════════════════════════════════════════╗
echo ║  🗑️  Plan Reviewer - Uninstall Hooks                ║
echo ╚══════════════════════════════════════════════════════╝
echo.

REM Call setup.bat with uninstall argument
call "%SCRIPT_DIR%\setup.bat" --uninstall

echo.
echo ✅ Uninstall complete!
echo    Restart Claude Code for changes to take effect.
