from setuptools import setup, find_packages
import os

# Read the contents of your README file
this_directory = os.path.abspath(os.path.dirname(__file__))
with open(os.path.join(this_directory, 'README.md'), encoding='utf-8') as f:
    long_description = f.read()

setup(
    name="bangla-pdf-ocr",
    version="1.0.0",
    author="AI Tax Lawyer Team",
    author_email="support@aitaxlawyer.com",
    description="One-command Bangla OCR solution with Tesseract",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/aitaxlawyer/bangla-pdf-ocr",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Image Recognition",
        "Topic :: Text Processing :: Linguistic",
    ],
    python_requires=">=3.7",
    install_requires=[
        "pytesseract>=0.3.10",
        "Pillow>=8.0.0",
        "pdf2image>=1.16.0",
        "requests>=2.25.0",
        "tqdm>=4.60.0",
        "numpy>=1.19.0",
        "opencv-python>=4.5.0",
    ],
    extras_require={
        "dev": [
            "pytest>=6.0",
            "black>=21.0",
            "flake8>=3.8",
            "mypy>=0.812",
        ],
    },
    entry_points={
        "console_scripts": [
            "bangla-pdf-ocr=bangla_pdf_ocr.cli:main",
            "bangla-pdf-ocr-setup=bangla_pdf_ocr.installer:setup_main",
        ],
    },
    include_package_data=True,
    package_data={
        "bangla_pdf_ocr": ["data/*"],
    },
    zip_safe=False,
)