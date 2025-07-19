/**
 * Fix Tax Tables - AI Tax Lawyer Bangladesh
 * Specialized tool to reconstruct broken tax tables for accurate RAG
 */

const fs = require('fs');
const path = require('path');

class TaxTableFixer {
  constructor() {
    this.hsCodePattern = /(\d{4})\.(\d{2})\.(\d{2})/;
    this.ratePatterns = {
      'So': '৫০০',
      'Soo': '৫০০', 
      'So0': '৫০০',
      'S00': '৫০০',
      '00': '৬০০',  // Common for alcohol
      '8': '৮',      // Single digit rates
      '20': '২০',    // 20% rate
      '30': '৩০',    // 30% rate
    };
  }

  fixTaxTables(text) {
    console.log('📊 Fixing tax table structures...');
    
    let fixed = text;
    
    // 1. Fix broken HS codes
    fixed = this.fixHSCodes(fixed);
    
    // 2. Fix tax rates
    fixed = this.fixTaxRates(fixed);
    
    // 3. Restructure table format
    fixed = this.restructureTableRows(fixed);
    
    // 4. Clean up table headers
    fixed = this.fixTableHeaders(fixed);
    
    console.log('   ✅ Tax tables restructured for accurate search');
    return fixed;
  }

  fixHSCodes(text) {
    console.log('   🔢 Fixing HS codes...');
    
    return text
      // Fix common HS code corruption
      .replace(/b0\.80/g, '৮০.৮০')
      .replace(/b088/g, '৮৫৪৪')
      .replace(/b\.88/g, '৮৫.৪৪')
      .replace(/b088\.82\.00/g, '৮৫৪৪.৮২.০০')
      .replace(/b088\.90\.00/g, '৮৫৪৪.৯০.০০')
      
      // Fix Bengali HS codes with corruption
      .replace(/৮০\.৮০\.০o/g, '৮০.৮০.০০')
      .replace(/৮৫৪২\.৩৯\.১o/g, '৮৫৪২.৩৯.১০')
      .replace(/৮৫৪৩\.৯০\.১o/g, '৮৫৪৩.৯০.১০')
      .replace(/৮৫৪৪\.১৯\.৯o/g, '৮৫৪৪.১৯.৯০')
      .replace(/৮৫৪৪\.২০\.০o/g, '৮৫৪৪.২০.০০')
      .replace(/৮৫৪৫\.৯০\.৯o/g, '৮৫৪৫.৯০.৯০')
      .replace(/৮৭০২\.১০\.৪১/g, '৮৭০২.১০.৪১')
      .replace(/৮৭০২\.১০\.৪৯/g, '৮৭০২.১০.৪৯')
      .replace(/৮৭০২\.৯০\.৪০/g, '৮৭০২.৯০.৪০');
  }

  fixTaxRates(text) {
    console.log('   💰 Fixing tax rates...');
    
    let fixed = text;
    
    // Fix specific corrupted rates with context
    for (const [corrupt, correct] of Object.entries(this.ratePatterns)) {
      // Only fix rates at end of lines or before line breaks
      const contextPattern = new RegExp(`\\b${corrupt}\\b(?=\\s*$|\\s*\\n)`, 'gm');
      fixed = fixed.replace(contextPattern, correct);
    }
    
    // Fix specific product rate contexts
    fixed = fixed
      // Electronic cigarettes - common rate 500%
      .replace(/(Electronic cigarettes[^\\n]*?)So0?/gi, '$1৫০০')
      .replace(/(electric vaporising devices[^\\n]*?)So0?/gi, '$1৫০০')
      
      // Motor vehicles - common rate 20-30%
      .replace(/(Motor vehicles[^\\n]*?)So/gi, '$1২০')
      .replace(/(Microbus[^\\n]*?)So/gi, '$1২০')
      .replace(/(Human hauler[^\\n]*?)So/gi, '$1৩০')
      
      // Optical cables - common rate 500%
      .replace(/(Optical fibre cables[^\\n]*?)So/gi, '$1৫০০')
      
      // Electrical items - common rate 20%
      .replace(/(electric conductors[^\\n]*?)০০/gi, '$1২০')
      .replace(/(উইন্ডিং ওয়্যার[^\\n]*?)০০/gi, '$1২০');
    
    return fixed;
  }

  restructureTableRows(text) {
    console.log('   📋 Restructuring table rows...');
    
    // Find and fix table patterns
    let restructured = text
      // Fix HS code + description + rate pattern
      .replace(/(\d{4}\.\d{2}\.\d{2})\s+([^\\n]+?)\s+(\d+)\s*$/gm, 
               'HS: $1 | $2 | Rate: $3%')
      
      // Fix Bengali HS code + description + rate
      .replace(/([\u09E6-\u09EF]{4}\.[\u09E6-\u09EF]{2}\.[\u09E6-\u09EF]{2})\s+([^\\n]+?)\s+([\u09E6-\u09EF]+)\s*$/gm,
               'HS: $1 | $2 | Rate: $3%')
      
      // Fix mixed patterns
      .replace(/(\d{2}\.\d{2})\s+(\d{4}\.\d{2}\.\d{2})\s+([^\\n]+?)\s+(\d+)\s*$/gm,
               'Section: $1 | HS: $2 | $3 | Rate: $4%')
      
      // Group related items
      .replace(/^(\d{4}\.\d{2}\.\d{2})\s*$/gm, '\n--- HS Code: $1 ---')
      .replace(/^([\u09E6-\u09EF]{4}\.[\u09E6-\u09EF]{2}\.[\u09E6-\u09EF]{2})\s*$/gm, '\n--- HS Code: $1 ---');
    
    return restructured;
  }

  fixTableHeaders(text) {
    console.log('   📊 Fixing table headers...');
    
    return text
      // Standardize table headers
      .replace(/শিরনামা\s*সংখ্যা.*?শুল্কহার/gs, 
               '\n=== TAX TABLE ===\nHeading | HS Code | Description | Rate (%)\n')
      
      // Fix column indicators
      .replace(/\(১\)\s*\(২\)\s*\(৩\)\s*\(৮\)/g, 
               '(1) | (2) | (3) | (4)')
      
      // Clean up gazette references in tables
      .replace(/বাংলাদেশ গেজেট.*?\d{4}/g, '');
  }

  processFile(inputFile, outputFile) {
    console.log(`\n🔧 FIXING TAX TABLES: ${path.basename(inputFile)}`);
    console.log('='.repeat(60));

    if (!fs.existsSync(inputFile)) {
      console.error(`❌ File not found: ${inputFile}`);
      return null;
    }

    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    console.log(`📄 Original: ${data.full_text.length} characters`);
    
    // Fix the full text
    const fixedText = this.fixTaxTables(data.full_text);
    
    // Update data
    data.full_text = fixedText;
    data.processing_metadata.tax_tables_fixed = true;
    data.processing_metadata.table_fix_date = new Date().toISOString();
    
    // Fix chunks too
    data.chunks = data.chunks.map((chunk, index) => ({
      ...chunk,
      content: this.fixTaxTables(chunk.content),
      metadata: {
        ...chunk.metadata,
        table_structured: true
      }
    }));
    
    // Save fixed version
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');
    
    console.log('\n✅ TAX TABLE FIXING COMPLETED!');
    console.log('='.repeat(60));
    console.log(`📄 Fixed text: ${fixedText.length} characters`);
    console.log(`📦 Fixed chunks: ${data.chunks.length}`);
    console.log(`📁 Saved: ${path.basename(outputFile)}`);
    
    // Validate some key fixes
    this.validateFixes(fixedText);
    
    return {
      success: true,
      inputFile,
      outputFile,
      fixedSize: fixedText.length,
      chunks: data.chunks.length
    };
  }

  validateFixes(text) {
    console.log('\n🔍 VALIDATION:');
    
    const hsCodeCount = (text.match(/\d{4}\.\d{2}\.\d{2}/g) || []).length;
    const rateCount = (text.match(/Rate: \d+%/g) || []).length;
    const structuredTables = (text.match(/=== TAX TABLE ===/g) || []).length;
    
    console.log(`   📊 HS Codes found: ${hsCodeCount}`);
    console.log(`   💰 Tax rates structured: ${rateCount}`);
    console.log(`   📋 Structured tables: ${structuredTables}`);
    
    if (hsCodeCount > 50 && rateCount > 20) {
      console.log('   ✅ Table structure looks good for RAG search');
    } else {
      console.log('   ⚠️  May need additional table fixes');
    }
  }
}

async function fixAllTaxTables() {
  console.log('🔧 AI TAX LAWYER - TAX TABLE FIXER');
  console.log('Fix broken tables for accurate RAG search');
  console.log('='.repeat(80));

  const fixer = new TaxTableFixer();
  
  const filesToFix = [
    {
      input: 'chrome-cleaned-vat-act-2012.json',
      output: 'tax-table-fixed-vat-act-2012.json'
    },
    {
      input: 'chrome-cleaned-income-tax-act-2023.json', 
      output: 'tax-table-fixed-income-tax-act-2023.json'
    },
    {
      input: 'chrome-cleaned-finance-act-2025.json',
      output: 'tax-table-fixed-finance-act-2025.json'
    }
  ].filter(item => fs.existsSync(item.input));

  const results = [];
  
  for (const { input, output } of filesToFix) {
    const result = fixer.processFile(input, output);
    if (result) {
      results.push(result);
    }
  }

  console.log('\n📊 TABLE FIXING SUMMARY:');
  console.log('='.repeat(80));
  console.log(`✅ Successfully fixed: ${results.length} files`);
  
  if (results.length > 0) {
    console.log('\n📄 Fixed Files:');
    results.forEach(result => {
      console.log(`   - ${path.basename(result.outputFile)} (${result.chunks} chunks)`);
    });
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Generate embeddings from table-fixed files');
    console.log('2. Store in Supabase with structured tax data');
    console.log('3. Test RAG queries for HS codes and tax rates');
    console.log('4. Validate search accuracy for tax calculations');
  }

  return results;
}

if (require.main === module) {
  fixAllTaxTables().catch(console.error);
}

module.exports = { TaxTableFixer, fixAllTaxTables };