/**
 * Post-Clean Artifacts - AI Tax Lawyer Bangladesh
 * Final cleanup of remaining OCR artifacts in Chrome-cleaned files
 */

const fs = require('fs');
const path = require('path');

function postCleanArtifacts(filePath) {
  console.log(`🧹 Post-cleaning artifacts in: ${path.basename(filePath)}`);
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let cleanedText = data.full_text;
  
  // Fix remaining artifacts
  cleanedText = cleanedText
    // Fix mixed Hindi/Bengali numerals
    .replace(/[०१२३४५६७८९]/g, (match) => {
      const hindiToBengali = {
        '०': '০', '१': '১', '२': '২', '३': '৩', '४': '৪',
        '५': '৫', '६': '৬', '७': '৭', '८': '৮', '९': '৯'
      };
      return hindiToBengali[match] || match;
    })
    
    // Fix incomplete "So" words
    .replace(/\bSo\b/g, '৫০০')
    .replace(/\bSo\s*$/gm, '৫০০')
    
    // Clean mixed character strings like ০९০९৭০DA
    .replace(/[০-৯][०-९]+[০-৯]*[A-Z]*/g, (match) => {
      // Convert Hindi numerals to Bengali and remove Latin letters
      return match.replace(/[०-९]/g, (hindi) => {
        const map = {'०': '০', '१': '১', '२': '২', '३': '৩', '४': '৪', '५': '৫', '६': '৬', '७': '৭', '८': '৮', '९': '৯'};
        return map[hindi] || hindi;
      }).replace(/[A-Z]+$/, '');
    })
    
    // Fix broken table entries
    .replace(/(\d+\.\d+)\s+(\d+)\s*$/gm, '$1 | $2%')
    
    // Remove standalone artifacts
    .replace(/^\s*[A-Z]{2,}\s*$/gm, '')
    .replace(/^\s*\d{4,}\s*$/gm, '')
    
    // Clean up spacing
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
  
  // Update the data
  data.full_text = cleanedText;
  data.processing_metadata.post_cleaned = true;
  data.processing_metadata.post_clean_date = new Date().toISOString();
  
  // Update chunks
  data.chunks = data.chunks.map(chunk => ({
    ...chunk,
    content: postCleanChunk(chunk.content)
  }));
  
  // Save back
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  
  console.log(`✅ Post-cleaning completed: ${path.basename(filePath)}`);
  return data;
}

function postCleanChunk(content) {
  return content
    .replace(/[०१२३४५६७८९]/g, (match) => {
      const hindiToBengali = {
        '०': '০', '१': '১', '२': '২', '३': '৩', '४': '৪',
        '५': '৫', '६': '৬', '७': '৭', '८': '৮', '९': '৯'
      };
      return hindiToBengali[match] || match;
    })
    .replace(/\bSo\b/g, '৫০০')
    .replace(/[০-৯][०-९]+[০-৯]*[A-Z]*/g, (match) => {
      return match.replace(/[०-९]/g, (hindi) => {
        const map = {'०': '০', '१': '১', '२': '২', '३': '৩', '४': '৪', '५': '৫', '६': '৬', '७': '৭', '८': '৮', '९': '৯'};
        return map[hindi] || hindi;
      }).replace(/[A-Z]+$/, '');
    });
}

// Run on all cleaned files
function postCleanAllFiles() {
  const cleanedFiles = [
    'chrome-cleaned-vat-act-2012.json',
    'chrome-cleaned-income-tax-act-2023.json',
    'chrome-cleaned-finance-act-2025.json'
  ].filter(f => fs.existsSync(f));
  
  console.log('🧹 POST-CLEANING ARTIFACTS FROM CHROME FILES');
  console.log('='.repeat(60));
  
  cleanedFiles.forEach(file => {
    postCleanArtifacts(file);
  });
  
  console.log(`\n✅ Post-cleaned ${cleanedFiles.length} files`);
  console.log('🎯 Files now ready for embeddings!');
}

if (require.main === module) {
  postCleanAllFiles();
}

module.exports = { postCleanArtifacts, postCleanAllFiles };