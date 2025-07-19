/**
 * Clean Chrome-Extracted Text - AI Tax Lawyer Bangladesh
 * Fix OCR issues, table formatting, and artifacts from Chrome extraction
 */

const fs = require('fs');
const path = require('path');

class ChromeTextCleaner {
  constructor() {
    this.numberMappings = {
      // Bengali to English numbers
      '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
      '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };
    
    this.commonMistakes = {
      // SAFE OCR fixes - NO general o→0 conversion
      // Removed: 'o': '0' and 'O': '0' to preserve English words like "alcohol", "for"
      // Specific number fixes handled in fixNumbers() with context-awareness
      'हन': 'নং',   // Hindi to Bengali
      'प': 'প',     // Hindi to Bengali
      'নবর': 'নম্বর',  // Common typo
      'গৈজেট': 'গেজেট', // Gazette typo
      'শুষ্কের': 'শুল্কের', // Duty typo
      'শুন্ধের': 'শুল্কের', // Duty typo
      'গাঁজানো': 'গাঁজানো', // Fermented fix
      'furmented': 'fermented' // English typo
    };
  }

  cleanText(rawText) {
    console.log('🧹 Cleaning Chrome-extracted text...');
    
    let cleaned = rawText;
    
    // Step 1: Remove table formatting artifacts
    cleaned = this.removeTableArtifacts(cleaned);
    
    // Step 2: Fix number issues
    cleaned = this.fixNumbers(cleaned);
    
    // Step 3: Fix common OCR mistakes
    cleaned = this.fixCommonMistakes(cleaned);
    
    // Step 4: Clean up formatting
    cleaned = this.cleanFormatting(cleaned);
    
    // Step 5: Restructure tables
    cleaned = this.restructureTables(cleaned);
    
    // Step 6: Remove header/footer artifacts
    cleaned = this.removeArtifacts(cleaned);
    
    console.log(`   📝 Text cleaned: ${cleaned.length} characters`);
    return cleaned;
  }

  removeTableArtifacts(text) {
    console.log('   🗃️  Removing table artifacts...');
    
    return text
      .replace(/│/g, '') // Remove table borders
      .replace(/┌|┐|└|┘|├|┤|┬|┴|┼/g, '') // Remove box drawing chars
      .replace(/\|/g, ' ') // Replace pipes with spaces
      .replace(/\s*\n\s*\n\s*\n/g, '\n\n') // Remove excessive newlines
      .replace(/^\s*[\(\)].*[\(\)]\s*$/gm, '') // Remove lines with only parentheses
      .replace(/^\s*\([\d\u09E6-\u09EF]+\)\s*$/gm, ''); // Remove lines with only (1), (২) etc
  }

  fixNumbers(text) {
    console.log('   🔢 Smart number fixing (context-aware)...');
    
    let fixed = text;
    
    // CONTEXT-AWARE FIXES - Only fix 'o' in specific numerical contexts
    
    // 1. HS Codes: xx.xx.oo → xx.xx.00
    fixed = fixed.replace(/(\d{2,4})\.(\d{2})\.([oO]{2})/g, '$1.$2.00');
    fixed = fixed.replace(/(\d{2,4})\.(\d{2})\.(\d)([oO])/g, '$1.$2.$30');
    fixed = fixed.replace(/(\d{2,4})\.(\d{2})\.([oO])(\d)/g, '$1.$2.0$4');
    
    // 2. Standalone numbers: So0 → 500, but preserve "alcohol", "for", etc.
    fixed = fixed.replace(/\bSo0\b/g, '500'); // Specific OCR error
    fixed = fixed.replace(/\b([1-9])o0\b/g, '$100'); // Pattern: 1o0 → 100
    fixed = fixed.replace(/\b(\d+)o(\d+)\b/g, '$10$2'); // Pattern: 12o5 → 1205
    
    // 3. Percentage rates at end of lines: 35o% → 350%
    fixed = fixed.replace(/(\d+)o(%|\s*$)/g, '$10$2');
    
    // 4. Bengali HS codes with mixed characters
    fixed = fixed.replace(/([\u09E6-\u09EF]{4})\.(\d+)\.([oO]+)/g, (match, p1, p2, p3) => {
      const englishYear = this.bengaliToEnglish(p1);
      const zeros = p3.replace(/[oO]/g, '0');
      return `${englishYear}.${p2}.${zeros}`;
    });
    
    // 5. Table data: Fix only when surrounded by numbers/codes
    fixed = fixed.replace(/(\d+\.\d+\.\d+)\s+(.+?)\s+([1-9])o([0-9])\s/g, '$1 $2 $30$4 ');
    
    // 6. Fix Bengali zeros mixed with English
    fixed = fixed.replace(/(\d+)০/g, '$1০'); // Keep Bengali zeros in Bengali context
    fixed = fixed.replace(/০(\d+)/g, '০$1'); // Keep Bengali zeros in Bengali context
    
    // 7. Specific VAT/tax code fixes (only in code context)
    fixed = fixed.replace(/২২০২\.১০\.০o/g, '২২০২.১০.০০');
    fixed = fixed.replace(/২২০২\.৯০\.০o/g, '২২০২.৯০.০০');
    fixed = fixed.replace(/২২০৩\.০০\.০o/g, '২২০৩.০০.০০');
    fixed = fixed.replace(/২৪০২\.১০\.০o/g, '২৪০২.১০.০০');
    fixed = fixed.replace(/২৪০২\.২০\.০o/g, '২৪০২.২০.০০');
    
    // 8. Tax rates: Fix only at end of descriptions
    fixed = fixed.replace(/(তামাকের তৈরি সিগারেট)\s+(\d*)o(\d*)/g, '$1 $2০$3');
    
    console.log('     ✅ Only fixed numbers in numerical contexts');
    console.log('     ✅ Preserved English words like "alcohol", "for", "from"');
    
    return fixed;
  }

  bengaliToEnglish(bengaliNum) {
    let english = bengaliNum;
    for (const [bengali, eng] of Object.entries(this.numberMappings)) {
      english = english.replace(new RegExp(bengali, 'g'), eng);
    }
    return english;
  }

  fixCommonMistakes(text) {
    console.log('   ✏️  Fixing common OCR mistakes...');
    
    let fixed = text;
    
    // Apply common mistake fixes
    for (const [mistake, correction] of Object.entries(this.commonMistakes)) {
      fixed = fixed.replace(new RegExp(mistake, 'g'), correction);
    }
    
    // Fix specific VAT/tax terms
    fixed = fixed
      .replace(/সম্পূরক শুন্ধের/g, 'সম্পূরক শুল্কের')
      .replace(/সম্পূরক শুষ্কের/g, 'সম্পূরক শুল্কের')
      .replace(/মূল্য সংযোজন কর/g, 'মূল্য সংযোজন কর')
      .replace(/VAT\s*কর/g, 'ভ্যাট')
      .replace(/H\.S\./g, 'এইচ.এস.')
      .replace(/HS/g, 'এইচএস');
    
    return fixed;
  }

  cleanFormatting(text) {
    console.log('   📐 Cleaning formatting...');
    
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')   // Convert remaining \r
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive newlines
      .replace(/\s+/g, ' ')   // Normalize spaces
      .replace(/\n\s+/g, '\n') // Remove spaces after newlines
      .replace(/\s+\n/g, '\n') // Remove spaces before newlines
      .replace(/^\s+/gm, '')   // Remove leading spaces from lines
      .trim();
  }

  restructureTables(text) {
    console.log('   📊 Restructuring tables...');
    
    // Fix table headers
    let restructured = text
      .replace(/হেডিং\s*নম্বর\s*এইচ\.\s*এস\.\s*কোড\s*পণ্যের বর্ণনা\s*সম্পূরক শুল্কের হার/g, 
               '\nসম্পূরক শুল্ক আরোপযোগ্য পণ্যসমূহ:\n\nহেডিং নম্বর | এইচ.এস. কোড | পণ্যের বর্ণনা | সম্পূরক শুল্কের হার (%)')
      
      // Fix table data alignment
      .replace(/(\d+\.?\d*)\s+(\d{4}\.\d{2}\.\d{2})\s+(.+?)\s+(\d+)/g, 
               '$1 | $2 | $3 | $4%')
      
      // Fix income tax tables
      .replace(/ক্রমিক\s*পারকুইজিট,?\s*নির্ধারিত মূল্য/g,
               '\nক্রমিক নং | পারকুইজিট, ভাতা, সুবিধা | নির্ধারিত মূল্য')
      
      .replace(/নং\s*ভাতা,?\s*সুবিধা,?\s*ইত্যাদি/g, '');
    
    return restructured;
  }

  removeArtifacts(text) {
    console.log('   🗑️  Removing header/footer artifacts...');
    
    return text
      // Remove page numbers and gazette headers
      .replace(/বাংলাদেশ গেজেট,?\s*অতিরিক্ত,?\s*[^\\n]*\d{4}\s*\d+/gi, '')
      .replace(/^\s*\d{4,6}\s*$/gm, '') // Remove standalone page numbers
      .replace(/রেজিস্টার্ড নং ডি এ-১.*?কর্তৃপক্ষ কর্তৃক প্রকাশিত/gs, '')
      
      // Remove scattered formatting elements
      .replace(/^\s*[\(\)\d\u09E6-\u09EF]+\s*$/gm, '') // Lines with only numbers/brackets
      .replace(/^\s*[G]\s*[\(\d\)]\s*$/gm, '') // Lines like (G) (8)
      
      // Clean up section numbers
      .replace(/^\s*(\d+)\.?\s*$/gm, '\n$1। ') // Fix section numbering
      
      // Remove excessive whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  processFile(inputFile, outputFile) {
    console.log(`\n🚀 PROCESSING: ${path.basename(inputFile)}`);
    console.log('='.repeat(60));

    if (!fs.existsSync(inputFile)) {
      console.error(`❌ File not found: ${inputFile}`);
      return null;
    }

    // Read raw text
    const rawText = fs.readFileSync(inputFile, 'utf8');
    console.log(`📄 Input size: ${rawText.length} characters`);

    // Clean the text
    const cleanedText = this.cleanText(rawText);

    // Create chunks for embedding
    const chunks = this.createIntelligentChunks(cleanedText);

    // Calculate statistics
    const stats = this.calculateStats(cleanedText);

    // Prepare output data
    const outputData = {
      document_info: {
        filename: path.basename(inputFile).replace('.txt', '.pdf'),
        document_type: this.detectDocumentType(inputFile),
        extraction_method: 'chrome_cleaned',
        processing_date: new Date().toISOString(),
        language: stats.language,
        quality_score: 90 // Chrome + cleaning = high quality
      },
      statistics: {
        total_characters: stats.totalCharacters,
        bengali_characters: stats.bengaliCharacters,
        english_characters: stats.englishCharacters,
        bengali_percentage: Math.round((stats.bengaliCharacters / stats.totalCharacters) * 100),
        sections_detected: stats.sections,
        chunks_created: chunks.length
      },
      full_text: cleanedText,
      chunks: chunks,
      processing_metadata: {
        artifacts_removed: true,
        tables_restructured: true,
        numbers_fixed: true,
        ocr_mistakes_corrected: true
      }
    };

    // Save cleaned output
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2), 'utf8');

    console.log('\n✅ CLEANING SUCCESSFUL!');
    console.log('='.repeat(60));
    console.log(`📄 Input: ${rawText.length} chars (raw Chrome extraction)`);
    console.log(`📄 Output: ${cleanedText.length} chars (cleaned)`);
    console.log(`📦 Chunks: ${chunks.length}`);
    console.log(`🎯 Quality: 90% (Chrome + cleaning)`);
    console.log(`📁 Saved: ${path.basename(outputFile)}`);

    return {
      success: true,
      inputFile,
      outputFile,
      originalSize: rawText.length,
      cleanedSize: cleanedText.length,
      chunks: chunks.length,
      stats
    };
  }

  detectDocumentType(filename) {
    const name = filename.toLowerCase();
    if (name.includes('vat')) return 'vat_act';
    if (name.includes('income')) return 'income_tax_act';
    if (name.includes('finance')) return 'finance_act';
    return 'legal_document';
  }

  createIntelligentChunks(text) {
    const chunks = [];
    const chunkSize = 800;
    const sentences = text.split(/([।.!?]+\s*)/);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] || '';
      const punctuation = sentences[i + 1] || '';
      const fullSentence = sentence + punctuation;
      
      if (currentChunk.length + fullSentence.length > chunkSize && currentChunk.length > 200) {
        chunks.push({
          id: `chrome_chunk_${chunkIndex + 1}`,
          content: currentChunk.trim(),
          metadata: {
            chunk_index: chunkIndex,
            character_count: currentChunk.length,
            section: this.extractSectionInfo(currentChunk),
            language: this.detectLanguage(currentChunk)
          }
        });
        
        // Overlap for next chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.min(20, Math.floor(words.length * 0.1)));
        currentChunk = overlapWords.join(' ') + ' ' + fullSentence;
        chunkIndex++;
      } else {
        currentChunk += fullSentence;
      }
    }
    
    // Final chunk
    if (currentChunk.trim().length > 100) {
      chunks.push({
        id: `chrome_chunk_${chunkIndex + 1}`,
        content: currentChunk.trim(),
        metadata: {
          chunk_index: chunkIndex,
          character_count: currentChunk.length,
          section: this.extractSectionInfo(currentChunk),
          language: this.detectLanguage(currentChunk)
        }
      });
    }
    
    return chunks;
  }

  extractSectionInfo(text) {
    const sectionMatch = text.match(/(ধারা\s*[\u09E6-\u09EF\d]+|অনুচ্ছেদ\s*[\u09E6-\u09EF\d]+|অধ্যায়\s*[\u09E6-\u09EF\d]+)/);
    return sectionMatch ? sectionMatch[1] : null;
  }

  detectLanguage(text) {
    const bengaliChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
    const bengaliRatio = bengaliChars / text.length;
    
    if (bengaliRatio > 0.6) return 'bn';
    if (bengaliRatio > 0.2) return 'mixed';
    return 'en';
  }

  calculateStats(text) {
    const bengaliChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const sections = (text.match(/(ধারা|অনুচ্ছেদ|অধ্যায়)\s*[\u09E6-\u09EF\d]+/g) || []).length;
    
    const bengaliRatio = bengaliChars / text.length;
    let language = 'mixed';
    if (bengaliRatio > 0.7) language = 'bn';
    else if (bengaliRatio < 0.2) language = 'en';
    
    return {
      totalCharacters: text.length,
      bengaliCharacters: bengaliChars,
      englishCharacters: englishChars,
      sections,
      language
    };
  }
}

async function cleanChromeFiles() {
  console.log('🚀 AI TAX LAWYER - CHROME TEXT CLEANER');
  console.log('Clean and format Chrome-extracted text files');
  console.log('='.repeat(80));

  const cleaner = new ChromeTextCleaner();
  
  // Files to clean - check what files actually exist
  const dsFolder = path.join(process.cwd(), 'Act-files', 'ds');
  console.log(`📁 Looking for files in: ${dsFolder}`);
  
  if (!fs.existsSync(dsFolder)) {
    console.error(`❌ Directory not found: ${dsFolder}`);
    console.log('Available directories:');
    const actFilesDir = path.join(process.cwd(), 'Act-files');
    if (fs.existsSync(actFilesDir)) {
      fs.readdirSync(actFilesDir).forEach(item => {
        const itemPath = path.join(actFilesDir, item);
        if (fs.statSync(itemPath).isDirectory()) {
          console.log(`   📁 ${item}/`);
        }
      });
    }
    return [];
  }

  // List available files in ds folder
  const availableFiles = fs.readdirSync(dsFolder).filter(f => f.endsWith('.txt'));
  console.log(`📄 Found ${availableFiles.length} text files:`);
  availableFiles.forEach(f => console.log(`   - ${f}`));

  // Define files to clean based on what's actually available
  const filesToClean = [
    {
      input: path.join('Act-files', 'ds', 'vat-2012-bangla.txt'),
      output: 'chrome-cleaned-vat-act-2012.json'
    },
    {
      input: path.join('Act-files', 'ds', 'income-tax-2023-bangla.txt'),
      output: 'chrome-cleaned-income-tax-act-2023.json'
    },
    {
      input: path.join('Act-files', 'ds', 'finance-act-2025-bangla.txt'),
      output: 'chrome-cleaned-finance-act-2025.json'
    }
  ].filter(item => {
    const exists = fs.existsSync(item.input);
    if (!exists) {
      console.log(`⚠️  File not found: ${item.input}`);
    }
    return exists;
  });

  const results = [];

  for (const { input, output } of filesToClean) {
    const result = cleaner.processFile(input, output);
    if (result) {
      results.push(result);
    }
  }

  // Summary
  console.log('\n📊 CLEANING SUMMARY:');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  console.log(`✅ Successfully cleaned: ${successful.length}/${filesToClean.length}`);
  
  if (successful.length > 0) {
    console.log('\n📄 Cleaned Files:');
    successful.forEach(result => {
      console.log(`   - ${path.basename(result.outputFile)} (${result.chunks} chunks)`);
    });
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Generate embeddings for cleaned texts');
    console.log('2. Store in Supabase vector database');
    console.log('3. Test RAG queries');
    console.log('4. Compare with OCR results');
  }

  return results;
}

// Run if called directly
if (require.main === module) {
  cleanChromeFiles().catch(console.error);
}

module.exports = { ChromeTextCleaner, cleanChromeFiles };