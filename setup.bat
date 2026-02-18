@echo off
REM
REM Claude Code Plan Reviewer - Setup Script (Windows)
REM
REM This script:
REM 1. Creates necessary directories
REM 2. Auto-installs hooks in Claude Code settings
REM 3. Copies plan_viewer.md and adds reference in CLAUDE.md
REM 4. Creates a sample plan for testing
REM 5. Starts the Python server
REM

setlocal EnableDelayedExpansion

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

REM Set Claude directory
set "CLAUDE_DIR=%USERPROFILE%\.claude"
set "PLANS_DIR=%CLAUDE_DIR%\plans"
set "REVIEWS_DIR=%CLAUDE_DIR%\plan-reviews"
set "SETTINGS_FILE=%CLAUDE_DIR%\settings.json"
set "CLAUDE_MD=%CLAUDE_DIR%\CLAUDE.md"

REM Get port from environment or use default
if not defined PLAN_REVIEWER_PORT set "PLAN_REVIEWER_PORT=3456"
set "PORT=%PLAN_REVIEWER_PORT%"

REM ── Uninstall mode ──
if "%1"=="--uninstall" goto :uninstall

echo ╔══════════════════════════════════════════════════════╗
echo ║  🔍 Claude Code Plan Reviewer - Setup               ║
echo ╚══════════════════════════════════════════════════════╝
echo.

REM 0. Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ python not found. Please install Python 3.8+.
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version 2^>^&1') do set "PYTHON_VERSION=%%i"
echo    ✓ Python found: %PYTHON_VERSION%

REM 1. Create directories
echo.
echo 📁 Creating directories...
if not exist "%PLANS_DIR%" mkdir "%PLANS_DIR%"
if not exist "%REVIEWS_DIR%" mkdir "%REVIEWS_DIR%"
echo    ✓ %PLANS_DIR%
echo    ✓ %REVIEWS_DIR%

REM 2. Make hook executable (not needed on Windows, but we ensure notify.bat exists)
if not exist "%SCRIPT_DIR%\notify.bat" (
    echo ❌ notify.bat not found. Please ensure it's in the same directory as setup.bat
    exit /b 1
)
echo    ✓ Hook script is present

REM 3. Generate hooks settings file
echo.
echo 🔗 Installing hooks into Claude Code settings...

set "HOOK_STOP=%SCRIPT_DIR%\notify.bat stop"
set "HOOK_TOOL=%SCRIPT_DIR%\notify.bat tool"

REM Create a temporary Python script to update settings
set "TEMP_PY=%TEMP%\update_settings_%RANDOM%.py"

(
echo import json, sys, os
echo.
echo settings_file = r"%SETTINGS_FILE%"
echo hook_stop = r"%HOOK_STOP%"
echo hook_tool = r"%HOOK_TOOL%"
echo.
echo # Load or create settings
echo settings = {}
echo if os.path.exists(settings_file):
echo     with open(settings_file, "r", encoding="utf-8") as f:
echo         try:
echo             settings = json.load(f)
echo         except json.JSONDecodeError:
echo             import shutil
echo             shutil.copy2(settings_file, settings_file + ".bak")
echo             print(f"   ⚠ Backed up corrupted settings to {settings_file}.bak")
echo             settings = {}
echo.
echo hooks = settings.setdefault("hooks", {})
echo.
echo def ensure_hook(event_name, command):
echo     entries = hooks.setdefault(event_name, [])
echo     for e in entries:
echo         if isinstance(e, dict):
echo             for h in e.get("hooks", []):
echo                 if isinstance(h, dict) and h.get("command") == command:
echo                     return False
echo     entries.append({"hooks": [{"type": "command", "command": command}]})
echo     return True
echo.
echo added_stop = ensure_hook("Stop", hook_stop)
echo added_tool = ensure_hook("PostToolUse", hook_tool)
echo.
echo with open(settings_file, "w", encoding="utf-8") as f:
echo     json.dump(settings, f, indent=2, ensure_ascii=False)
echo.
echo if added_stop or added_tool:
echo     print("   ✓ Hooks installed in " + settings_file)
echo else:
echo     print("   ✓ Hooks already present (skipped)")
) > "%TEMP_PY%"

python "%TEMP_PY%"
del "%TEMP_PY%"

REM 4. Copy plan_viewer.md and add reference in CLAUDE.md
echo.
echo 📝 CLAUDE.md integration...

copy /Y "%SCRIPT_DIR%\plan_viewer.md" "%CLAUDE_DIR%\plan_viewer.md" >nul
echo    ✓ Copied plan_viewer.md to %CLAUDE_DIR%\plan_viewer.md

set "REFERENCE_LINE=Read ~/.claude/plan_viewer.md for Plan Viewer integration instructions."

findstr /C:"%REFERENCE_LINE%" "%CLAUDE_MD%" >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ Reference already in CLAUDE.md (skipped)
) else (
    echo. >> "%CLAUDE_MD%"
    echo %REFERENCE_LINE% >> "%CLAUDE_MD%"
    echo    ✓ Added reference to %CLAUDE_MD%"
)

REM 5. Create a sample plan for testing
set "SAMPLE_PLAN=%PLANS_DIR%\sample-architecture-plan.md"
if not exist "%SAMPLE_PLAN%" (
    echo.
    echo 📄 Creating sample plan for testing...
    (
echo # Architecture Plan: User Authentication System
echo.
echo ## Overview
echo.
echo Design and implement a secure authentication system supporting OAuth2,
echo JWT tokens, and multi-factor authentication (MFA).
echo.
echo ## Goals
echo.
echo - Support email/password and social login (Google, GitHub)
echo - Implement JWT-based session management
echo - Add TOTP-based MFA as an optional security layer
echo - Maintain sub-200ms authentication response times
echo.
echo ## System Architecture
echo.
echo ```mermaid
echo flowchart TD
echo     Client[Client App] --^> Gateway[API Gateway]
echo     Gateway --^> AuthService[Auth Service]
echo     AuthService --^> UserDB[(User Database)]
echo     AuthService --^> TokenStore[(Token Store / Redis)]
echo     AuthService --^> MFAService[MFA Service]
echo.
echo     Gateway --^> OAuthProvider[OAuth Providers]
echo     OAuthProvider --^> Google[Google OAuth]
echo     OAuthProvider --^> GitHub[GitHub OAuth]
echo.
echo     AuthService --^> EventBus[Event Bus]
echo     EventBus --^> AuditLog[Audit Logger]
echo     EventBus --^> NotifService[Notification Service]
echo ```
echo.
echo ## Database Design
echo.
echo ### Users Table
echo.
echo | Column | Type | Notes |
echo |--------|------|-------|
echo | id | UUID | Primary key |
echo | email | VARCHAR(255) | Unique, indexed |
echo | password_hash | VARCHAR(255) | bcrypt |
echo | mfa_enabled | BOOLEAN | Default false |
echo | mfa_secret | VARCHAR(255) | Encrypted TOTP secret |
echo | created_at | TIMESTAMP | |
echo | updated_at | TIMESTAMP | |
echo.
echo ### Sessions Table
echo.
echo | Column | Type | Notes |
echo |--------|------|-------|
echo | id | UUID | Primary key |
echo | user_id | UUID | Foreign key |
echo | token_hash | VARCHAR(255) | SHA-256 of JWT |
echo | expires_at | TIMESTAMP | |
echo | ip_address | INET | |
echo.
echo ## API Endpoints
echo.
echo ### POST /auth/login
echo - Accept email + password
echo - Return JWT access token + refresh token
echo - Set httpOnly cookie for refresh token
echo.
echo ### POST /auth/oauth/callback
echo - Handle OAuth2 callback
echo - Create or link user account
echo - Return JWT tokens
echo.
echo ### POST /auth/mfa/verify
echo - Verify TOTP code
echo - Upgrade session to MFA-verified
echo.
echo ### POST /auth/refresh
echo - Accept refresh token
echo - Return new access token
echo.
echo ## Security Considerations
echo.
echo 1. **Rate Limiting**: 5 login attempts per minute per IP
echo 2. **Token Rotation**: Refresh tokens are single-use
echo 3. **Password Policy**: Minimum 12 chars, breach database check
echo 4. **Audit Logging**: All auth events logged with IP and user-agent
echo.
echo ## Implementation Timeline
echo.
echo ```mermaid
echo gantt
echo     title Authentication System Implementation
echo     dateFormat  YYYY-MM-DD
echo     section Core Auth
echo     User model ^& DB setup    :a1, 2026-02-01, 3d
echo     Login/Register endpoints :a2, after a1, 4d
echo     JWT token service        :a3, after a1, 3d
echo     section OAuth
echo     OAuth2 integration       :b1, after a2, 5d
echo     Google provider          :b2, after b1, 2d
echo     GitHub provider          :b3, after b2, 2d
echo     section MFA
echo     TOTP implementation      :c1, after a3, 4d
echo     MFA enrollment flow      :c2, after c1, 3d
echo     section Testing
echo     Integration tests        :d1, after b3, 5d
echo     Security audit           :d2, after d1, 3d
echo ```
echo.
echo ## Open Questions
echo.
echo - Should we support WebAuthn/passkeys in v1 or defer to v2?
echo - Redis cluster vs single instance for token store?
echo - Self-hosted vs managed OAuth (Auth0/Clerk)?
    ) > "%SAMPLE_PLAN%"
    echo    ✓ Created sample plan: %SAMPLE_PLAN%
)

REM 6. Kill existing server on the same port
echo.
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT% ^| findstr LISTENING') do (
    set "EXISTING_PID=%%a"
)
if defined EXISTING_PID (
    echo 🔄 Stopping existing server on port %PORT% (PID %EXISTING_PID%)...
    taskkill /F /PID %EXISTING_PID% >nul 2>&1
    timeout /t 2 /nobreak >nul
    echo    ✓ Stopped
)

REM 7. Start server
echo.
echo 🚀 Starting Plan Reviewer server...
echo    URL: http://localhost:%PORT%
echo.
echo Press Ctrl+C to stop the server.
echo.
python "%SCRIPT_DIR%\server.py" --port %PORT%

goto :eof

:uninstall
echo 🗑  Uninstalling Plan Reviewer hooks...

set "TEMP_PY=%TEMP%\uninstall_hooks_%RANDOM%.py"

(
echo import json, sys, os
echo.
echo settings_file = r"%SETTINGS_FILE%"
echo notify_script = r"%SCRIPT_DIR%\notify.bat"
echo.
echo if not os.path.exists(settings_file):
echo     print("   No settings file found, nothing to do.")
echo     sys.exit(0)
echo.
echo with open(settings_file, "r", encoding="utf-8") as f:
echo     settings = json.load(f)
echo.
echo hooks = settings.get("hooks", {})
echo removed = False
echo for event_name in list(hooks.keys()):
echo     entries = hooks[event_name]
echo     filtered = []
echo     for e in entries:
echo         keep = True
echo         for h in e.get("hooks", []):
echo             if isinstance(h, dict) and notify_script in h.get("command", ""):
echo                 keep = False
echo                 removed = True
echo         if keep:
echo             filtered.append(e)
echo     if filtered:
echo         hooks[event_name] = filtered
echo     else:
echo         del hooks[event_name]
echo.
echo if not hooks:
echo     settings.pop("hooks", None)
echo.
echo with open(settings_file, "w", encoding="utf-8") as f:
echo     json.dump(settings, f, indent=2, ensure_ascii=False)
echo.
echo if removed:
echo     print("   ✓ Hooks removed from " + settings_file)
echo else:
echo     print("   No plan reviewer hooks found.")
) > "%TEMP_PY%"

python "%TEMP_PY%"
del "%TEMP_PY%"

echo    Done. Restart Claude Code for changes to take effect.
goto :eof
