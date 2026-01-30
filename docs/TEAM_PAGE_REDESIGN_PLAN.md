# Team Page Redesign Plan

## Current State Analysis

### What Exists
- **Team Page** (`app/dashboard/team/page.tsx`): Basic layout with leaderboard + activity feed
- **InviteTeamDialog**: Email-based invitation modal (exists but not prominently displayed)
- **TeamActivityFeed**: Shows team posts with engagement metrics
- **TeamLeaderboard**: Ranked list by engagement
- **TeamMemberList**: Member management component
- **API Endpoints**: Complete CRUD for teams, members, invitations
- **Hooks**: `useTeam`, `useTeamInvitations`, `useTeamLeaderboard`

### What's Missing/Broken
1. **No visible invite button** - InviteTeamDialog exists but isn't accessible
2. **No team member overview** on main page
3. **No pending invitations view**
4. **Activity feed only shows current user's posts** (not all team members)
5. **No team creation flow** for users without a team
6. **No empty states** when user has no team

---

## Redesign Goals

1. **Make team invitations prominent and easy**
2. **Show team members at a glance**
3. **Display pending invitations with resend/cancel options**
4. **Better empty state for users without a team**
5. **Improved visual hierarchy and UX**

---

## New Page Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Team Name                           [Manage Team] [+ Invite Members]││
│  │ 5 members · Created Jan 2024                                        ││
│  └─────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────┤
│  TABS: [Overview] [Members] [Activity] [Settings]                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  OVERVIEW TAB (Default)                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────────────────┐│
│  │  TEAM MEMBERS (Quick)    │  │  LEADERBOARD                         ││
│  │  ┌─────────────────────┐ │  │  [Week] [Month] [All Time]           ││
│  │  │ 👤 John (Owner)     │ │  │  ┌─────────────────────────────────┐││
│  │  │ 👤 Jane (Admin)     │ │  │  │ 🥇 John - 2.5k engagement      │││
│  │  │ 👤 Bob  (Member)    │ │  │  │ 🥈 Jane - 1.8k engagement      │││
│  │  │ +2 more             │ │  │  │ 🥉 Bob  - 1.2k engagement      │││
│  │  └─────────────────────┘ │  │  └─────────────────────────────────┘││
│  │                          │  └──────────────────────────────────────┘│
│  │  PENDING INVITATIONS     │                                          │
│  │  ┌─────────────────────┐ │  ┌──────────────────────────────────────┐│
│  │  │ alice@co.com        │ │  │  RECENT ACTIVITY                     ││
│  │  │ Sent 2 days ago     │ │  │  ┌─────────────────────────────────┐││
│  │  │ [Resend] [Cancel]   │ │  │  │ John posted about AI trends    │││
│  │  └─────────────────────┘ │  │  │ 1.2k impressions · 45 reactions │││
│  │                          │  │  └─────────────────────────────────┘││
│  │  [+ Invite More]         │  │  [View All Activity →]               ││
│  └──────────────────────────┘  └──────────────────────────────────────┘│
│                                                                          │
│  MEMBERS TAB                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Search members...                           [+ Invite Members]       ││
│  ├─────────────────────────────────────────────────────────────────────┤│
│  │ ┌─────────────────────────────────────────────────────────────────┐ ││
│  │ │ 👤 John Doe          Owner    john@company.com    Joined Jan 1  │ ││
│  │ │ 👤 Jane Smith        Admin    jane@company.com    Joined Jan 5  │ ││
│  │ │ 👤 Bob Wilson        Member   bob@company.com     Joined Jan 10 │ ││
│  │ └─────────────────────────────────────────────────────────────────┘ ││
│  │                                                                      ││
│  │ PENDING INVITATIONS (2)                                              ││
│  │ ┌─────────────────────────────────────────────────────────────────┐ ││
│  │ │ alice@company.com    Member   Sent 2 days ago   [Resend][Cancel]│ ││
│  │ │ charlie@company.com  Admin    Sent 5 days ago   [Resend][Cancel]│ ││
│  │ └─────────────────────────────────────────────────────────────────┘ ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Phase 1: Core Team Page Redesign

#### Task 1.1: Create Team Header Component
**File**: `components/features/team-header.tsx`
- Team name, logo, member count
- Primary "Invite Members" button (always visible to owners/admins)
- "Manage Team" dropdown for settings
- Created date display

#### Task 1.2: Create Team Overview Component
**File**: `components/features/team-overview.tsx`
- Quick member preview (first 5 with "+X more" link)
- Pending invitations card with actions
- Compact leaderboard preview
- Recent activity preview (3 posts)

#### Task 1.3: Create Pending Invitations Component
**File**: `components/features/pending-invitations.tsx`
- List of pending invitations
- Resend button with loading state
- Cancel button with confirmation
- Time since sent display
- Empty state when no pending invitations

#### Task 1.4: Update Team Page with Tabs
**File**: `app/dashboard/team/page.tsx`
- Add tabbed navigation: Overview | Members | Activity | Settings
- Default to Overview tab
- Responsive layout
- Loading states for each tab

#### Task 1.5: Create No Team State Component
**File**: `components/features/no-team-state.tsx`
- Friendly empty state when user has no team
- "Create Team" button
- "Join Team" explanation (via invitation)

### Phase 2: Enhanced Invite Flow

#### Task 2.1: Improve InviteTeamDialog
**File**: `components/features/invite-team-dialog.tsx`
- Better visual design
- Bulk paste support for multiple emails
- Role explanation tooltips
- Copy invite link option
- Success animation

#### Task 2.2: Create Quick Invite Card
**File**: `components/features/quick-invite-card.tsx`
- Compact card shown on Overview tab
- Single email input + role selector
- "Send Invite" button
- Links to full invite dialog for bulk invites

### Phase 3: Fix Activity Feed

#### Task 3.1: Update useTeamPosts Hook
**File**: `hooks/use-team-posts.ts`
- Fetch posts from ALL team members (not just current user)
- Join team_members with my_posts table
- Add proper filtering and pagination

### Phase 4: Team Settings

#### Task 4.1: Create Team Settings Page
**File**: `app/dashboard/team/settings/page.tsx`
- Team name/logo editing
- Danger zone: Delete team, Transfer ownership
- Notification preferences

---

## Component Hierarchy

```
app/dashboard/team/page.tsx
├── TeamHeader
│   ├── TeamLogo
│   ├── TeamInfo (name, member count, created)
│   └── TeamActions
│       ├── InviteTeamDialog (trigger button)
│       └── ManageTeamDropdown
│
├── Tabs (Overview | Members | Activity | Settings)
│
├── [Overview Tab]
│   ├── TeamMembersPreview
│   │   └── MemberAvatarList
│   ├── PendingInvitationsCard
│   │   └── InvitationItem (resend/cancel)
│   ├── TeamLeaderboard (compact)
│   └── RecentActivityPreview
│
├── [Members Tab]
│   ├── MemberSearch
│   ├── TeamMemberList (full)
│   └── PendingInvitationsSection
│
├── [Activity Tab]
│   └── TeamActivityFeed (full)
│
└── [Settings Tab]
    └── TeamSettings
```

---

## Database Queries Needed

### Get Team with Members and Pending Invitations
```sql
-- Get team details with member count
SELECT t.*,
       COUNT(DISTINCT tm.user_id) as member_count,
       COUNT(DISTINCT ti.id) FILTER (WHERE ti.status = 'pending') as pending_count
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id
LEFT JOIN team_invitations ti ON t.id = ti.team_id
WHERE t.id = $1
GROUP BY t.id;

-- Get pending invitations
SELECT ti.*, p.full_name as inviter_name
FROM team_invitations ti
JOIN profiles p ON ti.invited_by = p.id
WHERE ti.team_id = $1 AND ti.status = 'pending'
ORDER BY ti.created_at DESC;
```

### Get All Team Members' Posts
```sql
SELECT mp.*, p.full_name, p.avatar_url
FROM my_posts mp
JOIN team_members tm ON mp.user_id = tm.user_id
JOIN profiles p ON mp.user_id = p.id
WHERE tm.team_id = $1
ORDER BY mp.posted_at DESC
LIMIT 20;
```

---

## UI/UX Improvements

1. **Prominent Invite Button**: Blue primary button in header, always visible to owners/admins
2. **Contextual Empty States**: Different messages for "no team", "no members", "no invitations"
3. **Quick Actions**: Inline resend/cancel for invitations
4. **Visual Feedback**: Loading spinners, success toasts, confirmation dialogs
5. **Responsive Design**: Mobile-friendly tabs, collapsible sections
6. **Keyboard Shortcuts**: Enter to send invite, Escape to close dialogs

---

## Files to Create/Modify

### New Files
- `components/features/team-header.tsx`
- `components/features/team-overview.tsx`
- `components/features/pending-invitations.tsx`
- `components/features/no-team-state.tsx`
- `components/features/quick-invite-card.tsx`
- `components/features/team-members-preview.tsx`

### Modified Files
- `app/dashboard/team/page.tsx` - Complete redesign with tabs
- `components/features/invite-team-dialog.tsx` - Enhanced UX
- `hooks/use-team-posts.ts` - Fix to fetch all team members' posts
- `hooks/use-team.ts` - Add pending invitations fetching

---

## Implementation Order

1. **Team Header** - Foundation with invite button
2. **Pending Invitations** - Show existing invitations
3. **Team Overview** - Quick glance dashboard
4. **Update Team Page** - Integrate new components
5. **No Team State** - Handle edge case
6. **Fix Activity Feed** - Show all team posts
7. **Team Settings** - Final polish

---

## Success Criteria

- [ ] Invite button is clearly visible on team page
- [ ] Users can send invitations with email + role
- [ ] Pending invitations are displayed with resend/cancel
- [ ] Team members are shown at a glance
- [ ] Activity feed shows all team members' posts
- [ ] Empty states are handled gracefully
- [ ] Mobile responsive design works
- [ ] All actions have loading/success feedback
