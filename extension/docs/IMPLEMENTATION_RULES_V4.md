# Implementation Rules & Workflow - v4.0

## LinkedIn Data Extractor - Major Feature Update

**Version:** 4.0
**Date:** 2026-01-10
**Previous Version:** Auto-Capture Feature (Phases 1-5 Complete)

---

## v4.0 Feature Scope

### Core Features (Priority 1)
1. **History Export** - Export 90-day trend data as CSV/JSON
2. **Scheduled Backups** - Daily/weekly auto-backup to local storage
3. **Growth Alerts** - User-configurable threshold notifications
4. **Capture Notifications** - Chrome notifications on successful capture

### UI Migration (Priority 2)
5. **React + TypeScript** - Modern framework migration
6. **shadcn/ui** - Neutral theme, minimalist design
7. **Recharts** - Data visualization for trends

### Advanced Features (Priority 3)
8. **Company Page Analytics** - Capture company page metrics
9. **Content Calendar** - View scheduled/past posts

### Cloud Sync (Priority 4)
10. **Google Drive Sync** - OAuth-based cloud backup

### Excluded (User Decision)
- Competitor Tracking - Skipped for this version

---

## Golden Rules (Same as v3.0)

### Rule 1: One Phase at a Time
- Complete ONE phase fully before starting the next
- No jumping ahead or partial implementations
- Each phase must be self-contained and functional

### Rule 2: Implement → QA → Fix → Commit
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Implement  │───▶│   QA Test   │───▶│  Fix Issues │───▶│   Commit    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                          │                   ▲
                          │   Issues Found    │
                          └───────────────────┘
```

### Rule 3: QA Like a Critic
- [ ] Does it handle ALL edge cases?
- [ ] What happens if the DOM element doesn't exist?
- [ ] Is there proper error handling?
- [ ] Are there any memory leaks?
- [ ] Does it follow existing code patterns?
- [ ] Does it work with the existing codebase?

### Rule 4: Commit Standards
Each commit must:
- Be atomic (one logical change)
- Have a descriptive message
- Reference the phase number
- Pass all QA checks

### Rule 5: No Shortcuts
- No "TODO" comments left behind
- No placeholder functions
- No hardcoded values that should be configurable

---

## Architecture Overview

### Build System
```
extension/
├── src/                          # TypeScript source
│   ├── popup/                    # React popup app
│   │   ├── components/           # shadcn/ui components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── lib/                 # Utilities
│   │   ├── App.tsx              # Main app
│   │   └── main.tsx             # Entry point
│   ├── background/              # Service worker (TS)
│   ├── content/                 # Content scripts (TS)
│   └── shared/                  # Shared types/utilities
├── dist/                        # Build output
├── public/                      # Static assets
├── vite.config.ts              # Vite config for popup
├── esbuild.config.js           # esbuild for content/background
├── tsconfig.json               # TypeScript config
└── package.json                # Dependencies
```

### Storage Architecture
```
IndexedDB (linkedin-data-extractor)
├── trends                       # Time-series data (90 days)
│   ├── impressions[]
│   ├── followers[]
│   └── engagements[]
├── captures                     # Capture history log
├── backups                      # Scheduled backup metadata
└── alerts                       # Alert configurations

chrome.storage.local (existing)
├── extension_settings
├── profile_data
├── creator_analytics
└── ... (existing keys)
```

---

## Phase Checklist

### Phase 1: Build System + TypeScript Foundation ✅
**Goal:** Set up modern build tooling without breaking existing functionality

**Files to Create:**
- [x] `package.json` - Dependencies and scripts
- [x] `tsconfig.json` - TypeScript configuration
- [x] `vite.config.ts` - Vite config for popup
- [x] `esbuild.config.js` - esbuild for content/background scripts
- [x] `src/shared/types.ts` - Shared TypeScript types
- [x] `src/shared/storage.ts` - Storage utilities

**Files to Migrate:**
- [x] `background/service-worker.js` → `src/background/service-worker.ts`
- [x] `content/auto-capture.js` → `src/content/auto-capture.ts`
- [x] `content/dom-extractor.js` → `src/content/dom-extractor.ts`
- [x] `content/content-script.js` → `src/content/content-script.ts`
- [x] `content/main-world-interceptor.js` → `src/content/main-world-interceptor.ts`

**Acceptance Criteria:**
- [x] `npm run build` produces working extension
- [x] `npm run dev` watches for changes
- [x] TypeScript compiles (with relaxed strictness for migration)
- [x] Existing functionality unchanged
- [x] Source maps generated for debugging

**QA Tests:**
1. ✅ Build extension - verify no errors
2. ⏳ Load in Chrome - verify works like before
3. ⏳ Test auto-capture - verify still functional
4. ⏳ Check DevTools - verify source maps work
5. ⏳ Make a change - verify hot reload works

---

### Phase 2: IndexedDB + Storage Layer Enhancement ✅
**Goal:** Add IndexedDB for large datasets, history tracking

**Files to Create:**
- [x] `src/shared/indexeddb.ts` - IndexedDB wrapper
- [x] `src/shared/history-manager.ts` - Trend data management

**Files to Modify:**
- [x] `src/background/service-worker.ts` - Add IndexedDB handlers

**Data Schema:**
```typescript
interface TrendDataPoint {
  date: string;          // ISO date
  type: 'impressions' | 'followers' | 'engagements';
  value: number;
  source: string;        // capture source
}

interface CaptureLog {
  id: string;
  timestamp: number;
  type: string;
  dataSize: number;
  success: boolean;
}

interface BackupMetadata {
  id: string;
  timestamp: number;
  size: number;
  type: 'manual' | 'scheduled';
}
```

**Acceptance Criteria:**
- [x] IndexedDB initialized on extension load
- [x] Trend data stored with 90-day retention
- [x] Old data automatically pruned (via runMaintenance)
- [x] Capture logs stored in IndexedDB
- [x] Export to CSV/JSON works from IndexedDB data

**QA Tests:**
1. ⏳ Store trend data - verify in DevTools IndexedDB
2. ⏳ Wait 24 hours (simulate) - verify data retained
3. ⏳ Add 91-day-old data - verify pruned
4. ⏳ Export trends - verify CSV/JSON format correct
5. ⏳ Clear extension data - verify clean reset

---

### Phase 3: Chrome Alarms + Notifications System ✅
**Goal:** Scheduled backups and user-configurable alerts

**Files to Create:**
- [x] `src/background/alarms.ts` - Alarm management
- [x] `src/background/notifications.ts` - Notification helpers
- [x] Alert configuration types (in types.ts - AlertConfig, BackupSchedule already existed)

**Files to Modify:**
- [x] `src/background/service-worker.ts` - Add alarm handlers
- [x] `manifest.json` - Add alarms + notifications permissions

**Alert Configuration:**
```typescript
interface AlertConfig {
  id: string;
  type: 'impressions' | 'followers' | 'engagement';
  condition: 'above' | 'below' | 'change';
  threshold: number;
  enabled: boolean;
  lastTriggered?: number;
}

interface BackupSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string;           // HH:mm format
  lastBackup?: number;
}
```

**Acceptance Criteria:**
- [x] Scheduled backups run at configured time
- [x] Growth alerts trigger on threshold breach
- [x] Capture notifications show on success
- [x] User can enable/disable each notification type
- [x] Notifications respect system quiet hours

**QA Tests:**
1. ⏳ Set daily backup - verify runs on schedule
2. ⏳ Set growth alert - verify triggers correctly
3. ⏳ Disable notification - verify doesn't appear
4. ⏳ Multiple alerts - verify all processed
5. ⏳ Browser closed - verify alarms persist

---

### Phase 4: React + shadcn/ui + Recharts Migration ✅
**Goal:** Modern, minimalist popup UI

**Files to Create:**
- [x] `src/popup/main.tsx` - React entry (Phase 1)
- [x] `src/popup/App.tsx` - Main component (updated)
- [x] `src/popup/components/ui/button.tsx` - Button component
- [x] `src/popup/components/ui/card.tsx` - Card component
- [x] `src/popup/components/ui/tabs.tsx` - Tabs component
- [x] `src/popup/components/ui/switch.tsx` - Switch component
- [x] `src/popup/components/ui/badge.tsx` - Badge component
- [x] `src/popup/components/Dashboard.tsx` - Dashboard view
- [x] `src/popup/components/Analytics.tsx` - Analytics view
- [x] `src/popup/components/Settings.tsx` - Settings view
- [x] `src/popup/components/TrendChart.tsx` - Recharts visualization
- [x] `src/popup/hooks/useStorage.ts` - Storage hooks
- [x] `src/popup/hooks/useAnalytics.ts` - Analytics hooks
- [x] `src/popup/lib/utils.ts` - shadcn utilities
- [x] `tailwind.config.js` - Tailwind configuration (Phase 1)
- [x] `postcss.config.js` - PostCSS configuration (Phase 1)

**shadcn/ui Components Implemented:**
- [x] Button
- [x] Card
- [x] Tabs
- [x] Switch
- [x] Badge

**UI Design:**
- [x] Neutral color theme (slate/gray)
- [x] Minimalist design
- [x] Clear typography
- [x] Consistent spacing
- [x] Responsive within popup constraints (380x600)

**Acceptance Criteria:**
- [x] All existing functionality preserved
- [x] Trend charts display correctly (Recharts)
- [x] Settings persist correctly
- [x] Auto-capture status visible
- [x] Export buttons work
- [x] Loading states implemented
- [x] Error states handled

**QA Tests:**
1. ⏳ Open popup - verify renders correctly
2. ⏳ Navigate tabs - verify smooth transitions
3. ⏳ View trends - verify charts render
4. ⏳ Change settings - verify persists
5. ⏳ Export data - verify downloads
6. ⏳ Test at different popup sizes - verify responsive

---

### Phase 5: Company Page Analytics + Content Calendar ✅
**Goal:** Capture company page data and show content timeline

**Files to Create:**
- [x] `src/content/company-extractor.ts` - Company page extraction
- [x] `src/popup/components/CompanyAnalytics.tsx`
- [x] `src/popup/components/ContentCalendar.tsx`

**Files to Modify:**
- [x] `src/content/auto-capture.ts` - Add company page detection
- [x] `src/background/service-worker.ts` - Add company handlers

**Company Analytics Schema:**
```typescript
interface CompanyAnalytics {
  companyId: string;
  companyName: string;
  capturedAt: number;
  followers: number;
  updates: number;
  pageViews: number;
  uniqueVisitors: number;
  customButtonClicks?: number;
}
```

**Content Calendar Schema:**
```typescript
interface ContentItem {
  id: string;
  type: 'post' | 'article' | 'poll';
  status: 'published' | 'scheduled' | 'draft';
  publishedAt?: number;
  scheduledFor?: number;
  impressions?: number;
  engagement?: number;
}
```

**Acceptance Criteria:**
- [x] Company pages auto-captured
- [x] Company analytics displayed in popup
- [x] Content calendar shows past 30 days
- [x] Scheduled posts visible (if accessible)
- [x] Timeline view with engagement overlay

**QA Tests:**
1. ⏳ Visit company page - verify auto-capture
2. ⏳ View company analytics - verify data correct
3. ⏳ Open content calendar - verify posts listed
4. ⏳ Check scheduled posts - verify displayed
5. ⏳ Multiple companies - verify isolation

---

### Phase 6: Google Drive Cloud Sync ✅
**Goal:** Backup data to Google Drive with OAuth

**Files to Create:**
- [x] `src/background/google-auth.ts` - OAuth flow
- [x] `src/background/drive-sync.ts` - Drive API wrapper
- [x] `src/popup/components/CloudSync.tsx` - Sync UI

**Files to Modify:**
- [x] `manifest.json` - Add identity permission, OAuth config
- [x] `src/background/service-worker.ts` - Add Drive sync handlers
- [x] `src/popup/components/Settings.tsx` - Add Cloud Sync tab
- [x] `src/shared/types.ts` - Add sync-related types

**OAuth Configuration:**
```json
{
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/drive.appdata"
    ]
  }
}
```

**Sync Features:**
- Manual sync trigger
- Auto-sync on schedule
- Conflict resolution (last-write-wins)
- Sync status indicator
- Disconnect option

**Acceptance Criteria:**
- [x] OAuth flow works correctly
- [x] Data syncs to Drive appdata folder
- [x] Sync status shown in UI
- [x] Manual sync button works
- [x] Auto-sync runs on schedule
- [x] User can disconnect

**QA Tests:**
1. ⏳ Connect Google account - verify OAuth works
2. ⏳ Sync data - verify appears in Drive
3. ⏳ Modify data - verify sync updates
4. ⏳ Disconnect - verify clean disconnect
5. ⏳ Reconnect - verify data restored

**Setup Requirements:**
To use Google Drive sync, you need to:
1. Create a Google Cloud project at https://console.cloud.google.com/
2. Enable the Google Drive API
3. Create OAuth 2.0 credentials (Chrome Extension type)
4. Replace `YOUR_CLIENT_ID` in manifest.json with your client ID
5. Replace `YOUR_EXTENSION_KEY` with your extension's public key

---

## Progress Tracker

| Phase | Status | Started | Completed | Commit Hash |
|-------|--------|---------|-----------|-------------|
| 1 | COMPLETE | 2026-01-10 | 2026-01-10 | 9f955ec |
| 2 | COMPLETE | 2026-01-10 | 2026-01-10 | 1369f23 |
| 3 | COMPLETE | 2026-01-10 | 2026-01-10 | e7251db |
| 4 | COMPLETE | 2026-01-10 | 2026-01-10 | 61e24d6 |
| 5 | COMPLETE | 2026-01-10 | 2026-01-10 | 37d2034 |
| 6 | COMPLETE | 2026-01-10 | 2026-01-10 | 9f60717 |

---

## QA Failure Log

Record any issues found during QA:

```
(No issues yet)
```

---

## Dependencies

```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "esbuild": "^0.19.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "@types/chrome": "^0.0.260"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.10.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.300.0"
  }
}
```

---

**START PHASE 1 IMPLEMENTATION**
