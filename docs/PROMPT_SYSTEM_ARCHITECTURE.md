# Unified Prompt Management System - Architecture Plan

## Overview

This document outlines the architecture for a centralized prompt management system that connects the Prompt Playground to all AI features (Remix, Post Composer, Carousel Generation) with Supabase storage and version tracking.

---

## Current State (Problems)

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT (Disconnected)                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Prompt Playground → localStorage → (dead end)              │
│  Admin Prompts → localStorage → (unused)                    │
│                                                              │
│  Remix → /api/ai/remix → hardcoded buildRemixSystemPrompt() │
│  Compose → /api/ai/generate → hardcoded TYPE_PROMPTS        │
│  Carousel → /api/ai/carousel/generate → hardcoded prompts   │
│                                                              │
│  NO VERSION TRACKING | NO CENTRAL STORAGE | NO CONNECTION   │
└─────────────────────────────────────────────────────────────┘
```

---

## Target State (Solution)

```
┌─────────────────────────────────────────────────────────────┐
│                     UNIFIED PROMPT SYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │ Prompt Playground│───▶│     Supabase Database        │   │
│  │ (Edit & Test)   │    │  ┌────────────────────────┐  │   │
│  └─────────────────┘    │  │    system_prompts      │  │   │
│                         │  │  - id                  │  │   │
│  ┌─────────────────┐    │  │  - type (enum)         │  │   │
│  │  Admin Panel    │───▶│  │  - name                │  │   │
│  │ (Manage & Deploy)│   │  │  - content             │  │   │
│  └─────────────────┘    │  │  - version             │  │   │
│                         │  │  - is_active           │  │   │
│         ▲               │  │  - is_default          │  │   │
│         │               │  │  - created_by          │  │   │
│         │               │  │  - created_at          │  │   │
│         │               │  │  - updated_at          │  │   │
│         │               │  └────────────────────────┘  │   │
│         │               │                              │   │
│         │               │  ┌────────────────────────┐  │   │
│         │               │  │  prompt_versions       │  │   │
│         │               │  │  - id                  │  │   │
│         │               │  │  - prompt_id (FK)      │  │   │
│         │               │  │  - version             │  │   │
│         │               │  │  - content             │  │   │
│         │               │  │  - change_notes        │  │   │
│         │               │  │  - created_by          │  │   │
│         │               │  │  - created_at          │  │   │
│         │               │  └────────────────────────┘  │   │
│         │               │                              │   │
│         │               │  ┌────────────────────────┐  │   │
│         │               │  │  prompt_usage_logs     │  │   │
│         │               │  │  - id                  │  │   │
│         │               │  │  - prompt_id (FK)      │  │   │
│         │               │  │  - user_id             │  │   │
│         │               │  │  - feature             │  │   │
│         │               │  │  - tokens_used         │  │   │
│         │               │  │  - response_quality    │  │   │
│         │               │  │  - created_at          │  │   │
│         │               │  └────────────────────────┘  │   │
│         │               └──────────────────────────────┘   │
│         │                              │                    │
│         │                              ▼                    │
│         │               ┌──────────────────────────────┐   │
│         │               │     Prompt Service Layer      │   │
│         │               │  lib/prompts/prompt-service.ts│   │
│         │               │  - getActivePrompt(type)      │   │
│         │               │  - getPromptWithFallback()    │   │
│         │               │  - savePrompt()               │   │
│         │               │  - createVersion()            │   │
│         │               │  - logUsage()                 │   │
│         │               └──────────────────────────────┘   │
│                                        │                    │
│         ┌──────────────────────────────┼───────────────┐   │
│         │                              │               │   │
│         ▼                              ▼               ▼   │
│  ┌─────────────┐              ┌─────────────┐  ┌─────────┐ │
│  │   Remix     │              │  Composer   │  │Carousel │ │
│  │/api/ai/remix│              │/api/ai/gen  │  │/api/ai/ │ │
│  │             │              │             │  │carousel │ │
│  └─────────────┘              └─────────────┘  └─────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table 1: `system_prompts`
Main table storing all prompt configurations.

```sql
CREATE TYPE prompt_type AS ENUM (
  'remix_professional',
  'remix_casual',
  'remix_inspiring',
  'remix_educational',
  'remix_thought_provoking',
  'remix_match_style',
  'post_story',
  'post_listicle',
  'post_how_to',
  'post_contrarian',
  'post_case_study',
  'post_reflection',
  'post_data_driven',
  'post_question',
  'post_carousel',
  'carousel_system',
  'carousel_user_template',
  'base_rules'
);

CREATE TABLE system_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type prompt_type NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_active_per_type UNIQUE (type, is_active)
    WHERE is_active = true
);

-- Indexes for performance
CREATE INDEX idx_prompts_type ON system_prompts(type);
CREATE INDEX idx_prompts_active ON system_prompts(is_active) WHERE is_active = true;
CREATE INDEX idx_prompts_default ON system_prompts(is_default) WHERE is_default = true;
```

### Table 2: `prompt_versions`
Version history for audit trail and rollback capability.

```sql
CREATE TABLE prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES system_prompts(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  change_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_version_per_prompt UNIQUE (prompt_id, version)
);

-- Index for fetching version history
CREATE INDEX idx_versions_prompt ON prompt_versions(prompt_id, version DESC);
```

### Table 3: `prompt_usage_logs`
Track prompt usage for analytics and optimization.

```sql
CREATE TABLE prompt_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES system_prompts(id) ON DELETE SET NULL,
  prompt_type prompt_type NOT NULL,
  prompt_version INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  feature VARCHAR(50) NOT NULL, -- 'remix', 'compose', 'carousel', 'playground'
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  model VARCHAR(100),
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_usage_prompt ON prompt_usage_logs(prompt_id);
CREATE INDEX idx_usage_type ON prompt_usage_logs(prompt_type);
CREATE INDEX idx_usage_feature ON prompt_usage_logs(feature);
CREATE INDEX idx_usage_created ON prompt_usage_logs(created_at DESC);
CREATE INDEX idx_usage_user ON prompt_usage_logs(user_id);
```

### Table 4: `prompt_test_results`
Store playground test results for comparison and optimization.

```sql
CREATE TABLE prompt_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES system_prompts(id) ON DELETE CASCADE,
  prompt_version INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  system_prompt TEXT NOT NULL,
  user_prompt TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  model VARCHAR(100) NOT NULL,
  temperature DECIMAL(3,2),
  max_tokens INTEGER,
  response_content TEXT NOT NULL,
  tokens_used INTEGER,
  estimated_cost DECIMAL(10,6),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_results_prompt ON prompt_test_results(prompt_id);
CREATE INDEX idx_test_results_user ON prompt_test_results(user_id);
```

---

## Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_test_results ENABLE ROW LEVEL SECURITY;

-- system_prompts: All authenticated users can read, only admins can write
CREATE POLICY "Anyone can read active prompts" ON system_prompts
  FOR SELECT USING (is_active = true OR is_default = true);

CREATE POLICY "Admins can manage prompts" ON system_prompts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- prompt_versions: Read for all, write for admins
CREATE POLICY "Anyone can read versions" ON prompt_versions
  FOR SELECT USING (true);

CREATE POLICY "Admins can create versions" ON prompt_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- prompt_usage_logs: System can write, admins can read all, users can read own
CREATE POLICY "Users can read own usage" ON prompt_usage_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can read all usage" ON prompt_usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "System can log usage" ON prompt_usage_logs
  FOR INSERT WITH CHECK (true);

-- prompt_test_results: Users manage own, admins see all
CREATE POLICY "Users can manage own test results" ON prompt_test_results
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can read all test results" ON prompt_test_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
```

---

## File Structure

```
lib/
├── prompts/
│   ├── index.ts                    # Main exports
│   ├── prompt-service.ts           # Core service class
│   ├── prompt-types.ts             # TypeScript types and enums
│   ├── prompt-defaults.ts          # Default/fallback prompts (from current hardcoded)
│   ├── prompt-cache.ts             # In-memory caching layer
│   └── prompt-utils.ts             # Helper functions (variable substitution, etc.)
│
├── ai/
│   ├── openai-client.ts            # (existing) - no changes
│   ├── remix-prompts.ts            # UPDATE: Use prompt service
│   ├── carousel-prompts.ts         # UPDATE: Use prompt service
│   └── prompt-templates.ts         # UPDATE: Use prompt service

hooks/
├── use-prompts.ts                  # New: Hook for fetching prompts
├── use-prompt-editor.ts            # New: Hook for editing prompts in playground
├── use-prompt-versions.ts          # New: Hook for version history
├── use-admin-prompts.ts            # UPDATE: Connect to Supabase instead of localStorage

components/
├── features/
│   ├── prompt-playground.tsx       # UPDATE: Connect to prompt service
│   ├── prompt-version-history.tsx  # New: Version history panel
│   ├── prompt-analytics.tsx        # New: Usage analytics dashboard
│   └── prompt-diff-viewer.tsx      # New: Compare prompt versions

app/
├── api/
│   ├── prompts/
│   │   ├── route.ts                # GET/POST prompts
│   │   ├── [id]/route.ts           # GET/PUT/DELETE single prompt
│   │   ├── [id]/versions/route.ts  # GET versions, POST new version
│   │   ├── [id]/activate/route.ts  # POST activate prompt
│   │   ├── [id]/rollback/route.ts  # POST rollback to version
│   │   └── test/route.ts           # POST test prompt (existing, update)
│   │
│   ├── ai/
│   │   ├── remix/route.ts          # UPDATE: Use prompt service
│   │   ├── generate/route.ts       # UPDATE: Use prompt service
│   │   ├── carousel/
│   │   │   └── generate/route.ts   # UPDATE: Use prompt service
│   │   └── playground/route.ts     # UPDATE: Log usage

supabase/
├── migrations/
│   └── 20250130_create_prompt_system.sql  # New migration
```

---

## Implementation Tasks

### Phase 1: Database & Core Service (Foundation)
1. **Task 1.1**: Create Supabase migration for all prompt tables
2. **Task 1.2**: Create TypeScript types (`lib/prompts/prompt-types.ts`)
3. **Task 1.3**: Create default prompts file (`lib/prompts/prompt-defaults.ts`)
4. **Task 1.4**: Create prompt service (`lib/prompts/prompt-service.ts`)
5. **Task 1.5**: Create caching layer (`lib/prompts/prompt-cache.ts`)

### Phase 2: API Routes
6. **Task 2.1**: Create prompts CRUD API (`/api/prompts/...`)
7. **Task 2.2**: Create version management API
8. **Task 2.3**: Update `/api/ai/remix` to use prompt service
9. **Task 2.4**: Update `/api/ai/generate` to use prompt service (or create if missing)
10. **Task 2.5**: Update `/api/ai/carousel/generate` to use prompt service
11. **Task 2.6**: Update `/api/ai/playground` to log usage

### Phase 3: Hooks & Frontend
12. **Task 3.1**: Create `use-prompts.ts` hook
13. **Task 3.2**: Create `use-prompt-versions.ts` hook
14. **Task 3.3**: Update `use-admin-prompts.ts` to use Supabase
15. **Task 3.4**: Update Prompt Playground component

### Phase 4: Admin & Analytics
16. **Task 4.1**: Create version history component
17. **Task 4.2**: Create prompt analytics component
18. **Task 4.3**: Update admin prompts page
19. **Task 4.4**: Create prompt diff viewer

### Phase 5: Seeding & Testing
20. **Task 5.1**: Create seed script for default prompts
21. **Task 5.2**: Test all AI features with new prompt system
22. **Task 5.3**: Add error handling and fallbacks

---

## Detailed Component Specifications

### 1. Prompt Service (`lib/prompts/prompt-service.ts`)

```typescript
/**
 * Core prompt service for fetching, caching, and managing prompts
 */
export class PromptService {
  /**
   * Get the active prompt for a given type
   * Falls back to default if no active prompt exists
   */
  static async getActivePrompt(type: PromptType): Promise<SystemPrompt>

  /**
   * Get prompt with automatic fallback to hardcoded defaults
   */
  static async getPromptWithFallback(type: PromptType): Promise<string>

  /**
   * Save a new prompt or update existing
   * Automatically creates a version entry
   */
  static async savePrompt(data: SavePromptInput): Promise<SystemPrompt>

  /**
   * Activate a prompt (deactivates others of same type)
   */
  static async activatePrompt(promptId: string): Promise<void>

  /**
   * Rollback to a specific version
   */
  static async rollbackToVersion(promptId: string, version: number): Promise<SystemPrompt>

  /**
   * Log prompt usage for analytics
   */
  static async logUsage(data: PromptUsageInput): Promise<void>

  /**
   * Get version history for a prompt
   */
  static async getVersionHistory(promptId: string): Promise<PromptVersion[]>

  /**
   * Get usage analytics for a prompt or type
   */
  static async getUsageAnalytics(filter: UsageFilter): Promise<UsageAnalytics>
}
```

### 2. Prompt Types (`lib/prompts/prompt-types.ts`)

```typescript
/**
 * All available prompt types in the system
 */
export enum PromptType {
  // Remix tones
  REMIX_PROFESSIONAL = 'remix_professional',
  REMIX_CASUAL = 'remix_casual',
  REMIX_INSPIRING = 'remix_inspiring',
  REMIX_EDUCATIONAL = 'remix_educational',
  REMIX_THOUGHT_PROVOKING = 'remix_thought_provoking',
  REMIX_MATCH_STYLE = 'remix_match_style',

  // Post types
  POST_STORY = 'post_story',
  POST_LISTICLE = 'post_listicle',
  POST_HOW_TO = 'post_how_to',
  POST_CONTRARIAN = 'post_contrarian',
  POST_CASE_STUDY = 'post_case_study',
  POST_REFLECTION = 'post_reflection',
  POST_DATA_DRIVEN = 'post_data_driven',
  POST_QUESTION = 'post_question',
  POST_CAROUSEL = 'post_carousel',

  // Carousel specific
  CAROUSEL_SYSTEM = 'carousel_system',
  CAROUSEL_USER_TEMPLATE = 'carousel_user_template',

  // Shared
  BASE_RULES = 'base_rules',
}

export interface SystemPrompt {
  id: string
  type: PromptType
  name: string
  description: string | null
  content: string
  variables: PromptVariable[]
  version: number
  isActive: boolean
  isDefault: boolean
  createdBy: string | null
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface PromptVariable {
  key: string
  description: string
  defaultValue?: string
  required: boolean
}

export interface PromptVersion {
  id: string
  promptId: string
  version: number
  content: string
  variables: PromptVariable[]
  changeNotes: string | null
  createdBy: string | null
  createdAt: string
}

export interface PromptUsageLog {
  id: string
  promptId: string | null
  promptType: PromptType
  promptVersion: number
  userId: string | null
  feature: 'remix' | 'compose' | 'carousel' | 'playground'
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  model: string | null
  responseTimeMs: number | null
  success: boolean
  errorMessage: string | null
  metadata: Record<string, unknown>
  createdAt: string
}
```

### 3. Updated Remix API Flow

```typescript
// app/api/ai/remix/route.ts

import { PromptService } from '@/lib/prompts/prompt-service'
import { PromptType } from '@/lib/prompts/prompt-types'

export async function POST(request: NextRequest) {
  // ... existing validation ...

  // Map tone to prompt type
  const promptTypeMap: Record<string, PromptType> = {
    'professional': PromptType.REMIX_PROFESSIONAL,
    'casual': PromptType.REMIX_CASUAL,
    'inspiring': PromptType.REMIX_INSPIRING,
    'educational': PromptType.REMIX_EDUCATIONAL,
    'thought-provoking': PromptType.REMIX_THOUGHT_PROVOKING,
    'match-my-style': PromptType.REMIX_MATCH_STYLE,
  }

  const promptType = promptTypeMap[tone] || PromptType.REMIX_PROFESSIONAL

  // Get prompt from service (with fallback to defaults)
  const systemPromptContent = await PromptService.getPromptWithFallback(promptType)

  // Get base rules
  const baseRules = await PromptService.getPromptWithFallback(PromptType.BASE_RULES)

  // Build final prompt with user context (existing logic)
  const finalSystemPrompt = buildRemixSystemPrompt(
    systemPromptContent,
    baseRules,
    userProfile,
    tone,
    length
  )

  // ... existing OpenAI call ...

  // Log usage
  await PromptService.logUsage({
    promptType,
    promptVersion: activePrompt?.version || 1,
    userId: user.id,
    feature: 'remix',
    totalTokens: response.totalTokens,
    model: response.model,
    success: true,
  })

  return NextResponse.json({ content: response.content, ... })
}
```

### 4. Caching Strategy

```typescript
// lib/prompts/prompt-cache.ts

/**
 * In-memory cache for prompts to reduce database calls
 * - Cache TTL: 5 minutes
 * - Invalidated on prompt update/activation
 * - Per-type caching for active prompts
 */
export class PromptCache {
  private static cache = new Map<PromptType, CachedPrompt>()
  private static TTL_MS = 5 * 60 * 1000 // 5 minutes

  static get(type: PromptType): SystemPrompt | null
  static set(type: PromptType, prompt: SystemPrompt): void
  static invalidate(type: PromptType): void
  static invalidateAll(): void
}
```

---

## API Endpoints

### Prompts API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/prompts` | List all prompts (with filters) |
| POST | `/api/prompts` | Create new prompt |
| GET | `/api/prompts/[id]` | Get single prompt |
| PUT | `/api/prompts/[id]` | Update prompt (creates version) |
| DELETE | `/api/prompts/[id]` | Soft delete prompt |
| POST | `/api/prompts/[id]/activate` | Activate prompt |
| GET | `/api/prompts/[id]/versions` | Get version history |
| POST | `/api/prompts/[id]/rollback` | Rollback to version |
| POST | `/api/prompts/test` | Test prompt (playground) |
| GET | `/api/prompts/analytics` | Get usage analytics |

---

## Migration Plan

### Step 1: Deploy Database Schema
- Run migration to create tables
- No impact on existing functionality

### Step 2: Seed Default Prompts
- Insert all current hardcoded prompts as defaults
- Mark them as `is_default = true` and `is_active = true`

### Step 3: Deploy Prompt Service
- Deploy new service layer
- Prompts read from DB with fallback to hardcoded

### Step 4: Update API Routes
- Update remix, compose, carousel routes
- Add usage logging

### Step 5: Update Frontend
- Connect playground to new system
- Update admin panel

### Step 6: Deprecate Hardcoded Prompts
- Once stable, hardcoded become true fallbacks only
- All customization happens in database

---

## Rollback Strategy

If issues occur:
1. **Immediate**: Fallback to hardcoded defaults is automatic
2. **Database**: Prompts table can be truncated, system falls back
3. **Code**: Feature flags can disable DB lookup entirely

---

## Success Metrics

1. **Functional**: All AI features use prompts from database
2. **Performance**: < 50ms overhead for prompt fetching (with cache)
3. **Reliability**: 100% fallback coverage for all prompt types
4. **Usability**: Version history visible in UI, rollback in < 3 clicks

---

## Timeline Estimate

- **Phase 1** (Foundation): Database + Service
- **Phase 2** (APIs): All API routes updated
- **Phase 3** (Frontend): Hooks + Playground
- **Phase 4** (Admin): Analytics + Version UI
- **Phase 5** (Polish): Testing + Seeding

---

## Agent Task Assignments

### Agent 1: Database & Types
- Create migration file
- Create TypeScript types
- Create default prompts file

### Agent 2: Prompt Service Core
- Create prompt-service.ts
- Create prompt-cache.ts
- Create prompt-utils.ts

### Agent 3: API Routes
- Create prompts CRUD API
- Create version management API
- Update existing AI routes

### Agent 4: Hooks & Frontend
- Create React hooks
- Update prompt playground
- Update admin prompts page

### Agent 5: Testing & Seeding
- Create seed script
- Test all features
- Add error handling
