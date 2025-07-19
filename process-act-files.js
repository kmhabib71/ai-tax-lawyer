/**
 * Document Processing Script for AI Tax Lawyer Bangladesh
 * Processes all PDF files in Act-files directory and stores them in Supabase
 */

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai').default;

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configuration
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

// Helper functions
function detectLanguage(text) {
  const bengaliPattern = /[\u0980-\u09FF]/;
  const englishPattern = /[A-Za-z]/;
  
  const bengaliCount = (text.match(bengaliPattern) || []).length;
  const englishCount = (text.match(englishPattern) || []).length;
  
  if (bengaliCount > englishCount * 0.3) return 'bn';
  if (englishCount > bengaliCount * 0.3) return 'en';
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
  let sectionNumber = '';
  let sectionTitle = '';
  
  if (language === 'bn' || language === 'mixed') {
    // Bengali section patterns
    const bengaliSectionPattern = /(ধারা\s*[\u09E6-\u09EF\d]+|অনুচ্ছেদ\s*[\u09E6-\u09EF\d]+|খণ্ড\s*[\u09E6-\u09EF\d]+)/g;
    const matches = text.match(bengaliSectionPattern);
    if (matches) {
      matches.forEach(match => {
        sections.push({
          number: match,
          title: match,
          language: 'bn'
        });
      });
    }
  }
  
  if (language === 'en' || language === 'mixed') {
    // English section patterns
    const englishSectionPattern = /(Section\s*\d+|Chapter\s*\d+|Part\s*[IVX\d]+)/gi;
    const matches = text.match(englishSectionPattern);
    if (matches) {
      matches.forEach(match => {
        sections.push({
          number: match,
          title: match,
          language: 'en'
        });
      });
    }
  }
  
  return sections;
}

function createChunks(text, metadata) {
  const chunks = [];
  const words = text.split(/\s+/);
  
  for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const chunkWords = words.slice(i, i + CHUNK_SIZE);
    const chunkText = chunkWords.join(' ');
    
    if (chunkText.trim().length > 100) {
      chunks.push({
        content: chunkText.trim(),
        metadata: {
          ...metadata,
          chunk_index: chunks.length,
          word_start: i,
          word_end: i + chunkWords.length
        }
      });
    }
  }
  
  return chunks;
}

async function extractKeywords(text, language) {
  try {
    const prompt = language === 'bn' 
      ? `Extract 10 important Bengali legal keywords from this text. Return only the keywords separated by commas:\n\n${text.substring(0, 1000)}`
      : `Extract 10 important English legal keywords from this text. Return only the keywords separated by commas:\n\n${text.substring(0, 1000)}`;
    
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.3
    });
    
    const keywords = response.choices[0].message.content
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 2);
    
    return keywords.slice(0, 10);
  } catch (error) {
    console.warn('Error extracting keywords:', error.message);
    return [];
  }
}

async function generateEmbeddings(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000), // Limit to avoid token limits
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.warn('Error generating embeddings:', error.message);
    return null;
  }
}

async function storeChunks(chunks) {
  try {
    const { data, error } = await supabase
      .from('document_chunks')
      .insert(chunks);
    
    if (error) {
      console.error('Error storing chunks:', error);
      return false;
    }
    
    console.log(`✅ Stored ${chunks.length} chunks in database`);
    return true;
  } catch (error) {
    console.error('Error storing chunks:', error);
    return false;
  }
}

async function logProcessing(filename, status, metadata = {}) {
  try {
    await supabase
      .from('document_processing_log')
      .insert({
        file_name: filename,
        processing_status: status,
        metadata: metadata,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.warn('Error logging processing:', error.message);
  }
}

async function processDocument(filePath) {
  const filename = path.basename(filePath);
  console.log(`\n🔄 Processing: ${filename}`);
  
  const startTime = Date.now();
  
  try {
    // Extract text from PDF
    const buffer = fs.readFileSync(filePath);
    const pdfData = await pdf(buffer, {
      normalizeWhitespace: true,
      disableCombineTextItems: false
    });
    
    if (!pdfData.text || pdfData.text.trim().length < 100) {
      throw new Error('Insufficient text extracted from PDF');
    }
    
    console.log(`   📄 Extracted ${pdfData.text.length} characters from ${pdfData.numpages} pages`);
    
    // Analyze document
    const language = detectLanguage(pdfData.text);
    const docType = detectDocumentType(filename);
    const sections = extractSections(pdfData.text, language);
    
    console.log(`   🔍 Detected: ${language} language, ${docType} type, ${sections.length} sections`);
    
    // Create metadata
    const metadata = {
      document_id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      document_name: filename,
      document_type: docType,
      language: language,
      source_file: filePath,
      total_pages: pdfData.numpages,
      total_characters: pdfData.text.length,
      sections: sections.slice(0, 10) // Limit sections for storage
    };
    
    // Create chunks
    const textChunks = createChunks(pdfData.text, metadata);
    console.log(`   📝 Created ${textChunks.length} text chunks`);
    
    // Process chunks with embeddings and keywords
    const processedChunks = [];
    
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      
      // Progress indicator
      if (i % 10 === 0) {
        console.log(`   ⚡ Processing chunk ${i + 1}/${textChunks.length}`);
      }
      
      // Generate embeddings
      const embeddings = await generateEmbeddings(chunk.content);
      
      // Extract keywords
      const keywords = await extractKeywords(chunk.content, language);
      
      // Prepare chunk for database
      const processedChunk = {
        id: `${metadata.document_id}_chunk_${i}`,
        content: chunk.content,
        metadata: {
          ...chunk.metadata,
          total_chunks: textChunks.length
        },
        embeddings: embeddings,
        keywords_bn: language === 'bn' ? keywords : [],
        keywords_en: language === 'en' ? keywords : [],
        search_vector: chunk.content // For full-text search
      };
      
      processedChunks.push(processedChunk);
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Store in database
    const stored = await storeChunks(processedChunks);
    
    const processingTime = Date.now() - startTime;
    
    if (stored) {
      await logProcessing(filename, 'completed', {
        chunks_created: processedChunks.length,
        processing_time_ms: processingTime,
        language: language,
        document_type: docType
      });
      
      console.log(`   ✅ Successfully processed in ${Math.round(processingTime / 1000)}s`);
      
      return {
        success: true,
        filename: filename,
        chunks: processedChunks.length,
        time: processingTime,
        language: language,
        type: docType
      };
    } else {
      throw new Error('Failed to store chunks in database');
    }
    
  } catch (error) {
    console.error(`   ❌ Error processing ${filename}:`, error.message);
    
    await logProcessing(filename, 'failed', {
      error: error.message,
      processing_time_ms: Date.now() - startTime
    });
    
    return {
      success: false,
      filename: filename,
      error: error.message,
      time: Date.now() - startTime
    };
  }
}

async function processAllDocuments() {
  console.log('🚀 AI Tax Lawyer Bangladesh - Document Processing');
  console.log('=' .repeat(60));
  
  // Check environment
  if (!process.env.OPENAI_API_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('❌ Missing environment variables');
    return;
  }
  
  // Check Act-files directory
  const actFilesPath = path.join(process.cwd(), 'Act-files');
  if (!fs.existsSync(actFilesPath)) {
    console.error('❌ Act-files directory not found');
    return;
  }
  
  // Get PDF files
  const files = fs.readdirSync(actFilesPath)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .map(file => path.join(actFilesPath, file));
  
  console.log(`📁 Found ${files.length} PDF files to process`);
  
  // Process each file
  const results = [];
  
  for (const filePath of files) {
    const result = await processDocument(filePath);
    results.push(result);
    
    // Delay between files
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n📊 Processing Summary:');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${files.length}`);
  console.log(`❌ Failed: ${failed.length}/${files.length}`);
  
  if (successful.length > 0) {
    const totalChunks = successful.reduce((sum, r) => sum + r.chunks, 0);
    console.log(`📝 Total chunks created: ${totalChunks}`);
    
    console.log('\n📋 Successful files:');
    successful.forEach(r => {
      console.log(`   • ${r.filename}: ${r.chunks} chunks (${r.language}, ${Math.round(r.time / 1000)}s)`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n⚠️  Failed files:');
    failed.forEach(r => {
      console.log(`   • ${r.filename}: ${r.error}`);
    });
  }
  
  console.log('\n🎉 Processing complete!');
}

// Run the processing
processAllDocuments().catch(console.error);