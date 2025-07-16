#!/usr/bin/env python3
"""
Setup script to install Tesseract OCR and Bengali language pack on Windows
"""

import os
import sys
import subprocess
import urllib.request
import zipfile
import tempfile
from pathlib import Path

def download_file(url, filename):
    """Download a file with progress"""
    print(f"📥 Downloading {filename}...")
    try:
        urllib.request.urlretrieve(url, filename)
        print(f"✓ Downloaded: {filename}")
        return True
    except Exception as e:
        print(f"❌ Download failed: {e}")
        return False

def install_tesseract_windows():
    """Install Tesseract on Windows"""
    print("\n🔧 Installing Tesseract OCR for Windows...")
    
    # Tesseract installer URL
    tesseract_url = "https://github.com/UB-Mannheim/tesseract/releases/download/v5.3.0.20221214/tesseract-ocr-w64-setup-5.3.0.20221214.exe"
    installer_path = "tesseract-installer.exe"
    
    # Download installer
    if not download_file(tesseract_url, installer_path):
        print("❌ Failed to download Tesseract installer")
        return False
    
    print("📋 Instructions for Tesseract installation:")
    print("1. Run the installer that was downloaded")
    print("2. Install to default location (C:\\Program Files\\Tesseract-OCR\\)")
    print("3. Make sure to check 'Add to PATH' during installation")
    print("4. Select 'Additional language data' and choose Bengali")
    
    # Try to run installer
    try:
        subprocess.run([installer_path], check=False)
        print("✓ Installer launched. Please complete the installation.")
        return True
    except Exception as e:
        print(f"❌ Could not launch installer: {e}")
        print(f"Please manually run: {installer_path}")
        return False

def download_bengali_traineddata():
    """Download Bengali language pack"""
    print("\n🔤 Downloading Bengali language pack...")
    
    # Bengali traineddata URL
    bengali_url = "https://github.com/tesseract-ocr/tessdata/raw/main/ben.traineddata"
    
    # Find Tesseract installation directory
    possible_paths = [
        r"C:\Program Files\Tesseract-OCR\tessdata",
        r"C:\Program Files (x86)\Tesseract-OCR\tessdata",
        r"C:\Users\{}\AppData\Local\Tesseract-OCR\tessdata".format(os.environ.get('USERNAME', '')),
    ]
    
    tessdata_path = None
    for path in possible_paths:
        if os.path.exists(path):
            tessdata_path = path
            break
    
    if not tessdata_path:
        print("❌ Tesseract tessdata directory not found. Please install Tesseract first.")
        print("Expected locations:")
        for path in possible_paths:
            print(f"  - {path}")
        return False
    
    print(f"✓ Found tessdata directory: {tessdata_path}")
    
    # Download Bengali traineddata
    bengali_file = os.path.join(tessdata_path, "ben.traineddata")
    
    if os.path.exists(bengali_file):
        print("✓ Bengali language pack already exists")
        return True
    
    try:
        download_file(bengali_url, bengali_file)
        print("✓ Bengali language pack installed")
        return True
    except Exception as e:
        print(f"❌ Failed to install Bengali language pack: {e}")
        return False

def test_installation():
    """Test if Tesseract and Bengali are working"""
    print("\n🧪 Testing Tesseract installation...")
    
    try:
        import pytesseract
        
        # Test version
        version = pytesseract.get_tesseract_version()
        print(f"✓ Tesseract version: {version}")
        
        # Test languages
        languages = pytesseract.get_languages()
        print(f"✓ Available languages: {languages}")
        
        if 'ben' in languages:
            print("✓ Bengali language pack working")
        else:
            print("❌ Bengali language pack not found")
            
        if 'eng' in languages:
            print("✓ English language pack working")
        else:
            print("⚠️ English language pack not found")
            
        return 'ben' in languages
        
    except Exception as e:
        print(f"❌ Tesseract test failed: {e}")
        return False

def create_quick_test():
    """Create a quick OCR test script"""
    print("\n📝 Creating quick test script...")
    
    test_script = """#!/usr/bin/env python3
import pytesseract
from PIL import Image, ImageDraw, ImageFont

def quick_ocr_test():
    # Create test image
    img = Image.new('RGB', (400, 100), color='white')
    draw = ImageDraw.Draw(img)
    
    # Add Bengali text
    text = "আয়কর আইন ২০২৩"
    try:
        font = ImageFont.truetype("arial.ttf", 30)
    except:
        font = ImageFont.load_default()
    
    draw.text((20, 30), text, fill='black', font=font)
    img.save("test_bengali.png")
    print("✓ Test image created: test_bengali.png")
    
    # Test OCR
    result = pytesseract.image_to_string(img, config='--psm 6 -l ben+eng')
    print(f"OCR Result: '{result.strip()}'")
    
    if result.strip():
        print("✅ OCR is working!")
        return True
    else:
        print("❌ OCR returned empty result")
        return False

if __name__ == "__main__":
    quick_ocr_test()
"""
    
    with open("quick_test.py", "w", encoding="utf-8") as f:
        f.write(test_script)
    
    print("✓ Quick test script created: quick_test.py")
    print("Run with: python quick_test.py")

def main():
    """Main setup function"""
    print("🔧 Tesseract OCR Setup for Bangladesh Tax Documents")
    print("=" * 60)
    
    print("\n📋 This script will help you install:")
    print("1. Tesseract OCR engine")
    print("2. Bengali language pack")
    print("3. Test the installation")
    
    # Check if Windows
    if sys.platform != "win32":
        print("❌ This script is designed for Windows only.")
        print("For other OS, please install manually:")
        print("- Ubuntu/Debian: sudo apt-get install tesseract-ocr tesseract-ocr-ben")
        print("- macOS: brew install tesseract tesseract-lang")
        return
    
    # Step 1: Install Tesseract
    print("\n" + "="*60)
    print("STEP 1: Install Tesseract OCR")
    print("="*60)
    
    user_input = input("Do you want to download and install Tesseract? (y/n): ").strip().lower()
    if user_input == 'y':
        install_tesseract_windows()
        print("\n⏳ Please complete the Tesseract installation and come back here.")
        input("Press Enter when installation is complete...")
    
    # Step 2: Install Bengali language pack
    print("\n" + "="*60)
    print("STEP 2: Install Bengali Language Pack")
    print("="*60)
    
    download_bengali_traineddata()
    
    # Step 3: Test installation
    print("\n" + "="*60)
    print("STEP 3: Test Installation")
    print("="*60)
    
    if test_installation():
        print("\n✅ Installation successful!")
        create_quick_test()
        print("\n🎉 You can now run OCR on your PDF files!")
        print("Next steps:")
        print("1. Run: python quick_test.py")
        print("2. Run: python simple_ocr_test.py")
    else:
        print("\n❌ Installation incomplete. Please check the errors above.")

if __name__ == "__main__":
    main() 