#!/bin/bash
# Development installation script for Bangla PDF OCR

echo "🔧 Installing Bangla PDF OCR in development mode..."
echo "=" * 50

# Install in development mode
pip install -e .

echo "Installing development dependencies..."
pip install pytest black flake8 mypy

echo "=" * 50
echo "🎉 Development installation complete!"
echo
echo "To test the package:"
echo "  python test_package.py"
echo
echo "To run the CLI:"
echo "  bangla-pdf-ocr-setup"
echo "  bangla-pdf-ocr input.pdf"
echo
echo "To run tests:"
echo "  pytest tests/"