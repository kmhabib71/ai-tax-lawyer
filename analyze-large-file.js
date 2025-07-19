/**
 * Large File Analyzer - AI Tax Lawyer Bangladesh
 * Analyzes large JSON files without loading them entirely into memory
 */

const fs = require('fs');
const path = require('path');

class LargeFileAnalyzer {
  constructor() {
    this.chunkSize = 1024 * 1024; // 1MB chunks
  }

  analyzeJSONFile(filePath) {
    console.log(`🔍 Analyzing large file: ${path.basename(filePath)}`);
    console.log('='.repeat(50));
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    console.log(`📁 File size: ${Math.round(stats.size / 1024)}KB`);
    
    // Read first chunk to get structure
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(Math.min(this.chunkSize, stats.size));
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    
    const firstChunk = buffer.toString('utf8');
    
    try {
      // Try to parse beginning of JSON
      let jsonStart = firstChunk;
      if (!firstChunk.trim().endsWith('}')) {
        // Find a good breaking point
        const lastBrace = firstChunk.lastIndexOf('}');
        if (lastBrace > 0) {
          jsonStart = firstChunk.substring(0, lastBrace + 1);
        }
      }
      
      // Attempt partial parse
      const partialData = JSON.parse(jsonStart + '}'); // Close the JSON
      
      console.log('📋 FILE STRUCTURE ANALYSIS:');
      console.log('='.repeat(50));
      
      this.analyzeStructure(partialData, filePath, stats.size);
      
    } catch (error) {
      console.log('⚠️  Could not parse as JSON, analyzing as text...');
      this.analyzeTextFile(firstChunk, stats.size);
    }
  }

  analyzeStructure(data, filePath, fileSize) {
    // Basic file info
    console.log(`📊 Basic Info:`);
    console.log(`   File: ${path.basename(filePath)}`);
    console.log(`   Size: ${Math.round(fileSize / 1024)}KB`);
    console.log(`   Type: JSON`);
    
    // Analyze top-level keys
    console.log(`\n🔑 Top-level keys:`);
    Object.keys(data).forEach(key => {
      const value = data[key];
      const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
      console.log(`   ${key}: ${type}`);
      
      if (key === 'chunks' && Array.isArray(value)) {
        console.log(`      Sample chunk keys: ${Object.keys(value[0] || {}).join(', ')}`);
      }
    });
    
    // OCR-specific analysis
    if (data.extraction_method === 'OCR') {
      console.log(`\n🔍 OCR Analysis:`);
      console.log(`   Document: ${data.document || 'Unknown'}`);
      console.log(`   Pages: ${data.total_pages || 'Unknown'}`);
      console.log(`   Characters: ${data.total_characters || 'Unknown'}`);
      console.log(`   Bengali chars: ${data.bengali_characters || 'Unknown'}`);
      console.log(`   English chars: ${data.english_characters || 'Unknown'}`);
      console.log(`   Language: ${data.language || 'Unknown'}`);
      console.log(`   Chunks created: ${data.chunks_created || 'Unknown'}`);
    }
    
    // Chunk analysis
    if (data.chunks && Array.isArray(data.chunks)) {
      console.log(`\n📦 Chunk Analysis:`);
      console.log(`   Total chunks: ${data.chunks.length}`);
      
      if (data.chunks.length > 0) {
        const firstChunk = data.chunks[0];
        console.log(`   Chunk structure:`);
        Object.keys(firstChunk).forEach(key => {
          const value = firstChunk[key];
          if (typeof value === 'string' && value.length > 100) {
            console.log(`     ${key}: string[${value.length}] "${value.substring(0, 50)}..."`);
          } else if (typeof value === 'object') {
            console.log(`     ${key}: object[${Object.keys(value).join(', ')}]`);
          } else {
            console.log(`     ${key}: ${typeof value} (${value})`);
          }
        });
        
        // Sample content
        if (firstChunk.content) {
          console.log(`\n📝 Sample content:`);
          console.log(`   "${firstChunk.content.substring(0, 200)}..."`);
        }
      }
    }
  }

  analyzeTextFile(content, fileSize) {
    console.log(`📊 Text File Analysis:`);
    console.log(`   Size: ${Math.round(fileSize / 1024)}KB`);
    console.log(`   Lines (sample): ${content.split('\n').length}`);
    console.log(`   Characters (sample): ${content.length}`);
    
    // Look for patterns
    const patterns = {
      'JSON-like': /[{}\[\]]/g,
      'Bengali text': /[\u0980-\u09FF]/g,
      'English text': /[A-Za-z]/g,
      'Numbers': /\d/g
    };
    
    console.log(`\n🔍 Content patterns:`);
    Object.entries(patterns).forEach(([name, pattern]) => {
      const matches = content.match(pattern) || [];
      console.log(`   ${name}: ${matches.length} occurrences`);
    });
    
    console.log(`\n📝 Sample content:`);
    console.log(`   "${content.substring(0, 300)}..."`);
  }

  streamAnalyzeChunks(filePath, maxChunks = 5) {
    console.log(`\n🔄 Stream analyzing chunks from: ${path.basename(filePath)}`);
    console.log('='.repeat(50));
    
    try {
      // Read the file in small portions to find chunks
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      if (!data.chunks || !Array.isArray(data.chunks)) {
        console.log('❌ No chunks array found');
        return;
      }
      
      console.log(`📦 Found ${data.chunks.length} chunks`);
      console.log(`🔍 Analyzing first ${Math.min(maxChunks, data.chunks.length)} chunks...\n`);
      
      for (let i = 0; i < Math.min(maxChunks, data.chunks.length); i++) {
        const chunk = data.chunks[i];
        
        console.log(`📄 Chunk ${i + 1}:`);
        console.log(`   ID: ${chunk.id}`);
        console.log(`   Content length: ${chunk.content ? chunk.content.length : 0} chars`);
        console.log(`   Content preview: "${(chunk.content || '').substring(0, 100)}..."`);
        
        if (chunk.metadata) {
          console.log(`   Metadata keys: ${Object.keys(chunk.metadata).join(', ')}`);
          if (chunk.metadata.chunk_index !== undefined) {
            console.log(`   Chunk index: ${chunk.metadata.chunk_index}`);
          }
        }
        console.log('');
      }
      
      // Check for required fields
      console.log(`✅ Required fields check:`);
      const firstChunk = data.chunks[0];
      const requiredFields = ['id', 'content', 'metadata'];
      
      requiredFields.forEach(field => {
        const exists = firstChunk && firstChunk[field] !== undefined;
        console.log(`   ${field}: ${exists ? '✅' : '❌'}`);
      });
      
    } catch (error) {
      console.error('❌ Stream analysis failed:', error.message);
    }
  }

  generateFileReport(filePath) {
    const report = {
      file_path: filePath,
      analysis_date: new Date().toISOString(),
      file_stats: {},
      structure_analysis: {},
      chunk_analysis: {},
      recommendations: []
    };
    
    try {
      // File stats
      const stats = fs.statSync(filePath);
      report.file_stats = {
        size_bytes: stats.size,
        size_kb: Math.round(stats.size / 1024),
        size_mb: Math.round(stats.size / (1024 * 1024) * 10) / 10,
        modified: stats.mtime.toISOString()
      };
      
      // Quick content analysis
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(Math.min(8192, stats.size)); // 8KB sample
      fs.readSync(fd, buffer, 0, buffer.length, 0);
      fs.closeSync(fd);
      
      const sample = buffer.toString('utf8');
      
      // Basic structure detection
      report.structure_analysis = {
        appears_to_be_json: sample.trim().startsWith('{'),
        has_chunks_array: sample.includes('"chunks"'),
        has_embeddings: sample.includes('"embedding"'),
        has_metadata: sample.includes('"metadata"'),
        bengali_detected: /[\u0980-\u09FF]/.test(sample),
        english_detected: /[A-Za-z]/.test(sample)
      };
      
      // Try to parse and get chunk info
      if (report.structure_analysis.appears_to_be_json) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(content);
          
          report.chunk_analysis = {
            total_chunks: data.chunks ? data.chunks.length : 0,
            document_type: data.document_type || data.metadata?.document_type,
            extraction_method: data.extraction_method,
            language: data.language,
            total_characters: data.total_characters,
            bengali_characters: data.bengali_characters
          };
          
        } catch (parseError) {
          report.chunk_analysis.parse_error = parseError.message;
        }
      }
      
      // Generate recommendations
      if (report.file_stats.size_mb > 10) {
        report.recommendations.push('Large file - consider streaming or chunked processing');
      }
      
      if (report.chunk_analysis.total_chunks > 50) {
        report.recommendations.push('Many chunks - use batch processing for embeddings');
      }
      
      if (!report.structure_analysis.has_embeddings) {
        report.recommendations.push('No embeddings detected - needs embedding generation');
      }
      
      return report;
      
    } catch (error) {
      report.error = error.message;
      return report;
    }
  }
}

// CLI usage
if (require.main === module) {
  const analyzer = new LargeFileAnalyzer();
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.log('Usage: node analyze-large-file.js <file-path>');
    console.log('Example: node analyze-large-file.js ocr-processed-finance-act-2025-bangla.json');
    process.exit(1);
  }
  
  try {
    console.log('🔍 AI Tax Lawyer Bangladesh - Large File Analyzer');
    console.log('='.repeat(60));
    
    // Basic analysis
    analyzer.analyzeJSONFile(filePath);
    
    // Stream chunk analysis
    analyzer.streamAnalyzeChunks(filePath, 3);
    
    // Generate detailed report
    const report = analyzer.generateFileReport(filePath);
    const reportFile = `file-analysis-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved: ${reportFile}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

module.exports = { LargeFileAnalyzer };