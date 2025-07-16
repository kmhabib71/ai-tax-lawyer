"""
Basic usage examples for Bangla PDF OCR
"""

from bangla_pdf_ocr import process_pdf, process_image, BanglaOCR

def example_1_simple_pdf():
    """Simple PDF processing example"""
    print("=== Example 1: Simple PDF Processing ===")
    
    # Process a PDF file
    try:
        text = process_pdf("sample_bangla_document.pdf")
        print("Extracted text:")
        print(text[:500] + "..." if len(text) > 500 else text)
    except FileNotFoundError:
        print("Sample PDF not found. Please provide a valid PDF file.")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")


def example_2_image_processing():
    """Image processing example"""
    print("=== Example 2: Image Processing ===")
    
    # Process an image file
    try:
        text = process_image("sample_bangla_text.jpg")
        print("Extracted text from image:")
        print(text)
    except FileNotFoundError:
        print("Sample image not found. Please provide a valid image file.")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")


def example_3_advanced_usage():
    """Advanced usage with custom configuration"""
    print("=== Example 3: Advanced Usage ===")
    
    # Initialize OCR with custom configuration
    config = {
        'dpi': 300,
        'preprocessing': {
            'enhance_contrast': True,
            'denoise': True,
            'resize_factor': 2.0,
            'grayscale': True,
        }
    }
    
    ocr = BanglaOCR(config=config)
    
    try:
        # Process specific pages of a PDF
        text = ocr.process_pdf("sample_document.pdf", first_page=1, last_page=3)
        print("Extracted text from pages 1-3:")
        print(text[:300] + "..." if len(text) > 300 else text)
    except FileNotFoundError:
        print("Sample document not found. Please provide a valid PDF file.")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")


def example_4_batch_processing():
    """Batch processing example"""
    print("=== Example 4: Batch Processing ===")
    
    import os
    
    # Sample files (you would replace with actual file paths)
    sample_files = [
        "document1.pdf",
        "document2.pdf",
        "image1.jpg",
        "image2.png"
    ]
    
    for file_path in sample_files:
        try:
            if file_path.lower().endswith('.pdf'):
                text = process_pdf(file_path)
                print(f"Processed PDF: {file_path}")
            else:
                text = process_image(file_path)
                print(f"Processed Image: {file_path}")
            
            # Save extracted text
            output_file = f"extracted_{os.path.basename(file_path)}.txt"
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(text)
            
            print(f"Text saved to: {output_file}")
            
        except FileNotFoundError:
            print(f"File not found: {file_path}")
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
    
    print("\n" + "="*50 + "\n")


def example_5_tax_document_processing():
    """Tax document processing example"""
    print("=== Example 5: Tax Document Processing ===")
    
    def extract_tax_info(pdf_path):
        """Extract tax information from Bengali tax documents"""
        text = process_pdf(pdf_path)
        
        # Process extracted text for tax information
        lines = text.split('\n')
        tax_info = {}
        
        for line in lines:
            line = line.strip()
            if 'নাম' in line or 'Name' in line:
                tax_info['name'] = line
            elif 'টিআইএন' in line or 'TIN' in line:
                tax_info['tin'] = line
            elif 'আয়' in line or 'Income' in line:
                tax_info['income'] = line
            elif 'ঠিকানা' in line or 'Address' in line:
                tax_info['address'] = line
        
        return tax_info
    
    try:
        tax_data = extract_tax_info("tax_certificate.pdf")
        print("Extracted Tax Information:")
        for key, value in tax_data.items():
            print(f"{key}: {value}")
    except FileNotFoundError:
        print("Tax document not found. Please provide a valid tax document.")
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n" + "="*50 + "\n")


def example_6_error_handling():
    """Error handling example"""
    print("=== Example 6: Error Handling ===")
    
    # Example of proper error handling
    files_to_process = [
        "valid_document.pdf",
        "non_existent_file.pdf",
        "corrupted_file.pdf"
    ]
    
    for file_path in files_to_process:
        try:
            print(f"Processing: {file_path}")
            text = process_pdf(file_path)
            print(f"Success: Extracted {len(text)} characters")
            
        except FileNotFoundError:
            print(f"Error: File '{file_path}' not found")
        except Exception as e:
            print(f"Error processing '{file_path}': {e}")
    
    print("\n" + "="*50 + "\n")


if __name__ == "__main__":
    # Run all examples
    example_1_simple_pdf()
    example_2_image_processing()
    example_3_advanced_usage()
    example_4_batch_processing()
    example_5_tax_document_processing()
    example_6_error_handling()
    
    print("Examples completed!")
    print("\nTo use these examples:")
    print("1. Install the package: pip install bangla-pdf-ocr")
    print("2. Run setup: bangla-pdf-ocr-setup")
    print("3. Replace sample file paths with actual files")
    print("4. Run: python basic_usage.py")