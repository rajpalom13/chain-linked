# Remaining Frontend Components - Implementation Specification

> ChainLinked v0.3.0 - Frontend Completion
> Generated: 2026-01-12

## Overview

This document specifies the 8 remaining frontend components needed to complete all Linear issues (AGI-46, AGI-47, AGI-48, AGI-53, AGI-55).

---

## 1. Team Leaderboard Component

**Issue:** AGI-55 - Analytics Dashboard
**File:** `components/features/team-leaderboard.tsx`
**Priority:** Medium
**Estimated Lines:** ~180

### Purpose
Display team-wide performance rankings with post counts, engagement rates, and weekly/monthly comparisons.

### Interface

```typescript
interface TeamMemberStats {
  id: string
  name: string
  avatarUrl?: string
  role: string
  postsThisWeek: number
  postsThisMonth: number
  totalEngagement: number
  engagementRate: number
  rank: number
  rankChange: number // positive = up, negative = down, 0 = same
}

interface TeamLeaderboardProps {
  members?: TeamMemberStats[]
  timeRange?: "week" | "month" | "all-time"
  onTimeRangeChange?: (range: "week" | "month" | "all-time") => void
  onMemberClick?: (memberId: string) => void
  isLoading?: boolean
  currentUserId?: string // Highlight current user
}
```

### UI Components
- Time range tabs (Week / Month / All Time)
- Ranked list with position badges (1st, 2nd, 3rd with gold/silver/bronze)
- Avatar, name, role for each member
- Key metrics: posts count, engagement rate
- Rank change indicator (up/down arrows with color)
- Highlight row for current user
- Loading skeleton state

### Sample Data
```typescript
const SAMPLE_LEADERBOARD: TeamMemberStats[] = [
  { id: "1", name: "Sarah Chen", role: "Marketing Lead", postsThisWeek: 12, postsThisMonth: 48, totalEngagement: 15420, engagementRate: 8.5, rank: 1, rankChange: 0 },
  { id: "2", name: "Alex Rivera", role: "Content Strategist", postsThisWeek: 10, postsThisMonth: 42, totalEngagement: 12800, engagementRate: 7.2, rank: 2, rankChange: 1 },
  // ... more members
]
```

---

## 2. Post Performance Drill-down Component

**Issue:** AGI-55 - Analytics Dashboard
**File:** `components/features/post-performance.tsx`
**Priority:** Medium
**Estimated Lines:** ~220

### Purpose
Detailed view of individual post performance with metrics over time, audience breakdown, and engagement analysis.

### Interface

```typescript
interface PostMetrics {
  date: string
  impressions: number
  engagements: number
  likes: number
  comments: number
  shares: number
  clicks: number
}

interface PostPerformanceData {
  id: string
  content: string
  publishedAt: string
  author: {
    name: string
    avatarUrl?: string
  }
  totalImpressions: number
  totalEngagements: number
  engagementRate: number
  metrics: PostMetrics[] // Time series data
  topComments?: { author: string; text: string; likes: number }[]
  audienceBreakdown?: {
    industries: { name: string; percentage: number }[]
    jobTitles: { name: string; percentage: number }[]
    locations: { name: string; percentage: number }[]
  }
}

interface PostPerformanceProps {
  post?: PostPerformanceData
  isLoading?: boolean
  onClose?: () => void
  onRemix?: (postId: string) => void
}
```

### UI Components
- Post content preview card
- Key metrics summary (impressions, engagements, rate)
- Line chart showing metrics over time (7 days)
- Engagement breakdown (likes, comments, shares, clicks)
- Audience demographics section (if available)
- Top comments section
- Actions: Remix, Share, Export

---

## 3. Schedule Calendar View Component

**Issue:** AGI-46 - Post Queue and Scheduling
**File:** `components/features/schedule-calendar.tsx`
**Priority:** Medium
**Estimated Lines:** ~280

### Purpose
Monthly calendar view showing scheduled posts with drag-and-drop rescheduling capability.

### Interface

```typescript
interface ScheduledPostItem {
  id: string
  content: string
  scheduledFor: Date
  status: "pending" | "posted" | "failed"
  platform: "linkedin"
}

interface ScheduleCalendarProps {
  posts?: ScheduledPostItem[]
  currentMonth?: Date
  onMonthChange?: (date: Date) => void
  onPostClick?: (post: ScheduledPostItem) => void
  onDateClick?: (date: Date) => void
  onReschedule?: (postId: string, newDate: Date) => void
  isLoading?: boolean
}
```

### UI Components
- Month/year header with navigation arrows
- 7-column grid (Sun-Sat)
- Day cells with post indicators (dots/badges)
- Hover preview of scheduled posts
- Click to see day's posts
- Today highlight
- Past dates grayed out
- Loading skeleton for month grid

### Layout
```
┌─────────────────────────────────────────────┐
│  < January 2026 >                           │
├─────┬─────┬─────┬─────┬─────┬─────┬─────────┤
│ Sun │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat     │
├─────┼─────┼─────┼─────┼─────┼─────┼─────────┤
│     │     │     │  1  │  2  │  3  │  4      │
│     │     │     │ ●●  │     │ ●   │         │
├─────┼─────┼─────┼─────┼─────┼─────┼─────────┤
│ ... │ ... │ ... │ ... │ ... │ ... │ ...     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────────┘
```

---

## 4. Schedule Post Modal Component

**Issue:** AGI-46 - Post Queue and Scheduling
**File:** `components/features/schedule-modal.tsx`
**Priority:** High
**Estimated Lines:** ~200

### Purpose
Modal for scheduling a post with date picker, time picker, and timezone selection.

### Interface

```typescript
interface ScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSchedule: (scheduledFor: Date, timezone: string) => void
  postPreview?: {
    content: string
    mediaCount?: number
  }
  defaultDate?: Date
  defaultTimezone?: string
  isSubmitting?: boolean
}
```

### UI Components
- Modal overlay with card
- Post preview section (truncated content)
- Date picker (calendar)
- Time picker (hour:minute dropdowns or input)
- Timezone selector dropdown
- Optimal time suggestions (based on analytics)
- Schedule button with loading state
- Cancel button

### Optimal Times Feature
```typescript
const OPTIMAL_TIMES = [
  { time: "09:00", label: "Morning Peak", engagement: "High" },
  { time: "12:30", label: "Lunch Break", engagement: "Medium" },
  { time: "17:00", label: "End of Day", engagement: "High" },
]
```

---

## 5. Post Detail Modal Component

**Issue:** AGI-53 - Inspiration Tab
**File:** `components/features/post-detail-modal.tsx`
**Priority:** Low
**Estimated Lines:** ~150

### Purpose
Expanded view of an inspiration post with full content, metrics, and remix action.

### Interface

```typescript
interface InspirationPost {
  id: string
  author: {
    name: string
    headline: string
    avatarUrl?: string
    followerCount: number
  }
  content: string
  publishedAt: string
  metrics: {
    likes: number
    comments: number
    shares: number
    impressions?: number
  }
  category: string
  tags?: string[]
}

interface PostDetailModalProps {
  post: InspirationPost | null
  isOpen: boolean
  onClose: () => void
  onRemix: (post: InspirationPost) => void
  onSave?: (post: InspirationPost) => void
}
```

### UI Components
- Full-screen modal overlay
- Author header with avatar, name, headline, followers
- Full post content (scrollable)
- Metrics bar (likes, comments, shares)
- Category and tags badges
- Action buttons: Remix, Save, Close
- Published date

---

## 6. Emoji Picker Component

**Issue:** AGI-47 - Post Composer
**File:** `components/features/emoji-picker.tsx`
**Priority:** Low
**Estimated Lines:** ~180

### Purpose
Searchable emoji picker popover for the post composer.

### Interface

```typescript
interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  isOpen: boolean
  onClose: () => void
  triggerRef?: React.RefObject<HTMLElement>
}
```

### UI Components
- Popover positioned near trigger
- Search input at top
- Category tabs (Smileys, People, Animals, Food, Activities, Travel, Objects, Symbols)
- Emoji grid (6-8 columns)
- Recently used section
- Skin tone selector (optional)

### Emoji Data Structure
```typescript
const EMOJI_CATEGORIES = {
  smileys: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", ...],
  people: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", ...],
  // ... other categories
}
```

---

## 7. PDF Export Utility

**Issue:** AGI-48 - Carousel Creator
**File:** `lib/pdf-export.ts`
**Priority:** High
**Estimated Lines:** ~250

### Purpose
Generate PDF carousel documents from slides using pdf-lib.

### Interface

```typescript
interface CarouselSlide {
  id: string
  title: string
  content: string
  order: number
}

interface BrandKit {
  primaryColor: string
  secondaryColor: string
  fontFamily?: string
  logoUrl?: string
}

interface PDFExportOptions {
  slides: CarouselSlide[]
  brandKit: BrandKit
  template: "bold" | "minimalist" | "data" | "story"
  format?: "square" | "portrait" | "landscape"
  filename?: string
}

async function exportCarouselToPDF(options: PDFExportOptions): Promise<Blob>
```

### Implementation Details
- Use `pdf-lib` for PDF generation
- Each slide = one PDF page
- Apply brand colors to backgrounds/accents
- Embed fonts (use standard fonts or fetch custom)
- Add slide numbers
- Support 3 formats:
  - Square: 1080x1080px (LinkedIn optimal)
  - Portrait: 1080x1350px
  - Landscape: 1920x1080px

### Template Styles
```typescript
const TEMPLATES = {
  bold: {
    titleSize: 48,
    contentSize: 24,
    backgroundColor: "primary",
    textColor: "white",
  },
  minimalist: {
    titleSize: 36,
    contentSize: 20,
    backgroundColor: "white",
    textColor: "black",
  },
  data: {
    titleSize: 32,
    contentSize: 18,
    backgroundColor: "white",
    textColor: "primary",
    showNumbers: true,
  },
  story: {
    titleSize: 40,
    contentSize: 22,
    backgroundColor: "gradient",
    textColor: "white",
  },
}
```

---

## 8. Media Upload Handler

**Issue:** AGI-47 - Post Composer
**File:** `components/features/media-upload.tsx`
**Priority:** High
**Estimated Lines:** ~200

### Purpose
Handle file uploads for images and videos in the post composer with preview and validation.

### Interface

```typescript
interface MediaFile {
  id: string
  file: File
  type: "image" | "video" | "document"
  previewUrl: string
  uploadProgress: number
  status: "pending" | "uploading" | "complete" | "error"
  error?: string
}

interface MediaUploadProps {
  files: MediaFile[]
  onFilesChange: (files: MediaFile[]) => void
  maxFiles?: number // Default: 9 for images, 1 for video
  maxSizeMB?: number // Default: 10MB for images, 200MB for video
  acceptedTypes?: string[] // Default: ["image/*", "video/*"]
  onUpload?: (file: File) => Promise<string> // Returns URL
  disabled?: boolean
}
```

### UI Components
- Drag-and-drop zone
- File input button
- Preview grid for uploaded files
- Progress indicator per file
- Remove button on each file
- Error state per file
- File type validation messages
- Size limit warnings

### Validation Rules (LinkedIn)
```typescript
const LINKEDIN_LIMITS = {
  image: {
    maxCount: 9,
    maxSizeMB: 10,
    formats: ["jpg", "jpeg", "png", "gif"],
    dimensions: { min: 552, max: 7680 },
  },
  video: {
    maxCount: 1,
    maxSizeMB: 200,
    formats: ["mp4", "mov", "avi"],
    duration: { min: 3, max: 600 }, // seconds
  },
  document: {
    maxCount: 1,
    maxSizeMB: 100,
    formats: ["pdf"],
  },
}
```

---

## File Structure

```
components/features/
├── team-leaderboard.tsx      # NEW
├── post-performance.tsx      # NEW
├── schedule-calendar.tsx     # NEW
├── schedule-modal.tsx        # NEW
├── post-detail-modal.tsx     # NEW
├── emoji-picker.tsx          # NEW
├── media-upload.tsx          # NEW
├── analytics-cards.tsx       # Existing
├── analytics-chart.tsx       # Existing
├── goals-tracker.tsx         # Existing
├── ...

lib/
├── pdf-export.ts             # NEW
├── supabase/
│   ├── client.ts
│   └── server.ts
```

---

## Dependencies to Install

```bash
npm install pdf-lib @emoji-mart/data @emoji-mart/react date-fns
```

| Package | Purpose | Size |
|---------|---------|------|
| `pdf-lib` | PDF generation | ~300KB |
| `@emoji-mart/data` | Emoji dataset | ~200KB |
| `@emoji-mart/react` | Emoji picker UI | ~50KB |
| `date-fns` | Already installed | - |

---

## Integration Points

### 1. Team Leaderboard → Analytics Page
```tsx
// app/dashboard/analytics/page.tsx
import { TeamLeaderboard } from "@/components/features/team-leaderboard"

<TeamLeaderboard
  currentUserId={user.id}
  onMemberClick={(id) => router.push(`/dashboard/team/${id}`)}
/>
```

### 2. Schedule Modal → Post Composer
```tsx
// components/features/post-composer.tsx
import { ScheduleModal } from "@/components/features/schedule-modal"

<ScheduleModal
  isOpen={showScheduleModal}
  onClose={() => setShowScheduleModal(false)}
  onSchedule={handleSchedulePost}
  postPreview={{ content }}
/>
```

### 3. PDF Export → Carousel Creator
```tsx
// components/features/carousel-creator.tsx
import { exportCarouselToPDF } from "@/lib/pdf-export"

const handleExport = async () => {
  const blob = await exportCarouselToPDF({ slides, brandKit, template })
  downloadBlob(blob, "carousel.pdf")
}
```

---

## Acceptance Criteria Checklist

### AGI-55 - Analytics Dashboard
- [ ] Team leaderboard with rankings
- [ ] Post drill-down with metrics over time
- [ ] All 4 screens functional

### AGI-46 - Scheduling
- [ ] Calendar view shows scheduled posts
- [ ] Modal for scheduling with date/time picker
- [ ] Timezone handling

### AGI-47 - Post Composer
- [ ] Emoji picker integration
- [ ] Media upload with preview
- [ ] File validation

### AGI-48 - Carousel Creator
- [ ] PDF export produces valid files
- [ ] Brand colors applied

### AGI-53 - Inspiration
- [ ] Post detail expanded view
- [ ] Full content display

---

## Estimated Total: ~1,660 lines

| Component | Lines |
|-----------|-------|
| Team Leaderboard | 180 |
| Post Performance | 220 |
| Schedule Calendar | 280 |
| Schedule Modal | 200 |
| Post Detail Modal | 150 |
| Emoji Picker | 180 |
| PDF Export | 250 |
| Media Upload | 200 |
| **Total** | **1,660** |
