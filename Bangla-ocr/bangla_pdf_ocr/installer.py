"""
Setup script for Bangla PDF OCR
Auto-downloads and configures Tesseract and trained data
"""

import os
import sys
import platform
import subprocess
import urllib.request
import zipfile
import tempfile
import shutil
from pathlib import Path
from typing import Optional

import requests
from tqdm import tqdm

from .config import TESSERACT_URLS, BANGLA_TRAINEDDATA_URL, TESSDATA_DIR, DATA_DIR


class TesseractSetup:
    """Handle Tesseract installation and configuration"""
    
    def __init__(self):
        self.system = platform.system().lower()
        self.tessdata_dir = TESSDATA_DIR
        
    def setup_tesseract(self, force: bool = False) -> bool:
        """
        Set up Tesseract OCR engine
        
        Args:
            force: Force reinstallation even if already installed
            
        Returns:
            True if setup successful, False otherwise
        """
        try:
            # Check if Tesseract is already installed
            if not force and self._is_tesseract_installed():
                print("✓ Tesseract is already installed")
                return True
            
            print("Setting up Tesseract OCR engine...")
            
            if self.system == 'windows':
                return self._setup_windows()
            elif self.system == 'darwin':  # macOS
                return self._setup_macos()
            elif self.system == 'linux':
                return self._setup_linux()
            else:
                print(f"❌ Unsupported system: {self.system}")
                return False
                
        except Exception as e:
            print(f"❌ Error setting up Tesseract: {e}")
            return False
    
    def _is_tesseract_installed(self) -> bool:
        """Check if Tesseract is installed and working"""
        try:
            import pytesseract
            pytesseract.get_tesseract_version()
            return True
        except:
            return False
    
    def _setup_windows(self) -> bool:
        """Set up Tesseract on Windows"""
        print("Setting up Tesseract for Windows...")
        
        # Try to install using winget first
        try:
            subprocess.run(['winget', 'install', 'UB-Mannheim.TesseractOCR'], 
                         check=True, capture_output=True)
            print("✓ Tesseract installed using winget")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass
        
        # Try chocolatey
        try:
            subprocess.run(['choco', 'install', 'tesseract'], 
                         check=True, capture_output=True)
            print("✓ Tesseract installed using chocolatey")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass
        
        # Manual installation instructions
        print("""
❌ Automatic installation failed. Please install Tesseract manually:

1. Download Tesseract from: https://github.com/UB-Mannheim/tesseract/releases
2. Run the installer as administrator
3. Add Tesseract to your PATH environment variable
4. Run 'bangla-pdf-ocr-setup' again

Or install using package managers:
- winget: winget install UB-Mannheim.TesseractOCR
- chocolatey: choco install tesseract
        """)
        return False
    
    def _setup_macos(self) -> bool:
        """Set up Tesseract on macOS"""
        print("Setting up Tesseract for macOS...")
        
        # Try homebrew
        try:
            subprocess.run(['brew', 'install', 'tesseract'], 
                         check=True, capture_output=True)
            print("✓ Tesseract installed using homebrew")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass
        
        # Try MacPorts
        try:
            subprocess.run(['sudo', 'port', 'install', 'tesseract'], 
                         check=True, capture_output=True)
            print("✓ Tesseract installed using MacPorts")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass
        
        print("""
❌ Automatic installation failed. Please install Tesseract manually:

1. Install Homebrew: https://brew.sh/
2. Run: brew install tesseract
3. Run 'bangla-pdf-ocr-setup' again

Or use MacPorts:
1. Install MacPorts: https://www.macports.org/
2. Run: sudo port install tesseract
        """)
        return False
    
    def _setup_linux(self) -> bool:
        """Set up Tesseract on Linux"""
        print("Setting up Tesseract for Linux...")
        
        # Try different package managers
        package_managers = [
            (['apt-get', 'update'], ['apt-get', 'install', '-y', 'tesseract-ocr']),
            (['yum', 'install', '-y', 'tesseract']),
            (['dnf', 'install', '-y', 'tesseract']),
            (['pacman', '-S', '--noconfirm', 'tesseract']),
            (['zypper', 'install', '-y', 'tesseract-ocr']),
        ]
        
        for commands in package_managers:
            try:
                if len(commands) == 2:  # Update and install
                    subprocess.run(commands[0], check=True, capture_output=True)
                    subprocess.run(commands[1], check=True, capture_output=True)
                else:  # Just install
                    subprocess.run(commands[0], check=True, capture_output=True)
                print("✓ Tesseract installed using system package manager")
                return True
            except (subprocess.CalledProcessError, FileNotFoundError):
                continue
        
        print("""
❌ Automatic installation failed. Please install Tesseract manually:

Ubuntu/Debian: sudo apt-get install tesseract-ocr
CentOS/RHEL: sudo yum install tesseract
Fedora: sudo dnf install tesseract
Arch: sudo pacman -S tesseract
openSUSE: sudo zypper install tesseract-ocr
        """)
        return False


def download_traineddata(force: bool = False) -> bool:
    """
    Download Bangla trained data for Tesseract
    
    Args:
        force: Force download even if file exists
        
    Returns:
        True if download successful, False otherwise
    """
    try:
        bengali_file = os.path.join(TESSDATA_DIR, 'ben.traineddata')
        english_file = os.path.join(TESSDATA_DIR, 'eng.traineddata')
        
        # Download Bengali trained data
        if force or not os.path.exists(bengali_file):
            print("Downloading Bengali trained data...")
            _download_file(BANGLA_TRAINEDDATA_URL, bengali_file)
            print("✓ Bengali trained data downloaded")
        else:
            print("✓ Bengali trained data already exists")
        
        # Download English trained data (fallback)
        if force or not os.path.exists(english_file):
            print("Downloading English trained data...")
            eng_url = 'https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata'
            _download_file(eng_url, english_file)
            print("✓ English trained data downloaded")
        else:
            print("✓ English trained data already exists")
        
        # Set TESSDATA_PREFIX environment variable
        _set_tessdata_prefix()
        
        return True
        
    except Exception as e:
        print(f"❌ Error downloading trained data: {e}")
        return False


def _download_file(url: str, filepath: str):
    """Download file with progress bar"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    total_size = int(response.headers.get('content-length', 0))
    
    with open(filepath, 'wb') as f, tqdm(
        desc=os.path.basename(filepath),
        total=total_size,
        unit='B',
        unit_scale=True,
        unit_divisor=1024,
    ) as pbar:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
            pbar.update(len(chunk))


def _set_tessdata_prefix():
    """Set TESSDATA_PREFIX environment variable"""
    try:
        # Try to set in current environment
        os.environ['TESSDATA_PREFIX'] = DATA_DIR
        
        # For Windows, try to set system-wide
        if platform.system().lower() == 'windows':
            try:
                subprocess.run([
                    'setx', 'TESSDATA_PREFIX', DATA_DIR
                ], check=True, capture_output=True)
            except subprocess.CalledProcessError:
                pass
        
        print(f"✓ TESSDATA_PREFIX set to: {DATA_DIR}")
        
    except Exception as e:
        print(f"⚠️ Warning: Could not set TESSDATA_PREFIX: {e}")


def setup_main():
    """Main setup function called by CLI"""
    print("🔧 Setting up Bangla PDF OCR...")
    print("=" * 50)
    
    # Initialize setup
    setup = TesseractSetup()
    
    # Setup Tesseract
    if setup.setup_tesseract():
        print("✓ Tesseract setup completed")
    else:
        print("❌ Tesseract setup failed")
        sys.exit(1)
    
    # Download trained data
    if download_traineddata():
        print("✓ Trained data setup completed")
    else:
        print("❌ Trained data setup failed")
        sys.exit(1)
    
    print("=" * 50)
    print("🎉 Setup completed successfully!")
    print("\nYou can now use:")
    print("  bangla-pdf-ocr input.pdf > output.txt")
    print("  python -c \"from bangla_pdf_ocr import process_pdf; print(process_pdf('input.pdf'))\"")


if __name__ == "__main__":
    setup_main()