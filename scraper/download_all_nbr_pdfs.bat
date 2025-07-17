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
python pdf_downloader.py "https://nbr.gov.bd/regulations/acts/finance-acts/ban"
timeout /t 2 /nobreak >nul

@REM echo [2/18] Downloading VAT Acts...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/acts/vat-acts/ban"
@REM timeout /t 2 /nobreak >nul

@REM echo [3/18] Downloading Customs Acts...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/acts/customs-acts/ban"
@REM timeout /t 2 /nobreak >nul

@REM REM Rules (বিধিমালা)
@REM echo [4/18] Downloading VAT Rules...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/rules/vat-rules/ban"
@REM timeout /t 2 /nobreak >nul

@REM echo [5/18] Downloading Income Tax Rules...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/rules/income-tax-rules/ban"
@REM timeout /t 2 /nobreak >nul

@REM echo [6/18] Downloading Customs Rules...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/rules/customs-rules/ban"
@REM timeout /t 2 /nobreak >nul

@REM echo [7/18] Downloading Excise Rules...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/rules/excise-rules/ban"
@REM timeout /t 2 /nobreak >nul

@REM echo [8/18] Downloading Other Relevant Rules...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/rules/other-relevant-rules/ban"
@REM timeout /t 2 /nobreak >nul

@REM REM SROs (এসআরও)
@REM echo [9/18] Downloading VAT SROs...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/sros/vat-sros/ban"
@REM timeout /t 2 /nobreak >nul

@REM echo [10/18] Downloading Income Tax SROs...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/sros/income-tax-sros/ban"
@REM timeout /t 2 /nobreak >nul

@REM echo [11/18] Downloading Customs SROs...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/sros/customs-sros/ban"
@REM timeout /t 2 /nobreak >nul

@REM echo [12/18] Downloading Excise SROs...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/sros/excise-sros/ban"
@REM timeout /t 2 /nobreak >nul

@REM echo [13/18] Downloading Other Relevant SROs...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/sros/other-relevant-sros/ban"
@REM timeout /t 2 /nobreak >nul

@REM REM General Orders (সাধারণ আদেশ)
@REM echo [14/18] Downloading VAT General Orders...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/gos/vat-gos/ban"
@REM timeout /t 2 /nobreak >nul

@REM echo [15/18] Downloading Income Tax General Orders...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/gos/income-tax-gos/ban"
@REM timeout /t 2 /nobreak >nul

@REM echo [16/18] Downloading Customs General Orders...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/gos/customs-gos/ban"
@REM timeout /t 2 /nobreak >nul

@REM echo [17/18] Downloading Excise Orders...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/gos/excise-gos/ban"
@REM timeout /t 2 /nobreak >nul

@REM REM Policy (নীতিমালা)
@REM echo [18/18] Downloading Policy Documents...
@REM set /a count+=1
@REM python pdf_downloader.py "https://nbr.gov.bd/regulations/policy/ban"
@REM timeout /t 2 /nobreak >nul

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