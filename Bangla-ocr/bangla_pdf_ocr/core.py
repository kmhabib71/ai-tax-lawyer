"""
Core OCR functionality for Bangla PDF OCR
"""

import os
import sys
import tempfile
import logging
from typing import List, Optional, Dict, Any
from pathlib import Path

import pytesseract
from PIL import Image
import numpy as np
import cv2
from pdf2image import convert_from_path

from .utils import setup_logging, validate_file, preprocess_image
from .config import DEFAULT_CONFIG, BANGLA_PSM_CONFIG

logger = logging.getLogger(__name__)


class BanglaOCR:
    """
    Main OCR class for processing Bangla documents
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize BanglaOCR with configuration
        
        Args:
            config: Configuration dictionary for OCR settings
        """
        self.config = {**DEFAULT_CONFIG, **(config or {})}
        self.setup_tesseract()
        setup_logging(self.config.get('log_level', 'INFO'))
        
    def setup_tesseract(self):
        """Set up Tesseract OCR engine"""
        try:
            # Try to find tesseract executable
            if sys.platform.startswith('win'):
                possible_paths = [
                    r'C:\Program Files\Tesseract-OCR\tesseract.exe',
                    r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
                    r'C:\Users\{}\AppData\Local\Tesseract-OCR\tesseract.exe'.format(os.environ.get('USERNAME', '')),
                ]
                for path in possible_paths:
                    if os.path.exists(path):
                        pytesseract.pytesseract.tesseract_cmd = path
                        break
            
            # Test if tesseract is available
            pytesseract.get_tesseract_version()
            logger.info("Tesseract OCR engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Tesseract: {e}")
            raise RuntimeError("Tesseract OCR engine not found. Please run 'bangla-pdf-ocr-setup' first.")
    
    def process_image(self, image_path: str, **kwargs) -> str:
        """
        Process a single image file
        
        Args:
            image_path: Path to the image file
            **kwargs: Additional OCR parameters
            
        Returns:
            Extracted text from the image
        """
        if not validate_file(image_path):
            raise ValueError(f"Invalid image file: {image_path}")
        
        try:
            # Load and preprocess image
            image = Image.open(image_path)
            processed_image = preprocess_image(image, self.config)
            
            # Configure OCR parameters
            ocr_config = {**BANGLA_PSM_CONFIG, **kwargs}
            
            # Perform OCR
            text = pytesseract.image_to_string(
                processed_image,
                lang='ben+eng',  # Bangla + English
                config=ocr_config.get('config', '--psm 6')
            )
            
            return self._clean_text(text)
            
        except Exception as e:
            logger.error(f"Error processing image {image_path}: {e}")
            raise
    
    def process_pdf(self, pdf_path: str, **kwargs) -> str:
        """
        Process a PDF file
        
        Args:
            pdf_path: Path to the PDF file
            **kwargs: Additional OCR parameters
            
        Returns:
            Extracted text from all pages
        """
        if not validate_file(pdf_path):
            raise ValueError(f"Invalid PDF file: {pdf_path}")
        
        try:
            # Convert PDF to images
            images = convert_from_path(
                pdf_path,
                dpi=self.config.get('dpi', 300),
                first_page=kwargs.get('first_page'),
                last_page=kwargs.get('last_page')
            )
            
            all_text = []
            
            for i, image in enumerate(images):
                logger.info(f"Processing page {i+1}/{len(images)}")
                
                # Preprocess image
                processed_image = preprocess_image(image, self.config)
                
                # Configure OCR parameters
                ocr_config = {**BANGLA_PSM_CONFIG, **kwargs}
                
                # Perform OCR
                text = pytesseract.image_to_string(
                    processed_image,
                    lang='ben+eng',  # Bangla + English
                    config=ocr_config.get('config', '--psm 6')
                )
                
                cleaned_text = self._clean_text(text)
                if cleaned_text.strip():
                    all_text.append(f"--- Page {i+1} ---\n{cleaned_text}")
            
            return '\n\n'.join(all_text)
            
        except Exception as e:
            logger.error(f"Error processing PDF {pdf_path}: {e}")
            raise
    
    def _clean_text(self, text: str) -> str:
        """
        Clean and post-process extracted text
        
        Args:
            text: Raw OCR text
            
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        # Remove extra whitespace
        text = '\n'.join(line.strip() for line in text.split('\n') if line.strip())
        
        # Apply custom cleaning rules for Bangla text
        # Add more cleaning rules as needed
        
        return text


def process_pdf(pdf_path: str, **kwargs) -> str:
    """
    Convenience function to process a PDF file
    
    Args:
        pdf_path: Path to the PDF file
        **kwargs: Additional OCR parameters
        
    Returns:
        Extracted text from the PDF
    """
    ocr = BanglaOCR()
    return ocr.process_pdf(pdf_path, **kwargs)


def process_image(image_path: str, **kwargs) -> str:
    """
    Convenience function to process an image file
    
    Args:
        image_path: Path to the image file
        **kwargs: Additional OCR parameters
        
    Returns:
        Extracted text from the image
    """
    ocr = BanglaOCR()
    return ocr.process_image(image_path, **kwargs)