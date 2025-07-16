"""
Utility functions for Bangla PDF OCR
"""

import os
import logging
from typing import Dict, Any, Optional
from pathlib import Path

import numpy as np
import cv2
from PIL import Image, ImageEnhance, ImageFilter


def setup_logging(level: str = 'INFO'):
    """
    Set up logging configuration
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
    """
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
        ]
    )


def validate_file(file_path: str) -> bool:
    """
    Validate if the file exists and is readable
    
    Args:
        file_path: Path to the file
        
    Returns:
        True if file is valid, False otherwise
    """
    path = Path(file_path)
    return path.exists() and path.is_file() and os.access(file_path, os.R_OK)


def preprocess_image(image: Image.Image, config: Dict[str, Any]) -> Image.Image:
    """
    Preprocess image for better OCR results
    
    Args:
        image: PIL Image object
        config: Configuration dictionary
        
    Returns:
        Preprocessed PIL Image
    """
    preprocessing_config = config.get('preprocessing', {})
    
    # Convert to grayscale if specified
    if preprocessing_config.get('grayscale', True):
        image = image.convert('L')
    
    # Resize image for better OCR
    resize_factor = preprocessing_config.get('resize_factor', 2.0)
    if resize_factor != 1.0:
        new_size = (int(image.width * resize_factor), int(image.height * resize_factor))
        image = image.resize(new_size, Image.LANCZOS)
    
    # Enhance contrast
    if preprocessing_config.get('enhance_contrast', True):
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)
    
    # Denoise
    if preprocessing_config.get('denoise', True):
        image = image.filter(ImageFilter.MedianFilter(size=3))
    
    # Convert to numpy array for OpenCV processing
    img_array = np.array(image)
    
    # Apply adaptive thresholding for better text extraction
    if len(img_array.shape) == 2:  # Grayscale
        img_array = cv2.adaptiveThreshold(
            img_array,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            2
        )
    
    # Convert back to PIL Image
    return Image.fromarray(img_array)


def get_supported_formats() -> Dict[str, list]:
    """
    Get supported file formats
    
    Returns:
        Dictionary with supported formats
    """
    return {
        'pdf': ['.pdf'],
        'image': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.gif', '.webp']
    }


def detect_file_type(file_path: str) -> Optional[str]:
    """
    Detect file type based on extension
    
    Args:
        file_path: Path to the file
        
    Returns:
        File type ('pdf' or 'image') or None if unsupported
    """
    supported_formats = get_supported_formats()
    file_ext = Path(file_path).suffix.lower()
    
    if file_ext in supported_formats['pdf']:
        return 'pdf'
    elif file_ext in supported_formats['image']:
        return 'image'
    else:
        return None


def format_text_output(text: str, output_format: str = 'plain') -> str:
    """
    Format text output based on specified format
    
    Args:
        text: Raw text to format
        output_format: Output format ('plain', 'markdown', 'json')
        
    Returns:
        Formatted text
    """
    if output_format == 'markdown':
        # Simple markdown formatting
        lines = text.split('\n')
        formatted_lines = []
        for line in lines:
            if line.strip():
                if line.startswith('---'):
                    formatted_lines.append(f"## {line}")
                else:
                    formatted_lines.append(line)
        return '\n'.join(formatted_lines)
    
    elif output_format == 'json':
        import json
        return json.dumps({'text': text, 'length': len(text)}, ensure_ascii=False, indent=2)
    
    else:  # plain text
        return text