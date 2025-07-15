# Claude Development Guidelines for AI Tax Lawyer

## Project Context
You are working on AI Tax Lawyer, an AI-powered tax advisor for Bangladeshi taxpayers. This application helps users legally optimize their taxes using NBR rules, SROs, and Income Tax Ordinance guidance.

## Core Workflow Instructions
**CRITICAL: Follow these steps at the start of every conversation:**

1. **Always read planning.md first** to understand the current project architecture and technical decisions
2. **Check tasks.md before starting work** to see what needs to be done and current progress
3. **Mark completed tasks immediately** when you finish them
4. **Add new tasks** to tasks.md when you discover additional work needed
5. **Update session summaries** in this file to maintain project context

## Technology Stack & Constraints

### Required Technologies
- **Frontend:** Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, MongoDB with Mongoose
- **AI:** OpenAI GPT-4 API with custom prompts
- **Vector DB:** Supabase Vector for RAG system
- **Auth:** NextAuth.js with multiple providers
- **Payments:** bKash/Nagad integration for Bangladesh
- **Deployment:** Vercel for frontend, Railway for additional services

### Code Standards
- Use TypeScript strictly - no `any` types
- Follow Next.js 14 App Router conventions
- Implement responsive design with Tailwind CSS
- Use server components where possible for performance
- Implement proper error handling and loading states
- Add comprehensive TypeScript interfaces for all data

### AI & RAG Implementation
- Optimize OpenAI API calls to minimize costs
- Implement semantic chunking for tax documents
- Use hybrid search (semantic + keyword) for better accuracy
- Always cite sources with NBR document references
- Implement confidence scoring for AI responses
- Add legal disclaimers to all AI-generated advice

## Development Priorities

### Performance Optimization
1. **Minimize API costs:** Cache responses, use streaming, implement query optimization
2. **Fast loading:** Use Next.js image optimization, lazy loading, code splitting
3. **Mobile-first:** Ensure excellent mobile experience for Bangladesh users
4. **SEO optimization:** Implement proper meta tags, structured data, sitemap

### User Experience Focus
1. **Bangladeshi Context:** Support Bengali language, local payment methods
2. **Trust Building:** Show citations, disclaimers, expert verification
3. **Simplicity:** Complex tax concepts explained in simple terms
4. **Accessibility:** WCAG compliance, keyboard navigation, screen reader support

### Security & Compliance
1. **Data Protection:** Encrypt sensitive tax data, secure API endpoints
2. **Legal Compliance:** Include proper disclaimers, terms of service
3. **Audit Trail:** Log all AI interactions with timestamps and sources
4. **Rate Limiting:** Prevent abuse of expensive AI APIs

## File Structure Guidelines
```
src/
├── app/                    # Next.js 14 App Router
├── components/             # Reusable UI components
│   ├── ui/                # Shadcn/ui components
│   ├── forms/             # Form components
│   ├── chat/              # Chat interface components
│   └── layout/            # Layout components
├── lib/                   # Utility functions
│   ├── db/                # Database utilities
│   ├── ai/                # AI and RAG utilities
│   ├── auth/              # Authentication utilities
│   └── utils/             # General utilities
├── types/                 # TypeScript type definitions
└── hooks/                 # Custom React hooks
```

## Quality Assurance
- Test all payment flows thoroughly
- Validate AI responses against known tax scenarios
- Ensure mobile responsiveness on various devices
- Test with different user personas (salaried, freelancer, business)
- Verify NBR citation accuracy

## Session Management
When context gets full or you need to summarize progress:
1. Review planning.md and tasks.md to understand current state
2. Update session summary section in this file with progress
3. Mark completed tasks and add new ones as needed

## Current Session Summary
*Last updated: 2025-01-14*

### Completed Work
- ✅ Created foundational project files (PRD, claude.md, planning.md, tasks.md)
- ✅ Updated all project names from "TaxMukto AI" to "AI Tax Lawyer" 
- ✅ TASK-001: Initialized Next.js 15+ project with TypeScript and Tailwind CSS
- ✅ TASK-002: Configured development environment with modern design system
- ✅ TASK-003: Set up MongoDB connection and comprehensive schemas (User, Conversation, TaxDocument)
- ✅ TASK-004: Configured OpenAI API integration with cost optimization and specialized prompts
- ✅ TASK-005: Designed and implemented core AI prompts for tax consultation
- ✅ TASK-006: Set up Supabase Vector database for RAG
- ✅ TASK-007: Implemented document processing pipeline
- ✅ TASK-008: Built RAG retrieval system
- ✅ TASK-009: Created enhanced landing page with hero section and features
- ✅ TASK-010: Built user onboarding flow and persona identification
- ✅ TASK-011: Implemented chat interface with real-time messaging
- ✅ TASK-012: Created user dashboard and conversation history

### In Progress
- Ready to move to next milestone: Localization & Compliance (TASK-022 to TASK-025)

### Next Steps
- TASK-022: Implement internationalization (i18n) framework
- TASK-023: Add Bengali language support for chat interface
- TASK-024: Implement legal disclaimers and terms of service
- TASK-025: Create audit trail and logging system

### Milestone 3 Complete: User Interface & Experience ✅
**All UI/UX tasks successfully completed:**
- TASK-009: Enhanced landing page with professional design ✅
- TASK-010: 3-step user onboarding flow with persona identification ✅
- TASK-011: Chat interface with real-time messaging ✅
- TASK-012: User dashboard with conversation history ✅
- TASK-012A: Real-time streaming chat responses (ChatGPT-like experience) ✅

**Key Achievements:**
- Modern, responsive design optimized for Bangladesh users
- Professional landing page with clear value proposition
- Comprehensive onboarding flow for user persona identification
- Real-time streaming chat with OpenAI integration
- Complete dashboard with analytics and conversation management
- ChatGPT-like streaming experience (text appears character by character)
- Performance optimized: responses start streaming within 1-2 seconds

### Milestone 5 Complete: Payment & Subscription System ✅
**All payment and subscription features successfully completed:**
- TASK-016: bKash payment gateway integration with API, payment flow, webhook handling ✅
- TASK-017: Complete subscription tiers and billing system (Free, Pro, Business) ✅
- TASK-018: Pricing page and subscription management with billing history ✅

**Key Achievements:**
- Full bKash payment integration with sandbox and production environments
- MongoDB models for subscriptions and payments with comprehensive schemas
- Feature gating system based on subscription tiers
- Dynamic pricing page with upgrade/downgrade flows
- Subscription management dashboard with usage tracking
- Payment history and audit trail for compliance
- Webhook handling for automated subscription activation
- Professional subscription card component integrated in dashboard

### Milestone 6 Complete: Advanced Features ✅
**All advanced tax calculation and optimization features successfully completed:**
- TASK-019: Interactive tax calculator with NBR-compliant calculations ✅
- TASK-020: Deduction finder and optimizer with smart recommendations ✅
- TASK-021: Professional PDF report generation with legal disclaimers ✅

**Key Achievements:**
- Complete tax calculator supporting all user types (salaried, freelancer, landlord, business)
- Advanced deduction optimizer with automated opportunity discovery
- Professional HTML report generation with comprehensive styling
- Real-time calculations using accurate NBR tax slabs and rates
- Smart deduction recommendations with implementation scoring
- Professional reports with legal disclaimers and audit trail
- Seamless integration with authentication and payment systems
- Mobile-responsive design optimized for Bangladesh users

### Important Notes
- Project upgraded to Next.js 15+ and React 19 for latest features
- Comprehensive MongoDB schemas designed for scalability
- AI system optimized for cost efficiency (gpt-4o-mini for simple queries, gpt-4o for complex)
- All code follows TypeScript strict mode and Next.js 15 conventions
- Beautiful landing page created with gradient design and user type cards
- Complete payment system ready for production with bKash integration

## Common Patterns & Best Practices

### AI Response Format
```typescript
interface AIResponse {
  summary: string;
  breakdown: TaxAdvice[];
  sources: NBRSource[];
  disclaimer: string;
  confidence: number;
}
```

### Error Handling
```typescript
try {
  // AI API call
} catch (error) {
  // Log error
  // Return user-friendly message
  // Graceful degradation
}
```

### Cost Optimization
- Use GPT-3.5 for simple queries, GPT-4 for complex tax scenarios
- Implement response caching for common questions
- Use streaming responses for better UX
- Batch similar queries when possible

## Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build production version
npm run type-check   # Run TypeScript checks
npm run lint         # Run ESLint
npm run test         # Run tests
```

Remember: This is a high-stakes application dealing with financial advice. Always prioritize accuracy, legal compliance, and user trust over feature velocity.