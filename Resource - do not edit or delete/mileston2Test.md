🧪 Manual Testing Guide for Milestone 2

Prerequisites

1. Start the development server: npm run dev
2. Ensure your environment variables are set (MongoDB, OpenAI, Supabase)
3. Have sample NBR documents ready for testing

---

Test 1: Basic AI System Testing

URL: http://localhost:3000/test-ai

What to test:

1. Tax Analysis Mode


    - Enter a basic scenario (salaried employee, BDT 600,000 salary)
    - Check if tax calculations are correct
    - Verify recommendations are generated

2. AI Consultation Mode


    - Ask: "How can I optimize my tax savings as a salaried employee?"
    - Verify AI response quality and citations

Expected Results:

- Tax calculations should show proper BDT amounts
- AI responses should include NBR rule references
- Confidence scores should be displayed

---

Test 2: Document Processing System

URL: http://localhost:3000/admin/documents

Sample Documents to Upload:

Sample 1: NBR Rule (Text Input)

Title: Income Tax Ordinance 1984 - Section 82C Deductions

Content:
Section 82C - Deductions from Total Income

(1) In computing the total income of an assessee, there shall be allowed as deductions from his income the following amounts:

(a) House Rent Allowance: Where the assessee is in receipt of house rent allowance as part of his salary, an amount equal to the  
 least of the following:
(i) The actual amount of house rent allowance received
(ii) Fifty percent of the basic salary
(iii) The excess of rent paid over ten percent of basic salary

(b) Medical Allowance: An amount equal to the actual medical expenses incurred, subject to a maximum of BDT 120,000 per year.

(c) Investment Allowance: Under Section 44, an assessee shall be allowed deduction of investments in approved securities, not
exceeding BDT 15,00,000.

This section provides significant tax savings opportunities for salaried employees in Bangladesh.

Sample 2: SRO Document (Text Input)

Title: SRO No. 123/Law/Income Tax/2024

Content:
SRO No. 123/Law/Income Tax/2024
Date: March 15, 2024

Subject: Tax exemption for IT sector exports

In exercise of the powers conferred by section 44 of the Income Tax Ordinance, 1984, the National Board of Revenue is pleased to  
 exempt the following income from tax:

1. Income from export of computer software, IT enabled services and data processing services shall be exempt from tax until June  
   30, 2026.

2. This exemption shall apply to companies engaged in:

   - Software development and export
   - Call center and business process outsourcing
   - Data entry and processing services

3. Conditions for exemption:
   - Company must be registered with Bangladesh Association of Software and Information Services (BASIS)
   - Minimum 80% of revenue must come from export
   - Proper documentation of export proceeds required

This SRO supersedes all previous notifications on this subject.

Testing Steps:

1. Text Input Mode:


    - Select "Text Input" mode
    - Choose document type "nbr_rule" or "sro"
    - Paste sample content above
    - Add appropriate title
    - Click "Process Text Document"

2. File Upload Mode:


    - Create a simple .txt file with the sample content
    - Select "File Upload" mode
    - Choose document type
    - Upload the file
    - Process the document

Expected Results:

- Document should be processed successfully
- Keywords should be extracted automatically
- Chunks should be created (typically 1-3 for these samples)
- Language detection should work (English/Bengali/Mixed)

---

Test 3: Complete RAG System Testing

URL: http://localhost:3000/test-rag

Test Scenarios:

Scenario 1: RAG Query Tab

1. Select "Salaried Employee" as user type
2. Ask these questions one by one:

Sample Questions:

1. "How to claim house rent allowance for salaried employees?"
2. "What is the maximum investment allowance limit?"
3. "How much medical allowance can I claim per year?"
4. "What are the conditions for IT sector tax exemption?"
5. "How to calculate tax deductions under Section 82C?"

Expected Results for each query:

- AI should provide detailed answers with NBR rule citations
- Sources section should show relevant document chunks
- Similarity scores should be > 70% for relevant matches
- Confidence scores should be reasonable (> 0.6)
- Processing time should be < 10 seconds

Scenario 2: Knowledge Search Tab

1. Search for specific terms:

- "house rent allowance"
- "investment allowance"
- "medical expenses"
- "IT sector exemption"
- "Section 82C"

Expected Results:

- Should return relevant document chunks
- Results should be ranked by similarity
- Keywords should be highlighted
- Document metadata should be displayed

Scenario 3: System Test Tab

1. Click "Run System Test"
2. Wait for all test queries to complete

Expected Results:

- Success rate should be > 80%
- Each query should process within reasonable time
- Failed queries should show clear error messages

---

Test 4: API Endpoint Testing

Using Browser Developer Tools or Postman:

Test Vector DB Status:

GET http://localhost:3000/api/vector-db?action=status

Test Document Processing:

POST http://localhost:3000/api/process-documents
Content-Type: multipart/form-data

action: process_text
text: [Sample NBR content]
title: Test Document
documentType: nbr_rule

Test RAG Query:

POST http://localhost:3000/api/rag-query
Content-Type: application/json

{
"action": "query",
"question": "How to claim house rent allowance?",
"userType": "salaried",
"retrievalOptions": {
"maxResults": 3,
"similarityThreshold": 0.7
}
}

---

Test 5: Database Setup Verification

Supabase Setup:

1. Go to your Supabase dashboard
2. Open SQL Editor
3. Run the supabase-setup.sql script from the project root
4. Verify tables are created:


    - tax_documents
    - document_chunks

Check if documents are stored:

SELECT COUNT(_) FROM tax_documents;
SELECT COUNT(_) FROM document_chunks;

---

🎯 Success Criteria Checklist

AI System Tests:

- Tax calculations produce correct BDT amounts
- AI responses include proper NBR citations
- Different user types get personalized advice
- Confidence scores are realistic (0.6-0.95)

Document Processing Tests:

- PDF/DOCX/TXT files process without errors
- Text chunking preserves sentence boundaries
- Keywords are extracted accurately
- Multi-language detection works
- Documents are stored in vector database

RAG System Tests:

- Semantic search returns relevant results
- AI answers are contextually accurate
- Source attribution works correctly
- Processing times are acceptable (< 10s)
- System handles multiple document types

Performance Tests:

- No memory leaks during extended testing
- API responses are consistently fast
- Error handling works gracefully
- System scales with document volume

---

🚨 Common Issues & Solutions

Issue: "OpenAI API error"
Solution: Check if OPENAI_API_KEY is correctly set in .env.local

Issue: "Supabase connection failed"Solution: Verify SUPABASE_URL and SUPABASE_ANON_KEY are correct

Issue: "No search results found"
Solution: Make sure documents are processed and stored first

Issue: "Document processing failed"
Solution: Check file format and size limits
