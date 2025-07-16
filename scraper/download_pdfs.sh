#!/bin/bash

echo "NBR PDF Downloader"
echo "=================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    echo "Please install Python 3 first"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "Installing requirements..."
pip install -r requirements.txt

# Create downloads directory
mkdir -p downloads

echo ""
echo "Available NBR URLs:"
echo "1. Income Tax Acts: https://nbr.gov.bd/regulations/acts/income-tax-acts/ban"
echo "2. VAT Acts: https://nbr.gov.bd/regulations/acts/vat-acts/ban"
echo "3. Customs Acts: https://nbr.gov.bd/regulations/acts/customs-acts/ban"
echo "4. Custom URL"
echo ""

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        url="https://nbr.gov.bd/regulations/acts/income-tax-acts/ban"
        ;;
    2)
        url="https://nbr.gov.bd/regulations/acts/vat-acts/ban"
        ;;
    3)
        url="https://nbr.gov.bd/regulations/acts/customs-acts/ban"
        ;;
    4)
        read -p "Enter the URL: " url
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "Downloading PDFs from: $url"
echo ""

python3 pdf_downloader.py "$url"

echo ""
echo "Download completed!"
echo "Check the downloads folder for your files." 