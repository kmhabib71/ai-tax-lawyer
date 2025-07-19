/**
 * Simple PDF to Images - AI Tax Lawyer Bangladesh
 * Just extract images, skip PDF reconversion for now
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function extractImagesToFolder() {
  console.log('🚀 AI TAX LAWYER - SIMPLE PDF TO IMAGES EXTRACTOR');
  console.log('Extract images from PDFs for manual Chrome testing');
  console.log('='.repeat(70));

  // Check Poppler
  try {
    await execAsync('pdftoppm -h');
    console.log('✅ Poppler found: pdftoppm available');
  } catch (error) {
    console.error('❌ Poppler not found. Please install poppler-utils');
    return;
  }

  // Files to convert
  const targetFiles = [
    'Act-files/Income_Tax_act-2023-bangla.pdf',
    'Act-files/finance-act-2025-bangla.pdf'
  ];

  for (const filePath of targetFiles) {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${filePath}`);
      continue;
    }

    const filename = path.basename(fullPath, '.pdf');
    const outputDir = path.join('extracted-images', filename);

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`\n📄 Processing: ${filename}`);
    console.log(`📁 File size: ${Math.round(fs.statSync(fullPath).size / 1024)}KB`);
    console.log(`📁 Output: ${outputDir}`);

    try {
      // Extract images at 200 DPI (good quality, smaller files)
      const command = `pdftoppm -png -r 200 "${fullPath}" "${path.join(outputDir, 'page')}"`;
      console.log(`🔄 Extracting images...`);
      
      const { stdout, stderr } = await execAsync(command);
      
      // Count generated images
      const imageFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));
      
      console.log(`✅ Extracted ${imageFiles.length} images`);
      console.log(`📁 Location: ./${outputDir}/`);
      
    } catch (error) {
      console.error(`❌ Failed to extract images: ${error.message}`);
    }
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Navigate to ./extracted-images/ folder');
  console.log('2. Use online tool to combine PNG images to PDF:');
  console.log('   - ilovepdf.com/jpg_to_pdf');
  console.log('   - smallpdf.com/jpg-to-pdf');
  console.log('   - pdf24.org/en/images-to-pdf');
  console.log('3. Test Chrome text extraction on combined PDF');
  console.log('4. Compare with OCR results');
}

// Run if called directly
if (require.main === module) {
  extractImagesToFolder().catch(console.error);
}

module.exports = { extractImagesToFolder };