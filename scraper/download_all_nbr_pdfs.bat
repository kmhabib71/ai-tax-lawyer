@echo off
echo NBR Complete PDF Downloader
echo ===========================
echo This will download all PDFs from NBR regulations, rules, SROs, and orders
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
echo Installing requirements...
pip install -r requirements.txt

echo.
echo Starting comprehensive NBR PDF download...
echo This may take a while as there are many categories to process.
echo.

REM Counter for tracking progress
set /a count=0
set /a total=18

REM Acts (Laws)
echo [1/18] Downloading Income Tax Acts...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/acts/income-tax-acts/ban"
timeout /t 2 /nobreak >nul

echo [2/18] Downloading VAT Acts...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/acts/vat-acts/ban"
timeout /t 2 /nobreak >nul

echo [3/18] Downloading Customs Acts...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/acts/customs-acts/ban"
timeout /t 2 /nobreak >nul

REM Rules (বিধিমালা)
echo [4/18] Downloading VAT Rules...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/rules/vat-rules/ban"
timeout /t 2 /nobreak >nul

echo [5/18] Downloading Income Tax Rules...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/rules/income-tax-rules/ban"
timeout /t 2 /nobreak >nul

echo [6/18] Downloading Customs Rules...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/rules/customs-rules/ban"
timeout /t 2 /nobreak >nul

echo [7/18] Downloading Excise Rules...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/rules/excise-rules/ban"
timeout /t 2 /nobreak >nul

echo [8/18] Downloading Other Relevant Rules...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/rules/other-relevant-rules/ban"
timeout /t 2 /nobreak >nul

REM SROs (এসআরও)
echo [9/18] Downloading VAT SROs...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/sros/vat-sros/ban"
timeout /t 2 /nobreak >nul

echo [10/18] Downloading Income Tax SROs...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/sros/income-tax-sros/ban"
timeout /t 2 /nobreak >nul

echo [11/18] Downloading Customs SROs...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/sros/customs-sros/ban"
timeout /t 2 /nobreak >nul

echo [12/18] Downloading Excise SROs...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/sros/excise-sros/ban"
timeout /t 2 /nobreak >nul

echo [13/18] Downloading Other Relevant SROs...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/sros/other-relevant-sros/ban"
timeout /t 2 /nobreak >nul

REM General Orders (সাধারণ আদেশ)
echo [14/18] Downloading VAT General Orders...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/gos/vat-gos/ban"
timeout /t 2 /nobreak >nul

echo [15/18] Downloading Income Tax General Orders...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/gos/income-tax-gos/ban"
timeout /t 2 /nobreak >nul

echo [16/18] Downloading Customs General Orders...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/gos/customs-gos/ban"
timeout /t 2 /nobreak >nul

echo [17/18] Downloading Excise Orders...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/gos/excise-gos/ban"
timeout /t 2 /nobreak >nul

REM Policy (নীতিমালা)
echo [18/18] Downloading Policy Documents...
set /a count+=1
python pdf_downloader.py "https://nbr.gov.bd/regulations/policy/ban"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo Complete NBR PDF Download Finished!
echo ========================================
echo.
echo All categories processed: %count%/%total%
echo.
echo File Structure:
echo downloads/
echo ├── income-tax-acts/ban/     (Tax Laws)
echo ├── vat-acts/ban/            (VAT Laws)  
echo ├── customs-acts/ban/        (Customs Laws)
echo ├── vat-rules/ban/           (VAT Rules)
echo ├── income-tax-rules/ban/    (Income Tax Rules)
echo ├── customs-rules/ban/       (Customs Rules)
echo ├── excise-rules/ban/        (Excise Rules)
echo ├── other-relevant-rules/ban/(Other Rules)
echo ├── vat-sros/ban/            (VAT SROs)
echo ├── income-tax-sros/ban/     (Income Tax SROs)
echo ├── customs-sros/ban/        (Customs SROs)
echo ├── excise-sros/ban/         (Excise SROs)
echo ├── other-relevant-sros/ban/ (Other SROs)
echo ├── vat-gos/ban/             (VAT General Orders)
echo ├── income-tax-gos/ban/      (Income Tax General Orders)
echo ├── customs-gos/ban/         (Customs General Orders)
echo ├── excise-gos/ban/          (Excise General Orders)
echo └── policy/ban/              (Policy Documents)
echo.
echo Check the downloads folder for all your PDFs!
echo This collection contains the complete Bangladesh tax law library.
echo.
pause 