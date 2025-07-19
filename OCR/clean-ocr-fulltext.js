/**
 * Clean OCR Full Text - AI Tax Lawyer Bangladesh
 * Remove \r\n artifacts from OCR full_text field while preserving chunks
 */

const fs = require('fs');
const path = require('path');

function cleanOCRFullText(filename) {
  console.log('🧹 AI TAX LAWYER - CLEAN OCR FULL TEXT');
  console.log('Removing \\r\\n artifacts from full_text field');
  console.log('='.repeat(60));

  const filePath = path.join(process.cwd(), filename);
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath);
    return;
  }

  // Read the OCR data
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  console.log(`📄 Processing: ${path.basename(filePath)}`);
  console.log(`📊 Original full_text: ${data.full_text.length} characters`);

  // Clean the full_text field
  const cleanedFullText = cleanTextArtifacts(data.full_text);
  
  // Update the data
  data.full_text = cleanedFullText;
  data.processing_metadata = data.processing_metadata || {};
  data.processing_metadata.fulltext_cleaned = true;
  data.processing_metadata.cleaning_date = new Date().toISOString();

  // Recalculate statistics
  const newStats = calculateCleanStats(cleanedFullText);
  data.total_characters = newStats.totalCharacters;
  data.bengali_characters = newStats.bengaliCharacters;
  data.english_characters = newStats.englishCharacters;

  // Save cleaned version
  const cleanedFilename = filename.replace('.json', '-cleaned.json');
  const outputPath = path.join(process.cwd(), cleanedFilename);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');

  console.log('\n✅ FULL TEXT CLEANING SUCCESSFUL!');
  console.log('='.repeat(60));
  console.log(`📄 Original: ${data.full_text.length} chars (with \\r\\n artifacts)`);
  console.log(`📄 Cleaned: ${cleanedFullText.length} chars (artifacts removed)`);
  console.log(`📦 Chunks: ${data.chunks.length} (unchanged)`);
  console.log(`📁 Output: ${path.basename(outputPath)}`);

  console.log('\n🎯 IMPROVEMENTS:');
  console.log('   ✅ Removed \\r\\n artifacts');
  console.log('   ✅ Preserved chunk quality');
  console.log('   ✅ Updated statistics');
  console.log('   ✅ Ready for embeddings');

  return {
    success: true,
    originalFile: filename,
    cleanedFile: cleanedFilename,
    originalSize: data.full_text.length,
    cleanedSize: cleanedFullText.length,
    chunksPreserved: data.chunks.length
  };
}

function cleanTextArtifacts(text) {
  console.log('🧹 Cleaning text artifacts...');
  
  // Remove \r\n and other OCR artifacts
  let cleaned = text
    .replace(/\\r\\n/g, '\n')  // Replace literal \r\n with newlines
    .replace(/\r\n/g, '\n')    // Replace actual \r\n with newlines
    .replace(/\r/g, '\n')      // Replace standalone \r
    .replace(/\n\s*\n\s*\n/g, '\n\n')  // Remove excessive newlines
    .replace(/\s+/g, ' ')      // Normalize spaces
    .replace(/\n\s+/g, '\n')   // Remove spaces after newlines
    .replace(/\s+\n/g, '\n')   // Remove spaces before newlines
    .trim();

  // Fix common OCR artifacts specific to Bengali legal text
  cleaned = cleaned
    .replace(/হই\s*বাংলাদেশ/g, 'বাংলাদেশ')  // Remove OCR noise
    .replace(/গেজেট\s*ট\s*'/g, 'গেজেট')     // Fix gazette formatting
    .replace(/সই\s*৮/g, '')                 // Remove page artifacts
    .replace(/GAP/g, 'আষাঢ়')               // Fix month names
    .replace(/CH FATT/g, '')               // Remove English artifacts
    .replace(/AVA\s*সংশোধন/g, 'সপ্তম সংশোধন'); // Fix amendment references

  console.log(`   📝 Artifacts removed, text cleaned: ${cleaned.length} chars`);
  return cleaned;
}

function calculateCleanStats(text) {
  const bengaliChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  const totalChars = text.length;
  
  return {
    totalCharacters: totalChars,
    bengaliCharacters: bengaliChars,
    englishCharacters: englishChars
  };
}

// Clean specific files
function cleanIncomeActFullText() {
  console.log('🎯 Cleaning Income Tax Act 2023 full text...');
  
  // Look for the processed income tax file
  const possibleFiles = [
    'ocr-processed-Income_Tax_act-2023-bangla.json',
    'ocr-processed-income-tax-act-2023-bangla.json'
  ];
  
  for (const filename of possibleFiles) {
    if (fs.existsSync(filename)) {
      return cleanOCRFullText(filename);
    }
  }
  
  console.error('❌ Income Tax Act OCR file not found');
  console.log('Available files:');
  const files = fs.readdirSync('.').filter(f => f.includes('ocr-processed') && f.endsWith('.json'));
  files.forEach(f => console.log(`   - ${f}`));
  
  return null;
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Clean specific file
    cleanOCRFullText(args[0]);
  } else {
    // Clean Income Tax Act
    cleanIncomeActFullText();
  }
}

module.exports = { cleanOCRFullText, cleanIncomeActFullText };