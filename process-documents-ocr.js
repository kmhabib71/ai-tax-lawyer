/**
 * OCR-Based Document Processing - AI Tax Lawyer Bangladesh
 * High-quality Bengali text extraction using OCR instead of PDF parsing
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Load environment variables
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key] = valueParts.join('=');
  }
});

class OCRProcessor {
  constructor() {
    this.tessractPath = 'tesseract'; // Assumes tesseract is in PATH
    this.supportedLanguages = ['ben', 'eng']; // Bengali and English
  }

  async checkTesseractInstallation() {
    try {
      const { stdout } = await execAsync('tesseract --version');
      console.log('✅ Tesseract found:', stdout.split('\n')[0]);
      return true;
    } catch (error) {
      console.error('❌ Tesseract not found. Please install tesseract-ocr:');
      console.error('   Ubuntu/Debian: sudo apt-get install tesseract-ocr tesseract-ocr-ben');
      console.error('   macOS: brew install tesseract tesseract-lang');
      console.error('   Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki');
      return false;
    }
  }

  async convertPdfToImages(pdfPath, outputDir) {
    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`📄 Converting PDF to images: ${path.basename(pdfPath)}`);
    
    try {
      // Use pdftoppm (from poppler-utils) to convert PDF to images
      const outputPrefix = path.join(outputDir, 'page');
      const command = `pdftoppm -png -r 300 "${pdfPath}" "${outputPrefix}"`;
      
      const { stdout, stderr } = await execAsync(command);
      
      // Get list of generated images
      const imageFiles = fs.readdirSync(outputDir)
        .filter(file => file.endsWith('.png'))
        .sort((a, b) => {
          const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
          const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
          return aNum - bNum;
        })
        .map(file => path.join(outputDir, file));

      console.log(`📸 Generated ${imageFiles.length} images from PDF`);
      return imageFiles;
      
    } catch (error) {
      console.error('❌ PDF to image conversion failed:', error.message);
      console.error('💡 Install poppler-utils: sudo apt-get install poppler-utils');
      throw error;
    }
  }

  async extractTextFromImage(imagePath, languages = ['ben', 'eng']) {
    const langString = languages.join('+');
    
    try {
      // Use tesseract with Bengali and English languages
      const command = `tesseract "${imagePath}" stdout -l ${langString} --psm 6`;
      const { stdout, stderr } = await execAsync(command);
      
      return stdout.trim();
    } catch (error) {
      console.error(`❌ OCR failed for ${path.basename(imagePath)}:`, error.message);
      return '';
    }
  }

  async processPageWithOCR(imagePath, pageNumber) {
    console.log(`🔍 Processing page ${pageNumber}: ${path.basename(imagePath)}`);
    
    const text = await this.extractTextFromImage(imagePath);
    
    // Analyze extracted text
    const bengaliCount = (text.match(/[\u0980-\u09FF]/g) || []).length;
    const englishCount = (text.match(/[A-Za-z]/g) || []).length;
    const totalChars = text.length;
    
    console.log(`   📝 Page ${pageNumber}: ${totalChars} chars (${bengaliCount} Bengali, ${englishCount} English)`);
    
    return {
      page: pageNumber,
      text: text,
      statistics: {
        totalCharacters: totalChars,
        bengaliCharacters: bengaliCount,
        englishCharacters: englishCount,
        language: bengaliCount > englishCount ? 'bn' : englishCount > bengaliCount ? 'en' : 'mixed'
      }
    };
  }

  detectDocumentType(filename) {
    const lower = filename.toLowerCase();
    if (lower.includes('finance')) return 'finance_act';
    if (lower.includes('income')) return 'income_tax';
    if (lower.includes('vat')) return 'vat_act';
    return 'circular';
  }

  extractSections(text, language) {
    const sections = [];
    
    if (language === 'bn' || language === 'mixed') {
      // Bengali section patterns
      const bengaliPatterns = [
        /(ধারা\s*[\u09E6-\u09EF\d]+)/g,
        /(অনুচ্ছেদ\s*[\u09E6-\u09EF\d]+)/g,
        /(খণ্ড\s*[\u09E6-\u09EF\d]+)/g,
        /(পরিচ্ছেদ\s*[\u09E6-\u09EF\d]+)/g,
        /(বিভাগ\s*[\u09E6-\u09EF\d]+)/g
      ];
      
      bengaliPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            sections.push({
              number: match,
              title: match,
              language: 'bn'
            });
          });
        }
      });
    }
    
    if (language === 'en' || language === 'mixed') {
      // English section patterns
      const englishPatterns = [
        /(Section\s*\d+)/gi,
        /(Chapter\s*\d+)/gi,
        /(Part\s*[IVX\d]+)/gi,
        /(Article\s*\d+)/gi
      ];
      
      englishPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            sections.push({
              number: match,
              title: match,
              language: 'en'
            });
          });
        }
      });
    }
    
    return sections;
  }

  createChunks(text, metadata) {
    const chunks = [];
    const chunkSize = 800;
    const chunkOverlap = 100;
    const words = text.split(/\s+/);
    
    for (let i = 0; i < words.length; i += chunkSize - chunkOverlap) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkText = chunkWords.join(' ');
      
      if (chunkText.trim().length > 100) {
        chunks.push({
          id: `${metadata.document_id}_chunk_${chunks.length}`,
          content: chunkText.trim(),
          metadata: {
            ...metadata,
            chunk_index: chunks.length,
            word_start: i,
            word_end: i + chunkWords.length,
            total_words: chunkWords.length,
            total_chars: chunkText.length
          }
        });
      }
    }
    
    return chunks;
  }

  async processDocumentWithOCR(pdfPath) {
    const filename = path.basename(pdfPath);
    console.log(`\n🚀 OCR PROCESSING: ${filename}`);
    console.log('='.repeat(50));
    
    const startTime = Date.now();
    
    try {
      // Create temporary directory for images
      const tempDir = path.join(process.cwd(), 'temp-ocr', filename.replace('.pdf', ''));
      
      // Convert PDF to images
      const imageFiles = await this.convertPdfToImages(pdfPath, tempDir);
      
      if (imageFiles.length === 0) {
        throw new Error('No images generated from PDF');
      }
      
      // Process each page with OCR
      console.log(`🔍 Extracting text from ${imageFiles.length} pages using OCR...`);
      const pages = [];
      
      for (let i = 0; i < imageFiles.length; i++) {
        const imagePath = imageFiles[i];
        const pageData = await this.processPageWithOCR(imagePath, i + 1);
        pages.push(pageData);
        
        // Small delay to prevent overwhelming the system
        if (i < imageFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Combine all page texts
      const fullText = pages.map(page => page.text).join('\n\n');
      
      // Calculate overall statistics
      const totalBengali = pages.reduce((sum, page) => sum + page.statistics.bengaliCharacters, 0);
      const totalEnglish = pages.reduce((sum, page) => sum + page.statistics.englishCharacters, 0);
      const totalChars = fullText.length;
      
      console.log(`📊 OCR Results: ${totalChars} chars (${totalBengali} Bengali, ${totalEnglish} English)`);
      
      // Detect language and document type
      const language = totalBengali > totalEnglish ? 'bn' : totalEnglish > totalBengali ? 'en' : 'mixed';
      const docType = this.detectDocumentType(filename);
      const sections = this.extractSections(fullText, language);
      
      console.log(`🔍 Analysis: ${language} language, ${docType} type, ${sections.length} sections`);
      
      // Show sample of extracted text
      const sampleText = fullText.substring(0, 300).replace(/\s+/g, ' ').trim();
      console.log(`📝 Sample OCR text: "${sampleText}..."`);
      
      // Create metadata
      const metadata = {
        document_id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        document_name: filename,
        document_type: docType,
        language: language,
        source_file: pdfPath,
        extraction_method: 'OCR',
        total_pages: pages.length,
        total_characters: totalChars,
        bengali_characters: totalBengali,
        english_characters: totalEnglish,
        sections: sections.slice(0, 10)
      };
      
      // Create chunks from OCR text
      const chunks = this.createChunks(fullText, metadata);
      console.log(`📦 Created ${chunks.length} chunks from OCR text`);
      
      // Clean up temporary images
      console.log(`🧹 Cleaning up ${imageFiles.length} temporary images...`);
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('⚠️  Failed to clean up temp directory:', cleanupError.message);
      }
      
      // Save processed document with OCR data
      const outputData = {
        document: filename,
        extraction_method: 'OCR',
        total_pages: pages.length,
        total_characters: totalChars,
        bengali_characters: totalBengali,
        english_characters: totalEnglish,
        chunks_created: chunks.length,
        language: language,
        document_type: docType,
        sections_found: sections.length,
        full_text: fullText,
        chunks: chunks,
        page_breakdown: pages.map(page => ({
          page: page.page,
          characters: page.statistics.totalCharacters,
          bengali_chars: page.statistics.bengaliCharacters,
          english_chars: page.statistics.englishCharacters,
          language: page.statistics.language
        })),
        sample_text: sampleText,
        processing_date: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime
      };
      
      const outputFile = `ocr-processed-${filename.replace('.pdf', '')}.json`;
      fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
      
      console.log(`💾 Saved OCR processed document to: ${outputFile}`);
      console.log(`📊 File size: ${Math.round(fs.statSync(outputFile).size / 1024)}KB`);
      console.log(`⏱️  Processing time: ${Math.round((Date.now() - startTime) / 1000)}s`);
      
      return {
        success: true,
        filename: filename,
        outputFile: outputFile,
        totalCharacters: totalChars,
        bengaliCharacters: totalBengali,
        englishCharacters: totalEnglish,
        totalChunks: chunks.length,
        language: language,
        sections: sections.length,
        processingTime: Date.now() - startTime
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
}

async function processAllDocumentsWithOCR() {
  console.log('🚀 AI Tax Lawyer Bangladesh - OCR DOCUMENT PROCESSING');
  console.log('High-quality Bengali text extraction using OCR');
  console.log('='.repeat(70));
  
  const processor = new OCRProcessor();
  
  // Check if tesseract is installed
  const tesseractAvailable = await processor.checkTesseractInstallation();
  if (!tesseractAvailable) {
    console.error('❌ Cannot proceed without Tesseract OCR. Please install it first.');
    return;
  }
  
  const actFilesPath = path.join(process.cwd(), 'Act-files');
  const files = fs.readdirSync(actFilesPath)
    .filter(file => file.toLowerCase().endsWith('.pdf'))
    .map(file => path.join(actFilesPath, file));
  
  console.log(`📁 Found ${files.length} PDF files to process with OCR`);
  
  const results = [];
  
  for (const filePath of files) {
    const result = await processor.processDocumentWithOCR(filePath);
    results.push(result);
    
    // Delay between files to prevent system overload
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n📊 OCR PROCESSING SUMMARY:');
  console.log('='.repeat(70));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successfully processed: ${successful.length}/${files.length}`);
  
  if (successful.length > 0) {
    const totalChars = successful.reduce((sum, r) => sum + r.totalCharacters, 0);
    const totalBengali = successful.reduce((sum, r) => sum + r.bengaliCharacters, 0);
    const totalEnglish = successful.reduce((sum, r) => sum + r.englishCharacters, 0);
    const totalChunks = successful.reduce((sum, r) => sum + r.totalChunks, 0);
    const totalSections = successful.reduce((sum, r) => sum + r.sections, 0);
    
    console.log(`📝 Total characters extracted: ${totalChars.toLocaleString()}`);
    console.log(`🔤 Total Bengali characters: ${totalBengali.toLocaleString()}`);
    console.log(`🔤 Total English characters: ${totalEnglish.toLocaleString()}`);
    console.log(`📦 Total chunks created: ${totalChunks.toLocaleString()}`);
    console.log(`📋 Total sections found: ${totalSections.toLocaleString()}`);
    console.log('');
    
    console.log('📋 Processed files with OCR:');
    successful.forEach(r => {
      console.log(`   • ${r.outputFile}:`);
      console.log(`     - ${r.totalChunks} chunks, ${r.bengaliCharacters} Bengali chars`);
      console.log(`     - Language: ${r.language}, Sections: ${r.sections}`);
      console.log(`     - Processing time: ${Math.round(r.processingTime / 1000)}s`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n⚠️  Failed files:');
    failed.forEach(r => {
      console.log(`   • ${r.filename}: ${r.error}`);
    });
  }
  
  console.log('\n🎉 OCR PROCESSING COMPLETE!');
  console.log('Now you have high-quality Bengali text extraction using OCR!');
  console.log('');
  console.log('💡 Next steps:');
  console.log('   1. Review the OCR output files for quality');
  console.log('   2. Generate embeddings for the extracted text');
  console.log('   3. Store in vector database for RAG system');
}

// Check if this is run directly
if (require.main === module) {
  processAllDocumentsWithOCR().catch(console.error);
}

module.exports = { OCRProcessor };