/**
 * FULL Document Processing - AI Tax Lawyer Bangladesh
 * Actually extracts ALL text and creates the processed document chunks
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

async function processFullDocument(filePath) {
  const filename = path.basename(filePath);
  console.log(`\n🔄 FULL PROCESSING: ${filename}`);
  console.log('='.repeat(50));
  
  try {
    // Extract ALL text from PDF
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer);
    
    console.log(`📄 Extracted ${data.text.length} characters from ${data.numpages} pages`);
    
    // Create chunks from ALL text
    const chunkSize = 800;
    const chunkOverlap = 100;
    const words = data.text.split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += chunkSize - chunkOverlap) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkText = chunkWords.join(' ');
      
      if (chunkText.trim().length > 100) {
        chunks.push({
          id: `${filename.replace('.pdf', '')}_chunk_${chunks.length}`,
          content: chunkText.trim(),
          metadata: {
            document_name: filename,
            chunk_index: chunks.length,
            word_start: i,
            word_end: i + chunkWords.length,
            total_words: chunkWords.length,
            total_chars: chunkText.length
          }
        });
      }
    }
    
    console.log(`📦 Created ${chunks.length} chunks from full document`);
    
    // Save ALL chunks to file
    const outputData = {
      document: filename,
      total_pages: data.numpages,
      total_characters: data.text.length,
      total_words: words.length,
      chunks_created: chunks.length,
      full_text: data.text, // Save FULL text
      chunks: chunks, // Save ALL chunks
      processing_date: new Date().toISOString()
    };
    
    const outputFile = `processed-${filename.replace('.pdf', '')}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
    
    console.log(`💾 Saved full processed document to: ${outputFile}`);
    console.log(`📊 File size: ${Math.round(fs.statSync(outputFile).size / 1024)}KB`);
    
    return {
      success: true,
      filename: filename,
      outputFile: outputFile,
      totalCharacters: data.text.length,
      totalChunks: chunks.length,
      fileSize: fs.statSync(outputFile).size
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

async function processAllDocuments() {
  console.log('🚀 AI Tax Lawyer Bangladesh - FULL DOCUMENT PROCESSING');
  console.log('This will extract ALL content from PDFs and create processable chunks');
  console.log('='.repeat(70));
  
  const actFilesPath = path.join(process.cwd(), 'Act-files');
  const files = fs.readdirSync(actFilesPath)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .map(file => path.join(actFilesPath, file));
  
  console.log(`📁 Found ${files.length} PDF files to FULLY process`);
  
  const results = [];
  
  for (const filePath of files) {
    const result = await processFullDocument(filePath);
    results.push(result);
    
    // Small delay between files
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n📊 FULL PROCESSING SUMMARY:');
  console.log('='.repeat(70));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successfully processed: ${successful.length}/${files.length}`);
  
  if (successful.length > 0) {
    const totalChars = successful.reduce((sum, r) => sum + r.totalCharacters, 0);
    const totalChunks = successful.reduce((sum, r) => sum + r.totalChunks, 0);
    const totalFileSize = successful.reduce((sum, r) => sum + r.fileSize, 0);
    
    console.log(`📝 Total characters extracted: ${totalChars.toLocaleString()}`);
    console.log(`📦 Total chunks created: ${totalChunks.toLocaleString()}`);
    console.log(`💾 Total processed data: ${Math.round(totalFileSize / 1024 / 1024)}MB`);
    console.log('');
    
    console.log('📋 Processed files:');
    successful.forEach(r => {
      console.log(`   • ${r.outputFile}: ${r.totalChunks} chunks (${Math.round(r.fileSize / 1024)}KB)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n⚠️  Failed files:');
    failed.forEach(r => {
      console.log(`   • ${r.filename}: ${r.error}`);
    });
  }
  
  console.log('\n🎉 FULL PROCESSING COMPLETE!');
  console.log('Now you have the actual document content ready for vector database storage.');
}

processAllDocuments().catch(console.error);