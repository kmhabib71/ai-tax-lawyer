@echo off
echo NBR PDF Downloader
echo ==================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python first
    pause
    exit /b 1
)

REM Install requirements if needed
if not exist "downloads" mkdir downloads
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing requirements...
pip install -r requirements.txt

echo.
echo Available NBR URLs:
echo 1. Income Tax Acts: https://nbr.gov.bd/regulations/acts/income-tax-acts/ban
echo 2. VAT Acts: https://nbr.gov.bd/regulations/acts/vat-acts/ban
echo 3. Customs Acts: https://nbr.gov.bd/regulations/acts/customs-acts/ban
echo 4. Custom URL
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    set url=https://nbr.gov.bd/regulations/acts/income-tax-acts/ban
) else if "%choice%"=="2" (
    set url=https://nbr.gov.bd/regulations/acts/vat-acts/ban
) else if "%choice%"=="3" (
    set url=https://nbr.gov.bd/regulations/acts/customs-acts/ban
) else if "%choice%"=="4" (
    set /p url="Enter the URL: "
) else (
    echo Invalid choice
    pause
    exit /b 1
)

echo.
echo Downloading PDFs from: %url%
echo.

python pdf_downloader.py "%url%"

echo.
echo Download completed!
echo Check the downloads folder for your files.
pause 