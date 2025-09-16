@echo off
echo Installing Python dependencies for SAP RFC integration...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.7+ and add it to your PATH
    pause
    exit /b 1
)

REM Install pyrfc
echo Installing pyrfc...
pip install pyrfc==3.3

if %errorlevel% equ 0 (
    echo.
    echo ✅ Python dependencies installed successfully!
    echo You can now use the SAP RFC integration.
) else (
    echo.
    echo ❌ Failed to install Python dependencies.
    echo Please check your Python installation and network connection.
)

echo.
pause