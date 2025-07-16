#!/usr/bin/env python3
"""
Test script to verify the Bangla PDF OCR package
"""

import sys
import os
from pathlib import Path

# Add the package to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '.'))

def test_imports():
    """Test that all modules can be imported"""
    try:
        from bangla_pdf_ocr import process_pdf, process_image, BanglaOCR
        from bangla_pdf_ocr.core import BanglaOCR
        from bangla_pdf_ocr.config import DEFAULT_CONFIG
        from bangla_pdf_ocr.utils import validate_file, detect_file_type
        from bangla_pdf_ocr.cli import main as cli_main
        from bangla_pdf_ocr.installer import setup_main
        print("✓ All imports successful")
        return True
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False

def test_configuration():
    """Test configuration loading"""
    try:
        from bangla_pdf_ocr.config import DEFAULT_CONFIG, BANGLA_PSM_CONFIG
        assert 'dpi' in DEFAULT_CONFIG
        assert 'preprocessing' in DEFAULT_CONFIG
        assert 'config' in BANGLA_PSM_CONFIG
        print("✓ Configuration tests passed")
        return True
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False

def test_utils():
    """Test utility functions"""
    try:
        from bangla_pdf_ocr.utils import validate_file, detect_file_type, get_supported_formats
        
        # Test file type detection
        assert detect_file_type("test.pdf") == "pdf"
        assert detect_file_type("test.jpg") == "image"
        assert detect_file_type("test.xyz") is None
        
        # Test supported formats
        formats = get_supported_formats()
        assert "pdf" in formats
        assert "image" in formats
        
        print("✓ Utility function tests passed")
        return True
    except Exception as e:
        print(f"❌ Utility test failed: {e}")
        return False

def test_ocr_initialization():
    """Test OCR class initialization"""
    try:
        from bangla_pdf_ocr import BanglaOCR
        
        # Test default initialization
        ocr = BanglaOCR()
        assert ocr.config is not None
        
        # Test custom config
        custom_config = {"dpi": 600, "test_param": "value"}
        ocr2 = BanglaOCR(config=custom_config)
        assert ocr2.config["dpi"] == 600
        assert ocr2.config["test_param"] == "value"
        
        print("✓ OCR initialization tests passed")
        return True
    except Exception as e:
        print(f"❌ OCR initialization test failed: {e}")
        return False

def test_cli_help():
    """Test CLI help functionality"""
    try:
        from bangla_pdf_ocr.cli import create_parser
        
        parser = create_parser()
        assert parser is not None
        
        # Test that help can be generated
        help_text = parser.format_help()
        assert "bangla-pdf-ocr" in help_text
        
        print("✓ CLI help tests passed")
        return True
    except Exception as e:
        print(f"❌ CLI test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Bangla PDF OCR Package")
    print("=" * 40)
    
    tests = [
        test_imports,
        test_configuration,
        test_utils,
        test_ocr_initialization,
        test_cli_help
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        if test():
            passed += 1
        else:
            failed += 1
    
    print("=" * 40)
    print(f"Tests passed: {passed}")
    print(f"Tests failed: {failed}")
    
    if failed == 0:
        print("🎉 All tests passed! Package is ready to use.")
        return 0
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())