/**
 * Intelligent Table Reconstructor - AI Tax Lawyer Bangladesh
 * Advanced table parsing for broken tax table data
 */

const fs = require('fs');
const path = require('path');

class IntelligentTableReconstructor {
  constructor() {
    this.hsCodePattern = /(\d{2,4})\.(\d{1,2})\.(\d{1,2})/g;
    this.ratePattern = /(\d{1,4})%?$/;
    this.productDescriptions = [];
    this.reconstructedTables = [];
  }

  analyzeAndReconstructTables(text) {
    console.log('🧠 INTELLIGENT TABLE RECONSTRUCTION');
    console.log('Analyzing text patterns for table reconstruction...');
    
    // Step 1: Find all table sections
    const tableSections = this.findTableSections(text);
    console.log(`📊 Found ${tableSections.length} table sections`);
    
    // Step 2: Reconstruct each table
    const reconstructedTables = [];
    tableSections.forEach((section, index) => {
      console.log(`\n🔧 Reconstructing table ${index + 1}...`);
      const reconstructed = this.reconstructTable(section);
      if (reconstructed.rows.length > 0) {
        reconstructedTables.push(reconstructed);
        console.log(`   ✅ Reconstructed ${reconstructed.rows.length} rows`);
      }
    });
    
    // Step 3: Generate clean text with reconstructed tables
    const cleanText = this.generateCleanTextWithTables(text, reconstructedTables);
    
    return {
      originalText: text,
      cleanText: cleanText,
      reconstructedTables: reconstructedTables,
      tableCount: reconstructedTables.length,
      totalRows: reconstructedTables.reduce((sum, table) => sum + table.rows.length, 0)
    };
  }

  findTableSections(text) {
    const sections = [];
    
    // Pattern 1: Look for table headers
    const tableHeaderPatterns = [
      /শিরনামা[\s\S]*?শুল্কহার/g,
      /Heading[\s\S]*?Rate/g,
      /হেডিং[\s\S]*?পরিমাণ/g,
      /এইচ\.?\s*এস\.?\s*কোড[\s\S]*?বর্ণনা/g
    ];
    
    tableHeaderPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Extract context around the match (500 chars before and 2000 after)
        const start = Math.max(0, match.index - 500);
        const end = Math.min(text.length, match.index + match[0].length + 2000);
        sections.push({
          type: 'header_based',
          content: text.substring(start, end),
          startIndex: match.index,
          headerMatch: match[0]
        });
      }
    });
    
    // Pattern 2: Look for HS code clusters
    const hsCodeMatches = [...text.matchAll(this.hsCodePattern)];
    if (hsCodeMatches.length > 5) {
      // Group nearby HS codes
      let currentGroup = [];
      let lastIndex = -1000;
      
      hsCodeMatches.forEach(match => {
        if (match.index - lastIndex < 200) {
          currentGroup.push(match);
        } else {
          if (currentGroup.length > 2) {
            sections.push(this.extractHSCodeSection(text, currentGroup));
          }
          currentGroup = [match];
        }
        lastIndex = match.index;
      });
      
      // Don't forget the last group
      if (currentGroup.length > 2) {
        sections.push(this.extractHSCodeSection(text, currentGroup));
      }
    }
    
    return sections;
  }

  extractHSCodeSection(text, hsMatches) {
    const firstMatch = hsMatches[0];
    const lastMatch = hsMatches[hsMatches.length - 1];
    
    const start = Math.max(0, firstMatch.index - 200);
    const end = Math.min(text.length, lastMatch.index + 500);
    
    return {
      type: 'hs_code_cluster',
      content: text.substring(start, end),
      startIndex: firstMatch.index,
      hsCodeCount: hsMatches.length
    };
  }

  reconstructTable(section) {
    const rows = [];
    const lines = section.content.split('\n').filter(line => line.trim());
    
    console.log(`   📝 Processing ${lines.length} lines...`);
    
    let currentRow = {};
    let pendingDescription = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Try to identify what this line contains
      const analysis = this.analyzeLine(line);
      
      if (analysis.hasHSCode) {
        // Save previous row if exists
        if (currentRow.hsCode || pendingDescription) {
          rows.push(this.finalizeRow(currentRow, pendingDescription));
        }
        
        // Start new row
        currentRow = {
          hsCode: analysis.hsCode,
          description: analysis.description || '',
          rate: analysis.rate || null,
          rawLine: line
        };
        pendingDescription = '';
        
      } else if (analysis.hasRate && currentRow.hsCode) {
        // Add rate to current row
        currentRow.rate = analysis.rate;
        if (analysis.description) {
          currentRow.description += ' ' + analysis.description;
        }
        
      } else if (analysis.description && (currentRow.hsCode || pendingDescription)) {
        // Add to description
        if (currentRow.hsCode) {
          currentRow.description += ' ' + analysis.description;
        } else {
          pendingDescription += ' ' + analysis.description;
        }
        
      } else if (this.looksLikeProductDescription(line)) {
        // Standalone product description
        if (currentRow.hsCode) {
          currentRow.description += ' ' + line;
        } else {
          pendingDescription += ' ' + line;
        }
      }
    }
    
    // Don't forget the last row
    if (currentRow.hsCode || pendingDescription) {
      rows.push(this.finalizeRow(currentRow, pendingDescription));
    }
    
    // Clean up and validate rows
    const validRows = rows
      .filter(row => row.hsCode || (row.description && row.description.length > 10))
      .map(row => this.cleanRow(row));
    
    return {
      type: section.type,
      rows: validRows,
      originalContent: section.content
    };
  }

  analyzeLine(line) {
    const analysis = {
      hasHSCode: false,
      hasRate: false,
      hsCode: null,
      rate: null,
      description: null
    };
    
    // Check for HS codes
    const hsMatch = line.match(/(\d{2,4})\.(\d{1,2})\.(\d{1,2})/);
    if (hsMatch) {
      analysis.hasHSCode = true;
      analysis.hsCode = hsMatch[0];
      
      // Extract description after HS code
      const afterHS = line.substring(hsMatch.index + hsMatch[0].length).trim();
      if (afterHS) {
        analysis.description = afterHS.replace(/^\s*[|\-\s]+/, '').trim();
      }
    }
    
    // Check for rates (numbers at end of line, possibly with %)
    const rateMatch = line.match(/(\d{1,4})%?\s*$/);
    if (rateMatch) {
      analysis.hasRate = true;
      analysis.rate = parseInt(rateMatch[1]);
      
      // Extract description before rate
      const beforeRate = line.substring(0, rateMatch.index).trim();
      if (beforeRate && !analysis.hsCode) {
        analysis.description = beforeRate.replace(/[|\-\s]+$/, '').trim();
      }
    }
    
    // If no HS code or rate, treat entire line as description
    if (!analysis.hasHSCode && !analysis.hasRate) {
      analysis.description = line.replace(/^[|\-\s]+/, '').replace(/[|\-\s]+$/, '').trim();
    }
    
    return analysis;
  }

  looksLikeProductDescription(line) {
    const productKeywords = [
      'ল্যাম্প', 'lamp', 'গাড়ী', 'motor', 'vehicle', 'cigarette', 'সিগারেট',
      'electronic', 'ইলেকট্রনিক', 'cable', 'কেবল', 'oil', 'তেল',
      'apparatus', 'যন্ত্র', 'equipment', 'সরঞ্জাম'
    ];
    
    const lowerLine = line.toLowerCase();
    return productKeywords.some(keyword => lowerLine.includes(keyword.toLowerCase()));
  }

  finalizeRow(currentRow, pendingDescription) {
    if (!currentRow.hsCode && pendingDescription) {
      // This is a description-only row
      return {
        hsCode: null,
        description: pendingDescription.trim(),
        rate: null,
        type: 'description_only'
      };
    }
    
    if (pendingDescription) {
      currentRow.description = (pendingDescription + ' ' + (currentRow.description || '')).trim();
    }
    
    return {
      ...currentRow,
      type: 'product_entry'
    };
  }

  cleanRow(row) {
    return {
      ...row,
      description: row.description ? this.cleanDescription(row.description) : '',
      hsCode: row.hsCode ? this.cleanHSCode(row.hsCode) : null,
      rate: row.rate ? this.cleanRate(row.rate) : null
    };
  }

  cleanDescription(desc) {
    return desc
      .replace(/\s+/g, ' ')
      .replace(/[|\-]{2,}/g, '')
      .replace(/^\s*[|\-\s]+/, '')
      .replace(/[|\-\s]+$/, '')
      .trim();
  }

  cleanHSCode(code) {
    return code.replace(/[^0-9.]/g, '');
  }

  cleanRate(rate) {
    if (typeof rate === 'string') {
      return parseInt(rate.replace(/[^0-9]/g, ''));
    }
    return rate;
  }

  generateCleanTextWithTables(originalText, tables) {
    let cleanText = originalText;
    
    // Replace each table section with clean structured format
    tables.forEach((table, index) => {
      const structuredTable = this.formatTableAsStructuredText(table, index);
      
      // Try to find and replace the original messy table
      // This is approximate - in practice, you'd need more sophisticated replacement
      const tableMarker = `\n\n=== RECONSTRUCTED TAX TABLE ${index + 1} ===\n${structuredTable}\n=== END TABLE ${index + 1} ===\n\n`;
      
      if (index === 0) {
        // Insert first table at a reasonable position
        const insertPoint = cleanText.indexOf('সম্পূরক শুল্ক') || cleanText.indexOf('supplementary duty') || cleanText.length / 2;
        cleanText = cleanText.substring(0, insertPoint) + tableMarker + cleanText.substring(insertPoint);
      }
    });
    
    return cleanText;
  }

  formatTableAsStructuredText(table, index) {
    let formatted = `TAX TABLE ${index + 1} (${table.rows.length} entries):\n\n`;
    
    table.rows.forEach(row => {
      if (row.type === 'product_entry' && row.hsCode) {
        formatted += `HS Code: ${row.hsCode}\n`;
        formatted += `Product: ${row.description}\n`;
        if (row.rate) {
          formatted += `Tax Rate: ${row.rate}%\n`;
        }
        formatted += `---\n`;
      } else if (row.description) {
        formatted += `Description: ${row.description}\n`;
      }
    });
    
    return formatted;
  }

  processFile(inputFile, outputFile) {
    console.log(`\n🧠 INTELLIGENT TABLE RECONSTRUCTION: ${path.basename(inputFile)}`);
    console.log('='.repeat(70));

    if (!fs.existsSync(inputFile)) {
      console.error(`❌ File not found: ${inputFile}`);
      return null;
    }

    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    const originalText = data.full_text;
    
    if (!originalText) {
      console.error(`❌ No text content found in ${inputFile}`);
      return null;
    }

    console.log(`📄 Original: ${originalText.length} characters`);
    
    // Reconstruct tables
    const result = this.analyzeAndReconstructTables(originalText);
    
    // Update the data
    data.full_text = result.cleanText;
    data.processing_metadata = data.processing_metadata || {};
    data.processing_metadata.intelligent_table_reconstruction = true;
    data.processing_metadata.reconstruction_date = new Date().toISOString();
    data.processing_metadata.tables_reconstructed = result.tableCount;
    data.processing_metadata.total_table_rows = result.totalRows;
    
    // Also update chunks with clean text
    data.chunks = data.chunks.map(chunk => ({
      ...chunk,
      content: this.cleanChunkText(chunk.content),
      metadata: {
        ...chunk.metadata,
        table_reconstructed: true
      }
    }));
    
    // Save reconstructed version
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');
    
    console.log('\n✅ INTELLIGENT RECONSTRUCTION COMPLETED!');
    console.log('='.repeat(70));
    console.log(`📄 Reconstructed: ${result.cleanText.length} characters`);
    console.log(`📊 Tables found: ${result.tableCount}`);
    console.log(`📋 Total rows: ${result.totalRows}`);
    console.log(`📁 Saved: ${path.basename(outputFile)}`);
    
    // Show sample of reconstructed tables
    if (result.reconstructedTables.length > 0) {
      console.log('\n📊 SAMPLE RECONSTRUCTED DATA:');
      const sampleTable = result.reconstructedTables[0];
      sampleTable.rows.slice(0, 3).forEach(row => {
        if (row.hsCode) {
          console.log(`   HS: ${row.hsCode} | ${row.description.substring(0, 50)}... | Rate: ${row.rate || 'N/A'}%`);
        }
      });
    }
    
    return {
      success: true,
      inputFile,
      outputFile,
      tablesReconstructed: result.tableCount,
      totalRows: result.totalRows,
      originalSize: originalText.length,
      reconstructedSize: result.cleanText.length
    };
  }

  cleanChunkText(content) {
    // Apply intelligent cleaning to chunk content
    const miniResult = this.analyzeAndReconstructTables(content);
    return miniResult.cleanText;
  }
}

async function reconstructAllTableFiles() {
  console.log('🧠 AI TAX LAWYER - INTELLIGENT TABLE RECONSTRUCTOR');
  console.log('Advanced table parsing for broken tax data');
  console.log('='.repeat(80));

  const reconstructor = new IntelligentTableReconstructor();
  
  const filesToReconstruct = [
    {
      input: 'chrome-cleaned-vat-act-2012.json',
      output: 'table-reconstructed-vat-act-2012.json'
    },
    {
      input: 'chrome-cleaned-income-tax-act-2023.json',
      output: 'table-reconstructed-income-tax-act-2023.json'
    },
    {
      input: 'chrome-cleaned-finance-act-2025.json',
      output: 'table-reconstructed-finance-act-2025.json'
    }
  ].filter(item => fs.existsSync(item.input));

  const results = [];
  
  for (const { input, output } of filesToReconstruct) {
    const result = reconstructor.processFile(input, output);
    if (result) {
      results.push(result);
    }
  }

  console.log('\n📊 RECONSTRUCTION SUMMARY:');
  console.log('='.repeat(80));
  console.log(`✅ Successfully reconstructed: ${results.length} files`);
  
  const totalTables = results.reduce((sum, r) => sum + r.tablesReconstructed, 0);
  const totalRows = results.reduce((sum, r) => sum + r.totalRows, 0);
  
  console.log(`📊 Total tables reconstructed: ${totalTables}`);
  console.log(`📋 Total rows extracted: ${totalRows}`);
  
  if (results.length > 0) {
    console.log('\n📄 Reconstructed Files:');
    results.forEach(result => {
      console.log(`   - ${path.basename(result.outputFile)} (${result.tablesReconstructed} tables, ${result.totalRows} rows)`);
    });
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Review sample reconstructed data above');
    console.log('2. Generate embeddings from table-reconstructed files');
    console.log('3. Test RAG queries for accurate tax rates');
    console.log('4. Validate search accuracy for HS codes');
  }

  return results;
}

if (require.main === module) {
  reconstructAllTableFiles().catch(console.error);
}

module.exports = { IntelligentTableReconstructor, reconstructAllTableFiles };