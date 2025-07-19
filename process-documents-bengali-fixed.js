/**
 * IMPROVED Document Processing - AI Tax Lawyer Bangladesh
 * With proper Bengali text extraction and normalization
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
  '†iwR÷vW©': 'রেজিস্ট্রার',
  'evsjv‡`k': 'বাংলাদেশ',
  '†M‡RU': 'গেজেট',
  'AwZwi³': 'অতিরিক্ত',
  'msL¨v': 'সংখ্যা',
  'KZ…©c¶': 'কর্তৃপক্ষ',
  'cÖKvwkZ': 'প্রকাশিত',
  '†mvgevi': 'সোমবার',
  'Ryb': 'জুন',
  'evsjv‡`‡ki': 'বাংলাদেশের',
  '†bvwUk': 'নোটিশ',
  'cÖ‡qvRb': 'প্রয়োজন',
  'KZ…©K': 'কর্তৃক',
  '‡K›`ªxq': 'কেন্দ্রীয়',
  'miKvi': 'সরকার',
  'Aby‡"Q`': 'অনুচ্ছেদ',
  'aviv': 'ধারা',
  '†h': 'যে',
  '‡Kvb': 'কোন',
  'e¨w³': 'ব্যক্তি',
  'cÖwZôvb': 'প্রতিষ্ঠান',
  'Kv‡Ri': 'কাজের',
  'Kg©Pvix': 'কর্মচারী',
  'cvwbi': 'পানির',
  '‡`k': 'দেশ',
  'ivR¯^': 'রাজস্ব',
  'Avq': 'আয়',
  'f¨vU': 'ভ্যাট',
  'Ki': 'কর',
  'wnmve': 'হিসাব'
};

function fixBengaliText(text) {
  let fixedText = text;
  
  // Apply known character mappings
  for (const [encoded, bengali] of Object.entries(bengaliNormalizationMap)) {
    fixedText = fixedText.replace(new RegExp(encoded, 'g'), bengali);
  }
  
  // Clean up control characters and normalize whitespace
  fixedText = fixedText.replace(/[\u0000-\u001F]/g, ' '); // Replace control characters
  fixedText = fixedText.replace(/\s+/g, ' '); // Normalize whitespace
  fixedText = fixedText.trim();
  
  return fixedText;
}

function detectLanguage(text) {
  const bengaliPattern = /[\u0980-\u09FF]/;
  const englishPattern = /[A-Za-z]/;
  
  const bengaliCount = (text.match(bengaliPattern) || []).length;
  const englishCount = (text.match(englishPattern) || []).length;
  
  if (bengaliCount > englishCount * 0.1) return 'bn';
  if (englishCount > bengaliCount * 0.1) return 'en';
  return 'mixed';
}

function detectDocumentType(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('finance')) return 'finance_act';
  if (lower.includes('income')) return 'income_tax';
  if (lower.includes('vat')) return 'vat_act';
  return 'circular';
}

function extractSections(text, language) {
  const sections = [];
  
  if (language === 'bn' || language === 'mixed') {
    // Bengali section patterns - both original and normalized
    const bengaliPatterns = [
      /(ধারা\s*[\u09E6-\u09EF\d]+)/g,
      /(অনুচ্ছেদ\s*[\u09E6-\u09EF\d]+)/g,
      /(খণ্ড\s*[\u09E6-\u09EF\d]+)/g,
      /(পরিচ্ছেদ\s*[\u09E6-\u09EF\d]+)/g,
      /(বিভাগ\s*[\u09E6-\u09EF\d]+)/g
    ];
    
    bengaliPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          sections.push({
            number: match,
            title: match,
            language: 'bn'
          });
        });
      }
    });
  }
  
  if (language === 'en' || language === 'mixed') {
    // English section patterns
    const englishPatterns = [
      /(Section\s*\d+)/gi,
      /(Chapter\s*\d+)/gi,
      /(Part\s*[IVX\d]+)/gi,
      /(Article\s*\d+)/gi
    ];
    
    englishPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          sections.push({
            number: match,
            title: match,
            language: 'en'
          });
        });
      }
    });
  }
  
  return sections;
}

function createChunks(text, metadata) {
  const chunks = [];
  const chunkSize = 800;
  const chunkOverlap = 100;
  const words = text.split(/\s+/);
  
  for (let i = 0; i < words.length; i += chunkSize - chunkOverlap) {
    const chunkWords = words.slice(i, i + chunkSize);
    const chunkText = chunkWords.join(' ');
    
    if (chunkText.trim().length > 100) {
      chunks.push({
        id: `${metadata.document_id}_chunk_${chunks.length}`,
        content: chunkText.trim(),
        metadata: {
          ...metadata,
          chunk_index: chunks.length,
          word_start: i,
          word_end: i + chunkWords.length,
          total_words: chunkWords.length,
          total_chars: chunkText.length
        }
      });
    }
  }
  
  return chunks;
}

async function processDocumentWithBengaliFix(filePath) {
  const filename = path.basename(filePath);
  console.log(`\n🔄 PROCESSING WITH BENGALI FIX: ${filename}`);
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  
  try {
    // Extract text from PDF
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer, {
      normalizeWhitespace: true,
      disableCombineTextItems: false
    });
    
    console.log(`📄 Extracted ${data.text.length} characters from ${data.numpages} pages`);
    
    // Apply Bengali text fixes
    const originalBengaliCount = (data.text.match(/[\u0980-\u09FF]/g) || []).length;
    const fixedText = fixBengaliText(data.text);
    const fixedBengaliCount = (fixedText.match(/[\u0980-\u09FF]/g) || []).length;
    
    console.log(`🔧 Bengali character fix: ${originalBengaliCount} → ${fixedBengaliCount} (+${fixedBengaliCount - originalBengaliCount})`);
    
    // Analyze the fixed document
    const language = detectLanguage(fixedText);
    const docType = detectDocumentType(filename);
    const sections = extractSections(fixedText, language);
    
    console.log(`🔍 Analysis: ${language} language, ${docType} type, ${sections.length} sections`);
    
    // Show sample of fixed text
    const sampleText = fixedText.substring(0, 200).replace(/\s+/g, ' ').trim();
    console.log(`📝 Sample fixed text: "${sampleText}..."`);
    
    // Create metadata
    const metadata = {
      document_id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      document_name: filename,
      document_type: docType,
      language: language,
      source_file: filePath,
      total_pages: data.numpages,
      total_characters: fixedText.length,
      bengali_characters: fixedBengaliCount,
      extraction_improvement: fixedBengaliCount - originalBengaliCount,
      sections: sections.slice(0, 10)
    };
    
    // Create chunks from fixed text
    const chunks = createChunks(fixedText, metadata);
    console.log(`📦 Created ${chunks.length} chunks from fixed text`);
    
    // Save processed document with Bengali fixes
    const outputData = {
      document: filename,
      total_pages: data.numpages,
      total_characters: fixedText.length,
      bengali_characters: fixedBengaliCount,
      extraction_improvement: fixedBengaliCount - originalBengaliCount,
      chunks_created: chunks.length,
      language: language,
      document_type: docType,
      sections_found: sections.length,
      full_text: fixedText, // Fixed Bengali text
      chunks: chunks, // Chunks with fixed Bengali text
      original_sample: data.text.substring(0, 500),
      fixed_sample: fixedText.substring(0, 500),
      processing_date: new Date().toISOString(),
      processing_time_ms: Date.now() - startTime
    };
    
    const outputFile = `fixed-processed-${filename.replace('.pdf', '')}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
    
    console.log(`💾 Saved fixed processed document to: ${outputFile}`);
    console.log(`📊 File size: ${Math.round(fs.statSync(outputFile).size / 1024)}KB`);
    console.log(`⏱️  Processing time: ${Math.round((Date.now() - startTime) / 1000)}s`);
    
    return {
      success: true,
      filename: filename,
      outputFile: outputFile,
      totalCharacters: fixedText.length,
      bengaliCharacters: fixedBengaliCount,
      totalChunks: chunks.length,
      language: language,
      sections: sections.length,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    console.error(`❌ Error processing ${filename}:`, error.message);
    return {
      success: false,
      filename: filename,
      error: error.message
    };
  }
}

async function processAllDocumentsWithFix() {
  console.log('🚀 AI Tax Lawyer Bangladesh - IMPROVED DOCUMENT PROCESSING');
  console.log('With proper Bengali text extraction and normalization');
  console.log('='.repeat(70));
  
  const actFilesPath = path.join(process.cwd(), 'Act-files');
  const files = fs.readdirSync(actFilesPath)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .map(file => path.join(actFilesPath, file));
  
  console.log(`📁 Found ${files.length} PDF files to process with Bengali fixes`);
  
  const results = [];
  
  for (const filePath of files) {
    const result = await processDocumentWithBengaliFix(filePath);
    results.push(result);
    
    // Small delay between files
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 IMPROVED PROCESSING SUMMARY:');
  console.log('='.repeat(70));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successfully processed: ${successful.length}/${files.length}`);
  
  if (successful.length > 0) {
    const totalChars = successful.reduce((sum, r) => sum + r.totalCharacters, 0);
    const totalBengali = successful.reduce((sum, r) => sum + r.bengaliCharacters, 0);
    const totalChunks = successful.reduce((sum, r) => sum + r.totalChunks, 0);
    const totalSections = successful.reduce((sum, r) => sum + r.sections, 0);
    
    console.log(`📝 Total characters extracted: ${totalChars.toLocaleString()}`);
    console.log(`🔤 Total Bengali characters: ${totalBengali.toLocaleString()}`);
    console.log(`📦 Total chunks created: ${totalChunks.toLocaleString()}`);
    console.log(`📋 Total sections found: ${totalSections.toLocaleString()}`);
    console.log('');
    
    console.log('📋 Processed files with Bengali fixes:');
    successful.forEach(r => {
      console.log(`   • ${r.outputFile}:`);
      console.log(`     - ${r.totalChunks} chunks, ${r.bengaliCharacters} Bengali chars`);
      console.log(`     - Language: ${r.language}, Sections: ${r.sections}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n⚠️  Failed files:');
    failed.forEach(r => {
      console.log(`   • ${r.filename}: ${r.error}`);
    });
  }
  
  console.log('\n🎉 IMPROVED PROCESSING COMPLETE!');
  console.log('Now you have properly formatted Bengali text in all processed documents!');
}

processAllDocumentsWithFix().catch(console.error);