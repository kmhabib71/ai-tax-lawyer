/**
 * Fix Bengali Text Extraction - AI Tax Lawyer Bangladesh
 * Improved PDF processing for proper Bengali character extraction
 */

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

// Load environment variables
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key] = valueParts.join('=');
  }
});

// Bengali character normalization mapping
const bengaliNormalizationMap = {
  // Common Bengali character encoding fixes
  '†iwR÷vW©': 'রেজিস্ট্রার',
  'evsjv‡`k': 'বাংলাদেশ',
  '†M‡RU': 'গেজেট',
  'AwZwi³': 'অতিরিক্ত',
  'msL¨v': 'সংখ্যা',
  'KZ…©c¶': 'কর্তৃপক্ষ',
  'cÖKvwkZ': 'প্রকাশিত',
  '†mvgevi': 'সোমবার',
  'Ryb': 'জুন',
  // Add more mappings as needed
};

function attemptBengaliTextFix(text) {
  let fixedText = text;
  
  // Apply known character mappings
  for (const [encoded, bengali] of Object.entries(bengaliNormalizationMap)) {
    fixedText = fixedText.replace(new RegExp(encoded, 'g'), bengali);
  }
  
  // Try to fix common Unicode escape sequences
  try {
    // Attempt to decode Unicode escape sequences
    fixedText = fixedText.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
      try {
        return String.fromCharCode(parseInt(code, 16));
      } catch (e) {
        return match;
      }
    });
    
    // Fix some common Bengali encoding issues
    fixedText = fixedText.replace(/\u0000/g, ''); // Remove null characters
    fixedText = fixedText.replace(/[\u0001-\u001F]/g, ' '); // Replace control characters with spaces
    
  } catch (error) {
    console.log('   ⚠️  Unicode fix failed, using original text');
  }
  
  return fixedText;
}

function analyzeBengaliContent(text) {
  const originalBengaliChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
  const fixedText = attemptBengaliTextFix(text);
  const fixedBengaliChars = (fixedText.match(/[\u0980-\u09FF]/g) || []).length;
  
  return {
    original: text,
    fixed: fixedText,
    originalBengaliCount: originalBengaliChars,
    fixedBengaliCount: fixedBengaliChars,
    improvement: fixedBengaliChars - originalBengaliChars,
    sample: fixedText.substring(0, 200)
  };
}

async function testBengaliExtractionFix(filePath) {
  const filename = path.basename(filePath);
  console.log(`\n🔧 TESTING BENGALI FIX: ${filename}`);
  console.log('='.repeat(50));
  
  try {
    // Extract text using different options
    const buffer = fs.readFileSync(filePath);
    
    // Method 1: Default extraction
    const defaultData = await pdf(buffer);
    console.log(`📄 Default extraction: ${defaultData.text.length} characters`);
    
    // Method 2: Enhanced options for Bengali
    const enhancedData = await pdf(buffer, {
      normalizeWhitespace: false,
      disableCombineTextItems: true,
      preserveWS: true,
      max: 0 // Process all pages
    });
    console.log(`📄 Enhanced extraction: ${enhancedData.text.length} characters`);
    
    // Method 3: Raw data extraction (try to get raw text)
    const rawData = await pdf(buffer, {
      version: 'v1.10.100',
      normalizeWhitespace: false,
      disableCombineTextItems: true,
    });
    console.log(`📄 Raw extraction: ${rawData.text.length} characters`);
    
    // Analyze each method
    const methods = [
      { name: 'Default', data: defaultData },
      { name: 'Enhanced', data: enhancedData },
      { name: 'Raw', data: rawData }
    ];
    
    let bestMethod = null;
    let bestScore = 0;
    
    for (const method of methods) {
      const analysis = analyzeBengaliContent(method.data.text);
      const score = analysis.fixedBengaliCount + (analysis.improvement * 2);
      
      console.log(`\n📊 ${method.name} method analysis:`);
      console.log(`   Bengali chars (original): ${analysis.originalBengaliCount}`);
      console.log(`   Bengali chars (fixed): ${analysis.fixedBengaliCount}`);
      console.log(`   Improvement: ${analysis.improvement > 0 ? '+' : ''}${analysis.improvement}`);
      console.log(`   Score: ${score}`);
      console.log(`   Sample: "${analysis.sample.replace(/\s+/g, ' ').trim()}..."`);
      
      if (score > bestScore) {
        bestScore = score;
        bestMethod = { ...method, analysis };
      }
    }
    
    console.log(`\n🏆 Best method: ${bestMethod.name} (score: ${bestScore})`);
    
    // Save the best result
    const outputData = {
      document: filename,
      best_method: bestMethod.name,
      extraction_methods: methods.map(m => ({
        name: m.name,
        total_chars: m.data.text.length,
        pages: m.data.numpages,
        bengali_chars: (m.data.text.match(/[\u0980-\u09FF]/g) || []).length
      })),
      best_result: {
        total_characters: bestMethod.data.text.length,
        total_pages: bestMethod.data.numpages,
        bengali_characters: bestMethod.analysis.fixedBengaliCount,
        fixed_text: bestMethod.analysis.fixed,
        sample_text: bestMethod.analysis.sample
      },
      processing_date: new Date().toISOString()
    };
    
    const outputFile = `bengali-extraction-test-${filename.replace('.pdf', '')}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
    
    console.log(`💾 Saved analysis to: ${outputFile}`);
    
    return {
      success: true,
      bestMethod: bestMethod.name,
      bengaliCount: bestMethod.analysis.fixedBengaliCount,
      totalChars: bestMethod.data.text.length,
      outputFile: outputFile
    };
    
  } catch (error) {
    console.error(`❌ Error testing ${filename}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function testAllBengaliFiles() {
  console.log('🧪 AI Tax Lawyer Bangladesh - Bengali Text Extraction Fix');
  console.log('Testing different extraction methods for Bengali PDFs');
  console.log('='.repeat(70));
  
  const actFilesPath = path.join(process.cwd(), 'Act-files');
  const bengaliFiles = [
    'finance-act-2025-bangla.pdf',
    'Income_Tax_act-2023-bangla.pdf',
    'vat-act-2012-bangla.pdf'
  ].map(file => path.join(actFilesPath, file)).filter(fs.existsSync);
  
  console.log(`📁 Found ${bengaliFiles.length} Bengali PDF files to test`);
  
  const results = [];
  
  for (const filePath of bengaliFiles) {
    const result = await testAllBengaliFiles(filePath);
    results.push(result);
    
    // Small delay between files
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 BENGALI EXTRACTION TEST SUMMARY:');
  console.log('='.repeat(70));
  
  const successful = results.filter(r => r.success);
  
  if (successful.length > 0) {
    console.log(`✅ Successfully tested: ${successful.length}/${bengaliFiles.length}`);
    console.log('');
    
    successful.forEach(r => {
      console.log(`   • ${r.outputFile}: ${r.bengaliCount} Bengali chars, ${r.totalChars} total`);
    });
    
    console.log('');
    console.log('💡 Recommendations:');
    console.log('   1. Use the best extraction method identified for each file');
    console.log('   2. Apply character normalization for encoded Bengali text');
    console.log('   3. Consider OCR for files with very low Bengali character counts');
  }
  
  console.log('\n🎯 Next step: Create improved processing pipeline with Bengali fixes!');
}

// Test a single file first
async function testSingleFile() {
  const financeActPath = path.join(process.cwd(), 'Act-files', 'finance-act-2025-bangla.pdf');
  if (fs.existsSync(financeActPath)) {
    await testBengaliExtractionFix(financeActPath);
  } else {
    console.log('❌ finance-act-2025-bangla.pdf not found');
  }
}

testSingleFile().catch(console.error);