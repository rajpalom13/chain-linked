# Implementation Rules & Workflow

## Self-Enforced Development Protocol

**Project:** LinkedIn Data Extractor - Auto-Capture Feature
**Date:** 2026-01-10

---

## Golden Rules

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
When QA'ing my own code, I must ask:
- [ ] Does it handle ALL edge cases?
- [ ] What happens if the DOM element doesn't exist?
- [ ] What happens if the page loads slowly?
- [ ] Is there proper error handling?
- [ ] Are there any memory leaks?
- [ ] Is the code readable and maintainable?
- [ ] Does it follow existing code patterns?
- [ ] Are there console.log statements for debugging?
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
- No copy-paste without understanding

---

## Phase Checklist

### Phase 1: Foundation
**Files to Create/Modify:**
- [ ] `content/auto-capture.js` (NEW)
- [ ] `content/content-script.js` (modify)
- [ ] `manifest.json` (modify)

**Acceptance Criteria:**
- [ ] AutoCaptureController class created
- [ ] Navigation detection working (History API + URL polling)
- [ ] Page type detection returning correct types for all analytics URLs
- [ ] Debouncing prevents duplicate captures
- [ ] Console logs show navigation events
- [ ] No errors on any LinkedIn page

**QA Tests:**
1. Navigate to /analytics/creator/content/ - should detect 'creator_analytics'
2. Navigate to /analytics/post-summary/urn:li:activity:123 - should detect 'post_analytics'
3. Navigate to /analytics/creator/audience/ - should detect 'audience_analytics'
4. Navigate rapidly between pages - should debounce
5. Use browser back/forward - should detect navigation
6. Refresh page - should re-detect

---

### Phase 2: Extractors
**Files to Modify:**
- [ ] `content/dom-extractor.js`
- [ ] `content/auto-capture.js`

**Acceptance Criteria:**
- [ ] Creator Analytics extractor captures all metrics
- [ ] Post Analytics extractor captures all sections
- [ ] Audience Analytics extractor captures follower data
- [ ] Audience Demographics extractor captures all categories
- [ ] All extractors handle missing elements gracefully
- [ ] Data matches schema defined in spec

**QA Tests:**
1. Extract from Creator Analytics - verify impressions, growth, top posts
2. Extract from Post Analytics - verify all 4 sections
3. Extract from Audience page - verify follower count, demographics
4. Extract from Demographics detail - verify all categories
5. Test with elements missing - should not crash
6. Verify data format matches schema

---

### Phase 3: Storage & Service Worker
**Files to Modify:**
- [ ] `background/service-worker.js`

**Acceptance Criteria:**
- [ ] New message handlers for all capture types
- [ ] History tracking implemented
- [ ] Capture logging implemented
- [ ] Deduplication working correctly
- [ ] Data persists across browser restart

**QA Tests:**
1. Capture data - verify stored in correct key
2. Capture same data twice - verify no duplicates
3. Capture over multiple days - verify history tracked
4. Check capture log - verify entries created
5. Restart browser - verify data persists
6. Export data - verify includes auto-captured data

---

### Phase 4: UI Updates
**Files to Modify:**
- [ ] `popup/popup.html`
- [ ] `popup/popup.js`
- [ ] `popup/popup.css`

**Acceptance Criteria:**
- [ ] Settings panel with auto-capture toggle
- [ ] Last capture time displayed
- [ ] Historical data viewable
- [ ] Growth indicators shown
- [ ] Capture status indicator

**QA Tests:**
1. Toggle auto-capture - verify setting persists
2. View last capture time - verify accurate
3. View historical data - verify trend display
4. Check growth indicators - verify calculations
5. Test on small popup window - verify responsive

---

### Phase 5: Integration & Polish
**Tasks:**
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Error message improvements
- [ ] Documentation updates

**QA Tests:**
1. Fresh install flow - verify everything works
2. Full user journey - browse LinkedIn, check popup
3. Performance check - no visible lag
4. Error scenarios - verify graceful handling
5. Multiple tabs - verify isolation

---

## Progress Tracker

| Phase | Status | Started | Completed | Commit Hash |
|-------|--------|---------|-----------|-------------|
| 1 | COMPLETED | 2026-01-10 | 2026-01-10 | 43a5da7 |
| 2 | COMPLETED | 2026-01-10 | 2026-01-10 | 84c96b0 |
| 3 | COMPLETED | 2026-01-10 | 2026-01-10 | 981b7a3 |
| 4 | COMPLETED | 2026-01-10 | 2026-01-10 | 059dd6e |
| 5 | COMPLETED | 2026-01-10 | 2026-01-10 | eac22fc |

---

## QA Failure Log

Record any issues found during QA:

```
[Phase 1] Issue: Missing service-worker.js handlers for AUTO_CAPTURE_* messages
- Root cause: auto-capture.js sends AUTO_CAPTURE_* messages but service-worker had no handlers
- Fix applied: Added handlers for AUTO_CAPTURE_CREATOR_ANALYTICS, AUTO_CAPTURE_POST_ANALYTICS,
  AUTO_CAPTURE_AUDIENCE, AUTO_CAPTURE_AUDIENCE_DEMOGRAPHICS, AUTO_CAPTURE_POST_DEMOGRAPHICS,
  AUTO_CAPTURE_PROFILE_VIEWS, AUTO_CAPTURE_LOG
- Verified: Yes

[Phase 4] Issue: handleSaveSettings() didn't update auto-capture status badge immediately
- Root cause: Toggling auto-capture saved setting but UI only updated on page reload
- Fix applied: Created updateAutoCaptureStatusBadge() helper and called it from handleSaveSettings()
- Verified: Yes

[Phase 4] Issue: Duplicate function declarations (getTimeAgo, truncateText)
- Root cause: Functions were defined twice, causing shadowing
- Fix applied: Removed duplicate definitions, kept better implementations
- Verified: Yes
```

---

## Commit Message Template

```
[Phase X] <type>: <description>

- <change 1>
- <change 2>
- <change 3>

QA: All tests passed
```

Types: feat, fix, refactor, docs, test

---

**START IMPLEMENTATION NOW**
