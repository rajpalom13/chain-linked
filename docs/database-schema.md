# ChainLinked Database Schema Documentation

> Auto-generated from Supabase project `baurjucvzdboavbcuxjh` on 2026-03-24

## Table of Contents

1. [Database Overview](#1-database-overview)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Table Groups](#3-table-groups)
4. [Detailed Table Schemas](#4-detailed-table-schemas)
5. [Foreign Key Relationships](#5-foreign-key-relationships)
6. [Row Level Security (RLS) Policies](#6-row-level-security-rls-policies)
7. [Indexes](#7-indexes)
8. [Key Database Patterns](#8-key-database-patterns)

## 1. Database Overview

| Property | Value |
|----------|-------|
| **Supabase Project ID** | `baurjucvzdboavbcuxjh` |
| **Project URL** | `https://baurjucvzdboavbcuxjh.supabase.co` |
| **Region** | `ap-south-1` |
| **Schema** | `public` |
| **Total Tables** | 73 |
| **Total RLS Policies** | 253 |
| **Total Indexes** | 298 |
| **Total Foreign Keys** | 31 |
| **Total Rows (approx)** | 4,596 |

All tables reside in the `public` schema and have Row Level Security (RLS) enabled.

## 2. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER & AUTH LAYER                                  │
│                                                                                 │
│  ┌──────────┐     ┌─────────────┐     ┌────────────┐     ┌──────────────────┐  │
│  │ profiles  │     │ admin_users  │     │ app_admins │     │ feature_flags    │  │
│  └─────┬─────┘     └─────────────┘     └────────────┘     └──────────────────┘  │
│        │ (user_id referenced across all tables via auth.uid())                  │
└────────┼───────────────────────────────────────────────────────────────────────┘
         │
    ┌────┴──────────────────────────────────────────────────────┐
    │                                                           │
    ▼                                                           ▼
┌───────────────────────────┐             ┌──────────────────────────────┐
│  TEAM MANAGEMENT          │             │  LINKEDIN DATA               │
│                           │             │                              │
│  companies ◄─── teams     │             │  linkedin_profiles           │
│  teams ◄─── team_members  │             │  linkedin_analytics          │
│  teams ◄─── team_invites  │             │  linkedin_credentials        │
│  teams ◄─── join_requests │             │  linkedin_tokens             │
│  teams ◄─── brand_kits    │             │  linkedin_research_posts     │
│  teams ◄─── templates     │             │  connections / followers     │
│  teams ◄─── content_rules │             │                              │
└───────────┬───────────────┘             └────────────┬─────────────────┘
            │                                          │
    ┌───────┴──────────┐                    ┌──────────┴──────────┐
    ▼                  ▼                    ▼                     ▼
┌────────────────┐ ┌─────────────────┐ ┌──────────┐  ┌────────────────────────┐
│ POSTS/CONTENT  │ │ DISCOVERY       │ │ my_posts │  │ ANALYTICS              │
│                │ │                 │ └────┬─────┘  │                        │
│ feed_posts     │ │ discover_posts  │      │        │ analytics_history      │
│ generated_posts│ │ discover_news   │      │        │ post_analytics (legacy)│
│ generated_     │ │ influencer_     │      ├───────►│ post_analytics_daily   │
│  suggestions   │ │  posts          │      │        │ post_analytics_wk/mth  │
│ scheduled_posts│ │ followed_       │      │        │ post_analytics_qtr/yr  │
│ inspiration_   │ │  influencers    │      │        │ post_analytics_accum   │
│  posts         │ │ viral_source_   │      │        │ profile_analytics_*    │
│ compose_convos │ │  profiles       │      │        │ analytics_summary_cache│
│ carousel_tmpls │ │                 │      │        │ analytics_tracking_    │
└────────────────┘ └─────────────────┘      │        │  status ◄──────────────┤
                                            │        └────────────────────────┘
┌────────────────────┐  ┌───────────────────┘
│ SWIPE & WISHLIST   │  │
│                    │  │  ┌───────────────────────┐
│ swipe_preferences  │  │  │ EXTENSION             │
│ swipe_wishlist ────┤  │  │ extension_settings    │
│ wishlist_          │  │  │ captured_apis         │
│  collections      │  │  │ capture_stats         │
│ saved_inspirations │  │  │ sync_metadata         │
└────────────────────┘  │  └───────────────────────┘
                        │
┌────────────────────┐  │  ┌───────────────────────┐
│ AI & PROMPTS       │  │  │ SYSTEM                │
│                    │  │  │ notifications         │
│ system_prompts ◄───┤  │  │ invitations           │
│ prompt_versions    │  │  │ user_niches           │
│ prompt_usage_logs  │  │  │ user_default_hashtags │
│ prompt_test_results│  │  │ tag_cluster_mappings  │
│ company_context ◄──┤  │  └───────────────────────┘
│ suggestion_gen_runs│  │
│ research_sessions  │  │
│ writing_style_prof │  │
└────────────────────┘  │
```

## 3. Table Groups

### User & Auth

| Table | Rows | Columns | RLS | Description |
|-------|------|---------|-----|-------------|
| `profiles` | 11 | 27 | Yes | User profiles linked to Supabase Auth |
| `admin_users` | 1 | 5 | Yes | Admin user accounts with credentials |
| `app_admins` | 1 | 2 | Yes | Application admin role assignments |
| `user_api_keys` | 1 | 9 | Yes | User API keys for external integrations |

### LinkedIn Data

| Table | Rows | Columns | RLS | Description |
|-------|------|---------|-----|-------------|
| `linkedin_profiles` | 6 | 17 | Yes | LinkedIn profile data synced from extension |
| `linkedin_analytics` | 11 | 13 | Yes | LinkedIn analytics snapshots |
| `linkedin_credentials` | 0 | 13 | Yes | Stored LinkedIn login credentials |
| `linkedin_tokens` | 8 | 9 | Yes | OAuth tokens for LinkedIn API access |
| `linkedin_research_posts` | 510 | 32 | Yes | LinkedIn posts collected for research/inspiration |
| `connections` | 15 | 13 | Yes | LinkedIn connections data |
| `followers` | 0 | 12 | Yes | LinkedIn followers data |

### Posts & Content

| Table | Rows | Columns | RLS | Description |
|-------|------|---------|-----|-------------|
| `my_posts` | 82 | 19 | Yes | User's own LinkedIn posts |
| `feed_posts` | 445 | 19 | Yes | Posts from user's LinkedIn feed |
| `generated_posts` | 140 | 17 | Yes | AI-generated post drafts |
| `generated_suggestions` | 119 | 13 | Yes | AI-generated content suggestions for swipe |
| `inspiration_posts` | 0 | 15 | Yes | Curated inspiration posts for swipe interface |
| `scheduled_posts` | 2 | 14 | Yes | Posts scheduled for future publishing |
| `compose_conversations` | 12 | 9 | Yes | AI compose conversation history |
| `comments` | 8 | 14 | Yes | Comments on LinkedIn posts |

### Analytics

| Table | Rows | Columns | RLS | Description |
|-------|------|---------|-----|-------------|
| `analytics_history` | 13 | 9 | Yes | Historical analytics snapshots per user per day |
| `analytics_summary_cache` | 308 | 16 | Yes | Cached analytics summary computations |
| `analytics_tracking_status` | 4 | 2 | Yes | Lookup table for tracking status labels |
| `post_analytics` | 71 | 21 | Yes | Legacy post-level analytics data |
| `post_analytics_daily` | 147 | 17 | Yes | Daily post analytics snapshots |
| `post_analytics_wk` | 87 | 18 | Yes | Weekly aggregated post analytics |
| `post_analytics_mth` | 69 | 18 | Yes | Monthly aggregated post analytics |
| `post_analytics_qtr` | 52 | 18 | Yes | Quarterly aggregated post analytics |
| `post_analytics_yr` | 52 | 18 | Yes | Yearly aggregated post analytics |
| `post_analytics_accumulative` | 77 | 17 | Yes | Cumulative post analytics totals |
| `profile_analytics_daily` | 19 | 9 | Yes | Daily profile-level analytics |
| `profile_analytics_accumulative` | 12 | 8 | Yes | Cumulative profile analytics |
| `audience_data` | 2 | 12 | Yes | Audience demographic data |
| `audience_history` | 3 | 6 | Yes | Historical audience data snapshots |

### Team Management

| Table | Rows | Columns | RLS | Description |
|-------|------|---------|-----|-------------|
| `teams` | 2 | 8 | Yes | Team entities for collaborative features |
| `team_members` | 4 | 5 | Yes | Team membership records |
| `team_invitations` | 1 | 10 | Yes | Pending team invitations |
| `team_join_requests` | 1 | 10 | Yes | Requests to join a team |
| `companies` | 1 | 10 | Yes | Company entities linked to teams |

### Content Discovery

| Table | Rows | Columns | RLS | Description |
|-------|------|---------|-----|-------------|
| `discover_posts` | 146 | 23 | Yes | Curated posts for the discover feed |
| `discover_news_articles` | 862 | 12 | Yes | News articles for the discover feed |
| `influencer_posts` | 14 | 19 | Yes | Posts from followed influencers |
| `followed_influencers` | 3 | 13 | Yes | Influencers a user follows |
| `viral_source_profiles` | 20 | 7 | Yes | Source profiles for viral content curation |

### Swipe & Wishlist

| Table | Rows | Columns | RLS | Description |
|-------|------|---------|-----|-------------|
| `swipe_preferences` | 38 | 6 | Yes | User swipe actions (like/dislike) on posts |
| `swipe_wishlist` | 7 | 13 | Yes | Saved items from swipe interface |
| `wishlist_collections` | 11 | 10 | Yes | User collections for organizing wishlist items |
| `saved_inspirations` | 0 | 4 | Yes | User-saved inspiration posts |

### Templates & Branding

| Table | Rows | Columns | RLS | Description |
|-------|------|---------|-----|-------------|
| `templates` | 78 | 13 | Yes | Post templates (shared and personal) |
| `template_favorites` | 0 | 4 | Yes | User-favorited templates |
| `template_categories` | 0 | 4 | Yes | Template category definitions |
| `carousel_templates` | 4 | 14 | Yes | Templates for LinkedIn carousel posts |
| `brand_kits` | 6 | 17 | Yes | Team brand identity settings |
| `content_rules` | 8 | 9 | Yes | Team content guidelines and rules |
| `posting_goals` | 1 | 9 | Yes | User posting frequency goals |
| `writing_style_profiles` | 0 | 17 | Yes | AI writing style configurations |

### AI & Prompts

| Table | Rows | Columns | RLS | Description |
|-------|------|---------|-----|-------------|
| `system_prompts` | 18 | 13 | Yes | AI system prompt definitions |
| `prompt_versions` | 0 | 8 | Yes | Versioned prompt history |
| `prompt_usage_logs` | 24 | 16 | Yes | Logs of AI prompt usage |
| `prompt_test_results` | 0 | 16 | Yes | A/B test results for prompts |
| `company_context` | 6 | 20 | Yes | Company context for AI content generation |
| `suggestion_generation_runs` | 12 | 11 | Yes | Tracking suggestion generation batch runs |
| `research_sessions` | 0 | 14 | Yes | AI research session tracking |

### Extension & Sync

| Table | Rows | Columns | RLS | Description |
|-------|------|---------|-----|-------------|
| `extension_settings` | 6 | 14 | Yes | Chrome extension configuration per user |
| `captured_apis` | 692 | 8 | Yes | API calls captured by the extension |
| `capture_stats` | 15 | 9 | Yes | Statistics about extension data capture |
| `sync_metadata` | 2 | 7 | Yes | Extension sync state tracking |

### System & Admin

| Table | Rows | Columns | RLS | Description |
|-------|------|---------|-----|-------------|
| `feature_flags` | 1 | 7 | Yes | Feature flag toggles |
| `notifications` | 0 | 13 | Yes | In-app notifications |
| `invitations` | 0 | 15 | Yes | General invitation records |
| `network_data` | 0 | 13 | Yes | LinkedIn network analysis data |
| `user_niches` | 0 | 7 | Yes | User niche/topic preferences |
| `user_default_hashtags` | 3 | 5 | Yes | User default hashtags for posts |
| `tag_cluster_mappings` | 322 | 3 | Yes | Tag-to-cluster mapping for content categorization |

## 4. Detailed Table Schemas

### `admin_users`

**RLS:** Enabled | **Rows:** 1

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `username` | `text` | No |  |  |
| `password_hash` | `text` | No |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `last_login` | `timestamp with time zone` | Yes |  | format: timestamptz |

**Primary Key:** `id`

### `analytics_history`

**RLS:** Enabled | **Rows:** 13

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `date` | `date` | No |  |  |
| `impressions` | `integer` | Yes |  | format: int4 |
| `members_reached` | `integer` | Yes |  | format: int4 |
| `engagements` | `integer` | Yes |  | format: int4 |
| `followers` | `integer` | Yes |  | format: int4 |
| `profile_views` | `integer` | Yes |  | format: int4 |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `analytics_summary_cache`

**RLS:** Enabled | **Rows:** 308

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `metric` | `text` | No |  |  |
| `period` | `text` | No |  |  |
| `metric_type` | `text` | No | `'post'::text` |  |
| `current_total` | `numeric` | No | `0` |  |
| `current_avg` | `numeric` | No | `0` |  |
| `current_count` | `bigint` | No | `0` | format: int8 |
| `comp_total` | `numeric` | No | `0` |  |
| `comp_avg` | `numeric` | No | `0` |  |
| `comp_count` | `bigint` | No | `0` | format: int8 |
| `pct_change` | `numeric` | No | `0` |  |
| `accumulative_total` | `numeric` | Yes |  |  |
| `timeseries` | `jsonb` | No | `'[]'::jsonb` |  |
| `computed_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |
| `created_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |

**Primary Key:** `id`

### `analytics_tracking_status`

**RLS:** Enabled | **Rows:** 4

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `integer` | No |  | format: int4 |
| `status` | `character varying` | No |  | format: varchar |

**Primary Key:** `id`

### `app_admins`

**RLS:** Enabled | **Rows:** 1

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `user_id` | `uuid` | No |  |  |
| `created_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |

**Primary Key:** `user_id`

### `audience_data`

**RLS:** Enabled | **Rows:** 2

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `total_followers` | `integer` | Yes |  | format: int4 |
| `follower_growth` | `integer` | Yes |  | format: int4 |
| `demographics_preview` | `jsonb` | Yes |  |  |
| `top_job_titles` | `jsonb` | Yes |  |  |
| `top_companies` | `jsonb` | Yes |  |  |
| `top_locations` | `jsonb` | Yes |  |  |
| `top_industries` | `jsonb` | Yes |  |  |
| `raw_data` | `jsonb` | Yes |  |  |
| `captured_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `audience_history`

**RLS:** Enabled | **Rows:** 3

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `date` | `date` | No |  |  |
| `total_followers` | `integer` | Yes | `0` | format: int4 |
| `new_followers` | `integer` | Yes | `0` | format: int4 |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `brand_kits`

**RLS:** Enabled | **Rows:** 6

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `team_id` | `uuid` | Yes |  |  |
| `website_url` | `text` | No |  |  |
| `primary_color` | `text` | No |  |  |
| `secondary_color` | `text` | Yes |  |  |
| `accent_color` | `text` | Yes |  |  |
| `background_color` | `text` | Yes |  |  |
| `text_color` | `text` | Yes |  |  |
| `font_primary` | `text` | Yes |  |  |
| `font_secondary` | `text` | Yes |  |  |
| `logo_url` | `text` | Yes |  |  |
| `logo_storage_path` | `text` | Yes |  |  |
| `raw_extraction` | `jsonb` | Yes |  |  |
| `is_active` | `boolean` | Yes | `true` | format: bool |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

**Foreign Keys:**
- `team_id` -> `teams.id`

### `capture_stats`

**RLS:** Enabled | **Rows:** 15

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `date` | `date` | No | `CURRENT_DATE` |  |
| `api_calls_captured` | `integer` | Yes | `0` | format: int4 |
| `feed_posts_captured` | `integer` | Yes | `0` | format: int4 |
| `analytics_captures` | `integer` | Yes | `0` | format: int4 |
| `dom_extractions` | `integer` | Yes | `0` | format: int4 |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `captured_apis`

**RLS:** Enabled | **Rows:** 692

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `category` | `text` | Yes |  |  |
| `endpoint` | `text` | Yes |  |  |
| `method` | `text` | Yes | `'GET'::text` |  |
| `response_hash` | `text` | Yes |  |  |
| `response_data` | `jsonb` | Yes |  |  |
| `captured_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `carousel_templates`

**RLS:** Enabled | **Rows:** 4

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `team_id` | `uuid` | Yes |  |  |
| `name` | `text` | No |  |  |
| `description` | `text` | Yes |  |  |
| `category` | `text` | No | `'custom'::text` |  |
| `slides` | `jsonb` | No |  |  |
| `brand_colors` | `jsonb` | Yes | `'[]'::jsonb` |  |
| `fonts` | `jsonb` | Yes | `'[]'::jsonb` |  |
| `thumbnail` | `text` | Yes |  |  |
| `is_public` | `boolean` | Yes | `false` | format: bool |
| `usage_count` | `integer` | Yes | `0` | format: int4 |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `comments`

**RLS:** Enabled | **Rows:** 8

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `activity_urn` | `text` | Yes |  |  |
| `author_name` | `text` | Yes |  |  |
| `author_headline` | `text` | Yes |  |  |
| `author_profile_url` | `text` | Yes |  |  |
| `content` | `text` | Yes |  |  |
| `comment_urn` | `text` | Yes |  |  |
| `parent_urn` | `text` | Yes |  |  |
| `reactions` | `integer` | Yes | `0` | format: int4 |
| `posted_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `raw_data` | `jsonb` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `companies`

**RLS:** Enabled | **Rows:** 1

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `name` | `text` | No |  |  |
| `slug` | `text` | Yes |  |  |
| `description` | `text` | Yes |  |  |
| `website` | `text` | Yes |  |  |
| `logo_url` | `text` | Yes |  |  |
| `owner_id` | `uuid` | Yes |  |  |
| `settings` | `jsonb` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `company_context`

**RLS:** Enabled | **Rows:** 6

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `company_name` | `text` | No |  |  |
| `website_url` | `text` | Yes |  |  |
| `industry` | `text` | Yes |  |  |
| `target_audience_input` | `text` | Yes |  |  |
| `value_proposition` | `text` | Yes |  |  |
| `company_summary` | `text` | Yes |  |  |
| `products_and_services` | `jsonb` | Yes | `'[]'::jsonb` |  |
| `target_audience` | `jsonb` | Yes | `'{}'::jsonb` |  |
| `tone_of_voice` | `jsonb` | Yes | `'{}'::jsonb` |  |
| `brand_colors` | `jsonb` | Yes | `'[]'::jsonb` |  |
| `scraped_content` | `text` | Yes |  |  |
| `perplexity_research` | `text` | Yes |  |  |
| `status` | `text` | No | `'pending'::text` |  |
| `error_message` | `text` | Yes |  |  |
| `inngest_run_id` | `text` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `completed_at` | `timestamp with time zone` | Yes |  | format: timestamptz |

**Primary Key:** `id`

### `compose_conversations`

**RLS:** Enabled | **Rows:** 12

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `mode` | `text` | No |  |  |
| `title` | `text` | Yes |  |  |
| `messages` | `jsonb` | No | `'[]'::jsonb` |  |
| `tone` | `text` | Yes | `'professional'::text` |  |
| `is_active` | `boolean` | Yes | `true` | format: bool |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `connections`

**RLS:** Enabled | **Rows:** 15

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `linkedin_id` | `text` | Yes |  |  |
| `first_name` | `text` | Yes |  |  |
| `last_name` | `text` | Yes |  |  |
| `headline` | `text` | Yes |  |  |
| `profile_picture` | `text` | Yes |  |  |
| `public_identifier` | `text` | Yes |  |  |
| `connected_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `connection_degree` | `integer` | Yes | `1` | format: int4 |
| `raw_data` | `jsonb` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `content_rules`

**RLS:** Enabled | **Rows:** 8

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `team_id` | `uuid` | Yes |  |  |
| `rule_type` | `text` | No |  |  |
| `rule_text` | `text` | No |  |  |
| `is_active` | `boolean` | Yes | `true` | format: bool |
| `priority` | `integer` | Yes | `0` | format: int4 |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

**Foreign Keys:**
- `team_id` -> `teams.id`

### `discover_news_articles`

**RLS:** Enabled | **Rows:** 862

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `headline` | `text` | No |  |  |
| `summary` | `text` | No |  |  |
| `source_url` | `text` | No |  |  |
| `source_name` | `text` | No |  |  |
| `published_date` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `relevance_tags` | `ARRAY` | No | `'{}'::text[]` | format: _text |
| `topic` | `text` | No |  |  |
| `ingest_batch_id` | `uuid` | Yes |  |  |
| `freshness` | `text` | No | `'new'::text` |  |
| `perplexity_citations` | `ARRAY` | Yes | `'{}'::text[]` | format: _text |
| `created_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |

**Primary Key:** `id`

### `discover_posts`

**RLS:** Enabled | **Rows:** 146

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `linkedin_url` | `text` | No |  |  |
| `author_name` | `text` | No |  |  |
| `author_headline` | `text` | No | `''::text` |  |
| `author_avatar_url` | `text` | Yes |  |  |
| `author_profile_url` | `text` | Yes |  |  |
| `content` | `text` | No |  |  |
| `post_type` | `text` | Yes |  |  |
| `likes_count` | `integer` | No | `0` | format: int4 |
| `comments_count` | `integer` | No | `0` | format: int4 |
| `reposts_count` | `integer` | No | `0` | format: int4 |
| `impressions_count` | `integer` | Yes |  | format: int4 |
| `posted_at` | `timestamp with time zone` | No |  | format: timestamptz |
| `scraped_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |
| `topics` | `ARRAY` | No | `'{}'::text[]` | format: _text |
| `is_viral` | `boolean` | No | `false` | format: bool |
| `engagement_rate` | `numeric` | Yes |  |  |
| `source` | `text` | No | `'apify'::text` |  |
| `ingest_batch_id` | `uuid` | Yes |  |  |
| `freshness` | `text` | Yes | `'new'::text` |  |
| `tags` | `ARRAY` | Yes |  | format: _text |
| `primary_cluster` | `text` | Yes |  |  |
| `linkedin_post_id` | `text` | Yes |  |  |

**Primary Key:** `id`

### `extension_settings`

**RLS:** Enabled | **Rows:** 6

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `auto_capture_enabled` | `boolean` | Yes | `true` | format: bool |
| `capture_feed` | `boolean` | Yes | `true` | format: bool |
| `capture_analytics` | `boolean` | Yes | `true` | format: bool |
| `capture_profile` | `boolean` | Yes | `true` | format: bool |
| `capture_messaging` | `boolean` | Yes | `false` | format: bool |
| `sync_enabled` | `boolean` | Yes | `true` | format: bool |
| `sync_interval` | `integer` | Yes | `30` | format: int4 |
| `dark_mode` | `boolean` | Yes | `false` | format: bool |
| `notifications_enabled` | `boolean` | Yes | `true` | format: bool |
| `raw_settings` | `jsonb` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `feature_flags`

**RLS:** Enabled | **Rows:** 1

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `name` | `text` | No |  |  |
| `description` | `text` | Yes |  |  |
| `enabled` | `boolean` | Yes | `false` | format: bool |
| `user_overrides` | `jsonb` | Yes | `'{}'::jsonb` |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `feed_posts`

**RLS:** Enabled | **Rows:** 445

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `activity_urn` | `text` | No |  |  |
| `author_urn` | `text` | Yes |  |  |
| `author_name` | `text` | Yes |  |  |
| `author_headline` | `text` | Yes |  |  |
| `author_profile_url` | `text` | Yes |  |  |
| `content` | `text` | Yes |  |  |
| `hashtags` | `jsonb` | Yes |  |  |
| `media_type` | `text` | Yes |  |  |
| `reactions` | `integer` | Yes |  | format: int4 |
| `comments` | `integer` | Yes |  | format: int4 |
| `reposts` | `integer` | Yes |  | format: int4 |
| `engagement_score` | `numeric` | Yes |  |  |
| `posted_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `raw_data` | `jsonb` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `media_urls` | `ARRAY` | Yes |  | format: _text |

**Primary Key:** `id`

### `followed_influencers`

**RLS:** Enabled | **Rows:** 3

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `linkedin_url` | `text` | No |  |  |
| `linkedin_username` | `text` | Yes |  |  |
| `author_name` | `text` | Yes |  |  |
| `author_headline` | `text` | Yes |  |  |
| `author_profile_picture` | `text` | Yes |  |  |
| `status` | `text` | No | `'active'::text` |  |
| `last_scraped_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `posts_count` | `integer` | Yes | `0` | format: int4 |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `last_seen_at` | `timestamp with time zone` | Yes |  | format: timestamptz |

**Primary Key:** `id`

### `followers`

**RLS:** Enabled | **Rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `linkedin_id` | `text` | Yes |  |  |
| `first_name` | `text` | Yes |  |  |
| `last_name` | `text` | Yes |  |  |
| `headline` | `text` | Yes |  |  |
| `profile_picture` | `text` | Yes |  |  |
| `public_identifier` | `text` | Yes |  |  |
| `followed_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `raw_data` | `jsonb` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `generated_posts`

**RLS:** Enabled | **Rows:** 140

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `discover_post_id` | `uuid` | Yes |  |  |
| `research_session_id` | `uuid` | Yes |  |  |
| `content` | `text` | No |  |  |
| `post_type` | `text` | No |  |  |
| `hook` | `text` | Yes |  |  |
| `cta` | `text` | Yes |  |  |
| `word_count` | `integer` | Yes |  | format: int4 |
| `estimated_read_time` | `integer` | Yes |  | format: int4 |
| `status` | `text` | No | `'draft'::text` |  |
| `source_url` | `text` | Yes |  |  |
| `source_title` | `text` | Yes |  |  |
| `source_snippet` | `text` | Yes |  |  |
| `created_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |
| `source` | `text` | Yes | `'compose'::text` |  |

**Primary Key:** `id`

**Foreign Keys:**
- `discover_post_id` -> `discover_posts.id`
- `research_session_id` -> `research_sessions.id`

### `generated_suggestions`

**RLS:** Enabled | **Rows:** 119

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `content` | `text` | No |  |  |
| `post_type` | `character varying` | Yes |  | format: varchar |
| `tone` | `character varying` | Yes |  | format: varchar |
| `category` | `character varying` | Yes |  | format: varchar |
| `prompt_context` | `jsonb` | Yes |  |  |
| `generation_batch_id` | `uuid` | Yes |  |  |
| `estimated_engagement` | `integer` | Yes |  | format: int4 |
| `status` | `character varying` | No | `'active'::character varying` | format: varchar |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `expires_at` | `timestamp with time zone` | Yes | `(now() + '7 days'::interval)` | format: timestamptz |
| `used_at` | `timestamp with time zone` | Yes |  | format: timestamptz |

**Primary Key:** `id`

### `influencer_posts`

**RLS:** Enabled | **Rows:** 14

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `influencer_id` | `uuid` | No |  |  |
| `user_id` | `uuid` | No |  |  |
| `linkedin_url` | `text` | Yes |  |  |
| `content` | `text` | No |  |  |
| `post_type` | `text` | Yes |  |  |
| `likes_count` | `integer` | Yes | `0` | format: int4 |
| `comments_count` | `integer` | Yes | `0` | format: int4 |
| `reposts_count` | `integer` | Yes | `0` | format: int4 |
| `posted_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `scraped_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `quality_score` | `numeric` | Yes |  |  |
| `quality_status` | `text` | Yes | `'pending'::text` |  |
| `rejection_reason` | `text` | Yes |  |  |
| `raw_data` | `jsonb` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `tags` | `ARRAY` | Yes |  | format: _text |
| `primary_cluster` | `text` | Yes |  |  |
| `linkedin_post_id` | `text` | Yes |  |  |

**Primary Key:** `id`

**Foreign Keys:**
- `influencer_id` -> `followed_influencers.id`

### `inspiration_posts`

**RLS:** Enabled | **Rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `author_name` | `text` | Yes |  |  |
| `author_headline` | `text` | Yes |  |  |
| `author_profile_url` | `text` | Yes |  |  |
| `author_avatar_url` | `text` | Yes |  |  |
| `content` | `text` | No |  |  |
| `category` | `text` | Yes |  |  |
| `niche` | `text` | Yes |  |  |
| `reactions` | `integer` | Yes |  | format: int4 |
| `comments` | `integer` | Yes |  | format: int4 |
| `reposts` | `integer` | Yes |  | format: int4 |
| `engagement_score` | `numeric` | Yes |  |  |
| `posted_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `source` | `text` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `invitations`

**RLS:** Enabled | **Rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `invitation_urn` | `text` | Yes |  |  |
| `invitation_type` | `text` | Yes |  |  |
| `direction` | `text` | Yes |  |  |
| `actor_name` | `text` | Yes |  |  |
| `actor_headline` | `text` | Yes |  |  |
| `actor_profile_url` | `text` | Yes |  |  |
| `actor_profile_picture` | `text` | Yes |  |  |
| `message` | `text` | Yes |  |  |
| `status` | `text` | No | `'pending'::text` |  |
| `sent_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `raw_data` | `jsonb` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `linkedin_analytics`

**RLS:** Enabled | **Rows:** 11

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `page_type` | `text` | No |  |  |
| `impressions` | `integer` | Yes |  | format: int4 |
| `members_reached` | `integer` | Yes |  | format: int4 |
| `engagements` | `integer` | Yes |  | format: int4 |
| `new_followers` | `integer` | Yes |  | format: int4 |
| `profile_views` | `integer` | Yes |  | format: int4 |
| `search_appearances` | `integer` | Yes |  | format: int4 |
| `top_posts` | `jsonb` | Yes |  |  |
| `raw_data` | `jsonb` | Yes |  |  |
| `captured_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `linkedin_credentials`

**RLS:** Enabled | **Rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `li_at` | `text` | No |  |  |
| `jsessionid` | `text` | No |  |  |
| `liap` | `text` | Yes |  |  |
| `csrf_token` | `text` | Yes |  |  |
| `user_agent` | `text` | Yes |  |  |
| `cookies_set_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `expires_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `is_valid` | `boolean` | Yes | `true` | format: bool |
| `last_used_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `linkedin_profiles`

**RLS:** Enabled | **Rows:** 6

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `profile_urn` | `text` | Yes |  |  |
| `public_identifier` | `text` | Yes |  |  |
| `first_name` | `text` | Yes |  |  |
| `last_name` | `text` | Yes |  |  |
| `headline` | `text` | Yes |  |  |
| `location` | `text` | Yes |  |  |
| `industry` | `text` | Yes |  |  |
| `profile_picture_url` | `text` | Yes |  |  |
| `background_image_url` | `text` | Yes |  |  |
| `connections_count` | `integer` | Yes |  | format: int4 |
| `followers_count` | `integer` | Yes |  | format: int4 |
| `summary` | `text` | Yes |  |  |
| `raw_data` | `jsonb` | Yes |  |  |
| `captured_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `linkedin_research_posts`

**RLS:** Enabled | **Rows:** 510

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `activity_urn` | `text` | Yes |  |  |
| `share_urn` | `text` | Yes |  |  |
| `ugc_post_urn` | `text` | Yes |  |  |
| `full_urn` | `text` | Yes |  |  |
| `text` | `text` | Yes |  |  |
| `url` | `text` | Yes |  |  |
| `post_type` | `text` | Yes |  |  |
| `posted_date` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `posted_relative` | `text` | Yes |  |  |
| `posted_timestamp` | `bigint` | Yes |  | format: int8 |
| `author_first_name` | `text` | Yes |  |  |
| `author_last_name` | `text` | Yes |  |  |
| `author_headline` | `text` | Yes |  |  |
| `author_username` | `text` | Yes |  |  |
| `author_profile_url` | `text` | Yes |  |  |
| `author_profile_picture` | `text` | Yes |  |  |
| `total_reactions` | `integer` | Yes | `0` | format: int4 |
| `likes` | `integer` | Yes | `0` | format: int4 |
| `supports` | `integer` | Yes | `0` | format: int4 |
| `loves` | `integer` | Yes | `0` | format: int4 |
| `insights` | `integer` | Yes | `0` | format: int4 |
| `celebrates` | `integer` | Yes | `0` | format: int4 |
| `funny` | `integer` | Yes | `0` | format: int4 |
| `comments` | `integer` | Yes | `0` | format: int4 |
| `reposts` | `integer` | Yes | `0` | format: int4 |
| `media_type` | `text` | Yes |  |  |
| `media_url` | `text` | Yes |  |  |
| `media_images` | `jsonb` | Yes |  |  |
| `profile_input` | `text` | Yes |  |  |
| `raw_data` | `jsonb` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `linkedin_tokens`

**RLS:** Enabled | **Rows:** 8

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `access_token` | `text` | No |  |  |
| `refresh_token` | `text` | Yes |  |  |
| `expires_at` | `timestamp with time zone` | No |  | format: timestamptz |
| `linkedin_urn` | `text` | Yes |  |  |
| `scopes` | `ARRAY` | Yes | `'{}'::text[]` | format: _text |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `my_posts`

**RLS:** Enabled | **Rows:** 82

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `activity_urn` | `text` | No |  |  |
| `content` | `text` | Yes |  |  |
| `media_type` | `text` | Yes |  |  |
| `reactions` | `integer` | Yes |  | format: int4 |
| `comments` | `integer` | Yes |  | format: int4 |
| `reposts` | `integer` | Yes |  | format: int4 |
| `impressions` | `integer` | Yes |  | format: int4 |
| `posted_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `raw_data` | `jsonb` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `media_urls` | `ARRAY` | Yes |  | format: _text |
| `source` | `text` | No | `'extension'::text` |  |
| `saves` | `integer` | Yes | `0` | format: int4 |
| `sends` | `integer` | Yes | `0` | format: int4 |
| `unique_views` | `integer` | Yes | `0` | format: int4 |
| `engagement_rate` | `numeric` | Yes |  |  |

**Primary Key:** `id`

### `network_data`

**RLS:** Enabled | **Rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `data_type` | `text` | Yes |  |  |
| `person_name` | `text` | Yes |  |  |
| `person_headline` | `text` | Yes |  |  |
| `person_profile_url` | `text` | Yes |  |  |
| `person_profile_picture` | `text` | Yes |  |  |
| `public_identifier` | `text` | Yes |  |  |
| `entity_urn` | `text` | Yes |  |  |
| `suggestion_reason` | `text` | Yes |  |  |
| `raw_data` | `jsonb` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `notifications`

**RLS:** Enabled | **Rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `notification_urn` | `text` | Yes |  |  |
| `notification_type` | `text` | Yes |  |  |
| `actor_name` | `text` | Yes |  |  |
| `actor_headline` | `text` | Yes |  |  |
| `actor_profile_url` | `text` | Yes |  |  |
| `content` | `text` | Yes |  |  |
| `is_read` | `boolean` | Yes | `false` | format: bool |
| `received_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `raw_data` | `jsonb` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `post_analytics`

**RLS:** Enabled | **Rows:** 71

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `activity_urn` | `text` | Yes |  |  |
| `post_content` | `text` | Yes |  |  |
| `post_type` | `text` | Yes |  |  |
| `impressions` | `integer` | Yes |  | format: int4 |
| `members_reached` | `integer` | Yes |  | format: int4 |
| `unique_views` | `integer` | Yes |  | format: int4 |
| `reactions` | `integer` | Yes |  | format: int4 |
| `comments` | `integer` | Yes |  | format: int4 |
| `reposts` | `integer` | Yes |  | format: int4 |
| `engagement_rate` | `numeric` | Yes |  |  |
| `profile_viewers` | `integer` | Yes |  | format: int4 |
| `followers_gained` | `integer` | Yes |  | format: int4 |
| `demographics` | `jsonb` | Yes |  |  |
| `raw_data` | `jsonb` | Yes |  |  |
| `posted_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `captured_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `saves` | `integer` | Yes | `0` | format: int4 |
| `sends` | `integer` | Yes | `0` | format: int4 |

**Primary Key:** `id`

### `post_analytics_accumulative`

**RLS:** Enabled | **Rows:** 77

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `post_id` | `uuid` | No |  |  |
| `analysis_date` | `date` | No |  |  |
| `post_created_at` | `date` | Yes |  |  |
| `impressions_total` | `integer` | Yes | `0` | format: int4 |
| `unique_reach_total` | `integer` | Yes | `0` | format: int4 |
| `reactions_total` | `integer` | Yes | `0` | format: int4 |
| `comments_total` | `integer` | Yes | `0` | format: int4 |
| `reposts_total` | `integer` | Yes | `0` | format: int4 |
| `saves_total` | `integer` | Yes | `0` | format: int4 |
| `sends_total` | `integer` | Yes | `0` | format: int4 |
| `engagements_total` | `integer` | Yes | `0` | format: int4 |
| `engagements_rate` | `numeric` | Yes |  |  |
| `analytics_tracking_status_id` | `integer` | Yes | `1` | format: int4 |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `post_type` | `character varying` | Yes | `NULL::character varying` | format: varchar |

**Primary Key:** `id`

**Foreign Keys:**
- `analytics_tracking_status_id` -> `analytics_tracking_status.id`
- `post_id` -> `my_posts.id`

### `post_analytics_daily`

**RLS:** Enabled | **Rows:** 147

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `post_id` | `uuid` | No |  |  |
| `analysis_date` | `date` | No |  |  |
| `impressions_gained` | `integer` | Yes | `0` | format: int4 |
| `unique_reach_gained` | `integer` | Yes | `0` | format: int4 |
| `reactions_gained` | `integer` | Yes | `0` | format: int4 |
| `comments_gained` | `integer` | Yes | `0` | format: int4 |
| `reposts_gained` | `integer` | Yes | `0` | format: int4 |
| `saves_gained` | `integer` | Yes | `0` | format: int4 |
| `sends_gained` | `integer` | Yes | `0` | format: int4 |
| `engagements_gained` | `integer` | Yes | `0` | format: int4 |
| `engagements_rate` | `numeric` | Yes |  |  |
| `analytics_tracking_status_id` | `integer` | Yes | `1` | format: int4 |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `post_type` | `character varying` | Yes | `NULL::character varying` | format: varchar |

**Primary Key:** `id`

**Foreign Keys:**
- `post_id` -> `my_posts.id`
- `analytics_tracking_status_id` -> `analytics_tracking_status.id`

### `post_analytics_mth`

**RLS:** Enabled | **Rows:** 69

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `post_id` | `uuid` | No |  |  |
| `month_start` | `date` | No |  |  |
| `analysis_date` | `date` | No |  |  |
| `impressions_total` | `integer` | Yes | `0` | format: int4 |
| `unique_reach_total` | `integer` | Yes | `0` | format: int4 |
| `reactions_total` | `integer` | Yes | `0` | format: int4 |
| `comments_total` | `integer` | Yes | `0` | format: int4 |
| `reposts_total` | `integer` | Yes | `0` | format: int4 |
| `saves_total` | `integer` | Yes | `0` | format: int4 |
| `sends_total` | `integer` | Yes | `0` | format: int4 |
| `engagements_total` | `integer` | Yes | `0` | format: int4 |
| `engagements_rate` | `numeric` | Yes |  |  |
| `is_finalized` | `boolean` | Yes | `false` | format: bool |
| `analytics_tracking_status_id` | `integer` | Yes | `1` | format: int4 |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `post_type` | `character varying` | Yes | `NULL::character varying` | format: varchar |

**Primary Key:** `id`

**Foreign Keys:**
- `analytics_tracking_status_id` -> `analytics_tracking_status.id`
- `post_id` -> `my_posts.id`

### `post_analytics_qtr`

**RLS:** Enabled | **Rows:** 52

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `post_id` | `uuid` | No |  |  |
| `quarter_start` | `date` | No |  |  |
| `analysis_date` | `date` | No |  |  |
| `impressions_total` | `integer` | Yes | `0` | format: int4 |
| `unique_reach_total` | `integer` | Yes | `0` | format: int4 |
| `reactions_total` | `integer` | Yes | `0` | format: int4 |
| `comments_total` | `integer` | Yes | `0` | format: int4 |
| `reposts_total` | `integer` | Yes | `0` | format: int4 |
| `saves_total` | `integer` | Yes | `0` | format: int4 |
| `sends_total` | `integer` | Yes | `0` | format: int4 |
| `engagements_total` | `integer` | Yes | `0` | format: int4 |
| `engagements_rate` | `numeric` | Yes |  |  |
| `is_finalized` | `boolean` | Yes | `false` | format: bool |
| `analytics_tracking_status_id` | `integer` | Yes | `1` | format: int4 |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `post_type` | `character varying` | Yes | `NULL::character varying` | format: varchar |

**Primary Key:** `id`

**Foreign Keys:**
- `analytics_tracking_status_id` -> `analytics_tracking_status.id`
- `post_id` -> `my_posts.id`

### `post_analytics_wk`

**RLS:** Enabled | **Rows:** 87

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `post_id` | `uuid` | No |  |  |
| `week_start` | `date` | No |  |  |
| `analysis_date` | `date` | No |  |  |
| `impressions_total` | `integer` | Yes | `0` | format: int4 |
| `unique_reach_total` | `integer` | Yes | `0` | format: int4 |
| `reactions_total` | `integer` | Yes | `0` | format: int4 |
| `comments_total` | `integer` | Yes | `0` | format: int4 |
| `reposts_total` | `integer` | Yes | `0` | format: int4 |
| `saves_total` | `integer` | Yes | `0` | format: int4 |
| `sends_total` | `integer` | Yes | `0` | format: int4 |
| `engagements_total` | `integer` | Yes | `0` | format: int4 |
| `engagements_rate` | `numeric` | Yes |  |  |
| `is_finalized` | `boolean` | Yes | `false` | format: bool |
| `analytics_tracking_status_id` | `integer` | Yes | `1` | format: int4 |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `post_type` | `character varying` | Yes | `NULL::character varying` | format: varchar |

**Primary Key:** `id`

**Foreign Keys:**
- `analytics_tracking_status_id` -> `analytics_tracking_status.id`
- `post_id` -> `my_posts.id`

### `post_analytics_yr`

**RLS:** Enabled | **Rows:** 52

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `post_id` | `uuid` | No |  |  |
| `year_start` | `date` | No |  |  |
| `analysis_date` | `date` | No |  |  |
| `impressions_total` | `integer` | Yes | `0` | format: int4 |
| `unique_reach_total` | `integer` | Yes | `0` | format: int4 |
| `reactions_total` | `integer` | Yes | `0` | format: int4 |
| `comments_total` | `integer` | Yes | `0` | format: int4 |
| `reposts_total` | `integer` | Yes | `0` | format: int4 |
| `saves_total` | `integer` | Yes | `0` | format: int4 |
| `sends_total` | `integer` | Yes | `0` | format: int4 |
| `engagements_total` | `integer` | Yes | `0` | format: int4 |
| `engagements_rate` | `numeric` | Yes |  |  |
| `is_finalized` | `boolean` | Yes | `false` | format: bool |
| `analytics_tracking_status_id` | `integer` | Yes | `1` | format: int4 |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `post_type` | `character varying` | Yes | `NULL::character varying` | format: varchar |

**Primary Key:** `id`

**Foreign Keys:**
- `analytics_tracking_status_id` -> `analytics_tracking_status.id`
- `post_id` -> `my_posts.id`

### `posting_goals`

**RLS:** Enabled | **Rows:** 1

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `period` | `text` | No |  |  |
| `target_posts` | `integer` | No |  | format: int4 |
| `current_posts` | `integer` | Yes | `0` | format: int4 |
| `start_date` | `date` | No |  |  |
| `end_date` | `date` | No |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `profile_analytics_accumulative`

**RLS:** Enabled | **Rows:** 12

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `analysis_date` | `date` | No |  |  |
| `followers_total` | `integer` | Yes | `0` | format: int4 |
| `profile_views_total` | `integer` | Yes | `0` | format: int4 |
| `search_appearances_total` | `integer` | Yes | `0` | format: int4 |
| `connections_total` | `integer` | Yes | `0` | format: int4 |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `profile_analytics_daily`

**RLS:** Enabled | **Rows:** 19

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `analysis_date` | `date` | No |  |  |
| `followers_gained` | `integer` | Yes | `0` | format: int4 |
| `profile_views_gained` | `integer` | Yes | `0` | format: int4 |
| `search_appearances_gained` | `integer` | Yes | `0` | format: int4 |
| `connections_gained` | `integer` | Yes | `0` | format: int4 |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `profiles`

**RLS:** Enabled | **Rows:** 11

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No |  |  |
| `full_name` | `text` | Yes |  |  |
| `avatar_url` | `text` | Yes |  |  |
| `email` | `text` | No |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `linkedin_access_token` | `text` | Yes |  |  |
| `linkedin_user_id` | `text` | Yes |  |  |
| `linkedin_connected_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `linkedin_token_expires_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `company_onboarding_completed` | `boolean` | Yes | `false` | format: bool |
| `company_name` | `text` | Yes |  |  |
| `company_description` | `text` | Yes |  |  |
| `company_products` | `text` | Yes |  |  |
| `company_icp` | `text` | Yes |  |  |
| `company_value_props` | `text` | Yes |  |  |
| `company_website` | `text` | Yes |  |  |
| `onboarding_completed` | `boolean` | Yes | `false` | format: bool |
| `onboarding_current_step` | `integer` | Yes | `1` | format: int4 |
| `linkedin_avatar_url` | `text` | Yes |  |  |
| `linkedin_headline` | `text` | Yes |  |  |
| `linkedin_profile_url` | `text` | Yes |  |  |
| `discover_topics_selected` | `boolean` | Yes | `false` | format: bool |
| `discover_topics` | `ARRAY` | Yes | `'{}'::text[]` | format: _text |
| `dashboard_tour_completed` | `boolean` | Yes | `false` | format: bool |
| `onboarding_type` | `text` | Yes |  |  |
| `extension_logged_in` | `boolean` | No | `false` | format: bool |
| `extension_last_active_at` | `timestamp with time zone` | Yes |  | format: timestamptz |

**Primary Key:** `id`

### `prompt_test_results`

**RLS:** Enabled | **Rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `prompt_id` | `uuid` | Yes |  |  |
| `prompt_version` | `integer` | No |  | format: int4 |
| `user_id` | `uuid` | Yes |  |  |
| `system_prompt` | `text` | No |  |  |
| `user_prompt` | `text` | No |  |  |
| `variables` | `jsonb` | No | `'{}'::jsonb` |  |
| `model` | `character varying` | No |  | format: varchar |
| `temperature` | `numeric` | Yes |  |  |
| `max_tokens` | `integer` | Yes |  | format: int4 |
| `response_content` | `text` | No |  |  |
| `tokens_used` | `integer` | Yes |  | format: int4 |
| `estimated_cost` | `numeric` | Yes |  |  |
| `rating` | `integer` | Yes |  | format: int4 |
| `notes` | `text` | Yes |  |  |
| `created_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |

**Primary Key:** `id`

**Foreign Keys:**
- `prompt_id` -> `system_prompts.id`

### `prompt_usage_logs`

**RLS:** Enabled | **Rows:** 24

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `prompt_id` | `uuid` | Yes |  |  |
| `prompt_type` | `USER-DEFINED` | No |  | format: prompt_type |
| `prompt_version` | `integer` | No |  | format: int4 |
| `user_id` | `uuid` | Yes |  |  |
| `feature` | `character varying` | No |  | format: varchar |
| `input_tokens` | `integer` | Yes |  | format: int4 |
| `output_tokens` | `integer` | Yes |  | format: int4 |
| `total_tokens` | `integer` | Yes |  | format: int4 |
| `model` | `character varying` | Yes |  | format: varchar |
| `response_time_ms` | `integer` | Yes |  | format: int4 |
| `success` | `boolean` | No | `true` | format: bool |
| `error_message` | `text` | Yes |  |  |
| `metadata` | `jsonb` | No | `'{}'::jsonb` |  |
| `created_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |
| `estimated_cost` | `numeric` | Yes | `NULL::numeric` |  |

**Primary Key:** `id`

**Foreign Keys:**
- `prompt_id` -> `system_prompts.id`

### `prompt_versions`

**RLS:** Enabled | **Rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `prompt_id` | `uuid` | No |  |  |
| `version` | `integer` | No |  | format: int4 |
| `content` | `text` | No |  |  |
| `variables` | `jsonb` | No | `'[]'::jsonb` |  |
| `change_notes` | `text` | Yes |  |  |
| `created_by` | `uuid` | Yes |  |  |
| `created_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |

**Primary Key:** `id`

**Foreign Keys:**
- `prompt_id` -> `system_prompts.id`

### `research_sessions`

**RLS:** Enabled | **Rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `topics` | `ARRAY` | No |  | format: _text |
| `depth` | `text` | No | `'basic'::text` |  |
| `status` | `text` | No | `'pending'::text` |  |
| `posts_discovered` | `integer` | Yes | `0` | format: int4 |
| `posts_generated` | `integer` | Yes | `0` | format: int4 |
| `error_message` | `text` | Yes |  |  |
| `failed_step` | `text` | Yes |  |  |
| `started_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `completed_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `created_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |
| `inngest_run_id` | `text` | Yes |  |  |

**Primary Key:** `id`

### `saved_inspirations`

**RLS:** Enabled | **Rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `inspiration_post_id` | `uuid` | No |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

**Foreign Keys:**
- `inspiration_post_id` -> `linkedin_research_posts.id`

### `scheduled_posts`

**RLS:** Enabled | **Rows:** 2

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `content` | `text` | No |  |  |
| `scheduled_for` | `timestamp with time zone` | No |  | format: timestamptz |
| `timezone` | `text` | Yes | `'UTC'::text` |  |
| `status` | `text` | No | `'pending'::text` |  |
| `visibility` | `text` | No | `'PUBLIC'::text` |  |
| `media_urls` | `ARRAY` | Yes |  | format: _text |
| `linkedin_post_id` | `text` | Yes |  |  |
| `posted_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `error_message` | `text` | Yes |  |  |
| `created_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |
| `activity_urn` | `text` | Yes |  |  |

**Primary Key:** `id`

### `suggestion_generation_runs`

**RLS:** Enabled | **Rows:** 12

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `status` | `character varying` | No | `'pending'::character varying` | format: varchar |
| `suggestions_requested` | `integer` | Yes | `10` | format: int4 |
| `suggestions_generated` | `integer` | Yes | `0` | format: int4 |
| `company_context_id` | `uuid` | Yes |  |  |
| `post_types_used` | `ARRAY` | Yes |  | format: _text |
| `inngest_run_id` | `character varying` | Yes |  | format: varchar |
| `error_message` | `text` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `completed_at` | `timestamp with time zone` | Yes |  | format: timestamptz |

**Primary Key:** `id`

**Foreign Keys:**
- `company_context_id` -> `company_context.id`

### `swipe_preferences`

**RLS:** Enabled | **Rows:** 38

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `post_id` | `uuid` | Yes |  |  |
| `suggestion_content` | `text` | Yes |  |  |
| `action` | `text` | No |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

**Foreign Keys:**
- `post_id` -> `inspiration_posts.id`

### `swipe_wishlist`

**RLS:** Enabled | **Rows:** 7

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `suggestion_id` | `uuid` | Yes |  |  |
| `content` | `text` | No |  |  |
| `post_type` | `character varying` | Yes |  | format: varchar |
| `category` | `character varying` | Yes |  | format: varchar |
| `notes` | `text` | Yes |  |  |
| `is_scheduled` | `boolean` | Yes | `false` | format: bool |
| `scheduled_post_id` | `uuid` | Yes |  |  |
| `status` | `character varying` | No | `'saved'::character varying` | format: varchar |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `collection_id` | `uuid` | Yes |  |  |

**Primary Key:** `id`

**Foreign Keys:**
- `suggestion_id` -> `generated_suggestions.id`
- `scheduled_post_id` -> `scheduled_posts.id`
- `collection_id` -> `wishlist_collections.id`

### `sync_metadata`

**RLS:** Enabled | **Rows:** 2

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `table_name` | `text` | No |  |  |
| `last_synced_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `sync_status` | `text` | Yes | `'idle'::text` |  |
| `pending_changes` | `integer` | Yes | `0` | format: int4 |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `system_prompts`

**RLS:** Enabled | **Rows:** 18

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `type` | `USER-DEFINED` | No |  | format: prompt_type |
| `name` | `character varying` | No |  | format: varchar |
| `description` | `text` | Yes |  |  |
| `content` | `text` | No |  |  |
| `variables` | `jsonb` | No | `'[]'::jsonb` |  |
| `version` | `integer` | No | `1` | format: int4 |
| `is_active` | `boolean` | No | `false` | format: bool |
| `is_default` | `boolean` | No | `false` | format: bool |
| `created_by` | `uuid` | Yes |  |  |
| `updated_by` | `uuid` | Yes |  |  |
| `created_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |

**Primary Key:** `id`

### `tag_cluster_mappings`

**RLS:** Enabled | **Rows:** 322

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `tag` | `text` | No |  |  |
| `cluster` | `text` | No |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `tag`

### `team_invitations`

**RLS:** Enabled | **Rows:** 1

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `team_id` | `uuid` | No |  |  |
| `email` | `text` | No |  |  |
| `role` | `text` | No | `'member'::text` |  |
| `token` | `text` | No |  |  |
| `invited_by` | `uuid` | Yes |  |  |
| `status` | `text` | No | `'pending'::text` |  |
| `expires_at` | `timestamp with time zone` | No | `(now() + '7 days'::interval)` | format: timestamptz |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `accepted_at` | `timestamp with time zone` | Yes |  | format: timestamptz |

**Primary Key:** `id`

**Foreign Keys:**
- `team_id` -> `teams.id`

### `team_join_requests`

**RLS:** Enabled | **Rows:** 1

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `team_id` | `uuid` | No |  |  |
| `status` | `text` | No | `'pending'::text` |  |
| `message` | `text` | Yes |  |  |
| `reviewed_by` | `uuid` | Yes |  |  |
| `reviewed_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `review_note` | `text` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

**Foreign Keys:**
- `team_id` -> `teams.id`

### `team_members`

**RLS:** Enabled | **Rows:** 4

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `team_id` | `uuid` | No |  |  |
| `user_id` | `uuid` | No |  |  |
| `role` | `text` | No | `'member'::text` |  |
| `joined_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

**Foreign Keys:**
- `team_id` -> `teams.id`

### `teams`

**RLS:** Enabled | **Rows:** 2

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `name` | `text` | No |  |  |
| `logo_url` | `text` | Yes |  |  |
| `owner_id` | `uuid` | Yes |  |  |
| `company_id` | `uuid` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `discoverable` | `boolean` | Yes | `true` | format: bool |

**Primary Key:** `id`

**Foreign Keys:**
- `company_id` -> `companies.id`

### `template_categories`

**RLS:** Enabled | **Rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `name` | `text` | No |  |  |
| `created_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |

**Primary Key:** `id`

### `template_favorites`

**RLS:** Enabled | **Rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `template_id` | `text` | No |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `templates`

**RLS:** Enabled | **Rows:** 78

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `team_id` | `uuid` | Yes |  |  |
| `name` | `text` | No |  |  |
| `content` | `text` | No |  |  |
| `category` | `text` | Yes |  |  |
| `tags` | `jsonb` | Yes |  |  |
| `is_public` | `boolean` | Yes | `false` | format: bool |
| `usage_count` | `integer` | Yes | `0` | format: int4 |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `is_ai_generated` | `boolean` | Yes | `false` | format: bool |
| `ai_generation_batch_id` | `uuid` | Yes |  |  |

**Primary Key:** `id`

**Foreign Keys:**
- `team_id` -> `teams.id`

### `user_api_keys`

**RLS:** Enabled | **Rows:** 1

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `provider` | `text` | No | `'openai'::text` |  |
| `encrypted_key` | `text` | No |  |  |
| `key_hint` | `text` | Yes |  |  |
| `is_valid` | `boolean` | Yes | `true` | format: bool |
| `last_validated_at` | `timestamp with time zone` | Yes |  | format: timestamptz |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `user_default_hashtags`

**RLS:** Enabled | **Rows:** 3

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `hashtags` | `ARRAY` | No | `'{}'::text[]` | format: _text |
| `created_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | No | `now()` | format: timestamptz |

**Primary Key:** `id`

### `user_niches`

**RLS:** Enabled | **Rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `niche` | `text` | No |  |  |
| `confidence` | `numeric` | Yes |  |  |
| `source` | `text` | Yes |  |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `viral_source_profiles`

**RLS:** Enabled | **Rows:** 20

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `linkedin_url` | `text` | No |  |  |
| `linkedin_username` | `text` | Yes |  |  |
| `display_name` | `text` | Yes |  |  |
| `category` | `text` | Yes |  |  |
| `status` | `text` | No | `'active'::text` |  |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `wishlist_collections`

**RLS:** Enabled | **Rows:** 11

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `name` | `text` | No |  |  |
| `description` | `text` | Yes |  |  |
| `emoji_icon` | `text` | Yes | `'📁'::text` |  |
| `color` | `text` | Yes | `'#6366f1'::text` |  |
| `item_count` | `integer` | Yes | `0` | format: int4 |
| `is_default` | `boolean` | Yes | `false` | format: bool |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

### `writing_style_profiles`

**RLS:** Enabled | **Rows:** 0

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | No | `gen_random_uuid()` |  |
| `user_id` | `uuid` | No |  |  |
| `avg_sentence_length` | `numeric` | Yes |  |  |
| `vocabulary_level` | `text` | Yes |  |  |
| `tone` | `text` | Yes |  |  |
| `formatting_style` | `jsonb` | Yes | `'{}'::jsonb` |  |
| `hook_patterns` | `ARRAY` | Yes | `'{}'::text[]` | format: _text |
| `emoji_usage` | `text` | Yes |  |  |
| `cta_patterns` | `ARRAY` | Yes | `'{}'::text[]` | format: _text |
| `signature_phrases` | `ARRAY` | Yes | `'{}'::text[]` | format: _text |
| `content_themes` | `ARRAY` | Yes | `'{}'::text[]` | format: _text |
| `raw_analysis` | `jsonb` | Yes | `'{}'::jsonb` |  |
| `posts_analyzed_count` | `integer` | Yes | `0` | format: int4 |
| `wishlisted_analyzed_count` | `integer` | Yes | `0` | format: int4 |
| `created_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `updated_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |
| `last_refreshed_at` | `timestamp with time zone` | Yes | `now()` | format: timestamptz |

**Primary Key:** `id`

## 5. Foreign Key Relationships

| Source Table | Source Column | Target Table | Target Column |
|-------------|--------------|--------------|---------------|
| `teams` | `company_id` | `companies` | `id` |
| `team_members` | `team_id` | `teams` | `id` |
| `team_invitations` | `team_id` | `teams` | `id` |
| `templates` | `team_id` | `teams` | `id` |
| `swipe_preferences` | `post_id` | `inspiration_posts` | `id` |
| `brand_kits` | `team_id` | `teams` | `id` |
| `swipe_wishlist` | `suggestion_id` | `generated_suggestions` | `id` |
| `swipe_wishlist` | `scheduled_post_id` | `scheduled_posts` | `id` |
| `suggestion_generation_runs` | `company_context_id` | `company_context` | `id` |
| `prompt_versions` | `prompt_id` | `system_prompts` | `id` |
| `prompt_usage_logs` | `prompt_id` | `system_prompts` | `id` |
| `prompt_test_results` | `prompt_id` | `system_prompts` | `id` |
| `generated_posts` | `discover_post_id` | `discover_posts` | `id` |
| `generated_posts` | `research_session_id` | `research_sessions` | `id` |
| `swipe_wishlist` | `collection_id` | `wishlist_collections` | `id` |
| `saved_inspirations` | `inspiration_post_id` | `linkedin_research_posts` | `id` |
| `post_analytics_mth` | `analytics_tracking_status_id` | `analytics_tracking_status` | `id` |
| `post_analytics_accumulative` | `analytics_tracking_status_id` | `analytics_tracking_status` | `id` |
| `post_analytics_wk` | `analytics_tracking_status_id` | `analytics_tracking_status` | `id` |
| `post_analytics_qtr` | `analytics_tracking_status_id` | `analytics_tracking_status` | `id` |
| `post_analytics_yr` | `analytics_tracking_status_id` | `analytics_tracking_status` | `id` |
| `post_analytics_daily` | `post_id` | `my_posts` | `id` |
| `post_analytics_accumulative` | `post_id` | `my_posts` | `id` |
| `post_analytics_mth` | `post_id` | `my_posts` | `id` |
| `post_analytics_qtr` | `post_id` | `my_posts` | `id` |
| `post_analytics_wk` | `post_id` | `my_posts` | `id` |
| `post_analytics_yr` | `post_id` | `my_posts` | `id` |
| `post_analytics_daily` | `analytics_tracking_status_id` | `analytics_tracking_status` | `id` |
| `team_join_requests` | `team_id` | `teams` | `id` |
| `content_rules` | `team_id` | `teams` | `id` |
| `influencer_posts` | `influencer_id` | `followed_influencers` | `id` |

## 6. Row Level Security (RLS) Policies

Total policies: **253**

All tables have RLS enabled. Policies primarily use `auth.uid() = user_id` for ownership checks, with team-based access using subqueries against `team_members`.

### `admin_users`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Service role can manage admin users | ALL | {service_role} | PERMISSIVE | `true` | `true` |

### `analytics_history`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `analytics_summary_cache`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Service role can manage analytics cache | ALL | {service_role} | PERMISSIVE | `true` | `true` |
| Users can read own analytics cache | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `analytics_tracking_status`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Service role can manage tracking status | ALL | {service_role} | PERMISSIVE | `true` | `true` |
| Authenticated users can read tracking status | SELECT | {authenticated} | PERMISSIVE | `true` | `-` |

### `audience_data`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `audience_history`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |

### `brand_kits`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can insert own brand kits | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can select own brand kits | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own brand kits | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Team members can select team brand kits | SELECT | {public} | PERMISSIVE | `((team_id IS NOT NULL) AND is_member_of_team(team_id))` | `-` |
| Users can delete own brand kits | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `capture_stats`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `captured_apis`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `carousel_templates`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can view own templates | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own templates | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can delete own templates | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own templates | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can view public templates | SELECT | {public} | PERMISSIVE | `(is_public = true)` | `-` |

### `comments`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `companies`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Owner can delete company | DELETE | {public} | PERMISSIVE | `(auth.uid() = owner_id)` | `-` |
| Team members can select associated company | SELECT | {public} | PERMISSIVE | `is_company_team_member(id)` | `-` |
| Owner can update company | UPDATE | {public} | PERMISSIVE | `(auth.uid() = owner_id)` | `(auth.uid() = owner_id)` |
| Owner can select own company | SELECT | {public} | PERMISSIVE | `(auth.uid() = owner_id)` | `-` |
| Owner can insert company | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = owner_id)` |

### `company_context`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can insert their own company context | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can view their own company context | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update their own company context | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can delete own company context | DELETE | {authenticated} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `compose_conversations`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users manage own conversations | ALL | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `connections`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `content_rules`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can manage own personal content rules | ALL | {public} | PERMISSIVE | `((auth.uid() = user_id) AND (team_id IS NULL))` | `-` |
| Team admins can manage team rules | ALL | {public} | PERMISSIVE | `((team_id IS NOT NULL) AND (EXISTS ( SELECT 1    FROM team_members   WHERE ((team_members.team_id = content_rules.team_id) AND (team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['admin'::text, 'owner'::text]))))))` | `-` |
| Team members can read team rules | SELECT | {public} | PERMISSIVE | `((team_id IS NOT NULL) AND (EXISTS ( SELECT 1    FROM team_members   WHERE ((team_members.team_id = content_rules.team_id) AND (team_members.user_id = auth.uid())))))` | `-` |

### `discover_news_articles`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Authenticated users can read news articles | SELECT | {authenticated} | PERMISSIVE | `true` | `-` |

### `discover_posts`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Authenticated users can read discover posts | SELECT | {authenticated} | PERMISSIVE | `true` | `-` |
| Service role full access to discover posts | ALL | {service_role} | PERMISSIVE | `true` | `true` |

### `extension_settings`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |

### `feature_flags`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Service role can manage feature flags | ALL | {service_role} | PERMISSIVE | `true` | `true` |
| Authenticated users can read feature flags | SELECT | {authenticated} | PERMISSIVE | `true` | `-` |

### `feed_posts`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `followed_influencers`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can manage own followed influencers | ALL | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Service role full access to followed influencers | ALL | {service_role} | PERMISSIVE | `true` | `true` |

### `followers`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `generated_posts`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can view their own generated posts | SELECT | {authenticated} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert their own generated posts | INSERT | {authenticated} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can delete their own generated posts | DELETE | {authenticated} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Service role full access to generated_posts | ALL | {service_role} | PERMISSIVE | `true` | `true` |
| Users can update their own generated posts | UPDATE | {authenticated} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `generated_suggestions`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update own suggestions | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can view own suggestions | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Service role can insert suggestions | INSERT | {service_role} | PERMISSIVE | `-` | `true` |
| Users can delete own suggestions | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `influencer_posts`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can read own influencer posts | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Service role full access to influencer posts | ALL | {service_role} | PERMISSIVE | `true` | `true` |

### `inspiration_posts`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Authenticated can select inspiration posts | SELECT | {public} | PERMISSIVE | `(auth.uid() IS NOT NULL)` | `-` |

### `invitations`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `linkedin_analytics`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `linkedin_credentials`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `linkedin_profiles`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Teammates can select linkedin profiles | SELECT | {public} | PERMISSIVE | `is_team_mate(user_id)` | `-` |
| Users can delete their own LinkedIn profile | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert their own LinkedIn profile | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can view their own LinkedIn profile | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update their own LinkedIn profile | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `linkedin_research_posts`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Authenticated can select research posts | SELECT | {public} | PERMISSIVE | `(auth.uid() IS NOT NULL)` | `-` |

### `linkedin_tokens`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update their own LinkedIn tokens | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert their own LinkedIn tokens | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can view their own LinkedIn tokens | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can delete their own LinkedIn tokens | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `my_posts`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can select own posts | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own posts | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can update own posts | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can delete own posts | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Teammates can select posts | SELECT | {public} | PERMISSIVE | `is_team_mate(user_id)` | `-` |

### `network_data`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `notifications`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `post_analytics`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `post_analytics_accumulative`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update own post accumulative | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own post accumulative | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can view own post accumulative | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `post_analytics_daily`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can insert own post daily analytics | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can update own post daily analytics | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can view own post daily analytics | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `post_analytics_mth`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update own monthly analytics | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own monthly analytics | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can view own monthly analytics | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `post_analytics_qtr`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can insert own quarterly analytics | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can view own quarterly analytics | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own quarterly analytics | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `post_analytics_wk`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update own weekly analytics | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can view own weekly analytics | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own weekly analytics | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |

### `post_analytics_yr`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can view own yearly analytics | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own yearly analytics | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own yearly analytics | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |

### `posting_goals`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `profile_analytics_accumulative`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can insert own profile accumulative | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can update own profile accumulative | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can view own profile accumulative | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `profile_analytics_daily`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update own profile daily analytics | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own profile daily analytics | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can view own profile daily analytics | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `profiles`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can select own profile | SELECT | {public} | PERMISSIVE | `(auth.uid() = id)` | `-` |
| Users can insert own profile | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = id)` |
| Teammates can select profiles | SELECT | {public} | PERMISSIVE | `is_team_mate(id)` | `-` |
| Users can delete own profile | DELETE | {public} | PERMISSIVE | `(auth.uid() = id)` | `-` |
| Team admins can read profiles of join request users | SELECT | {authenticated} | PERMISSIVE | `(EXISTS ( SELECT 1    FROM (team_join_requests tjr      JOIN team_members tm ON ((tm.team_id = tjr.team_id)))   WHERE ((tjr.user_id = profiles.id) AND (tjr.status = 'pending'::text) AND (tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['admin'::text, 'owner'::text])))))` | `-` |
| Users can update own profile | UPDATE | {public} | PERMISSIVE | `(auth.uid() = id)` | `(auth.uid() = id)` |

### `prompt_test_results`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Admins can read all test results | SELECT | {authenticated} | PERMISSIVE | `is_admin(auth.uid())` | `-` |
| Users can manage own test results | ALL | {public} | PERMISSIVE | `(user_id = auth.uid())` | `(user_id = auth.uid())` |

### `prompt_usage_logs`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| System can log usage | INSERT | {service_role} | PERMISSIVE | `-` | `true` |
| Admins can read all usage | SELECT | {authenticated} | PERMISSIVE | `is_admin(auth.uid())` | `-` |
| Users can read own usage | SELECT | {public} | PERMISSIVE | `(user_id = auth.uid())` | `-` |

### `prompt_versions`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Admins can create versions | INSERT | {authenticated} | PERMISSIVE | `-` | `is_admin(auth.uid())` |
| Authenticated users can read prompt versions | SELECT | {authenticated} | PERMISSIVE | `true` | `-` |

### `research_sessions`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update their own research sessions | UPDATE | {authenticated} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can view their own research sessions | SELECT | {authenticated} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Service role full access to research_sessions | ALL | {service_role} | PERMISSIVE | `true` | `true` |
| Users can insert their own research sessions | INSERT | {authenticated} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |

### `saved_inspirations`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |

### `scheduled_posts`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |

### `suggestion_generation_runs`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can view own generation runs | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own generation runs | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Service role can update generation runs | UPDATE | {service_role} | PERMISSIVE | `true` | `true` |

### `swipe_preferences`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `swipe_wishlist`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can view own wishlist | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own wishlist items | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own wishlist items | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can delete own wishlist items | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `sync_metadata`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `system_prompts`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Admins can manage prompts | ALL | {authenticated} | PERMISSIVE | `is_admin(auth.uid())` | `is_admin(auth.uid())` |
| Anyone can read active or default prompts | SELECT | {public} | PERMISSIVE | `((is_active = true) OR (is_default = true))` | `-` |

### `tag_cluster_mappings`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Allow authenticated read | SELECT | {authenticated} | PERMISSIVE | `true` | `-` |

### `team_invitations`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Team admins can insert invitations | INSERT | {public} | PERMISSIVE | `-` | `is_team_admin_or_owner(team_id)` |
| Team admins can delete invitations | DELETE | {public} | PERMISSIVE | `is_team_admin_or_owner(team_id)` | `-` |
| Invitee can select own invitations | SELECT | {public} | PERMISSIVE | `(email = ( SELECT auth.email() AS email))` | `-` |
| Team admins can update invitations | UPDATE | {public} | PERMISSIVE | `is_team_admin_or_owner(team_id)` | `-` |
| Team admins can select invitations | SELECT | {public} | PERMISSIVE | `is_team_admin_or_owner(team_id)` | `-` |

### `team_join_requests`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Team admins can update team join requests | UPDATE | {public} | PERMISSIVE | `(EXISTS ( SELECT 1    FROM team_members   WHERE ((team_members.team_id = team_join_requests.team_id) AND (team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['admin'::text, 'owner'::text])))))` | `-` |
| Users can create own join requests | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can delete own pending join requests | DELETE | {authenticated} | PERMISSIVE | `((auth.uid() = user_id) AND (status = 'pending'::text))` | `-` |
| Users can view own join requests | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Team admins can view team join requests | SELECT | {public} | PERMISSIVE | `(EXISTS ( SELECT 1    FROM team_members   WHERE ((team_members.team_id = team_join_requests.team_id) AND (team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['admin'::text, 'owner'::text])))))` | `-` |

### `team_members`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Anyone can read members of discoverable teams | SELECT | {authenticated} | PERMISSIVE | `(EXISTS ( SELECT 1    FROM teams   WHERE ((teams.id = team_members.team_id) AND (teams.discoverable = true))))` | `-` |
| Owner or admin can delete members | DELETE | {public} | PERMISSIVE | `(is_team_admin_or_owner(team_id) OR (auth.uid() = user_id))` | `-` |
| Users can select own memberships | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Owner or admin can insert members | INSERT | {public} | PERMISSIVE | `-` | `is_team_admin_or_owner(team_id)` |
| Owner or admin can update members | UPDATE | {public} | PERMISSIVE | `is_team_admin_or_owner(team_id)` | `-` |
| Team members can select teammates | SELECT | {public} | PERMISSIVE | `is_member_of_team(team_id)` | `-` |
| Users can insert self as member | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |

### `teams`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Anyone can read discoverable teams | SELECT | {authenticated} | PERMISSIVE | `(discoverable = true)` | `-` |
| Owner can delete team | DELETE | {public} | PERMISSIVE | `(auth.uid() = owner_id)` | `-` |
| Team members can select their teams | SELECT | {public} | PERMISSIVE | `is_member_of_team(id)` | `-` |
| Owners and admins can update team | UPDATE | {authenticated} | PERMISSIVE | `((auth.uid() = owner_id) OR (EXISTS ( SELECT 1    FROM team_members   WHERE ((team_members.team_id = teams.id) AND (team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))` | `((auth.uid() = owner_id) OR (EXISTS ( SELECT 1    FROM team_members   WHERE ((team_members.team_id = teams.id) AND (team_members.user_id = auth.uid()) AND (team_members.role = ANY (ARRAY['owner'::text, 'admin'::text]))))))` |
| Authenticated can insert teams | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = owner_id)` |

### `template_categories`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can update own categories | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can delete own categories | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can select own categories | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own categories | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |

### `template_favorites`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can view their own favorites | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can add their own favorites | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can remove their own favorites | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `templates`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can insert own templates | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can delete own templates | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Team members can select team templates | SELECT | {public} | PERMISSIVE | `((team_id IS NOT NULL) AND is_member_of_team(team_id))` | `-` |
| Authenticated can select public templates | SELECT | {public} | PERMISSIVE | `((is_public = true) OR (is_ai_generated = true))` | `-` |
| Users can update own templates | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can select own templates | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `user_api_keys`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can delete own api keys | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own api keys | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can select own api keys | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own api keys | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |

### `user_default_hashtags`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can delete own hashtags | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own hashtags | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can read own hashtags | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own hashtags | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |

### `user_niches`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can delete own rows | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update own rows | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can select own rows | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can insert own rows | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |

### `viral_source_profiles`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Service role full access to viral source profiles | ALL | {service_role} | PERMISSIVE | `true` | `true` |

### `wishlist_collections`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can delete own non-default collections | DELETE | {public} | PERMISSIVE | `((auth.uid() = user_id) AND (is_default = false))` | `-` |
| Users can insert own collections | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |
| Users can update own collections | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can view own collections | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |

### `writing_style_profiles`

| Policy Name | Command | Roles | Permissive | USING (qual) | WITH CHECK |
|-------------|---------|-------|------------|--------------|------------|
| Users can view their own writing style | SELECT | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can delete their own writing style | DELETE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `-` |
| Users can update their own writing style | UPDATE | {public} | PERMISSIVE | `(auth.uid() = user_id)` | `(auth.uid() = user_id)` |
| Users can insert their own writing style | INSERT | {public} | PERMISSIVE | `-` | `(auth.uid() = user_id)` |

## 7. Indexes

Total indexes: **298**

### `admin_users`

| Index Name | Definition |
|------------|------------|
| `admin_users_username_key` | `CREATE UNIQUE INDEX admin_users_username_key ON public.admin_users USING btree (username)` |
| `admin_users_pkey` | `CREATE UNIQUE INDEX admin_users_pkey ON public.admin_users USING btree (id)` |

### `analytics_history`

| Index Name | Definition |
|------------|------------|
| `idx_analytics_history_date` | `CREATE INDEX idx_analytics_history_date ON public.analytics_history USING btree (date DESC)` |
| `analytics_history_pkey` | `CREATE UNIQUE INDEX analytics_history_pkey ON public.analytics_history USING btree (id)` |
| `analytics_history_user_id_date_key` | `CREATE UNIQUE INDEX analytics_history_user_id_date_key ON public.analytics_history USING btree (user_id, date)` |
| `idx_analytics_history_user_id` | `CREATE INDEX idx_analytics_history_user_id ON public.analytics_history USING btree (user_id)` |

### `analytics_summary_cache`

| Index Name | Definition |
|------------|------------|
| `analytics_summary_cache_user_id_metric_period_key` | `CREATE UNIQUE INDEX analytics_summary_cache_user_id_metric_period_key ON public.analytics_summary_cache USING btree (user_id, metric, period)` |
| `idx_analytics_summary_cache_lookup` | `CREATE INDEX idx_analytics_summary_cache_lookup ON public.analytics_summary_cache USING btree (user_id, metric, period)` |
| `idx_analytics_summary_cache_computed_at` | `CREATE INDEX idx_analytics_summary_cache_computed_at ON public.analytics_summary_cache USING btree (computed_at)` |
| `analytics_summary_cache_pkey` | `CREATE UNIQUE INDEX analytics_summary_cache_pkey ON public.analytics_summary_cache USING btree (id)` |

### `analytics_tracking_status`

| Index Name | Definition |
|------------|------------|
| `analytics_tracking_status_pkey` | `CREATE UNIQUE INDEX analytics_tracking_status_pkey ON public.analytics_tracking_status USING btree (id)` |

### `app_admins`

| Index Name | Definition |
|------------|------------|
| `app_admins_pkey` | `CREATE UNIQUE INDEX app_admins_pkey ON public.app_admins USING btree (user_id)` |

### `audience_data`

| Index Name | Definition |
|------------|------------|
| `audience_data_user_id_key` | `CREATE UNIQUE INDEX audience_data_user_id_key ON public.audience_data USING btree (user_id)` |
| `audience_data_pkey` | `CREATE UNIQUE INDEX audience_data_pkey ON public.audience_data USING btree (id)` |
| `idx_audience_data_user_id` | `CREATE INDEX idx_audience_data_user_id ON public.audience_data USING btree (user_id)` |

### `audience_history`

| Index Name | Definition |
|------------|------------|
| `audience_history_pkey` | `CREATE UNIQUE INDEX audience_history_pkey ON public.audience_history USING btree (id)` |
| `audience_history_user_id_date_key` | `CREATE UNIQUE INDEX audience_history_user_id_date_key ON public.audience_history USING btree (user_id, date)` |
| `idx_audience_history_user_date` | `CREATE INDEX idx_audience_history_user_date ON public.audience_history USING btree (user_id, date)` |

### `brand_kits`

| Index Name | Definition |
|------------|------------|
| `idx_brand_kits_team_id` | `CREATE INDEX idx_brand_kits_team_id ON public.brand_kits USING btree (team_id)` |
| `idx_brand_kits_user_id` | `CREATE INDEX idx_brand_kits_user_id ON public.brand_kits USING btree (user_id)` |
| `brand_kits_pkey` | `CREATE UNIQUE INDEX brand_kits_pkey ON public.brand_kits USING btree (id)` |

### `capture_stats`

| Index Name | Definition |
|------------|------------|
| `capture_stats_user_id_date_key` | `CREATE UNIQUE INDEX capture_stats_user_id_date_key ON public.capture_stats USING btree (user_id, date)` |
| `idx_capture_stats_user_id` | `CREATE INDEX idx_capture_stats_user_id ON public.capture_stats USING btree (user_id)` |
| `idx_capture_stats_date` | `CREATE INDEX idx_capture_stats_date ON public.capture_stats USING btree (date)` |
| `capture_stats_pkey` | `CREATE UNIQUE INDEX capture_stats_pkey ON public.capture_stats USING btree (id)` |

### `captured_apis`

| Index Name | Definition |
|------------|------------|
| `captured_apis_pkey` | `CREATE UNIQUE INDEX captured_apis_pkey ON public.captured_apis USING btree (id)` |
| `idx_captured_apis_category` | `CREATE INDEX idx_captured_apis_category ON public.captured_apis USING btree (category)` |
| `idx_captured_apis_user_id` | `CREATE INDEX idx_captured_apis_user_id ON public.captured_apis USING btree (user_id)` |

### `carousel_templates`

| Index Name | Definition |
|------------|------------|
| `idx_carousel_templates_category` | `CREATE INDEX idx_carousel_templates_category ON public.carousel_templates USING btree (category)` |
| `carousel_templates_pkey` | `CREATE UNIQUE INDEX carousel_templates_pkey ON public.carousel_templates USING btree (id)` |
| `idx_carousel_templates_user_id` | `CREATE INDEX idx_carousel_templates_user_id ON public.carousel_templates USING btree (user_id)` |

### `comments`

| Index Name | Definition |
|------------|------------|
| `idx_comments_user_id` | `CREATE INDEX idx_comments_user_id ON public.comments USING btree (user_id)` |
| `idx_comments_activity_urn` | `CREATE INDEX idx_comments_activity_urn ON public.comments USING btree (activity_urn)` |
| `comments_pkey` | `CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id)` |

### `companies`

| Index Name | Definition |
|------------|------------|
| `idx_companies_slug` | `CREATE INDEX idx_companies_slug ON public.companies USING btree (slug)` |
| `companies_pkey` | `CREATE UNIQUE INDEX companies_pkey ON public.companies USING btree (id)` |
| `companies_slug_key` | `CREATE UNIQUE INDEX companies_slug_key ON public.companies USING btree (slug)` |
| `idx_companies_owner` | `CREATE INDEX idx_companies_owner ON public.companies USING btree (owner_id)` |
| `idx_companies_name_trgm` | `CREATE INDEX idx_companies_name_trgm ON public.companies USING gin (name gin_trgm_ops)` |

### `company_context`

| Index Name | Definition |
|------------|------------|
| `idx_company_context_user_id` | `CREATE INDEX idx_company_context_user_id ON public.company_context USING btree (user_id)` |
| `company_context_pkey` | `CREATE UNIQUE INDEX company_context_pkey ON public.company_context USING btree (id)` |
| `idx_company_context_user_unique` | `CREATE UNIQUE INDEX idx_company_context_user_unique ON public.company_context USING btree (user_id)` |
| `idx_company_context_status` | `CREATE INDEX idx_company_context_status ON public.company_context USING btree (status)` |

### `compose_conversations`

| Index Name | Definition |
|------------|------------|
| `compose_conversations_pkey` | `CREATE UNIQUE INDEX compose_conversations_pkey ON public.compose_conversations USING btree (id)` |
| `idx_compose_conversations_user` | `CREATE INDEX idx_compose_conversations_user ON public.compose_conversations USING btree (user_id)` |
| `idx_compose_conversations_active` | `CREATE INDEX idx_compose_conversations_active ON public.compose_conversations USING btree (user_id, mode, is_active)` |
| `idx_compose_conversations_user_updated` | `CREATE INDEX idx_compose_conversations_user_updated ON public.compose_conversations USING btree (user_id, updated_at DESC)` |

### `connections`

| Index Name | Definition |
|------------|------------|
| `idx_connections_linkedin_id` | `CREATE INDEX idx_connections_linkedin_id ON public.connections USING btree (linkedin_id)` |
| `connections_pkey` | `CREATE UNIQUE INDEX connections_pkey ON public.connections USING btree (id)` |
| `idx_connections_user_id` | `CREATE INDEX idx_connections_user_id ON public.connections USING btree (user_id)` |

### `content_rules`

| Index Name | Definition |
|------------|------------|
| `idx_content_rules_user` | `CREATE INDEX idx_content_rules_user ON public.content_rules USING btree (user_id)` |
| `content_rules_pkey` | `CREATE UNIQUE INDEX content_rules_pkey ON public.content_rules USING btree (id)` |
| `idx_content_rules_team` | `CREATE INDEX idx_content_rules_team ON public.content_rules USING btree (team_id)` |

### `discover_news_articles`

| Index Name | Definition |
|------------|------------|
| `discover_news_articles_source_url_topic_key` | `CREATE UNIQUE INDEX discover_news_articles_source_url_topic_key ON public.discover_news_articles USING btree (source_url, topic)` |
| `idx_news_articles_created_at` | `CREATE INDEX idx_news_articles_created_at ON public.discover_news_articles USING btree (created_at DESC)` |
| `idx_news_articles_freshness` | `CREATE INDEX idx_news_articles_freshness ON public.discover_news_articles USING btree (freshness)` |
| `idx_news_articles_ingest_batch` | `CREATE INDEX idx_news_articles_ingest_batch ON public.discover_news_articles USING btree (ingest_batch_id)` |
| `idx_news_articles_relevance_tags` | `CREATE INDEX idx_news_articles_relevance_tags ON public.discover_news_articles USING gin (relevance_tags)` |
| `discover_news_articles_pkey` | `CREATE UNIQUE INDEX discover_news_articles_pkey ON public.discover_news_articles USING btree (id)` |
| `idx_news_articles_topic` | `CREATE INDEX idx_news_articles_topic ON public.discover_news_articles USING btree (topic)` |

### `discover_posts`

| Index Name | Definition |
|------------|------------|
| `idx_discover_posts_cluster` | `CREATE INDEX idx_discover_posts_cluster ON public.discover_posts USING btree (primary_cluster)` |
| `idx_discover_posts_content_trgm` | `CREATE INDEX idx_discover_posts_content_trgm ON public.discover_posts USING gin (content gin_trgm_ops)` |
| `idx_discover_posts_author_trgm` | `CREATE INDEX idx_discover_posts_author_trgm ON public.discover_posts USING gin (author_name gin_trgm_ops)` |
| `idx_discover_posts_is_viral` | `CREATE INDEX idx_discover_posts_is_viral ON public.discover_posts USING btree (is_viral) WHERE (is_viral = true)` |
| `idx_discover_posts_engagement_rate` | `CREATE INDEX idx_discover_posts_engagement_rate ON public.discover_posts USING btree (engagement_rate DESC NULLS LAST)` |
| `idx_discover_posts_posted_at` | `CREATE INDEX idx_discover_posts_posted_at ON public.discover_posts USING btree (posted_at DESC)` |
| `idx_discover_posts_topics` | `CREATE INDEX idx_discover_posts_topics ON public.discover_posts USING gin (topics)` |
| `discover_posts_linkedin_url_key` | `CREATE UNIQUE INDEX discover_posts_linkedin_url_key ON public.discover_posts USING btree (linkedin_url)` |
| `idx_discover_posts_freshness` | `CREATE INDEX idx_discover_posts_freshness ON public.discover_posts USING btree (freshness)` |
| `idx_discover_posts_linkedin_url` | `CREATE INDEX idx_discover_posts_linkedin_url ON public.discover_posts USING btree (linkedin_url)` |
| `discover_posts_pkey` | `CREATE UNIQUE INDEX discover_posts_pkey ON public.discover_posts USING btree (id)` |
| `idx_discover_posts_dedup` | `CREATE UNIQUE INDEX idx_discover_posts_dedup ON public.discover_posts USING btree (linkedin_post_id) WHERE (linkedin_post_id IS NOT NULL)` |
| `idx_discover_posts_tags` | `CREATE INDEX idx_discover_posts_tags ON public.discover_posts USING gin (tags)` |
| `idx_discover_posts_ingest_batch` | `CREATE INDEX idx_discover_posts_ingest_batch ON public.discover_posts USING btree (ingest_batch_id)` |

### `extension_settings`

| Index Name | Definition |
|------------|------------|
| `extension_settings_user_id_key` | `CREATE UNIQUE INDEX extension_settings_user_id_key ON public.extension_settings USING btree (user_id)` |
| `idx_extension_settings_user_id` | `CREATE INDEX idx_extension_settings_user_id ON public.extension_settings USING btree (user_id)` |
| `extension_settings_pkey` | `CREATE UNIQUE INDEX extension_settings_pkey ON public.extension_settings USING btree (id)` |

### `feature_flags`

| Index Name | Definition |
|------------|------------|
| `feature_flags_pkey` | `CREATE UNIQUE INDEX feature_flags_pkey ON public.feature_flags USING btree (id)` |
| `feature_flags_name_key` | `CREATE UNIQUE INDEX feature_flags_name_key ON public.feature_flags USING btree (name)` |

### `feed_posts`

| Index Name | Definition |
|------------|------------|
| `feed_posts_pkey` | `CREATE UNIQUE INDEX feed_posts_pkey ON public.feed_posts USING btree (id)` |
| `idx_feed_posts_created_at` | `CREATE INDEX idx_feed_posts_created_at ON public.feed_posts USING btree (created_at DESC)` |
| `idx_feed_posts_has_media` | `CREATE INDEX idx_feed_posts_has_media ON public.feed_posts USING btree (((media_urls IS NOT NULL))) WHERE (media_urls IS NOT NULL)` |
| `feed_posts_user_activity_unique` | `CREATE UNIQUE INDEX feed_posts_user_activity_unique ON public.feed_posts USING btree (user_id, activity_urn)` |
| `idx_feed_posts_activity_urn` | `CREATE INDEX idx_feed_posts_activity_urn ON public.feed_posts USING btree (activity_urn)` |
| `idx_feed_posts_user_id` | `CREATE INDEX idx_feed_posts_user_id ON public.feed_posts USING btree (user_id)` |
| `feed_posts_user_id_activity_urn_key` | `CREATE UNIQUE INDEX feed_posts_user_id_activity_urn_key ON public.feed_posts USING btree (user_id, activity_urn)` |

### `followed_influencers`

| Index Name | Definition |
|------------|------------|
| `followed_influencers_pkey` | `CREATE UNIQUE INDEX followed_influencers_pkey ON public.followed_influencers USING btree (id)` |
| `followed_influencers_user_id_linkedin_url_key` | `CREATE UNIQUE INDEX followed_influencers_user_id_linkedin_url_key ON public.followed_influencers USING btree (user_id, linkedin_url)` |
| `idx_followed_influencers_user` | `CREATE INDEX idx_followed_influencers_user ON public.followed_influencers USING btree (user_id)` |

### `followers`

| Index Name | Definition |
|------------|------------|
| `idx_followers_linkedin_id` | `CREATE INDEX idx_followers_linkedin_id ON public.followers USING btree (linkedin_id)` |
| `followers_pkey` | `CREATE UNIQUE INDEX followers_pkey ON public.followers USING btree (id)` |
| `idx_followers_user_id` | `CREATE INDEX idx_followers_user_id ON public.followers USING btree (user_id)` |

### `generated_posts`

| Index Name | Definition |
|------------|------------|
| `idx_generated_posts_status` | `CREATE INDEX idx_generated_posts_status ON public.generated_posts USING btree (status)` |
| `idx_generated_posts_user` | `CREATE INDEX idx_generated_posts_user ON public.generated_posts USING btree (user_id)` |
| `generated_posts_pkey` | `CREATE UNIQUE INDEX generated_posts_pkey ON public.generated_posts USING btree (id)` |
| `idx_generated_posts_created` | `CREATE INDEX idx_generated_posts_created ON public.generated_posts USING btree (created_at DESC)` |
| `idx_generated_posts_type` | `CREATE INDEX idx_generated_posts_type ON public.generated_posts USING btree (post_type)` |
| `idx_generated_posts_session` | `CREATE INDEX idx_generated_posts_session ON public.generated_posts USING btree (research_session_id)` |

### `generated_suggestions`

| Index Name | Definition |
|------------|------------|
| `idx_generated_suggestions_expires` | `CREATE INDEX idx_generated_suggestions_expires ON public.generated_suggestions USING btree (expires_at) WHERE ((status)::text = 'active'::text)` |
| `idx_generated_suggestions_user_created` | `CREATE INDEX idx_generated_suggestions_user_created ON public.generated_suggestions USING btree (user_id, created_at DESC)` |
| `idx_generated_suggestions_batch` | `CREATE INDEX idx_generated_suggestions_batch ON public.generated_suggestions USING btree (generation_batch_id)` |
| `idx_generated_suggestions_user_status` | `CREATE INDEX idx_generated_suggestions_user_status ON public.generated_suggestions USING btree (user_id, status)` |
| `unique_suggestion_content_per_user` | `CREATE UNIQUE INDEX unique_suggestion_content_per_user ON public.generated_suggestions USING btree (user_id, content)` |
| `generated_suggestions_pkey` | `CREATE UNIQUE INDEX generated_suggestions_pkey ON public.generated_suggestions USING btree (id)` |

### `influencer_posts`

| Index Name | Definition |
|------------|------------|
| `idx_influencer_posts_dedup` | `CREATE UNIQUE INDEX idx_influencer_posts_dedup ON public.influencer_posts USING btree (user_id, linkedin_post_id) WHERE (linkedin_post_id IS NOT NULL)` |
| `idx_influencer_posts_user` | `CREATE INDEX idx_influencer_posts_user ON public.influencer_posts USING btree (user_id)` |
| `idx_influencer_posts_influencer` | `CREATE INDEX idx_influencer_posts_influencer ON public.influencer_posts USING btree (influencer_id)` |
| `idx_influencer_posts_linkedin_url` | `CREATE INDEX idx_influencer_posts_linkedin_url ON public.influencer_posts USING btree (linkedin_url)` |
| `idx_influencer_posts_quality_status` | `CREATE INDEX idx_influencer_posts_quality_status ON public.influencer_posts USING btree (quality_status)` |
| `idx_influencer_posts_posted_at` | `CREATE INDEX idx_influencer_posts_posted_at ON public.influencer_posts USING btree (posted_at DESC)` |
| `idx_influencer_posts_cluster` | `CREATE INDEX idx_influencer_posts_cluster ON public.influencer_posts USING btree (primary_cluster)` |
| `idx_influencer_posts_tags` | `CREATE INDEX idx_influencer_posts_tags ON public.influencer_posts USING gin (tags)` |
| `influencer_posts_pkey` | `CREATE UNIQUE INDEX influencer_posts_pkey ON public.influencer_posts USING btree (id)` |
| `influencer_posts_user_id_linkedin_url_key` | `CREATE UNIQUE INDEX influencer_posts_user_id_linkedin_url_key ON public.influencer_posts USING btree (user_id, linkedin_url)` |

### `inspiration_posts`

| Index Name | Definition |
|------------|------------|
| `idx_inspiration_posts_category` | `CREATE INDEX idx_inspiration_posts_category ON public.inspiration_posts USING btree (category)` |
| `inspiration_posts_pkey` | `CREATE UNIQUE INDEX inspiration_posts_pkey ON public.inspiration_posts USING btree (id)` |
| `idx_inspiration_posts_niche` | `CREATE INDEX idx_inspiration_posts_niche ON public.inspiration_posts USING btree (niche)` |
| `idx_inspiration_posts_engagement` | `CREATE INDEX idx_inspiration_posts_engagement ON public.inspiration_posts USING btree (engagement_score DESC)` |

### `invitations`

| Index Name | Definition |
|------------|------------|
| `idx_invitations_direction` | `CREATE INDEX idx_invitations_direction ON public.invitations USING btree (direction)` |
| `idx_invitations_user_id` | `CREATE INDEX idx_invitations_user_id ON public.invitations USING btree (user_id)` |
| `invitations_pkey` | `CREATE UNIQUE INDEX invitations_pkey ON public.invitations USING btree (id)` |

### `linkedin_analytics`

| Index Name | Definition |
|------------|------------|
| `linkedin_analytics_pkey` | `CREATE UNIQUE INDEX linkedin_analytics_pkey ON public.linkedin_analytics USING btree (id)` |
| `idx_linkedin_analytics_user_id` | `CREATE INDEX idx_linkedin_analytics_user_id ON public.linkedin_analytics USING btree (user_id)` |
| `linkedin_analytics_user_id_page_type_key` | `CREATE UNIQUE INDEX linkedin_analytics_user_id_page_type_key ON public.linkedin_analytics USING btree (user_id, page_type)` |

### `linkedin_credentials`

| Index Name | Definition |
|------------|------------|
| `linkedin_credentials_user_id_key` | `CREATE UNIQUE INDEX linkedin_credentials_user_id_key ON public.linkedin_credentials USING btree (user_id)` |
| `linkedin_credentials_pkey` | `CREATE UNIQUE INDEX linkedin_credentials_pkey ON public.linkedin_credentials USING btree (id)` |
| `idx_linkedin_credentials_user_id` | `CREATE INDEX idx_linkedin_credentials_user_id ON public.linkedin_credentials USING btree (user_id)` |

### `linkedin_profiles`

| Index Name | Definition |
|------------|------------|
| `linkedin_profiles_pkey` | `CREATE UNIQUE INDEX linkedin_profiles_pkey ON public.linkedin_profiles USING btree (id)` |
| `idx_linkedin_profiles_user_id` | `CREATE INDEX idx_linkedin_profiles_user_id ON public.linkedin_profiles USING btree (user_id)` |
| `linkedin_profiles_user_id_unique` | `CREATE UNIQUE INDEX linkedin_profiles_user_id_unique ON public.linkedin_profiles USING btree (user_id)` |

### `linkedin_research_posts`

| Index Name | Definition |
|------------|------------|
| `idx_linkedin_research_posts_activity_urn` | `CREATE INDEX idx_linkedin_research_posts_activity_urn ON public.linkedin_research_posts USING btree (activity_urn)` |
| `idx_linkedin_research_posts_author_username` | `CREATE INDEX idx_linkedin_research_posts_author_username ON public.linkedin_research_posts USING btree (author_username)` |
| `idx_linkedin_research_posts_posted_date` | `CREATE INDEX idx_linkedin_research_posts_posted_date ON public.linkedin_research_posts USING btree (posted_date DESC)` |
| `idx_linkedin_research_posts_total_reactions` | `CREATE INDEX idx_linkedin_research_posts_total_reactions ON public.linkedin_research_posts USING btree (total_reactions DESC)` |
| `idx_linkedin_research_posts_post_type` | `CREATE INDEX idx_linkedin_research_posts_post_type ON public.linkedin_research_posts USING btree (post_type)` |
| `idx_linkedin_research_posts_text_search` | `CREATE INDEX idx_linkedin_research_posts_text_search ON public.linkedin_research_posts USING gin (to_tsvector('english'::regconfig, text))` |
| `linkedin_research_posts_pkey` | `CREATE UNIQUE INDEX linkedin_research_posts_pkey ON public.linkedin_research_posts USING btree (id)` |
| `linkedin_research_posts_activity_urn_key` | `CREATE UNIQUE INDEX linkedin_research_posts_activity_urn_key ON public.linkedin_research_posts USING btree (activity_urn)` |

### `linkedin_tokens`

| Index Name | Definition |
|------------|------------|
| `linkedin_tokens_pkey` | `CREATE UNIQUE INDEX linkedin_tokens_pkey ON public.linkedin_tokens USING btree (id)` |
| `idx_linkedin_tokens_expires_at` | `CREATE INDEX idx_linkedin_tokens_expires_at ON public.linkedin_tokens USING btree (expires_at)` |
| `linkedin_tokens_user_id_key` | `CREATE UNIQUE INDEX linkedin_tokens_user_id_key ON public.linkedin_tokens USING btree (user_id)` |
| `idx_linkedin_tokens_user_id` | `CREATE INDEX idx_linkedin_tokens_user_id ON public.linkedin_tokens USING btree (user_id)` |

### `my_posts`

| Index Name | Definition |
|------------|------------|
| `idx_my_posts_activity_urn` | `CREATE INDEX idx_my_posts_activity_urn ON public.my_posts USING btree (activity_urn)` |
| `my_posts_pkey` | `CREATE UNIQUE INDEX my_posts_pkey ON public.my_posts USING btree (id)` |
| `my_posts_user_id_activity_urn_key` | `CREATE UNIQUE INDEX my_posts_user_id_activity_urn_key ON public.my_posts USING btree (user_id, activity_urn)` |
| `idx_my_posts_user_id` | `CREATE INDEX idx_my_posts_user_id ON public.my_posts USING btree (user_id)` |
| `idx_my_posts_has_media` | `CREATE INDEX idx_my_posts_has_media ON public.my_posts USING btree (((media_urls IS NOT NULL))) WHERE (media_urls IS NOT NULL)` |
| `idx_my_posts_source` | `CREATE INDEX idx_my_posts_source ON public.my_posts USING btree (source)` |
| `idx_my_posts_user_source` | `CREATE INDEX idx_my_posts_user_source ON public.my_posts USING btree (user_id, source)` |
| `idx_my_posts_created_at` | `CREATE INDEX idx_my_posts_created_at ON public.my_posts USING btree (created_at DESC)` |

### `network_data`

| Index Name | Definition |
|------------|------------|
| `network_data_pkey` | `CREATE UNIQUE INDEX network_data_pkey ON public.network_data USING btree (id)` |
| `idx_network_data_type` | `CREATE INDEX idx_network_data_type ON public.network_data USING btree (data_type)` |
| `idx_network_data_user_id` | `CREATE INDEX idx_network_data_user_id ON public.network_data USING btree (user_id)` |

### `notifications`

| Index Name | Definition |
|------------|------------|
| `notifications_pkey` | `CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id)` |
| `idx_notifications_user_created` | `CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC)` |
| `idx_notifications_user_id` | `CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id)` |

### `post_analytics`

| Index Name | Definition |
|------------|------------|
| `post_analytics_user_id_activity_urn_key` | `CREATE UNIQUE INDEX post_analytics_user_id_activity_urn_key ON public.post_analytics USING btree (user_id, activity_urn)` |
| `idx_post_analytics_activity_urn` | `CREATE INDEX idx_post_analytics_activity_urn ON public.post_analytics USING btree (activity_urn)` |
| `idx_post_analytics_user_id` | `CREATE INDEX idx_post_analytics_user_id ON public.post_analytics USING btree (user_id)` |
| `post_analytics_pkey` | `CREATE UNIQUE INDEX post_analytics_pkey ON public.post_analytics USING btree (id)` |

### `post_analytics_accumulative`

| Index Name | Definition |
|------------|------------|
| `idx_post_analytics_accumulative_post_type` | `CREATE INDEX idx_post_analytics_accumulative_post_type ON public.post_analytics_accumulative USING btree (post_type) WHERE (post_type IS NOT NULL)` |
| `idx_poac_user_post` | `CREATE INDEX idx_poac_user_post ON public.post_analytics_accumulative USING btree (user_id, post_id)` |
| `post_analytics_accumulative_user_id_post_id_key` | `CREATE UNIQUE INDEX post_analytics_accumulative_user_id_post_id_key ON public.post_analytics_accumulative USING btree (user_id, post_id)` |
| `post_analytics_accumulative_pkey` | `CREATE UNIQUE INDEX post_analytics_accumulative_pkey ON public.post_analytics_accumulative USING btree (id)` |

### `post_analytics_daily`

| Index Name | Definition |
|------------|------------|
| `post_analytics_daily_user_id_post_id_analysis_date_key` | `CREATE UNIQUE INDEX post_analytics_daily_user_id_post_id_analysis_date_key ON public.post_analytics_daily USING btree (user_id, post_id, analysis_date)` |
| `idx_post_analytics_daily_user_date` | `CREATE INDEX idx_post_analytics_daily_user_date ON public.post_analytics_daily USING btree (user_id, analysis_date DESC)` |
| `idx_poad_status` | `CREATE INDEX idx_poad_status ON public.post_analytics_daily USING btree (analytics_tracking_status_id)` |
| `idx_post_analytics_daily_post_type` | `CREATE INDEX idx_post_analytics_daily_post_type ON public.post_analytics_daily USING btree (post_type) WHERE (post_type IS NOT NULL)` |
| `idx_poad_user_date` | `CREATE INDEX idx_poad_user_date ON public.post_analytics_daily USING btree (user_id, analysis_date DESC)` |
| `idx_poad_user_post_date` | `CREATE INDEX idx_poad_user_post_date ON public.post_analytics_daily USING btree (user_id, post_id, analysis_date DESC)` |
| `post_analytics_daily_pkey` | `CREATE UNIQUE INDEX post_analytics_daily_pkey ON public.post_analytics_daily USING btree (id)` |

### `post_analytics_mth`

| Index Name | Definition |
|------------|------------|
| `idx_poam_user_post_month` | `CREATE INDEX idx_poam_user_post_month ON public.post_analytics_mth USING btree (user_id, post_id, month_start DESC)` |
| `post_analytics_mth_user_id_post_id_month_start_key` | `CREATE UNIQUE INDEX post_analytics_mth_user_id_post_id_month_start_key ON public.post_analytics_mth USING btree (user_id, post_id, month_start)` |
| `post_analytics_mth_pkey` | `CREATE UNIQUE INDEX post_analytics_mth_pkey ON public.post_analytics_mth USING btree (id)` |

### `post_analytics_qtr`

| Index Name | Definition |
|------------|------------|
| `post_analytics_qtr_pkey` | `CREATE UNIQUE INDEX post_analytics_qtr_pkey ON public.post_analytics_qtr USING btree (id)` |
| `idx_poaq_user_post_quarter` | `CREATE INDEX idx_poaq_user_post_quarter ON public.post_analytics_qtr USING btree (user_id, post_id, quarter_start DESC)` |
| `post_analytics_qtr_user_id_post_id_quarter_start_key` | `CREATE UNIQUE INDEX post_analytics_qtr_user_id_post_id_quarter_start_key ON public.post_analytics_qtr USING btree (user_id, post_id, quarter_start)` |

### `post_analytics_wk`

| Index Name | Definition |
|------------|------------|
| `idx_poaw_user_post_week` | `CREATE INDEX idx_poaw_user_post_week ON public.post_analytics_wk USING btree (user_id, post_id, week_start DESC)` |
| `post_analytics_wk_pkey` | `CREATE UNIQUE INDEX post_analytics_wk_pkey ON public.post_analytics_wk USING btree (id)` |
| `post_analytics_wk_user_id_post_id_week_start_key` | `CREATE UNIQUE INDEX post_analytics_wk_user_id_post_id_week_start_key ON public.post_analytics_wk USING btree (user_id, post_id, week_start)` |

### `post_analytics_yr`

| Index Name | Definition |
|------------|------------|
| `post_analytics_yr_pkey` | `CREATE UNIQUE INDEX post_analytics_yr_pkey ON public.post_analytics_yr USING btree (id)` |
| `post_analytics_yr_user_id_post_id_year_start_key` | `CREATE UNIQUE INDEX post_analytics_yr_user_id_post_id_year_start_key ON public.post_analytics_yr USING btree (user_id, post_id, year_start)` |
| `idx_poay_user_post_year` | `CREATE INDEX idx_poay_user_post_year ON public.post_analytics_yr USING btree (user_id, post_id, year_start DESC)` |

### `posting_goals`

| Index Name | Definition |
|------------|------------|
| `idx_posting_goals_user_id` | `CREATE INDEX idx_posting_goals_user_id ON public.posting_goals USING btree (user_id)` |
| `posting_goals_pkey` | `CREATE UNIQUE INDEX posting_goals_pkey ON public.posting_goals USING btree (id)` |

### `profile_analytics_accumulative`

| Index Name | Definition |
|------------|------------|
| `profile_analytics_accumulative_pkey` | `CREATE UNIQUE INDEX profile_analytics_accumulative_pkey ON public.profile_analytics_accumulative USING btree (id)` |
| `profile_analytics_accumulative_user_id_analysis_date_key` | `CREATE UNIQUE INDEX profile_analytics_accumulative_user_id_analysis_date_key ON public.profile_analytics_accumulative USING btree (user_id, analysis_date)` |
| `idx_paa_user_date` | `CREATE INDEX idx_paa_user_date ON public.profile_analytics_accumulative USING btree (user_id, analysis_date DESC)` |

### `profile_analytics_daily`

| Index Name | Definition |
|------------|------------|
| `profile_analytics_daily_user_id_analysis_date_key` | `CREATE UNIQUE INDEX profile_analytics_daily_user_id_analysis_date_key ON public.profile_analytics_daily USING btree (user_id, analysis_date)` |
| `profile_analytics_daily_pkey` | `CREATE UNIQUE INDEX profile_analytics_daily_pkey ON public.profile_analytics_daily USING btree (id)` |
| `idx_profile_analytics_daily_user_date` | `CREATE INDEX idx_profile_analytics_daily_user_date ON public.profile_analytics_daily USING btree (user_id, analysis_date DESC)` |
| `idx_pad_user_date` | `CREATE INDEX idx_pad_user_date ON public.profile_analytics_daily USING btree (user_id, analysis_date DESC)` |

### `profiles`

| Index Name | Definition |
|------------|------------|
| `idx_profiles_onboarding_completed` | `CREATE INDEX idx_profiles_onboarding_completed ON public.profiles USING btree (onboarding_completed)` |
| `profiles_pkey` | `CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)` |
| `idx_profiles_company_onboarding` | `CREATE INDEX idx_profiles_company_onboarding ON public.profiles USING btree (company_onboarding_completed)` |

### `prompt_test_results`

| Index Name | Definition |
|------------|------------|
| `idx_test_results_rating` | `CREATE INDEX idx_test_results_rating ON public.prompt_test_results USING btree (rating) WHERE (rating IS NOT NULL)` |
| `prompt_test_results_pkey` | `CREATE UNIQUE INDEX prompt_test_results_pkey ON public.prompt_test_results USING btree (id)` |
| `idx_test_results_prompt` | `CREATE INDEX idx_test_results_prompt ON public.prompt_test_results USING btree (prompt_id)` |
| `idx_test_results_user` | `CREATE INDEX idx_test_results_user ON public.prompt_test_results USING btree (user_id)` |
| `idx_test_results_created` | `CREATE INDEX idx_test_results_created ON public.prompt_test_results USING btree (created_at DESC)` |

### `prompt_usage_logs`

| Index Name | Definition |
|------------|------------|
| `idx_usage_type` | `CREATE INDEX idx_usage_type ON public.prompt_usage_logs USING btree (prompt_type)` |
| `idx_usage_feature` | `CREATE INDEX idx_usage_feature ON public.prompt_usage_logs USING btree (feature)` |
| `prompt_usage_logs_pkey` | `CREATE UNIQUE INDEX prompt_usage_logs_pkey ON public.prompt_usage_logs USING btree (id)` |
| `idx_usage_created` | `CREATE INDEX idx_usage_created ON public.prompt_usage_logs USING btree (created_at DESC)` |
| `idx_usage_success` | `CREATE INDEX idx_usage_success ON public.prompt_usage_logs USING btree (success)` |
| `idx_usage_user` | `CREATE INDEX idx_usage_user ON public.prompt_usage_logs USING btree (user_id)` |
| `idx_usage_prompt` | `CREATE INDEX idx_usage_prompt ON public.prompt_usage_logs USING btree (prompt_id)` |

### `prompt_versions`

| Index Name | Definition |
|------------|------------|
| `idx_unique_version_per_prompt` | `CREATE UNIQUE INDEX idx_unique_version_per_prompt ON public.prompt_versions USING btree (prompt_id, version)` |
| `idx_versions_prompt` | `CREATE INDEX idx_versions_prompt ON public.prompt_versions USING btree (prompt_id, version DESC)` |
| `prompt_versions_pkey` | `CREATE UNIQUE INDEX prompt_versions_pkey ON public.prompt_versions USING btree (id)` |

### `research_sessions`

| Index Name | Definition |
|------------|------------|
| `idx_research_sessions_created` | `CREATE INDEX idx_research_sessions_created ON public.research_sessions USING btree (created_at DESC)` |
| `research_sessions_pkey` | `CREATE UNIQUE INDEX research_sessions_pkey ON public.research_sessions USING btree (id)` |
| `idx_research_sessions_user` | `CREATE INDEX idx_research_sessions_user ON public.research_sessions USING btree (user_id)` |
| `idx_research_sessions_status` | `CREATE INDEX idx_research_sessions_status ON public.research_sessions USING btree (status)` |

### `saved_inspirations`

| Index Name | Definition |
|------------|------------|
| `saved_inspirations_user_id_inspiration_post_id_key` | `CREATE UNIQUE INDEX saved_inspirations_user_id_inspiration_post_id_key ON public.saved_inspirations USING btree (user_id, inspiration_post_id)` |
| `saved_inspirations_pkey` | `CREATE UNIQUE INDEX saved_inspirations_pkey ON public.saved_inspirations USING btree (id)` |
| `idx_saved_inspirations_user_id` | `CREATE INDEX idx_saved_inspirations_user_id ON public.saved_inspirations USING btree (user_id)` |

### `scheduled_posts`

| Index Name | Definition |
|------------|------------|
| `idx_scheduled_posts_status` | `CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts USING btree (status)` |
| `scheduled_posts_pkey` | `CREATE UNIQUE INDEX scheduled_posts_pkey ON public.scheduled_posts USING btree (id)` |
| `idx_scheduled_posts_user_id` | `CREATE INDEX idx_scheduled_posts_user_id ON public.scheduled_posts USING btree (user_id)` |
| `idx_scheduled_posts_user_created` | `CREATE INDEX idx_scheduled_posts_user_created ON public.scheduled_posts USING btree (user_id, created_at DESC)` |
| `idx_scheduled_posts_status_scheduled` | `CREATE INDEX idx_scheduled_posts_status_scheduled ON public.scheduled_posts USING btree (status, scheduled_for) WHERE (status = 'pending'::text)` |
| `idx_scheduled_posts_activity_urn` | `CREATE INDEX idx_scheduled_posts_activity_urn ON public.scheduled_posts USING btree (activity_urn)` |
| `idx_scheduled_posts_scheduled_for` | `CREATE INDEX idx_scheduled_posts_scheduled_for ON public.scheduled_posts USING btree (scheduled_for)` |
| `idx_scheduled_posts_user_status` | `CREATE INDEX idx_scheduled_posts_user_status ON public.scheduled_posts USING btree (user_id, status)` |
| `idx_scheduled_posts_pending` | `CREATE INDEX idx_scheduled_posts_pending ON public.scheduled_posts USING btree (scheduled_for) WHERE (status = 'pending'::text)` |

### `suggestion_generation_runs`

| Index Name | Definition |
|------------|------------|
| `suggestion_generation_runs_pkey` | `CREATE UNIQUE INDEX suggestion_generation_runs_pkey ON public.suggestion_generation_runs USING btree (id)` |
| `idx_suggestion_generation_runs_user_created` | `CREATE INDEX idx_suggestion_generation_runs_user_created ON public.suggestion_generation_runs USING btree (user_id, created_at DESC)` |
| `idx_suggestion_generation_runs_inngest` | `CREATE INDEX idx_suggestion_generation_runs_inngest ON public.suggestion_generation_runs USING btree (inngest_run_id) WHERE (inngest_run_id IS NOT NULL)` |
| `idx_suggestion_generation_runs_user_status` | `CREATE INDEX idx_suggestion_generation_runs_user_status ON public.suggestion_generation_runs USING btree (user_id, status)` |
| `idx_suggestion_generation_runs_active_per_user` | `CREATE UNIQUE INDEX idx_suggestion_generation_runs_active_per_user ON public.suggestion_generation_runs USING btree (user_id) WHERE ((status)::text = ANY ((ARRAY['pending'::character varying, 'generating'::character varying])::text[]))` |

### `swipe_preferences`

| Index Name | Definition |
|------------|------------|
| `idx_swipe_preferences_user_id` | `CREATE INDEX idx_swipe_preferences_user_id ON public.swipe_preferences USING btree (user_id)` |
| `idx_swipe_preferences_action` | `CREATE INDEX idx_swipe_preferences_action ON public.swipe_preferences USING btree (action)` |
| `swipe_preferences_pkey` | `CREATE UNIQUE INDEX swipe_preferences_pkey ON public.swipe_preferences USING btree (id)` |

### `swipe_wishlist`

| Index Name | Definition |
|------------|------------|
| `idx_swipe_wishlist_scheduled` | `CREATE INDEX idx_swipe_wishlist_scheduled ON public.swipe_wishlist USING btree (scheduled_post_id) WHERE (scheduled_post_id IS NOT NULL)` |
| `idx_swipe_wishlist_user_status` | `CREATE INDEX idx_swipe_wishlist_user_status ON public.swipe_wishlist USING btree (user_id, status)` |
| `idx_swipe_wishlist_user_collection` | `CREATE INDEX idx_swipe_wishlist_user_collection ON public.swipe_wishlist USING btree (user_id, collection_id)` |
| `idx_swipe_wishlist_collection_id` | `CREATE INDEX idx_swipe_wishlist_collection_id ON public.swipe_wishlist USING btree (collection_id)` |
| `idx_swipe_wishlist_user_created` | `CREATE INDEX idx_swipe_wishlist_user_created ON public.swipe_wishlist USING btree (user_id, created_at DESC)` |
| `swipe_wishlist_pkey` | `CREATE UNIQUE INDEX swipe_wishlist_pkey ON public.swipe_wishlist USING btree (id)` |
| `unique_wishlist_item_per_user` | `CREATE UNIQUE INDEX unique_wishlist_item_per_user ON public.swipe_wishlist USING btree (user_id, content)` |

### `sync_metadata`

| Index Name | Definition |
|------------|------------|
| `sync_metadata_pkey` | `CREATE UNIQUE INDEX sync_metadata_pkey ON public.sync_metadata USING btree (id)` |
| `sync_metadata_user_id_table_name_key` | `CREATE UNIQUE INDEX sync_metadata_user_id_table_name_key ON public.sync_metadata USING btree (user_id, table_name)` |
| `idx_sync_metadata_user_id` | `CREATE INDEX idx_sync_metadata_user_id ON public.sync_metadata USING btree (user_id)` |

### `system_prompts`

| Index Name | Definition |
|------------|------------|
| `idx_prompts_default` | `CREATE INDEX idx_prompts_default ON public.system_prompts USING btree (is_default) WHERE (is_default = true)` |
| `idx_prompts_active` | `CREATE INDEX idx_prompts_active ON public.system_prompts USING btree (is_active) WHERE (is_active = true)` |
| `idx_prompts_type` | `CREATE INDEX idx_prompts_type ON public.system_prompts USING btree (type)` |
| `idx_unique_active_per_type` | `CREATE UNIQUE INDEX idx_unique_active_per_type ON public.system_prompts USING btree (type) WHERE (is_active = true)` |
| `system_prompts_pkey` | `CREATE UNIQUE INDEX system_prompts_pkey ON public.system_prompts USING btree (id)` |
| `idx_prompts_created_by` | `CREATE INDEX idx_prompts_created_by ON public.system_prompts USING btree (created_by)` |

### `tag_cluster_mappings`

| Index Name | Definition |
|------------|------------|
| `tag_cluster_mappings_pkey` | `CREATE UNIQUE INDEX tag_cluster_mappings_pkey ON public.tag_cluster_mappings USING btree (tag)` |

### `team_invitations`

| Index Name | Definition |
|------------|------------|
| `idx_team_invitations_token` | `CREATE INDEX idx_team_invitations_token ON public.team_invitations USING btree (token)` |
| `idx_team_invitations_email` | `CREATE INDEX idx_team_invitations_email ON public.team_invitations USING btree (email)` |
| `idx_team_invitations_status` | `CREATE INDEX idx_team_invitations_status ON public.team_invitations USING btree (status)` |
| `team_invitations_pkey` | `CREATE UNIQUE INDEX team_invitations_pkey ON public.team_invitations USING btree (id)` |
| `team_invitations_token_key` | `CREATE UNIQUE INDEX team_invitations_token_key ON public.team_invitations USING btree (token)` |
| `idx_team_invitations_team` | `CREATE INDEX idx_team_invitations_team ON public.team_invitations USING btree (team_id)` |

### `team_join_requests`

| Index Name | Definition |
|------------|------------|
| `idx_join_requests_team` | `CREATE INDEX idx_join_requests_team ON public.team_join_requests USING btree (team_id)` |
| `team_join_requests_pkey` | `CREATE UNIQUE INDEX team_join_requests_pkey ON public.team_join_requests USING btree (id)` |
| `team_join_requests_user_id_team_id_key` | `CREATE UNIQUE INDEX team_join_requests_user_id_team_id_key ON public.team_join_requests USING btree (user_id, team_id)` |
| `idx_join_requests_user` | `CREATE INDEX idx_join_requests_user ON public.team_join_requests USING btree (user_id)` |
| `idx_team_join_requests_team_status` | `CREATE INDEX idx_team_join_requests_team_status ON public.team_join_requests USING btree (team_id, status)` |

### `team_members`

| Index Name | Definition |
|------------|------------|
| `team_members_pkey` | `CREATE UNIQUE INDEX team_members_pkey ON public.team_members USING btree (id)` |
| `idx_team_members_user` | `CREATE INDEX idx_team_members_user ON public.team_members USING btree (user_id)` |
| `idx_team_members_team` | `CREATE INDEX idx_team_members_team ON public.team_members USING btree (team_id)` |
| `team_members_team_id_user_id_key` | `CREATE UNIQUE INDEX team_members_team_id_user_id_key ON public.team_members USING btree (team_id, user_id)` |

### `teams`

| Index Name | Definition |
|------------|------------|
| `idx_teams_name_trgm` | `CREATE INDEX idx_teams_name_trgm ON public.teams USING gin (name gin_trgm_ops)` |
| `teams_pkey` | `CREATE UNIQUE INDEX teams_pkey ON public.teams USING btree (id)` |
| `idx_teams_owner` | `CREATE INDEX idx_teams_owner ON public.teams USING btree (owner_id)` |
| `idx_teams_company` | `CREATE INDEX idx_teams_company ON public.teams USING btree (company_id)` |

### `template_categories`

| Index Name | Definition |
|------------|------------|
| `template_categories_pkey` | `CREATE UNIQUE INDEX template_categories_pkey ON public.template_categories USING btree (id)` |
| `idx_template_categories_user_id` | `CREATE INDEX idx_template_categories_user_id ON public.template_categories USING btree (user_id)` |
| `template_categories_user_id_name_key` | `CREATE UNIQUE INDEX template_categories_user_id_name_key ON public.template_categories USING btree (user_id, name)` |

### `template_favorites`

| Index Name | Definition |
|------------|------------|
| `template_favorites_pkey` | `CREATE UNIQUE INDEX template_favorites_pkey ON public.template_favorites USING btree (id)` |
| `template_favorites_user_id_template_id_key` | `CREATE UNIQUE INDEX template_favorites_user_id_template_id_key ON public.template_favorites USING btree (user_id, template_id)` |

### `templates`

| Index Name | Definition |
|------------|------------|
| `idx_templates_category` | `CREATE INDEX idx_templates_category ON public.templates USING btree (category)` |
| `idx_templates_user_ai_generated` | `CREATE INDEX idx_templates_user_ai_generated ON public.templates USING btree (user_id, category) WHERE (is_ai_generated = true)` |
| `idx_templates_user_created` | `CREATE INDEX idx_templates_user_created ON public.templates USING btree (user_id, created_at DESC)` |
| `idx_templates_team_id` | `CREATE INDEX idx_templates_team_id ON public.templates USING btree (team_id)` |
| `idx_templates_user_id` | `CREATE INDEX idx_templates_user_id ON public.templates USING btree (user_id)` |
| `templates_pkey` | `CREATE UNIQUE INDEX templates_pkey ON public.templates USING btree (id)` |

### `user_api_keys`

| Index Name | Definition |
|------------|------------|
| `idx_user_api_keys_provider` | `CREATE INDEX idx_user_api_keys_provider ON public.user_api_keys USING btree (user_id, provider)` |
| `user_api_keys_pkey` | `CREATE UNIQUE INDEX user_api_keys_pkey ON public.user_api_keys USING btree (id)` |
| `user_api_keys_user_id_provider_key` | `CREATE UNIQUE INDEX user_api_keys_user_id_provider_key ON public.user_api_keys USING btree (user_id, provider)` |
| `idx_user_api_keys_user_id` | `CREATE INDEX idx_user_api_keys_user_id ON public.user_api_keys USING btree (user_id)` |

### `user_default_hashtags`

| Index Name | Definition |
|------------|------------|
| `user_default_hashtags_user_id_key` | `CREATE UNIQUE INDEX user_default_hashtags_user_id_key ON public.user_default_hashtags USING btree (user_id)` |
| `user_default_hashtags_pkey` | `CREATE UNIQUE INDEX user_default_hashtags_pkey ON public.user_default_hashtags USING btree (id)` |

### `user_niches`

| Index Name | Definition |
|------------|------------|
| `user_niches_user_id_niche_key` | `CREATE UNIQUE INDEX user_niches_user_id_niche_key ON public.user_niches USING btree (user_id, niche)` |
| `user_niches_pkey` | `CREATE UNIQUE INDEX user_niches_pkey ON public.user_niches USING btree (id)` |
| `idx_user_niches_user_id` | `CREATE INDEX idx_user_niches_user_id ON public.user_niches USING btree (user_id)` |

### `viral_source_profiles`

| Index Name | Definition |
|------------|------------|
| `viral_source_profiles_linkedin_url_key` | `CREATE UNIQUE INDEX viral_source_profiles_linkedin_url_key ON public.viral_source_profiles USING btree (linkedin_url)` |
| `idx_viral_source_profiles_status` | `CREATE INDEX idx_viral_source_profiles_status ON public.viral_source_profiles USING btree (status)` |
| `viral_source_profiles_pkey` | `CREATE UNIQUE INDEX viral_source_profiles_pkey ON public.viral_source_profiles USING btree (id)` |

### `wishlist_collections`

| Index Name | Definition |
|------------|------------|
| `wishlist_collections_pkey` | `CREATE UNIQUE INDEX wishlist_collections_pkey ON public.wishlist_collections USING btree (id)` |
| `idx_wishlist_collections_user_id` | `CREATE INDEX idx_wishlist_collections_user_id ON public.wishlist_collections USING btree (user_id)` |
| `idx_wishlist_collections_user_name` | `CREATE UNIQUE INDEX idx_wishlist_collections_user_name ON public.wishlist_collections USING btree (user_id, name)` |

### `writing_style_profiles`

| Index Name | Definition |
|------------|------------|
| `writing_style_profiles_user_id_key` | `CREATE UNIQUE INDEX writing_style_profiles_user_id_key ON public.writing_style_profiles USING btree (user_id)` |
| `writing_style_profiles_pkey` | `CREATE UNIQUE INDEX writing_style_profiles_pkey ON public.writing_style_profiles USING btree (id)` |

## 8. Key Database Patterns

### UUID Primary Keys

Nearly all tables use `uuid` as the primary key type, typically with `gen_random_uuid()` or `uuid_generate_v4()` as the default value. This aligns with Supabase's default pattern and enables distributed ID generation without coordination.

### Timestamp Columns

Most tables include standard timestamp columns:

- `created_at` - Record creation time, typically defaults to `now()`
- `updated_at` - Last modification time, typically defaults to `now()`
- `deleted_at` - Soft delete timestamp (where applicable)

### JSONB Usage

Several tables use `jsonb` columns for flexible, schema-less data storage:

- `analytics_summary_cache.timeseries`
- `audience_data.demographics_preview`
- `audience_data.raw_data`
- `audience_data.top_companies`
- `audience_data.top_industries`
- `audience_data.top_job_titles`
- `audience_data.top_locations`
- `brand_kits.raw_extraction`
- `captured_apis.response_data`
- `carousel_templates.brand_colors`
- `carousel_templates.fonts`
- `carousel_templates.slides`
- `comments.raw_data`
- `companies.settings`
- `company_context.brand_colors`
- `company_context.products_and_services`
- `company_context.target_audience`
- `company_context.tone_of_voice`
- `compose_conversations.messages`
- `connections.raw_data`
- `extension_settings.raw_settings`
- `feature_flags.user_overrides`
- `feed_posts.hashtags`
- `feed_posts.raw_data`
- `followers.raw_data`
- `generated_suggestions.prompt_context`
- `influencer_posts.raw_data`
- `invitations.raw_data`
- `linkedin_analytics.raw_data`
- `linkedin_analytics.top_posts`
- `linkedin_profiles.raw_data`
- `linkedin_research_posts.media_images`
- `linkedin_research_posts.raw_data`
- `my_posts.raw_data`
- `network_data.raw_data`
- `notifications.raw_data`
- `post_analytics.demographics`
- `post_analytics.raw_data`
- `prompt_test_results.variables`
- `prompt_usage_logs.metadata`
- `prompt_versions.variables`
- `system_prompts.variables`
- `templates.tags`
- `writing_style_profiles.formatting_style`
- `writing_style_profiles.raw_analysis`

### User Ownership Pattern

Most tables include a `user_id` column (type `uuid`) that references `auth.users.id` from Supabase Auth. RLS policies consistently use `auth.uid() = user_id` to enforce row-level access control, ensuring users can only access their own data.

### Analytics Time-Series Pattern

Post analytics are partitioned across multiple time-granularity tables:

| Table | Granularity | Purpose |
|-------|------------|---------|
| `post_analytics_daily` | Daily | Fine-grained daily snapshots |
| `post_analytics_wk` | Weekly | Weekly aggregation |
| `post_analytics_mth` | Monthly | Monthly aggregation |
| `post_analytics_qtr` | Quarterly | Quarterly aggregation |
| `post_analytics_yr` | Yearly | Yearly aggregation |
| `post_analytics_accumulative` | Cumulative | Running totals |

All analytics tables share the same column structure and reference both `my_posts.id` and `analytics_tracking_status.id` via foreign keys.

### Team Multi-Tenancy Pattern

Team-scoped resources (`templates`, `brand_kits`, `content_rules`) reference `teams.id` via a `team_id` foreign key. RLS policies for team-owned resources typically check membership via a subquery against `team_members`.

### Soft References (No FK Constraint)

Many tables use `user_id` columns that reference Supabase Auth users (`auth.users.id`) but do not have explicit foreign key constraints defined in the `public` schema. These are enforced at the application level and through RLS policies.

### Extension Data Capture Pattern

The Chrome extension captures LinkedIn data through:

- `captured_apis` - Raw API responses intercepted by the extension
- `capture_stats` - Aggregated capture statistics
- `sync_metadata` - Tracks what data has been synced and when
- `extension_settings` - Per-user extension configuration

### Content Generation Pipeline

AI content generation follows this flow:

1. `company_context` - Stores company information for context
2. `system_prompts` -> `prompt_versions` - Versioned AI prompts
3. `suggestion_generation_runs` - Batch generation tracking
4. `generated_suggestions` - Output suggestions for swipe interface
5. `generated_posts` - Full AI-generated post drafts
6. `compose_conversations` - Interactive AI compose sessions
7. `prompt_usage_logs` / `prompt_test_results` - Monitoring and testing
