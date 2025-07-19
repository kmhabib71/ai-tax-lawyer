/**
 * Convert Text PDFs to Image PDFs - AI Tax Lawyer Bangladesh
 * Convert selectable text PDFs to image-based PDFs for Chrome extraction
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class PDFToImageConverter {
  constructor() {
    this.outputDir = 'image-pdfs';
    this.imageMagickCmd = 'magick'; // Default command
  }

  async checkPopplerInstallation() {
    try {
      const { stdout } = await execAsync('pdftoppm -h');
      console.log('✅ Poppler found: pdftoppm available');
      return true;
    } catch (error) {
      console.error('❌ Poppler not found. Please install poppler-utils:');
      console.error('   Ubuntu/Debian: sudo apt-get install poppler-utils');
      console.error('   macOS: brew install poppler');
      console.error('   Windows: Download from https://github.com/oschwartz10612/poppler-windows');
      return false;
    }
  }

  async checkImageMagickInstallation() {
    // Try different ImageMagick command variations for Windows
    const commands = ['magick -version', 'convert -version', 'magick.exe -version', 'convert.exe -version'];
    
    for (const cmd of commands) {
      try {
        const { stdout } = await execAsync(cmd);
        console.log(`✅ ImageMagick found: ${cmd.split(' ')[0]} available`);
        this.imageMagickCmd = cmd.split(' ')[0]; // Store the working command
        return true;
      } catch (error) {
        // Continue to next command
        continue;
      }
    }
    
    console.error('❌ ImageMagick not found. Please check installation:');
    console.error('   Windows: Make sure ImageMagick is added to PATH');
    console.error('   Try: magick -version in cmd/powershell');
    console.error('   Download: https://imagemagick.org/script/download.php#windows');
    return false;
  }

  async convertPDFToImages(pdfPath, outputDir) {
    const filename = path.basename(pdfPath, '.pdf');
    const imagesDir = path.join(outputDir, `${filename}_images`);
    
    // Create images directory
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    console.log(`📄 Converting PDF to images: ${filename}`);
    console.log(`📁 Output directory: ${imagesDir}`);

    try {
      // Convert PDF to high-quality PNG images (300 DPI)
      const command = `pdftoppm -png -r 300 "${pdfPath}" "${path.join(imagesDir, 'page')}"`;
      console.log(`🔄 Running: ${command}`);
      
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('Warning')) {
        console.warn('⚠️ Conversion warnings:', stderr);
      }

      // List generated images
      const imageFiles = fs.readdirSync(imagesDir)
        .filter(file => file.endsWith('.png'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/page-(\d+)\.png/)?.[1] || '0');
          const numB = parseInt(b.match(/page-(\d+)\.png/)?.[1] || '0');
          return numA - numB;
        })
        .map(file => path.join(imagesDir, file));

      console.log(`✅ Generated ${imageFiles.length} image pages`);
      return { success: true, imageFiles, imagesDir };

    } catch (error) {
      console.error('❌ PDF to images conversion failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async convertImagesToPDF(imageFiles, outputPdfPath) {
    console.log(`📄 Converting ${imageFiles.length} images back to PDF...`);
    console.log(`📁 Output PDF: ${outputPdfPath}`);

    try {
      // Use ImageMagick to convert images to PDF
      const imagesList = imageFiles.map(img => `"${img}"`).join(' ');
      const command = `${this.imageMagickCmd} ${imagesList} "${outputPdfPath}"`;
      
      console.log(`🔄 Running: ${this.imageMagickCmd} [${imageFiles.length} images] -> PDF`);
      
      const { stdout, stderr } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer
      
      if (stderr && !stderr.includes('Warning')) {
        console.warn('⚠️ PDF creation warnings:', stderr);
      }

      // Check if PDF was created
      if (fs.existsSync(outputPdfPath)) {
        const pdfSize = Math.round(fs.statSync(outputPdfPath).size / 1024 / 1024);
        console.log(`✅ Image-based PDF created: ${pdfSize}MB`);
        return { success: true, outputPdfPath, sizeMB: pdfSize };
      } else {
        throw new Error('PDF file was not created');
      }

    } catch (error) {
      console.error('❌ Images to PDF conversion failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async convertToImagePDF(pdfPath) {
    const filename = path.basename(pdfPath, '.pdf');
    const outputPdfPath = path.join(this.outputDir, `${filename}-image-based.pdf`);
    
    console.log(`\n🚀 CONVERTING: ${filename}`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();

    try {
      // Create output directory
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }

      // Step 1: Convert PDF to images
      const imageResult = await this.convertPDFToImages(pdfPath, this.outputDir);
      if (!imageResult.success) {
        throw new Error(imageResult.error);
      }

      // Step 2: Convert images back to PDF
      const pdfResult = await this.convertImagesToPDF(imageResult.imageFiles, outputPdfPath);
      if (!pdfResult.success) {
        throw new Error(pdfResult.error);
      }

      // Step 3: Cleanup temporary images
      console.log(`🧹 Cleaning up temporary images...`);
      fs.rmSync(imageResult.imagesDir, { recursive: true, force: true });

      const processingTime = Date.now() - startTime;

      console.log(`\n✅ CONVERSION SUCCESSFUL!`);
      console.log('='.repeat(60));
      console.log(`📄 Input: ${path.basename(pdfPath)}`);
      console.log(`📄 Output: ${path.basename(outputPdfPath)}`);
      console.log(`📊 Size: ${pdfResult.sizeMB}MB`);
      console.log(`⏱️  Time: ${Math.round(processingTime / 1000)}s`);
      console.log(`🎯 Ready for Chrome extraction!`);

      return {
        success: true,
        inputFile: pdfPath,
        outputFile: outputPdfPath,
        sizeMB: pdfResult.sizeMB,
        processingTime
      };

    } catch (error) {
      console.error(`\n❌ CONVERSION FAILED: ${error.message}`);
      return {
        success: false,
        inputFile: pdfPath,
        error: error.message
      };
    }
  }
}

async function convertSpecificFiles() {
  console.log('🚀 AI TAX LAWYER - PDF TO IMAGE-BASED PDF CONVERTER');
  console.log('Convert selectable text PDFs to image PDFs for Chrome extraction');
  console.log('='.repeat(80));

  const converter = new PDFToImageConverter();

  // Check required tools
  const popplerAvailable = await converter.checkPopplerInstallation();
  const imageMagickAvailable = await converter.checkImageMagickInstallation();

  if (!popplerAvailable || !imageMagickAvailable) {
    console.error('❌ Required tools not available. Please install them first.');
    return;
  }

  // Files to convert
  const targetFiles = [
    'Act-files/Income_Tax_act-2023-bangla.pdf',
    'Act-files/finance-act-2025-bangla.pdf'
  ];

  const results = [];

  for (const filePath of targetFiles) {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${filePath}`);
      continue;
    }

    console.log(`📁 File size: ${Math.round(fs.statSync(fullPath).size / 1024)}KB`);
    
    const result = await converter.convertToImagePDF(fullPath);
    results.push(result);
    
    // Delay between files
    if (targetFiles.indexOf(filePath) < targetFiles.length - 1) {
      console.log('\n⏳ Waiting before next conversion...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n📊 CONVERSION SUMMARY:');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successfully converted: ${successful.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n📄 Converted Files:');
    successful.forEach(result => {
      console.log(`   - ${path.basename(result.outputFile)} (${result.sizeMB}MB)`);
    });
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Use Chrome to extract text from image-based PDFs');
    console.log('2. Compare quality with OCR extraction');
    console.log('3. Choose best method for each document');
    console.log('\n📁 Image PDFs saved in: ./image-pdfs/');
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed Conversions:');
    failed.forEach(result => {
      console.log(`   - ${path.basename(result.inputFile)}: ${result.error}`);
    });
  }

  return results;
}

// Run if called directly
if (require.main === module) {
  convertSpecificFiles().catch(console.error);
}

module.exports = { PDFToImageConverter, convertSpecificFiles };