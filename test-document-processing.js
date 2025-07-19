/**
 * Simple test script to process documents without API dependencies
 */

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

// Test PDF processing
async function testPDFProcessing() {
  console.log('🚀 Testing Document Processing Pipeline...\n');
  
  const actFilesPath = path.join(process.cwd(), 'Act-files');
  
  if (!fs.existsSync(actFilesPath)) {
    console.error('❌ Act-files directory not found');
    return;
  }

  const files = fs.readdirSync(actFilesPath)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .map(file => path.join(actFilesPath, file));

  console.log(`📁 Found ${files.length} PDF files:`);
  files.forEach((file, index) => {
    const stats = fs.statSync(file);
    console.log(`  ${index + 1}. ${path.basename(file)} (${Math.round(stats.size / 1024)}KB)`);
  });
  console.log('');

  // Test processing first file
  if (files.length > 0) {
    const testFile = files[0];
    console.log(`🔍 Testing extraction from: ${path.basename(testFile)}`);
    
    try {
      const buffer = fs.readFileSync(testFile);
      const data = await pdf(buffer);
      
      console.log(`✅ Successfully extracted text:`);
      console.log(`   - Pages: ${data.numpages}`);
      console.log(`   - Text length: ${data.text.length} characters`);
      console.log(`   - First 200 chars: "${data.text.substring(0, 200).replace(/\s+/g, ' ').trim()}..."`);
      
      // Check if it contains Bengali text
      const bengaliPattern = /[\u0980-\u09FF]/;
      const hasBengali = bengaliPattern.test(data.text);
      console.log(`   - Contains Bengali: ${hasBengali ? '✅ Yes' : '❌ No'}`);
      
      return true;
      
    } catch (error) {
      console.error(`❌ Error processing ${path.basename(testFile)}:`);
      console.error(`   ${error.message}`);
      return false;
    }
  } else {
    console.log('❌ No PDF files found to test');
    return false;
  }
}

// Test environment variables
function testEnvironment() {
  console.log('🔧 Checking Environment Variables:');
  
  const required = [
    'OPENAI_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL', 
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  let allPresent = true;
  
  required.forEach(key => {
    const value = process.env[key];
    if (value) {
      console.log(`   ✅ ${key}: ${'*'.repeat(Math.min(value.length, 20))}`);
    } else {
      console.log(`   ❌ ${key}: Missing`);
      allPresent = false;
    }
  });
  
  console.log('');
  return allPresent;
}

// Main test function
async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 AI Tax Lawyer - Document Processing Test');
  console.log('='.repeat(60));
  console.log('');
  
  const envOk = testEnvironment();
  const pdfOk = await testPDFProcessing();
  
  console.log('');
  console.log('📊 Test Results:');
  console.log(`   Environment Setup: ${envOk ? '✅ Ready' : '❌ Missing vars'}`);
  console.log(`   PDF Processing: ${pdfOk ? '✅ Working' : '❌ Failed'}`);
  console.log('');
  
  if (envOk && pdfOk) {
    console.log('🎉 All tests passed! Ready to process documents.');
  } else {
    console.log('⚠️  Some tests failed. Check the issues above.');
  }
  
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Set up missing environment variables in .env.local');
  console.log('   2. Start Next.js server: npm run dev');
  console.log('   3. Process documents: curl -X POST http://localhost:3000/api/process-documents -d \'{"action": "process_act_files"}\'');
}

// Run the tests
runTests().catch(console.error);