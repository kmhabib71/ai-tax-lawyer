"""
Bangla PDF OCR - One-command Bangla OCR solution

A pip package that wraps Tesseract + layout analysis for Bangla.
Works on Windows, macOS, Linux without manual Tesseract installs.
"""

from .core import process_pdf, process_image, BanglaOCR
from .installer import setup_tesseract, download_traineddata
from .cli import main as cli_main

__version__ = "1.0.0"
__author__ = "AI Tax Lawyer Team"
__description__ = "One-command Bangla OCR solution with Tesseract"

__all__ = [
    'process_pdf',
    'process_image', 
    'BanglaOCR',
    'setup_tesseract',
    'download_traineddata',
    'cli_main'
]