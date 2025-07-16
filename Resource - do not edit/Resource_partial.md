# AI Tax Lawyer Bangladesh - Development Resources

## Overview

This document provides specific open source tools, free resources, documentation, and guides mapped to each task in tasks.md. All resources are either free or have generous free tiers suitable for development and early-stage deployment.

---

## **Milestone 1: Chat-First Knowledge Foundation** _(Week 1)_

### 1.1 Knowledge Pipeline Setup

#### 1.1.1 Set up web scraping pipeline for NBR documents

**Resources:**

- **Scrapy Framework**: https://scrapy.org/
- **BeautifulSoup**: https://www.crummy.com/software/BeautifulSoup/bs4/doc/
- **Requests**: https://docs.python-requests.org/en/latest/
- **Selenium**: https://selenium-python.readthedocs.io/
- **Playwright**: https://playwright.dev/python/
- **NBR Website**: https://nbr.gov.bd/

**Free Tools:**

- **Scrapy Cloud** (Free tier): https://scrapinghub.com/
- **Apify** (Free tier): https://apify.com/
- **Puppeteer**: https://pptr.dev/

**Documentation:**

- Scrapy Tutorial: https://docs.scrapy.org/en/latest/intro/tutorial.html
- Web Scraping Ethics: https://blog.apify.com/web-scraping-ethics/

#### 1.1.2 - 1.1.5 Scrape NBR documents (Income Tax, Finance Acts, Circulars, DTAA, VAT)

**Resources:**

- **NBR Official Portal**: https://nbr.gov.bd/
- **Income Tax Ordinance 1984**: https://nbr.gov.bd/uploads/law/income-tax-ordinance-1984.pdf
- **Finance Acts Archive**: https://nbr.gov.bd/finance-acts
- **SRO Database**: https://nbr.gov.bd/sro
- **VAT Act 1991**: https://nbr.gov.bd/uploads/law/vat-act-1991.pdf

**Tools:**

- **PDF Parser**: PyPDF2, pdfplumber, pymupdf
- **OCR**: Tesseract, EasyOCR
- **Text Extraction**: textract, tika-python

**Code Examples:**

```python
# Sample NBR scraper
import scrapy
import requests
from bs4 import BeautifulSoup

class NBRScraper(scrapy.Spider):
    name = 'nbr_documents'
    start_urls = ['https://nbr.gov.bd/sro']

    def parse(self, response):
        # Extract document links
        doc_links = response.css('a[href$=".pdf"]::attr(href)').getall()
        for link in doc_links:
            yield response.follow(link, self.parse_document)
```

#### 1.1.6 Clean and convert all documents to Markdown

**Resources:**

- **MarkItDown**: https://github.com/microsoft/markitdown
- **Pandoc**: https://pandoc.org/
- **Python-docx**: https://python-docx.readthedocs.io/
- **Markdown**: https://python-markdown.github.io/

**Tools:**

- **Mammoth**: https://github.com/mwilliamson/python-mammoth
- **pdfminer3k**: https://pypi.org/project/pdfminer3k/
- **camelot-py**: https://camelot-py.readthedocs.io/

### 1.2 Vector Database Implementation

#### 1.2.1 Set up Supabase with pgvector extension

**Resources:**

- **Supabase**: https://supabase.com/ (Free tier: 500MB DB)
- **pgvector**: https://github.com/pgvector/pgvector
- **Supabase Python**: https://github.com/supabase/supabase-py

**Setup Guide:**

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  content TEXT,
  metadata JSONB,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for vector similarity search
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);
```

#### 1.2.2 Implement document chunking with LangChain

**Resources:**

- **LangChain**: https://python.langchain.com/
- **Text Splitters**: https://python.langchain.com/docs/modules/data_connection/document_transformers/

**Code Example:**

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.document_loaders import TextLoader

# Initialize text splitter
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
)

# Load and split documents
loader = TextLoader("nbr_document.md")
documents = loader.load()
texts = text_splitter.split_documents(documents)
```

#### 1.2.3 Create embedding pipeline with OpenAI

**Resources:**

- **OpenAI API**: https://platform.openai.com/docs/guides/embeddings
- **OpenAI Python**: https://github.com/openai/openai-python
- **Alternative: Sentence Transformers**: https://www.sbert.net/

**Code Example:**

```python
import openai
from sentence_transformers import SentenceTransformer

# OpenAI embeddings
def create_openai_embedding(text):
    response = openai.Embedding.create(
        model="text-embedding-3-small",
        input=text
    )
    return response['data'][0]['embedding']

# Alternative: Free local embeddings
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(texts)
```

#### 1.2.4 Store embeddings with metadata tagging

**Resources:**

- **Supabase Python Client**: https://github.com/supabase/supabase-py
- **PostgreSQL JSON**: https://www.postgresql.org/docs/current/datatype-json.html

#### 1.2.5 Build vector search function

**Code Example:**

```python
def vector_search(query_embedding, limit=5):
    supabase = create_client(url, key)

    result = supabase.rpc('match_documents', {
        'query_embedding': query_embedding,
        'match_threshold': 0.7,
        'match_count': limit
    }).execute()

    return result.data
```

#### 1.2.6 Implement hybrid search (semantic + keyword)

**Resources:**

- **Lunr.js**: https://lunrjs.com/
- **Whoosh**: https://whoosh.readthedocs.io/
- **Elasticsearch**: https://www.elastic.co/ (Free tier available)

### 1.3 Chat Interface Foundation

#### 1.3.1 Create full-screen chat component

**Resources:**

- **Next.js**: https://nextjs.org/
- **React**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **Radix UI**: https://www.radix-ui.com/

**Code Example:**

```jsx
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-sky-100 to-indigo-100">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 ${
              message.role === "user" ? "text-right" : "text-left"
            }`}
          >
            <div
              className={`inline-block p-3 rounded-lg ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-800"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="আপনার প্রশ্ন লিখুন..."
            className="flex-1"
          />
          <Button onClick={handleSend}>পাঠান</Button>
        </div>
      </div>
    </div>
  );
}
```

#### 1.3.2 Implement streaming chat with Vercel AI SDK

**Resources:**

- **Vercel AI SDK**: https://sdk.vercel.ai/
- **useChat Hook**: https://sdk.vercel.ai/docs/api-reference/use-chat
- **Streaming Responses**: https://sdk.vercel.ai/docs/guides/providers/openai

**Code Example:**

```jsx
import { useChat } from "ai/react";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          {m.role === "user" ? "User: " : "AI: "}
          {m.content}
        </div>
      ))}

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Say something..."
        />
      </form>
    </div>
  );
}
```

#### 1.3.3 Add Bengali/English language toggle

**Resources:**

- **Next.js i18n**: https://nextjs.org/docs/advanced-features/i18n
- **React i18next**: https://react.i18next.com/
- **Google Translate API**: https://cloud.google.com/translate

**Code Example:**

```jsx
import { useTranslation } from "react-i18next";

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "bn" ? "en" : "bn");
  };

  return (
    <button onClick={toggleLanguage}>
      {i18n.language === "bn" ? "English" : "বাংলা"}
    </button>
  );
}
```

#### 1.3.4 Implement voice input with Web Speech API

**Resources:**

- **Web Speech API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- **React Speech Recognition**: https://github.com/JamesBrill/react-speech-recognition
- **Whisper API**: https://platform.openai.com/docs/guides/speech-to-text

**Code Example:**

```jsx
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

export default function VoiceInput() {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }

  return (
    <div>
      <button onClick={SpeechRecognition.startListening}>Start</button>
      <button onClick={SpeechRecognition.stopListening}>Stop</button>
      <p>{transcript}</p>
    </div>
  );
}
```

#### 1.3.5 Create message history persistence

**Resources:**

- **Supabase Database**: https://supabase.com/docs/guides/database
- **localStorage**: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- **IndexedDB**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

#### 1.3.6 Add typing indicators and loading states

**Resources:**

- **Framer Motion**: https://www.framer.com/motion/
- **React Loading**: https://github.com/fakiolinho/react-loading
- **Lottie React**: https://github.com/Gamote/lottie-react

---

## **Milestone 2: RAG System and AI Pipeline** _(Week 2)_

### 2.1 RAG Implementation

#### 2.1.1 Implement semantic search with confidence scoring

**Resources:**

- **Sentence Transformers**: https://www.sbert.net/
- **FAISS**: https://github.com/facebookresearch/faiss
- **ChromaDB**: https://www.trychroma.com/

**Code Example:**

```python
from sentence_transformers import SentenceTransformer
import numpy as np

class SemanticSearch:
    def __init__(self):
        self.model = SentenceTransformer('all-MiniLM-L6-v2')

    def search(self, query, documents, top_k=5):
        query_embedding = self.model.encode([query])
        doc_embeddings = self.model.encode(documents)

        # Calculate cosine similarity
        similarities = np.dot(query_embedding, doc_embeddings.T)[0]

        # Get top results with confidence scores
        top_indices = np.argsort(similarities)[::-1][:top_k]
        results = []

        for idx in top_indices:
            results.append({
                'document': documents[idx],
                'confidence': float(similarities[idx]),
                'index': idx
            })

        return results
```

#### 2.1.2 Add BM25 keyword search with lunr.js

**Resources:**

- **Lunr.js**: https://lunrjs.com/
- **Rank-BM25**: https://github.com/dorianbrown/rank_bm25
- **Elasticsearch**: https://www.elastic.co/

**Code Example:**

```python
from rank_bm25 import BM25Okapi
import string

class KeywordSearch:
    def __init__(self, documents):
        # Tokenize documents
        tokenized_docs = [doc.lower().split() for doc in documents]
        self.bm25 = BM25Okapi(tokenized_docs)
        self.documents = documents

    def search(self, query, top_k=5):
        tokenized_query = query.lower().split()
        scores = self.bm25.get_scores(tokenized_query)

        # Get top results
        top_indices = np.argsort(scores)[::-1][:top_k]
        results = []

        for idx in top_indices:
            results.append({
                'document': self.documents[idx],
                'score': float(scores[idx]),
                'index': idx
            })

        return results
```

#### 2.1.3 Create hybrid ranking algorithm (70/30 split)

**Code Example:**

```python
class HybridSearch:
    def __init__(self, documents):
        self.semantic_search = SemanticSearch()
        self.keyword_search = KeywordSearch(documents)

    def search(self, query, top_k=5):
        # Get semantic results
        semantic_results = self.semantic_search.search(query, self.documents, top_k)

        # Get keyword results
        keyword_results = self.keyword_search.search(query, top_k)

        # Combine scores (70% semantic, 30% keyword)
        combined_scores = {}

        for result in semantic_results:
            idx = result['index']
            combined_scores[idx] = 0.7 * result['confidence']

        for result in keyword_results:
            idx = result['index']
            if idx in combined_scores:
                combined_scores[idx] += 0.3 * result['score']
            else:
                combined_scores[idx] = 0.3 * result['score']

        # Sort by combined score
        sorted_results = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)

        return sorted_results[:top_k]
```

#### 2.1.4 Build context assembly for prompts

**Resources:**

- **LangChain Prompt Templates**: https://python.langchain.com/docs/modules/model_io/prompts/
- **Jinja2**: https://jinja.palletsprojects.com/

#### 2.1.5 Implement source citation system

**Code Example:**

```python
class CitationSystem:
    def format_response_with_citations(self, response, sources):
        citations = []
        formatted_response = response

        for i, source in enumerate(sources, 1):
            citation = f"[{i}] {source['title']} - {source['section']}"
            citations.append(citation)

        # Append citations to response
        formatted_response += "\n\n**Sources:**\n"
        formatted_response += "\n".join(citations)

        return formatted_response
```

#### 2.1.6 Add confidence thresholds and escalation

**Code Example:**

```python
class ConfidenceManager:
    def __init__(self):
        self.low_confidence_threshold = 0.5
        self.high_confidence_threshold = 0.8

    def get_model_recommendation(self, confidence_score):
        if confidence_score >= self.high_confidence_threshold:
            return "gpt-4o-mini"  # Cost-effective for high confidence
        elif confidence_score >= self.low_confidence_threshold:
            return "gpt-4o"      # Better model for medium confidence
        else:
            return "escalate_to_human"  # Low confidence needs human review
```

### 2.2 AI Response System

#### 2.2.1 Create bilingual prompt templates

**Resources:**

- **LangChain**: https://python.langchain.com/docs/modules/model_io/prompts/
- **Prompt Engineering Guide**: https://www.promptingguide.ai/

**Code Example:**

```python
from langchain.prompts import PromptTemplate

bilingual_prompt = PromptTemplate(
    input_variables=["context", "question", "language"],
    template="""
    You are a Bangladeshi tax lawyer expert. Answer the question based on the context provided.

    Context: {context}
    Question: {question}
    Language: {language}

    Instructions:
    - If language is 'bn', respond in Bengali
    - If language is 'en', respond in English
    - Cite specific sections and SRO numbers
    - Be accurate and professional
    - Include legal disclaimers

    Answer:
    """
)
```

#### 2.2.2 Implement GPT-4o-mini for cost optimization

**Resources:**

- **OpenAI API**: https://platform.openai.com/docs/api-reference
- **Model Pricing**: https://openai.com/pricing

**Code Example:**

```python
import openai

class CostOptimizedAI:
    def __init__(self):
        self.models = {
            'cheap': 'gpt-4o-mini',
            'premium': 'gpt-4o'
        }

    def get_response(self, prompt, complexity='simple'):
        model = self.models['cheap' if complexity == 'simple' else 'premium']

        response = openai.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )

        return response.choices[0].message.content
```

#### 2.2.3 Add GPT-4o escalation for complex queries

**Code Example:**

```python
class QueryComplexityAnalyzer:
    def __init__(self):
        self.complex_keywords = [
            'appeal', 'audit', 'penalty', 'tribunal', 'legal action',
            'multiple income', 'business loss', 'capital gains'
        ]

    def analyze_complexity(self, query):
        query_lower = query.lower()
        complexity_score = 0

        # Check for complex keywords
        for keyword in self.complex_keywords:
            if keyword in query_lower:
                complexity_score += 1

        # Check query length
        if len(query.split()) > 50:
            complexity_score += 1

        return 'complex' if complexity_score > 0 else 'simple'
```

#### 2.2.4 Build streaming response pipeline

**Resources:**

- **Server-Sent Events**: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- **Vercel AI SDK**: https://sdk.vercel.ai/docs/guides/providers/openai

**Code Example:**

```python
import asyncio
import json
from typing import AsyncGenerator

async def stream_response(prompt: str) -> AsyncGenerator[str, None]:
    response = await openai.ChatCompletion.acreate(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        stream=True
    )

    async for chunk in response:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
```

#### 2.2.5 Add legal disclaimer auto-append

**Code Example:**

```python
class LegalDisclaimer:
    def __init__(self):
        self.disclaimers = {
            'bn': "⚠️ এই তথ্য সাধারণ জ্ঞানের জন্য; কোনো আইনি পরামর্শের বিকল্প নয়। গুরুত্বপূর্ণ সিদ্ধান্তের জন্য পেশাদার পরামর্শ নিন।",
            'en': "⚠️ This information is for general knowledge only; not a substitute for professional legal advice. Consult a qualified professional for important decisions."
        }

    def add_disclaimer(self, response, language='bn'):
        disclaimer = self.disclaimers.get(language, self.disclaimers['en'])
        return f"{response}\n\n{disclaimer}"
```

#### 2.2.6 Implement response caching with Redis

**Resources:**

- **Redis**: https://redis.io/
- **Redis-py**: https://github.com/redis/redis-py
- **Upstash Redis**: https://upstash.com/docs/redis (Free tier available)

**Code Example:**

```python
import redis
import hashlib
import json

class ResponseCache:
    def __init__(self):
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0)

    def get_cache_key(self, query, context):
        # Create hash from query and context
        content = f"{query}:{context}"
        return hashlib.md5(content.encode()).hexdigest()

    def get_cached_response(self, query, context):
        cache_key = self.get_cache_key(query, context)
        cached = self.redis_client.get(cache_key)

        if cached:
            return json.loads(cached)
        return None

    def cache_response(self, query, context, response, ttl=3600):
        cache_key = self.get_cache_key(query, context)
        self.redis_client.setex(
            cache_key,
            ttl,
            json.dumps(response)
        )
```

### 2.3 Chat State Management

#### 2.3.1 Design conversation state machine

**Resources:**

- **XState**: https://xstate.js.org/
- **Zustand**: https://github.com/pmndrs/zustand
- **React Context**: https://react.dev/reference/react/useContext

**Code Example:**

```jsx
import { createMachine, interpret } from "xstate";

const taxChatMachine = createMachine({
  id: "taxChat",
  initial: "greeting",
  states: {
    greeting: {
      on: {
        START: "askUserType",
      },
    },
    askUserType: {
      on: {
        SALARIED: "askIncome",
        BUSINESS: "askBusinessType",
        FREELANCER: "askIncome",
      },
    },
    askIncome: {
      on: {
        INCOME_PROVIDED: "calculateTax",
      },
    },
    calculateTax: {
      on: {
        SHOW_OPTIMIZATION: "showOptimization",
        FILE_RETURN: "prepareReturn",
      },
    },
    showOptimization: {
      on: {
        APPLY_OPTIMIZATION: "optimizeTax",
      },
    },
    prepareReturn: {
      on: {
        SUBMIT: "submitReturn",
      },
    },
    submitReturn: {
      type: "final",
    },
  },
});
```

#### 2.3.2 Implement user persona detection

**Code Example:**

```javascript
class PersonaDetector {
  constructor() {
    this.keywords = {
      salaried: ["salary", "job", "employee", "monthly pay", "বেতন"],
      business: ["business", "company", "profit", "loss", "ব্যবসা"],
      freelancer: ["freelance", "contract", "project", "ফ্রিল্যান্স"],
      landlord: ["rent", "property", "landlord", "ভাড়া"],
    };
  }

  detectPersona(message) {
    const messageLower = message.toLowerCase();
    const scores = {};

    Object.entries(this.keywords).forEach(([persona, keywords]) => {
      scores[persona] = keywords.filter((keyword) =>
        messageLower.includes(keyword)
      ).length;
    });

    const topPersona = Object.entries(scores).reduce((a, b) =>
      scores[a[0]] > scores[b[0]] ? a : b
    );

    return topPersona[1] > 0 ? topPersona[0] : "unknown";
  }
}
```

#### 2.3.3 Create context persistence across sessions

**Resources:**

- **Supabase**: https://supabase.com/docs/guides/database
- **localStorage**: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

**Code Example:**

```javascript
class SessionManager {
  constructor() {
    this.supabase = createClient(url, key);
  }

  async saveSession(userId, sessionData) {
    const { data, error } = await this.supabase.from("chat_sessions").insert([
      {
        user_id: userId,
        session_data: sessionData,
        updated_at: new Date().toISOString(),
      },
    ]);

    return { data, error };
  }

  async loadSession(userId) {
    const { data, error } = await this.supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1);

    return data?.[0] || null;
  }
}
```

---

## **Milestone 3: Interactive Tax Engine** _(Week 3)_

### 3.1 Tax Calculation Engine

#### 3.1.1 Create tax rule DSL for different user types

**Resources:**

- **JSON Schema**: https://json-schema.org/
- **Ajv**: https://ajv.js.org/
- **Zod**: https://zod.dev/

**Code Example:**

```javascript
// Tax Rules DSL
const taxRules2024 = {
  salaried: {
    slabs: [
      { min: 0, max: 350000, rate: 0 },
      { min: 350001, max: 450000, rate: 0.05 },
      { min: 450001, max: 750000, rate: 0.1 },
      { min: 750001, max: 1150000, rate: 0.15 },
      { min: 1150001, max: 1650000, rate: 0.2 },
      { min: 1650001, max: Infinity, rate: 0.25 },
    ],
    deductions: {
      investment: { max: 1500000, rate: 0.15 },
      lifeInsurance: { max: 100000, rate: 0.15 },
      dps: { max: 1200000, rate: 0.15 },
    },
  },
  business: {
    slabs: [
      { min: 0, max: 400000, rate: 0 },
      { min: 400001, max: 500000, rate: 0.05 },
      // ... more slabs
    ],
    deductions: {
      businessExpense: { rate: 1.0 },
      depreciation: { rate: 1.0 },
    },
  },
};

class TaxCalculator {
  constructor(rules) {
    this.rules = rules;
  }

  calculateTax(income, userType, deductions = {}) {
    const userRules = this.rules[userType];
    if (!userRules) throw new Error("Invalid user type");

    // Calculate taxable income after deductions
    let taxableIncome = income;
    Object.entries(deductions).forEach(([type, amount]) => {
      const deductionRule = userRules.deductions[type];
      if (deductionRule) {
        const maxDeduction = deductionRule.max || amount;
        const deductionAmount = Math.min(amount, maxDeduction);
        taxableIncome -= deductionAmount * deductionRule.rate;
      }
    });

    // Apply tax slabs
    let tax = 0;
    for (const slab of userRules.slabs) {
      const slabIncome = Math.min(
        Math.max(taxableIncome - slab.min, 0),
        slab.max - slab.min
      );
      tax += slabIncome * slab.rate;
    }

    return {
      grossIncome: income,
      taxableIncome: Math.max(taxableIncome, 0),
      tax: Math.max(tax, 0),
      effectiveRate: tax / income,
    };
  }
}
```

#### 3.1.2 Implement 2024-25 tax slabs and rates

**Resources:**

- **NBR Finance Act 2024**: https://nbr.gov.bd/finance-act-2024
- **Tax Slab Calculator**: https://github.com/username/bangladesh-tax-calculator

#### 3.1.3 Build deduction calculation engine

**Code Example:**

```javascript
class DeductionEngine {
  constructor() {
    this.deductionRules = {
      investment: {
        types: ["dps", "savings_certificate", "life_insurance", "pf"],
        maxTotal: 1500000,
        rate: 0.15,
      },
      donations: {
        types: ["charitable", "educational", "religious"],
        maxPercentage: 0.1, // 10% of income
        rate: 1.0,
      },
      houseRent: {
        maxPercentage: 0.25, // 25% of basic salary
        rate: 1.0,
      },
    };
  }

  calculateDeductions(income, investments, donations, houseRent) {
    const deductions = {};

    // Investment deductions
    const totalInvestment = Object.values(investments).reduce(
      (a, b) => a + b,
      0
    );
    deductions.investment =
      Math.min(totalInvestment, this.deductionRules.investment.maxTotal) *
      this.deductionRules.investment.rate;

    // Donation deductions
    const totalDonations = Object.values(donations).reduce((a, b) => a + b, 0);
    const maxDonation = income * this.deductionRules.donations.maxPercentage;
    deductions.donations = Math.min(totalDonations, maxDonation);

    // House rent deductions
    const maxHouseRent = income * this.deductionRules.houseRent.maxPercentage;
    deductions.houseRent = Math.min(houseRent, maxHouseRent);

    return deductions;
  }
}
```

#### 3.1.4 Create tax resolver pattern

**Resources:**

- **Strategy Pattern**: https://refactoring.guru/design-patterns/strategy
- **Factory Pattern**: https://refactoring.guru/design-patterns/factory-method

#### 3.1.5 Add penalty calculation logic

**Code Example:**

```javascript
class PenaltyCalculator {
  constructor() {
    this.penaltyRules = {
      lateReturn: {
        rate: 0.005, // 0.5% per month
        maxMonths: 12,
      },
      underPayment: {
        rate: 0.02, // 2% per month
        maxMonths: 12,
      },
      nonFiling: {
        fixedAmount: 1000,
        percentageRate: 0.005,
      },
    };
  }

  calculateLatePenalty(taxAmount, monthsLate) {
    const months = Math.min(monthsLate, this.penaltyRules.lateReturn.maxMonths);
    return taxAmount * this.penaltyRules.lateReturn.rate * months;
  }

  calculateUnderPaymentPenalty(unpaidAmount, monthsLate) {
    const months = Math.min(
      monthsLate,
      this.penaltyRules.underPayment.maxMonths
    );
    return unpaidAmount * this.penaltyRules.underPayment.rate * months;
  }
}
```

#### 3.1.6 Implement advance tax calculations

**Code Example:**

```javascript
class AdvanceTaxCalculator {
  constructor() {
    this.quarters = [
      { name: "Q1", dueDate: "2024-09-15", percentage: 0.25 },
      { name: "Q2", dueDate: "2024-12-15", percentage: 0.25 },
      { name: "Q3", dueDate: "2025-03-15", percentage: 0.25 },
      { name: "Q4", dueDate: "2025-06-15", percentage: 0.25 },
    ];
  }

  calculateAdvanceTax(annualTax, currentQuarter) {
    const quarterlyAmount = annualTax / 4;
    const schedule = [];

    for (let i = 0; i < 4; i++) {
      const quarter = this.quarters[i];
      const isPaid = i < currentQuarter;
      const isOverdue = new Date() > new Date(quarter.dueDate);

      schedule.push({
        quarter: quarter.name,
        dueDate: quarter.dueDate,
        amount: quarterlyAmount,
        isPaid,
        isOverdue,
      });
    }

    return schedule;
  }
}
```

### 3.2 Interactive Chat Cards

#### 3.2.1 Create calculator card component

**Resources:**

- **React**: https://react.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **Headless UI**: https://headlessui.com/

**Code Example:**

```jsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function TaxCalculatorCard({ onCalculate }) {
  const [income, setIncome] = useState("");
  const [userType, setUserType] = useState("salaried");

  const handleCalculate = () => {
    onCalculate({
      income: parseFloat(income),
      userType,
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>কর ক্যালকুলেটর</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">আয়ের ধরন</label>
          <select
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="salaried">চাকরিজীবী</option>
            <option value="business">ব্যবসায়ী</option>
            <option value="freelancer">ফ্রিল্যান্সার</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            বার্ষিক আয় (৳)
          </label>
          <Input
            type="number"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="আপনার বার্ষিক আয়"
          />
        </div>

        <Button onClick={handleCalculate} className="w-full">
          কর গণনা করুন
        </Button>
      </CardContent>
    </Card>
  );
}
```

#### 3.2.2 Build income input forms

**Code Example:**

```jsx
export default function IncomeInputForm({ userType, onSubmit }) {
  const [formData, setFormData] = useState({
    basicSalary: "",
    houseRent: "",
    medical: "",
    conveyance: "",
    bonus: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const renderSalariedForm = () => (
    <div className="space-y-4">
      <Input
        label="মূল বেতন"
        value={formData.basicSalary}
        onChange={(e) =>
          setFormData({ ...formData, basicSalary: e.target.value })
        }
        placeholder="মাসিক মূল বেতন"
      />
      <Input
        label="বাড়ি ভাড়া"
        value={formData.houseRent}
        onChange={(e) =>
          setFormData({ ...formData, houseRent: e.target.value })
        }
        placeholder="মাসিক বাড়ি ভাড়া"
      />
      {/* More fields */}
    </div>
  );

  const renderBusinessForm = () => (
    <div className="space-y-4">
      <Input label="মোট আয়" placeholder="বার্ষিক মোট আয়" />
      <Input label="ব্যবসায়িক খরচ" placeholder="বার্ষিক ব্যবসায়িক খরচ" />
      {/* More fields */}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {userType === "salaried" && renderSalariedForm()}
      {userType === "business" && renderBusinessForm()}
      <Button type="submit">পরবর্তী</Button>
    </form>
  );
}
```

#### 3.2.3 Add deduction selection interface

**Code Example:**

```jsx
export default function DeductionSelector({ onSelect }) {
  const [selectedDeductions, setSelectedDeductions] = useState({});

  const deductionOptions = [
    { id: "dps", label: "DPS", maxAmount: 1200000 },
    { id: "life_insurance", label: "জীবন বীমা", maxAmount: 100000 },
    { id: "pf", label: "প্রভিডেন্ট ফান্ড", maxAmount: null },
    { id: "savings_certificate", label: "সঞ্চয়পত্র", maxAmount: null },
  ];

  const handleDeductionChange = (id, amount) => {
    setSelectedDeductions((prev) => ({
      ...prev,
      [id]: parseFloat(amount) || 0,
    }));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">কর ছাড় নির্বাচন করুন</h3>

      {deductionOptions.map((option) => (
        <div
          key={option.id}
          className="flex items-center justify-between p-3 border rounded"
        >
          <div>
            <label className="font-medium">{option.label}</label>
            {option.maxAmount && (
              <p className="text-sm text-gray-600">
                সর্বোচ্চ: ৳{option.maxAmount.toLocaleString()}
              </p>
            )}
          </div>
          <Input
            type="number"
            placeholder="পরিমাণ"
            onChange={(e) => handleDeductionChange(option.id, e.target.value)}
            className="w-32"
          />
        </div>
      ))}

      <Button onClick={() => onSelect(selectedDeductions)} className="w-full">
        কর ছাড় প্রয়োগ করুন
      </Button>
    </div>
  );
}
```

#### 3.2.4 Create savings visualization cards

**Resources:**

- **Chart.js**: https://www.chartjs.org/
- **Recharts**: https://recharts.org/
- **D3.js**: https://d3js.org/

**Code Example:**

```jsx
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts";

export default function SavingsVisualization({ taxData }) {
  const data = [
    { name: "কর", value: taxData.tax, color: "#ef4444" },
    { name: "সঞ্চয়", value: taxData.savings, color: "#22c55e" },
    { name: "হাতে পাওয়া", value: taxData.takeHome, color: "#3b82f6" },
  ];

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>আয়ের বিভাজন</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between">
            <span>মোট কর:</span>
            <span className="font-semibold">
              ৳{taxData.tax.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>সম্ভাব্য সঞ্চয়:</span>
            <span className="font-semibold text-green-600">
              ৳{taxData.savings.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 3.2.5 Implement progress tracking cards

**Code Example:**

```jsx
export default function ProgressTracker({ steps, currentStep }) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>অগ্রগতি</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  index < currentStep
                    ? "bg-green-500 text-white"
                    : index === currentStep
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {index < currentStep ? "✓" : index + 1}
              </div>
              <span
                className={`${
                  index <= currentStep ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 3.2.6 Add tax comparison charts

**Code Example:**

```jsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function TaxComparisonChart({ scenarios }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>কর তুলনা</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={scenarios}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value) => [`৳${value.toLocaleString()}`, "কর"]}
            />
            <Bar dataKey="tax" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### 3.3 Form Integration

#### 3.3.1 Replace static calculator with dynamic engine

**Code Example:**

```jsx
import { useState, useEffect } from "react";
import { TaxCalculator } from "@/lib/taxCalculator";

export default function DynamicTaxCalculator() {
  const [calculator] = useState(new TaxCalculator(taxRules2024));
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    income: "",
    userType: "salaried",
    deductions: {},
  });

  useEffect(() => {
    if (formData.income && formData.userType) {
      const result = calculator.calculateTax(
        parseFloat(formData.income),
        formData.userType,
        formData.deductions
      );
      setResult(result);
    }
  }, [formData, calculator]);

  return (
    <div className="space-y-6">
      <TaxCalculatorCard
        onCalculate={(data) => setFormData((prev) => ({ ...prev, ...data }))}
      />

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SavingsVisualization taxData={result} />
          <TaxBreakdown breakdown={result} />
        </div>
      )}
    </div>
  );
}
```

#### 3.3.2 Add real-time calculation updates

**Code Example:**

```jsx
import { useDebounce } from "@/hooks/useDebounce";

export default function RealTimeCalculator() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);

  const debouncedInput = useDebounce(input, 300);

  useEffect(() => {
    if (debouncedInput) {
      const calculator = new TaxCalculator(taxRules2024);
      const result = calculator.calculateTax(
        parseFloat(debouncedInput),
        "salaried"
      );
      setResult(result);
    }
  }, [debouncedInput]);

  return (
    <div>
      <Input
        type="number"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="আয়ের পরিমাণ লিখুন..."
      />

      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p>কর: ৳{result.tax.toLocaleString()}</p>
          <p>কার্যকর হার: {(result.effectiveRate * 100).toFixed(2)}%</p>
        </div>
      )}
    </div>
  );
}
```

#### 3.3.3 Create tax optimization suggestions

**Code Example:**

```javascript
class TaxOptimizer {
  constructor() {
    this.optimizations = [
      {
        id: "dps_investment",
        title: "DPS বিনিয়োগ",
        description: "DPS এ বিনিয়োগ করে ১৫% কর ছাড় পান",
        savingsCalculator: (income) => Math.min(income * 0.15, 180000),
        requirement: "মাসিক DPS কিস্তি দিন",
      },
      {
        id: "life_insurance",
        title: "জীবন বীমা",
        description: "জীবন বীমা প্রিমিয়াম থেকে কর ছাড়",
        savingsCalculator: (income) => Math.min(income * 0.15, 15000),
        requirement: "বার্ষিক প্রিমিয়াম সর্বোচ্চ ১ লক্ষ টাকা",
      },
    ];
  }

  getSuggestions(income, currentDeductions) {
    return this.optimizations
      .map((opt) => ({
        ...opt,
        potentialSavings: opt.savingsCalculator(income),
        isUsed: currentDeductions[opt.id] > 0,
      }))
      .filter((opt) => !opt.isUsed);
  }
}
```

#### 3.3.4 Implement form validation

**Resources:**

- **Zod**: https://zod.dev/
- **React Hook Form**: https://react-hook-form.com/
- **Formik**: https://formik.org/

**Code Example:**

```jsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const taxFormSchema = z.object({
  income: z.number().min(0, "আয় ০ এর চেয়ে কম হতে পারে না"),
  userType: z.enum(["salaried", "business", "freelancer"]),
  deductions: z.object({
    dps: z.number().min(0).max(1200000, "DPS সর্বোচ্চ ১২ লক্ষ টাকা"),
    lifeInsurance: z
      .number()
      .min(0)
      .max(100000, "জীবন বীমা সর্বোচ্চ ১ লক্ষ টাকা"),
  }),
});

export default function ValidatedTaxForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(taxFormSchema),
  });

  const onSubmit = (data) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input
          {...register("income", { valueAsNumber: true })}
          type="number"
          placeholder="আয়ের পরিমাণ"
        />
        {errors.income && (
          <p className="text-red-500 text-sm">{errors.income.message}</p>
        )}
      </div>

      <Button type="submit">জমা দিন</Button>
    </form>
  );
}
```

#### 3.3.5 Add input sanitization

**Code Example:**

```javascript
class InputSanitizer {
  static sanitizeNumber(input) {
    // Remove non-numeric characters except decimal point
    const cleaned = input.replace(/[^0-9.]/g, "");

    // Ensure only one decimal point
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      return parts[0] + "." + parts.slice(1).join("");
    }

    return cleaned;
  }

  static sanitizeText(input) {
    // Remove HTML tags and trim whitespace
    return input.replace(/<[^>]*>/g, "").trim();
  }

  static validateBangladeshiTIN(tin) {
    // TIN format: 12 digits
    const tinRegex = /^\d{12}$/;
    return tinRegex.test(tin);
  }

  static validateBangladeshiPhone(phone) {
    // Bangladesh phone format: +880 or 880 followed by 10 digits
    const phoneRegex = /^(\+880|880)?[1-9]\d{8}$/;
    return phoneRegex.test(phone);
  }
}
```

---

## **General Development Resources**

### Documentation and Learning

- **Next.js Documentation**: https://nextjs.org/docs
- **React Documentation**: https://react.dev/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Supabase Documentation**: https://supabase.com/docs

### Free Development Tools

- **Visual Studio Code**: https://code.visualstudio.com/
- **Git**: https://git-scm.com/
- **Node.js**: https://nodejs.org/
- **Docker**: https://www.docker.com/
- **Postman**: https://www.postman.com/

### Free Hosting and Services

- **Vercel**: https://vercel.com/ (Free tier for frontend)
- **Railway**: https://railway.app/ (Free tier for backend)
- **Supabase**: https://supabase.com/ (Free tier for database)
- **Upstash**: https://upstash.com/ (Free tier for Redis)
- **Cloudflare**: https://www.cloudflare.com/ (Free CDN and security)

### Testing and Quality Assurance

- **Jest**: https://jestjs.io/
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
- **Cypress**: https://www.cypress.io/
- **ESLint**: https://eslint.org/
- **Prettier**: https://prettier.io/

### Performance and Monitoring

- **Lighthouse**: https://developers.google.com/web/tools/lighthouse
- **Sentry**: https://sentry.io/ (Free tier for error tracking)
- **Google Analytics**: https://analytics.google.com/
- **Plausible**: https://plausible.io/ (Privacy-focused analytics)

### Design and UI Resources

- **Figma**: https://www.figma.com/ (Free tier available)
- **Unsplash**: https://unsplash.com/ (Free photos)
- **Heroicons**: https://heroicons.com/ (Free SVG icons)
- **Radix UI**: https://www.radix-ui.com/ (Headless UI components)

---

## **Conclusion**

This resource document provides comprehensive, free, and open-source tools for every task in the AI Tax Lawyer Bangladesh project. Each resource has been carefully selected for:

1. **Cost-effectiveness**: Free or generous free tiers
2. **Reliability**: Proven tools with good community support
3. **Scalability**: Can grow with the project
4. **Documentation**: Well-documented with examples
5. **Community**: Active communities for support

All resources are current as of 2024 and should provide a solid foundation for building the complete AI Tax Lawyer Bangladesh platform. Regular updates to this document will ensure resources remain current and effective.
