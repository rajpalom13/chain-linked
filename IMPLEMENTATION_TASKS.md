# ChainLinked Platform Enhancement - Implementation Plan

## Overview
Comprehensive enhancement of the ChainLinked LinkedIn content management platform covering 8 major workstreams with UI/UX optimizations.

---

## WORKSTREAM 1: Enhanced Onboarding with Company Context Ingestion
**Reference**: e:/agiready/canada onboarding patterns

### Tasks:
1. **Redesign Onboarding Step 3 (Company Context)**
   - Replace current basic company setup with rich company ingestion
   - Add fields: Company Name, Company Website URL, Industry, Target Audience
   - Implement AI-powered website analysis using OpenAI to extract brand context
   - Extract: value proposition, products/services, target ICP, tone of voice
   - Store structured data in `brand_kits` table

2. **Add Onboarding Step 4 (AI Analysis Review)**
   - Display AI-extracted company data in editable rich format
   - Show structured sections: Company Info, Products, ICP, Tone/Voice
   - Color-coded sections with icons (following canada patterns)
   - Allow user to edit/refine extracted data
   - Dual persistence: localStorage + Supabase

3. **Enhance Onboarding Progress Component**
   - Improve progress bar with step labels
   - Add step descriptions
   - Better mobile responsiveness
   - Animated transitions between steps

4. **Implement Onboarding Guard Enhancement**
   - Prevent step skipping with server-side validation
   - Handle invite flow (copy team owner's company data)
   - Multi-layer fallback loading (Supabase → localStorage)

---

## WORKSTREAM 2: LinkedIn OAuth & Posting Flow
### Tasks:
5. **Fix LinkedIn Status API Route**
   - Implement `/api/linkedin/status` endpoint (currently empty stub)
   - Check token validity, expiry, and connection status
   - Return structured status response

6. **Enhance Copy-to-Clipboard Fallback**
   - Add polished "Copy to LinkedIn" button in compose
   - Quick action: Open LinkedIn in new tab + copy content
   - Toast confirmation with LinkedIn redirect link
   - Visual feedback with animation

7. **LinkedIn Connection Status Component**
   - Real-time connection status badge in sidebar
   - Token expiry warning notifications
   - Re-connect flow without losing data

---

## WORKSTREAM 3: Discover Tab with Real Data Pipeline
### Tasks:
8. **Build Discover API Route**
   - Create `/api/discover/posts` endpoint
   - Accept topic/category filters
   - Pagination support
   - Cache layer for scraped content

9. **Enhance Discover UI**
   - Better content cards with creator profiles (avatar, headline)
   - Engagement metrics display (likes, comments, reposts)
   - Visual source badges with brand colors
   - Infinite scroll with intersection observer
   - Skeleton loading states
   - Empty state improvements

10. **Build Post Import/Storage System**
    - Create database schema for discovered posts
    - API route to receive scraped data from Apify
    - Deduplication logic
    - Engagement metric storage and updates

---

## WORKSTREAM 4: Prompt Reverse Engineering & Post Type Classification
### Tasks:
11. **Build Post Type Classification System**
    - Define post type taxonomy: Story, Listicle, How-To, Contrarian, Case Study, Personal Reflection, Data-Driven, Question/Poll, Carousel Summary
    - Create classification prompts for OpenAI
    - Store classifications in database

12. **Create Post Type Dropdown in Composer**
    - Add post type selector in compose page
    - Each type has tailored system prompt
    - Dynamic prompt switching based on selection
    - Show type-specific tips and guidelines

13. **Build Prompt Templates per Post Type**
    - Create 9+ prompt templates mapped to post types
    - Include tone, structure, hook patterns
    - Store in database for admin management
    - Allow user customization

---

## WORKSTREAM 5: Admin Panel
### Tasks:
14. **Create Admin Layout & Navigation**
    - New `/admin` route group
    - Admin sidebar with sections
    - Role-based access control
    - Admin detection middleware

15. **Build Prompt Management Dashboard**
    - CRUD for system prompts
    - Prompt versioning
    - A/B testing support
    - Usage analytics per prompt

16. **Build Data Overview Dashboard**
    - User count, active users, post count metrics
    - Engagement aggregates across all users
    - Top performing content types
    - Data tables with filtering and sorting (TanStack)

17. **Build User Management Panel**
    - User list with search/filter
    - User detail view
    - Account status management
    - Team management overview

---

## WORKSTREAM 6: PostHog Analytics Integration
### Tasks:
18. **Complete PostHog Event Tracking**
    - Track all key user actions:
      - Post created, edited, scheduled, published
      - Template used, saved, deleted
      - AI generation triggered (with type)
      - Carousel created, exported
      - Swipe actions (left/right)
      - Discover content viewed, remixed
      - Settings changed
      - Onboarding step completed
    - Add feature flags support
    - Implement user properties sync

19. **Add Session Replay Setup**
    - Enable session recording in PostHog config
    - Add privacy controls (mask sensitive fields)
    - Configure recording triggers

---

## WORKSTREAM 7: Prompt Playground Enhancement
### Tasks:
20. **Enhance Prompt Playground UI**
    - Add variable management panel
    - Template library sidebar
    - Response comparison view (side-by-side)
    - Token usage display
    - Model selection dropdown
    - Temperature/top-p controls
    - Save/load prompt configurations

21. **Add Prompt History**
    - Store prompt runs with results
    - Searchable history list
    - Re-run previous prompts
    - Compare results across runs

---

## WORKSTREAM 8: Carousel Editor Enhancements
### Tasks:
22. **Implement Default Carousel Templates**
    - 6+ professional templates (Minimalist, Bold, Corporate, Creative, Data-Driven, Story)
    - Template preview thumbnails
    - One-click template application
    - Favorite/star templates
    - Recently used templates

23. **AI Content Integration for Carousels**
    - Generate slide content from topic
    - Auto-populate slides with AI content
    - Suggest visual layouts based on content
    - Smart text sizing based on content length

---

## WORKSTREAM 9: UI/UX Platform Optimization
### Tasks:
24. **Dashboard Home Improvements**
    - Better metric card designs with micro-animations
    - Improved goals tracker visual design
    - Quick actions redesign with better iconography
    - Performance chart improvements

25. **Sidebar Navigation Enhancement**
    - Active state improvements
    - Section grouping with collapsible categories
    - Badge counters for notifications
    - Keyboard navigation support

26. **Global UI Polish**
    - Consistent spacing and typography
    - Better empty states across all pages
    - Improved loading skeletons
    - Smooth page transitions with Framer Motion
    - Better dark mode contrast
    - Accessibility improvements (focus rings, aria labels)
    - Toast notification consistency
    - Form validation UX improvements

27. **Compose Page UX Enhancement**
    - Better LinkedIn preview accuracy
    - Character count with visual progress bar
    - Draft auto-save indicator
    - Improved media upload UX
    - Better AI generation integration

28. **Mobile Responsiveness Audit**
    - Fix any responsive breakpoint issues
    - Improve touch targets
    - Better mobile navigation
    - Swipe gestures on mobile

---

## Implementation Priority Order

### Phase 1 (Core - Parallel)
- Workstream 1 (Onboarding) - Agent A
- Workstream 9 (UI/UX) - Agent B
- Workstream 6 (PostHog) - Agent C

### Phase 2 (Features - Parallel)
- Workstream 2 (LinkedIn) - Agent D
- Workstream 4 (Post Types) - Agent E
- Workstream 7 (Prompt Playground) - Agent F

### Phase 3 (Advanced - Parallel)
- Workstream 3 (Discover) - Agent G
- Workstream 5 (Admin Panel) - Agent H
- Workstream 8 (Carousel) - Agent I

### Phase 4: QA & Integration Testing
- Cross-feature integration testing
- Build verification
- Regression testing
