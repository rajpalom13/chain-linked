# Changelog

All notable changes to the ChainLinked project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-12

### Added

#### Analytics Dashboard (AGI-55)
- **Analytics Cards** - 4 metric cards displaying impressions, engagement rate, followers, and profile views
- **Analytics Chart** - Interactive area chart with 7d/30d/90d time range filters showing impressions and engagements
- **Goals Tracker** - Weekly/monthly posting goals with progress visualization and streak tracking

#### Team Activity Feed (AGI-50)
- Real-time team posts feed with author info and engagement metrics
- Content preview with expand/collapse functionality
- "Remix" button for repurposing team content
- Relative timestamps (e.g., "2 hours ago")

#### Post Composer (AGI-47)
- Two-column layout with rich text editor and LinkedIn preview
- Character counter with 3000 character limit
- Formatting toolbar (bold, italic, lists, hashtags)
- Media attachment placeholders
- "Post Now" and "Schedule" actions

#### Post Queue & Scheduling (AGI-46)
- Scheduled posts list with date grouping (Today, Tomorrow, This Week, Later)
- Status badges (Pending, Posting, Failed)
- Post actions (Edit, Delete, Post Now)
- Empty state and loading skeletons

#### Swipe Interface (AGI-52)
- Tinder-style swipe cards for AI post suggestions
- Swipe left (dislike) / right (like) with animations
- Keyboard support (arrow keys)
- Engagement prediction indicators
- "Edit & Post" quick action

#### Inspiration Feed (AGI-53)
- Curated viral posts from 6 categories
- Category tabs with filtering
- Search functionality
- Post metrics and "Remix" action
- Responsive grid layout (1/2/3 columns)

#### Settings (AGI-56)
- **Profile Settings** - Name, email, avatar management
- **LinkedIn Connection** - Connection status and refresh
- **API Keys** - BYOK OpenAI key management
- **Brand Kit** - Color picker for primary/secondary colors
- **Team Management** - Member list, invite, role assignment
- **Notifications** - Toggle switches for all notification types

#### Template Library (AGI-49)
- Grid/List view toggle
- Search and category filtering
- Create/Edit template modal
- Template cards with usage count
- Public/Private visibility toggle
- 5 template categories

#### Carousel Creator (AGI-48)
- Slide editor with add/remove functionality
- 4 template styles (Bold, Minimalist, Data-focused, Story-style)
- Brand kit integration with color customization
- Live carousel preview with navigation
- Export PDF placeholder

### Infrastructure
- **Supabase Integration** - Client configuration for browser and server
- **Database Types** - Complete TypeScript types for 16+ tables
- **Environment Setup** - .env.local with Supabase credentials

### Navigation
- Updated sidebar for ChainLinked branding
- 8 new dashboard routes:
  - `/dashboard` - Main dashboard
  - `/dashboard/analytics` - Full analytics view
  - `/dashboard/compose` - Post composer
  - `/dashboard/schedule` - Scheduled posts
  - `/dashboard/team` - Team activity
  - `/dashboard/templates` - Template library
  - `/dashboard/inspiration` - Inspiration feed + swipe
  - `/dashboard/carousels` - Carousel creator
  - `/dashboard/settings` - All settings

### Developer Experience
- **CLAUDE.md** - Development rules and standards
- **JSDoc** - Comprehensive documentation on all components
- **TypeScript** - Strict typing throughout

### Fixed (QA Pass)
- **sidebar.tsx** - Replace Math.random() with static value to fix ESLint impure function error
- **swipe-interface.tsx** - Fix useEffect dependency array for keyboard handler
- **carousel-creator.tsx** - Replace img tags with next/image component for optimization
- **settings.tsx** - Add API key validation with error feedback UI
- **template-library.tsx** - Fix undefined template reference in delete handler
- **post-composer.tsx** - Fix Safari regex incompatibility with lookbehind assertions

---

## [0.1.0] - 2026-01-12

### Added
- Initial Next.js 16 project scaffold
- Dashboard page with sample components
- shadcn/ui components (22 total)
- Recharts integration for data visualization
- TanStack Table for data display
- Tailwind CSS v4 with CSS variables theming
