"""
Basic tests for Bangla PDF OCR
"""

import pytest
import tempfile
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

from bangla_pdf_ocr import process_image, BanglaOCR
from bangla_pdf_ocr.utils import validate_file, detect_file_type, get_supported_formats


class TestUtils:
    """Test utility functions"""
    
    def test_validate_file_exists(self):
        """Test file validation with existing file"""
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(b"test content")
            tmp_path = tmp.name
        
        try:
            assert validate_file(tmp_path) is True
        finally:
            os.unlink(tmp_path)
    
    def test_validate_file_not_exists(self):
        """Test file validation with non-existent file"""
        assert validate_file("/non/existent/file.pdf") is False
    
    def test_detect_file_type(self):
        """Test file type detection"""
        assert detect_file_type("document.pdf") == "pdf"
        assert detect_file_type("image.jpg") == "image"
        assert detect_file_type("image.png") == "image"
        assert detect_file_type("unknown.xyz") is None
    
    def test_get_supported_formats(self):
        """Test supported formats retrieval"""
        formats = get_supported_formats()
        assert "pdf" in formats
        assert "image" in formats
        assert ".pdf" in formats["pdf"]
        assert ".jpg" in formats["image"]


class TestBanglaOCR:
    """Test BanglaOCR class"""
    
    def test_initialization(self):
        """Test OCR initialization"""
        ocr = BanglaOCR()
        assert ocr.config is not None
        assert "dpi" in ocr.config
    
    def test_initialization_with_config(self):
        """Test OCR initialization with custom config"""
        custom_config = {"dpi": 600, "custom_param": "test"}
        ocr = BanglaOCR(config=custom_config)
        assert ocr.config["dpi"] == 600
        assert ocr.config["custom_param"] == "test"
    
    def test_clean_text(self):
        """Test text cleaning functionality"""
        ocr = BanglaOCR()
        
        # Test with empty text
        assert ocr._clean_text("") == ""
        
        # Test with whitespace
        test_text = "  Line 1  \n  \n  Line 2  \n  "
        cleaned = ocr._clean_text(test_text)
        assert cleaned == "Line 1\nLine 2"


class TestImageProcessing:
    """Test image processing functionality"""
    
    def create_test_image(self, text="Test", size=(200, 100)):
        """Create a test image with text"""
        image = Image.new('RGB', size, color='white')
        draw = ImageDraw.Draw(image)
        
        # Try to use a font, fallback to default if not available
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()
        
        draw.text((10, 10), text, fill='black', font=font)
        return image
    
    def test_process_image_with_temporary_file(self):
        """Test image processing with temporary file"""
        # Create test image
        image = self.create_test_image("Hello World")
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            image.save(tmp.name)
            tmp_path = tmp.name
        
        try:
            # This test might fail if Tesseract is not properly installed
            # In that case, we catch the exception and skip the test
            try:
                text = process_image(tmp_path)
                assert isinstance(text, str)
            except RuntimeError as e:
                if "Tesseract OCR engine not found" in str(e):
                    pytest.skip("Tesseract not installed")
                else:
                    raise
        finally:
            os.unlink(tmp_path)
    
    def test_process_image_file_not_found(self):
        """Test image processing with non-existent file"""
        with pytest.raises(ValueError, match="Invalid image file"):
            process_image("/non/existent/image.jpg")


class TestConfiguration:
    """Test configuration handling"""
    
    def test_default_config_values(self):
        """Test default configuration values"""
        from bangla_pdf_ocr.config import DEFAULT_CONFIG
        
        assert "dpi" in DEFAULT_CONFIG
        assert "preprocessing" in DEFAULT_CONFIG
        assert DEFAULT_CONFIG["dpi"] == 300
        assert DEFAULT_CONFIG["preprocessing"]["enhance_contrast"] is True
    
    def test_bangla_psm_config(self):
        """Test Bangla PSM configuration"""
        from bangla_pdf_ocr.config import BANGLA_PSM_CONFIG
        
        assert "config" in BANGLA_PSM_CONFIG
        assert "--psm" in BANGLA_PSM_CONFIG["config"]


if __name__ == "__main__":
    pytest.main([__file__])