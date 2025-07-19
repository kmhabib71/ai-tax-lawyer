/**
 * Aggressive Table Cleaner - AI Tax Lawyer Bangladesh
 * Fix all remaining So, So0, Soo issues in tax tables aggressively
 */

const fs = require('fs');
const path = require('path');

function aggressiveTableClean(filePath) {
  console.log(`🔥 AGGRESSIVE CLEANING: ${path.basename(filePath)}`);
  console.log('Fixing ALL remaining table artifacts...');
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let text = data.full_text;
  
  console.log(`📄 Original: ${text.length} characters`);
  
  // AGGRESSIVE FIXES - Fix all obvious table issues
  
  // 1. Fix mixed numbers/letters in tax context
  text = text
    // Fix Hindi numerals mixed with Bengali
    .replace(/[०१२३४५६७८९]/g, (match) => {
      const hindiToBengali = {
        '०': '০', '१': '১', '२': '২', '३': '৩', '४': '৪',
        '५': '৫', '६': '৬', '७': '৭', '८': '৮', '९': '৯'
      };
      return hindiToBengali[match] || match;
    })
    
    // Fix common corrupted rates in tax tables
    .replace(/\bSo\b(?=\s|$|\n)/g, '৫০০')  // So at end of line = 500%
    .replace(/\bSoo\b/g, '৫০০')            // Soo = 500%
    .replace(/\bSo0\b/g, '৫০০')            // So0 = 500%
    .replace(/\bS00\b/g, '৫০০')            // S00 = 500%
    
    // Fix broken HS codes aggressively
    .replace(/b0\.80/g, '৮০.৮০')
    .replace(/b088/g, '৮৫৪৪')
    .replace(/b\.88/g, '৮৫.৪৪')
    .replace(/b088\.82\.00/g, '৮৫৪৪.৮২.০০')
    .replace(/b088\.90\.00/g, '৮৫৪৪.৯০.০০')
    .replace(/b080\.80\.00/g, '৮০৮০.৮০.০০')
    
    // Fix standalone numbers that are clearly rates
    .replace(/(\n.*electronic cigarettes.*)\s+০০\s*$/gmi, '$1 ৫০০')
    .replace(/(\n.*vaporising devices.*)\s+০০\s*$/gmi, '$1 ৫০০')
    .replace(/(\n.*Motor vehicles.*)\s+০০\s*$/gmi, '$1 ২০')
    .replace(/(\n.*Microbus.*)\s+০০\s*$/gmi, '$1 ২০')
    .replace(/(\n.*optical fibre.*)\s+০০\s*$/gmi, '$1 ৫০০')
    
    // Fix specific patterns in your example
    .replace(/৪९৭৯/g, '৪৯৭৯')  // Fix mixed Hindi digits
    .replace(/০९০९৭০DA/g, '০৯০৯৭০')  // Remove Latin letters, fix Hindi
    
    // Fix table structure - make it more searchable
    .replace(/শিরনামা\s*সংখ্যা.*?শুল্কহার.*?\n/gs, '\n=== SUPPLEMENTARY DUTY TABLE ===\n')
    .replace(/\(১\)\s*\(২\)\s*\(৩\)\s*\(৮\)/g, 'Heading | HS Code | Description | Rate (%)')
    
    // Fix specific product entries from your example
    .replace(/(৮৫৩৯\.৩১\.৯০.*?এনার্জি সেভিং ল্যাম্প.*?)\s*৮\s*$/gm, '$1 | Rate: ৮%')
    .replace(/(২০)\s*$/gm, '| Rate: ২০%')
    .replace(/(৩০)\s*$/gm, '| Rate: ৩০%')
    
    // Clean up excessive whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  // Update chunks too
  data.chunks = data.chunks.map(chunk => ({
    ...chunk,
    content: aggressiveCleanChunk(chunk.content)
  }));
  
  // Update data
  data.full_text = text;
  data.processing_metadata = data.processing_metadata || {};
  data.processing_metadata.aggressive_table_cleaned = true;
  data.processing_metadata.aggressive_clean_date = new Date().toISOString();
  
  // Save back
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  
  console.log(`✅ Aggressive cleaning completed!`);
  console.log(`📄 Cleaned: ${text.length} characters`);
  console.log(`📦 Chunks updated: ${data.chunks.length}`);
  
  // Validate fixes
  validateTableFixes(text);
  
  return data;
}

function aggressiveCleanChunk(content) {
  return content
    // Fix all the same issues in chunks
    .replace(/[०१२३४५६७८९]/g, (match) => {
      const hindiToBengali = {
        '०': '০', '१': '১', '२': '২', '३': '৩', '४': '৪',
        '५': '৫', '६': '৬', '७': '৭', '८': '৮', '९': '৯'
      };
      return hindiToBengali[match] || match;
    })
    .replace(/\bSo\b(?=\s|$|\n)/g, '৫০০')
    .replace(/\bSoo\b/g, '৫০০')
    .replace(/\bSo0\b/g, '৫০০')
    .replace(/\bS00\b/g, '৫০০')
    .replace(/b0\.80/g, '৮০.৮০')
    .replace(/b088/g, '৮৫৪৪')
    .replace(/৪९৭৯/g, '৪৯৭৯')
    .replace(/০९০९৭০DA/g, '০৯০৯৭০');
}

function validateTableFixes(text) {
  console.log('\n🔍 VALIDATION AFTER AGGRESSIVE CLEANING:');
  
  const soCount = (text.match(/\bSo\b/g) || []).length;
  const sooCount = (text.match(/\bSoo\b/g) || []).length;
  const so0Count = (text.match(/\bSo0\b/g) || []).length;
  const hindiDigits = (text.match(/[०१२३४५६७८९]/g) || []).length;
  const mixedCodes = (text.match(/b\d/g) || []).length;
  
  console.log(`   ❌ Remaining "So": ${soCount}`);
  console.log(`   ❌ Remaining "Soo": ${sooCount}`);
  console.log(`   ❌ Remaining "So0": ${so0Count}`);
  console.log(`   ❌ Remaining Hindi digits: ${hindiDigits}`);
  console.log(`   ❌ Remaining broken codes (b088, etc): ${mixedCodes}`);
  
  const totalIssues = soCount + sooCount + so0Count + hindiDigits + mixedCodes;
  
  if (totalIssues === 0) {
    console.log('   ✅ ALL TABLE ARTIFACTS CLEANED!');
  } else {
    console.log(`   ⚠️  ${totalIssues} issues remain - may need manual review`);
  }
  
  // Check for structured data
  const hsCodeCount = (text.match(/\d{4}\.\d{2}\.\d{2}/g) || []).length;
  const ratePatterns = (text.match(/Rate: \d+%/g) || []).length;
  
  console.log(`   📊 HS Codes found: ${hsCodeCount}`);
  console.log(`   💰 Structured rates: ${ratePatterns}`);
}

async function cleanAllTableFiles() {
  console.log('🔥 AI TAX LAWYER - AGGRESSIVE TABLE CLEANER');
  console.log('Fix ALL remaining table artifacts aggressively');
  console.log('='.repeat(70));

  const filesToClean = [
    'chrome-cleaned-vat-act-2012.json',
    'chrome-cleaned-income-tax-act-2023.json',
    'chrome-cleaned-finance-act-2025.json'
  ].filter(f => fs.existsSync(f));

  if (filesToClean.length === 0) {
    console.error('❌ No chrome-cleaned files found to process');
    return;
  }

  console.log(`📄 Found ${filesToClean.length} files to clean aggressively`);

  for (const file of filesToClean) {
    aggressiveTableClean(file);
    console.log(''); // Add spacing between files
  }

  console.log('🎯 AGGRESSIVE CLEANING COMPLETE!');
  console.log('All files should now have clean tax tables for RAG');
  console.log('\nNext steps:');
  console.log('1. Generate embeddings from cleaned files');
  console.log('2. Store in Supabase vector database');
  console.log('3. Test RAG queries for tax rates');
}

if (require.main === module) {
  cleanAllTableFiles().catch(console.error);
}

module.exports = { aggressiveTableClean, cleanAllTableFiles };