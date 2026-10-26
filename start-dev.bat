@echo off
setlocal EnableExtensions DisableDelayedExpansion
set "PROJECT_DIR=%~dp0src\web-framework"

if /i "%~1"=="--api" goto api
if /i "%~1"=="--web" goto web
if not "%~1"=="" (
    echo Usage: start-dev.bat
    exit /b 1
)

title KeyVault - Development launcher
echo.
echo   KeyVault development workspace
echo   ==============================
echo.

if not exist "%PROJECT_DIR%\package.json" (
    echo ERROR: Cannot find the frontend at "%PROJECT_DIR%".
    goto failed
)
if not exist "%PROJECT_DIR%\api\go.mod" (
    echo ERROR: Cannot find the Go API at "%PROJECT_DIR%\api".
    goto failed
)

where go.exe >nul 2>&1
if errorlevel 1 (
    echo ERROR: Go is not installed or is not on PATH. Install Go 1.26.10 or newer.
    goto failed
)
where node.exe >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or is not on PATH. Install Node.js 22 or newer.
    goto failed
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not on PATH. Reinstall Node.js with npm included.
    goto failed
)
node.exe -e "if (Number(process.versions.node.split('.')[0]) < 22) { console.error('ERROR: Node.js 22 or newer is required.'); process.exit(1); }"
if errorlevel 1 goto failed

if not exist "%PROJECT_DIR%\.env" (
    echo ERROR: The local environment file is missing.
    echo From "%PROJECT_DIR%", run:
    echo.
    echo   go install github.com/MUKE-coder/grit/v3/cmd/grit@v3.411.4
    echo   grit env
    echo.
    echo This generates fresh secrets. Do not use .env.example unchanged.
    goto failed
)

pushd "%PROJECT_DIR%"
if errorlevel 1 goto failed
if not exist "node_modules\.bin\vite.cmd" (
    echo Frontend dependencies are missing. Installing with npm ci...
    call npm.cmd ci
    if errorlevel 1 (
        popd
        echo ERROR: Dependency installation failed. Review the npm output above.
        goto failed
    )
)
popd

echo Starting the Go API and Vite in separate windows...
start "KeyVault - Go API" "%ComSpec%" /d /k call "%~f0" --api
if errorlevel 1 (
    echo ERROR: Could not open the API window.
    goto failed
)
start "KeyVault - Frontend" "%ComSpec%" /d /k call "%~f0" --web
if errorlevel 1 (
    echo ERROR: Could not open the frontend window. Close the API window if needed.
    goto failed
)

echo.
echo Frontend: http://localhost:5173
echo The browser will open when Vite is ready.
echo The API uses APP_PORT from .env, defaulting to 8080.
echo First startup may take longer while Go compiles and initializes SQLite.
echo.
echo Keep both server windows open. To stop, press Ctrl+C in each window.
echo If either server exits, its window stays open so you can read the error.
exit /b 0

:api
title KeyVault - Go API
cd /d "%PROJECT_DIR%\api"
if errorlevel 1 exit /b 1
echo Starting the Go API. Initial compilation may take a moment...
go.exe run .
if errorlevel 1 (
    echo.
    echo ERROR: The Go API stopped unexpectedly. Review the output above.
    exit /b 1
)
exit /b 0

:web
title KeyVault - Frontend
cd /d "%PROJECT_DIR%"
if errorlevel 1 exit /b 1
call npm.cmd run dev -- --host localhost --port 5173 --strictPort --open
if errorlevel 1 (
    echo.
    echo ERROR: The frontend stopped unexpectedly. Review the output above.
    echo If port 5173 is occupied, stop the existing server and try again.
    exit /b 1
)
exit /b 0

:failed
echo.
echo Development startup failed.
pause
exit /b 1