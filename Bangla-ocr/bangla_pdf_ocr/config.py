"""
Configuration settings for Bangla PDF OCR
"""

import os
from typing import Dict, Any

# Default configuration
DEFAULT_CONFIG: Dict[str, Any] = {
    'dpi': 300,
    'log_level': 'INFO',
    'preprocessing': {
        'enhance_contrast': True,
        'denoise': True,
        'resize_factor': 2.0,
        'grayscale': True,
    },
    'tesseract': {
        'timeout': 30,
        'nice': 0,
    }
}

# Bangla-specific PSM (Page Segmentation Mode) configuration
BANGLA_PSM_CONFIG: Dict[str, Any] = {
    'config': '--psm 6 -c tessedit_char_whitelist=০১২৩৪৫৬৭৮৯'
              'অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়ৎংঃৃৄৢৣৗৈািীুূৃৄৄৃৗৈৌৃৄৌৗৈেৌৗৈেৄৃৄৃৄৌৗৈে'
              'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
              '.,!?;:()[]{}"\'-/\\|@#$%^&*+=<>~`'
}

# Tesseract installation URLs
TESSERACT_URLS: Dict[str, str] = {
    'windows': 'https://github.com/UB-Mannheim/tesseract/releases/download/v5.3.0.20221222/tesseract-ocr-w64-setup-5.3.0.20221222.exe',
    'macos': 'https://github.com/tesseract-ocr/tesseract/releases',
    'linux': 'https://github.com/tesseract-ocr/tesseract/releases'
}

# Bangla trained data URL
BANGLA_TRAINEDDATA_URL = 'https://github.com/tesseract-ocr/tessdata/raw/main/ben.traineddata'

# Data directories
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
TESSDATA_DIR = os.path.join(DATA_DIR, 'tessdata')

# Create data directories if they don't exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(TESSDATA_DIR, exist_ok=True)