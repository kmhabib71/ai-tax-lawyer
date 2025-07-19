/**
 * Process VAT Act 2012 - AI Tax Lawyer Bangladesh
 * Using the validated Finance Act procedure for VAT Act 2012
 */

const fs = require('fs');
const path = require('path');
const { OCRProcessor } = require('./process-documents-ocr.js');

async function processVATAct() {
  console.log('🚀 AI TAX LAWYER BANGLADESH - VAT ACT PROCESSING');
  console.log('Using validated procedure from Finance Act success');
  console.log('='.repeat(70));
  
  const processor = new OCRProcessor();
  
  // Check if tesseract is installed
  const tesseractAvailable = await processor.checkTesseractInstallation();
  if (!tesseractAvailable) {
    console.error('❌ Cannot proceed without Tesseract OCR. Please install it first.');
    return;
  }
  
  // Process VAT Act 2012 (Bengali)
  const vatFile = path.join(process.cwd(), 'Act-files', 'vat-act-2012-bangla.pdf');
  
  if (!fs.existsSync(vatFile)) {
    console.error('❌ VAT Act file not found:', vatFile);
    return;
  }
  
  console.log(`📄 Processing: ${path.basename(vatFile)}`);
  console.log(`📁 File size: ${Math.round(fs.statSync(vatFile).size / 1024)}KB`);
  
  try {
    const result = await processor.processDocumentWithOCR(vatFile);
    
    if (result.success) {
      console.log('\n🎉 VAT ACT PROCESSING SUCCESSFUL!');
      console.log('='.repeat(70));
      console.log(`✅ Document: ${result.filename}`);
      console.log(`📄 Output: ${result.outputFile}`);
      console.log(`📊 Characters: ${result.totalCharacters.toLocaleString()}`);
      console.log(`🔤 Bengali: ${result.bengaliCharacters.toLocaleString()}`);
      console.log(`🔤 English: ${result.englishCharacters.toLocaleString()}`);
      console.log(`📦 Chunks: ${result.totalChunks}`);
      console.log(`🌐 Language: ${result.language}`);
      console.log(`📋 Sections: ${result.sections}`);
      console.log(`⏱️  Time: ${Math.round(result.processingTime / 1000)}s`);
      
      console.log('\n📋 NEXT STEPS:');
      console.log('1. Analyze the output file for quality');
      console.log('2. Generate embeddings and store in Supabase');
      console.log('3. Test RAG queries for VAT');
      console.log('4. Complete Phase 1.1 tasks');
      
      // Quick analysis
      const outputPath = result.outputFile;
      if (fs.existsSync(outputPath)) {
        const outputData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
        
        console.log('\n📊 QUALITY ANALYSIS:');
        console.log(`   📦 Chunks created: ${outputData.chunks_created}`);
        console.log(`   🔤 Bengali ratio: ${Math.round((outputData.bengali_characters / outputData.total_characters) * 100)}%`);
        console.log(`   📄 Avg chunk size: ${Math.round(outputData.total_characters / outputData.chunks_created)} chars`);
        
        if (outputData.chunks && outputData.chunks.length > 0) {
          const sampleChunk = outputData.chunks[0];
          console.log(`   📝 Sample content: "${sampleChunk.content.substring(0, 100)}..."`);
        }
        
        // Success criteria check
        const qualityScore = (outputData.bengali_characters / outputData.total_characters) * 100;
        const chunkQuality = outputData.chunks_created > 10;
        const overallSuccess = qualityScore > 50 && chunkQuality;
        
        console.log(`\n🎯 QUALITY ASSESSMENT:`);
        console.log(`   Bengali content: ${qualityScore.toFixed(1)}% ${qualityScore > 50 ? '✅' : '❌'}`);
        console.log(`   Chunk quantity: ${outputData.chunks_created} ${chunkQuality ? '✅' : '❌'}`);
        console.log(`   Overall: ${overallSuccess ? '✅ READY FOR EMBEDDINGS' : '❌ NEEDS REVIEW'}`);
        
        if (overallSuccess) {
          console.log('\n🚀 READY FOR NEXT PHASE:');
          console.log('   Store both Income Tax + VAT in Supabase');
          console.log('   Complete Phase 1.1 knowledge pipeline');
        }
      }
      
    } else {
      console.error('\n❌ Processing failed:', result.error);
    }
    
  } catch (error) {
    console.error('\n❌ Unexpected error:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  processVATAct().catch(console.error);
}

module.exports = { processVATAct };