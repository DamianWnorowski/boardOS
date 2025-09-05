@echo off
REM Windows environment setup script for BoardOS
REM Sets up environment variables for the BoardOS Construction Scheduler

echo 🚀 BoardOS Environment Setup (Windows)
echo =======================================

REM Check if .env file exists
if exist .env (
    echo ✅ Found .env file
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if "%%a"=="VITE_SUPABASE_URL" set VITE_SUPABASE_URL=%%b
        if "%%a"=="VITE_SUPABASE_ANON_KEY" set VITE_SUPABASE_ANON_KEY=%%b
    )
    echo 📝 Environment variables loaded from .env file
) else (
    echo ❌ No .env file found! Creating from template...
    copy .env.example .env
    echo ⚠️  Please edit .env file with your Supabase credentials
    pause
    exit /b 1
)

REM Verify required environment variables
if "%VITE_SUPABASE_URL%"=="" (
    echo ❌ VITE_SUPABASE_URL not found in environment
    exit /b 1
)

if "%VITE_SUPABASE_ANON_KEY%"=="" (
    echo ❌ VITE_SUPABASE_ANON_KEY not found in environment
    exit /b 1
)

echo ✅ Environment variables configured:
echo    📊 VITE_SUPABASE_URL: %VITE_SUPABASE_URL%
echo    🔑 VITE_SUPABASE_ANON_KEY: [configured]

echo.
echo 🎯 Ready to run BoardOS commands:
echo    npm run dev           - Start development server
echo    npm run claude:start  - Start Claude session
echo    npm run migration:check - Check database status
echo.

REM Test database connection
echo 🔍 Testing database connection...
node scripts/check-migration.js

if %errorlevel% equ 0 (
    echo ✅ Database connection successful!
) else (
    echo ⚠️  Database connection issues detected
)

echo.
echo 🎉 Environment setup complete!