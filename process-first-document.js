/**
 * Process First Document - AI Tax Lawyer Bangladesh
 * Simple script to test the document processing pipeline
 */

const fs = require('fs');
const path = require('path');

async function processFirstDocument() {
  console.log('🚀 AI Tax Lawyer Bangladesh - Processing First Document');
  console.log('=' .repeat(60));
  
  // Load environment variables manually
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const envVars = {};
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key] = valueParts.join('=');
    }
  });
  
  // Check environment
  console.log('🔧 Environment Check:');
  console.log(`   OpenAI API Key: ${envVars.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Supabase URL: ${envVars.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log('');
  
  // Check Act-files directory
  const actFilesPath = path.join(process.cwd(), 'Act-files');
  if (!fs.existsSync(actFilesPath)) {
    console.error('❌ Act-files directory not found');
    return;
  }
  
  // Get PDF files
  const files = fs.readdirSync(actFilesPath)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .map(file => ({
      name: file,
      path: path.join(actFilesPath, file),
      size: fs.statSync(path.join(actFilesPath, file)).size
    }));
  
  console.log(`📁 Found ${files.length} PDF files:`);
  files.forEach((file, index) => {
    console.log(`   ${index + 1}. ${file.name} (${Math.round(file.size / 1024)}KB)`);
  });
  console.log('');
  
  // Process the first file (Finance Act 2024-25)
  const targetFile = files.find(f => f.name.includes('finance')) || files[0];
  console.log(`🔍 Processing: ${targetFile.name}`);
  
  try {
    const pdf = require('pdf-parse');
    const buffer = fs.readFileSync(targetFile.path);
    
    console.log('   📄 Extracting text...');
    const data = await pdf(buffer);
    
    console.log(`   ✅ Extracted ${data.text.length} characters from ${data.numpages} pages`);
    
    // Analyze the content
    const bengaliPattern = /[\u0980-\u09FF]/;
    const hasBengali = bengaliPattern.test(data.text);
    const bengaliMatches = (data.text.match(bengaliPattern) || []).length;
    const englishMatches = (data.text.match(/[A-Za-z]/) || []).length;
    
    console.log(`   📊 Language Analysis:`);
    console.log(`      Bengali characters: ${bengaliMatches}`);
    console.log(`      English characters: ${englishMatches}`);
    console.log(`      Detected language: ${hasBengali ? 'Bengali/Mixed' : 'English'}`);
    console.log('');
    
    // Show sample content
    console.log('📝 Sample Content (first 500 characters):');
    console.log('   ' + data.text.substring(0, 500).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() + '...');
    console.log('');
    
    // Extract sections
    console.log('🔍 Detecting sections...');
    const bengaliSections = data.text.match(/(ধারা\s*[\u09E6-\u09EF\d]+|অনুচ্ছেদ\s*[\u09E6-\u09EF\d]+)/g) || [];
    const englishSections = data.text.match(/(Section\s*\d+|Chapter\s*\d+)/gi) || [];
    
    console.log(`   Bengali sections found: ${bengaliSections.length}`);
    if (bengaliSections.length > 0) {
      console.log(`   Examples: ${bengaliSections.slice(0, 3).join(', ')}`);
    }
    
    console.log(`   English sections found: ${englishSections.length}`);
    if (englishSections.length > 0) {
      console.log(`   Examples: ${englishSections.slice(0, 3).join(', ')}`);
    }
    console.log('');
    
    // Create sample chunks
    console.log('📦 Creating sample chunks...');
    const words = data.text.split(/\s+/);
    const chunkSize = 800;
    const chunks = [];
    
    for (let i = 0; i < Math.min(words.length, chunkSize * 3); i += chunkSize) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkText = chunkWords.join(' ');
      if (chunkText.trim().length > 100) {
        chunks.push({
          index: chunks.length,
          content: chunkText.trim(),
          wordCount: chunkWords.length,
          charCount: chunkText.length
        });
      }
    }
    
    console.log(`   ✅ Created ${chunks.length} sample chunks`);
    chunks.forEach((chunk, index) => {
      console.log(`      Chunk ${index + 1}: ${chunk.charCount} chars, ${chunk.wordCount} words`);
    });
    console.log('');
    
    // Save sample output
    const outputData = {
      file: targetFile.name,
      pages: data.numpages,
      totalCharacters: data.text.length,
      language: hasBengali ? 'Bengali/Mixed' : 'English',
      bengaliSections: bengaliSections.length,
      englishSections: englishSections.length,
      sampleChunks: chunks.length,
      processingTime: Date.now(),
      sampleText: data.text.substring(0, 1000)
    };
    
    fs.writeFileSync('document-processing-sample.json', JSON.stringify(outputData, null, 2));
    console.log('💾 Sample processing results saved to document-processing-sample.json');
    console.log('');
    
    console.log('🎉 First document processing test completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   • File: ${targetFile.name}`);
    console.log(`   • Size: ${Math.round(targetFile.size / 1024)}KB`);
    console.log(`   • Pages: ${data.numpages}`);
    console.log(`   • Characters: ${data.text.length.toLocaleString()}`);
    console.log(`   • Language: ${hasBengali ? 'Bengali/Mixed' : 'English'}`);
    console.log(`   • Sections: ${bengaliSections.length + englishSections.length}`);
    console.log(`   • Sample chunks: ${chunks.length}`);
    console.log('');
    console.log('✅ Ready to implement full processing pipeline with OpenAI embeddings!');
    
  } catch (error) {
    console.error(`❌ Error processing ${targetFile.name}:`);
    console.error(`   ${error.message}`);
  }
}

// Run the processing
processFirstDocument().catch(console.error);