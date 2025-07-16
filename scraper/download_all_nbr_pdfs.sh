#!/bin/bash

echo "NBR Complete PDF Downloader"
echo "==========================="
echo "This will download all PDFs from NBR regulations, rules, SROs, and orders"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    echo "Please install Python 3 first"
    exit 1
fi

# Install requirements if needed
if [ ! -d "downloads" ]; then
    mkdir downloads
fi

echo "Installing requirements..."
pip3 install -r requirements.txt

echo ""
echo "Starting comprehensive NBR PDF download..."
echo "This may take a while as there are many categories to process."
echo ""

# Counter for tracking progress
count=0
total=18

# Acts (Laws)
echo "[1/18] Downloading Income Tax Acts..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/acts/income-tax-acts/ban"
sleep 2

echo "[2/18] Downloading VAT Acts..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/acts/vat-acts/ban"
sleep 2

echo "[3/18] Downloading Customs Acts..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/acts/customs-acts/ban"
sleep 2

# Rules (বিধিমালা)
echo "[4/18] Downloading VAT Rules..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/rules/vat-rules/ban"
sleep 2

echo "[5/18] Downloading Income Tax Rules..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/rules/income-tax-rules/ban"
sleep 2

echo "[6/18] Downloading Customs Rules..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/rules/customs-rules/ban"
sleep 2

echo "[7/18] Downloading Excise Rules..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/rules/excise-rules/ban"
sleep 2

echo "[8/18] Downloading Other Relevant Rules..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/rules/other-relevant-rules/ban"
sleep 2

# SROs (এসআরও)
echo "[9/18] Downloading VAT SROs..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/sros/vat-sros/ban"
sleep 2

echo "[10/18] Downloading Income Tax SROs..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/sros/income-tax-sros/ban"
sleep 2

echo "[11/18] Downloading Customs SROs..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/sros/customs-sros/ban"
sleep 2

echo "[12/18] Downloading Excise SROs..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/sros/excise-sros/ban"
sleep 2

echo "[13/18] Downloading Other Relevant SROs..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/sros/other-relevant-sros/ban"
sleep 2

# General Orders (সাধারণ আদেশ)
echo "[14/18] Downloading VAT General Orders..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/gos/vat-gos/ban"
sleep 2

echo "[15/18] Downloading Income Tax General Orders..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/gos/income-tax-gos/ban"
sleep 2

echo "[16/18] Downloading Customs General Orders..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/gos/customs-gos/ban"
sleep 2

echo "[17/18] Downloading Excise Orders..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/gos/excise-gos/ban"
sleep 2

# Policy (নীতিমালা)
echo "[18/18] Downloading Policy Documents..."
((count++))
python3 pdf_downloader.py "https://nbr.gov.bd/regulations/policy/ban"
sleep 2

echo ""
echo "========================================"
echo "Complete NBR PDF Download Finished!"
echo "========================================"
echo ""
echo "All categories processed: $count/$total"
echo ""
echo "File Structure:"
echo "downloads/"
echo "├── income-tax-acts/ban/     (Tax Laws)"
echo "├── vat-acts/ban/            (VAT Laws)"
echo "├── customs-acts/ban/        (Customs Laws)"
echo "├── vat-rules/ban/           (VAT Rules)"
echo "├── income-tax-rules/ban/    (Income Tax Rules)"
echo "├── customs-rules/ban/       (Customs Rules)"
echo "├── excise-rules/ban/        (Excise Rules)"
echo "├── other-relevant-rules/ban/(Other Rules)"
echo "├── vat-sros/ban/            (VAT SROs)"
echo "├── income-tax-sros/ban/     (Income Tax SROs)"
echo "├── customs-sros/ban/        (Customs SROs)"
echo "├── excise-sros/ban/         (Excise SROs)"
echo "├── other-relevant-sros/ban/ (Other SROs)"
echo "├── vat-gos/ban/             (VAT General Orders)"
echo "├── income-tax-gos/ban/      (Income Tax General Orders)"
echo "├── customs-gos/ban/         (Customs General Orders)"
echo "├── excise-gos/ban/          (Excise General Orders)"
echo "└── policy/ban/              (Policy Documents)"
echo ""
echo "Check the downloads folder for all your PDFs!"
echo "This collection contains the complete Bangladesh tax law library."
echo "" 