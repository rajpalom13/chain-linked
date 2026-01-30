# Team Feature Architecture with Resend Email Integration

## Overview

This document outlines the architecture for ChainLinked's team management feature with email invitations powered by Resend. The feature enables company owners and admins to invite team members via email, manage team roles, and collaborate on LinkedIn content.

## System Architecture

```
+------------------+     +------------------+     +------------------+
|    Client        |     |    Next.js API   |     |    Supabase      |
|  (React 19)      |<--->|    Routes        |<--->|    PostgreSQL    |
+------------------+     +------------------+     +------------------+
        |                        |
        |                        v
        |                +------------------+
        |                |     Resend       |
        |                |  Email Service   |
        |                +------------------+
        |                        |
        v                        v
+------------------+     +------------------+
|   UI Components  |     |  Email Templates |
| (shadcn/ui)      |     |  (React Email)   |
+------------------+     +------------------+
```

## Database Schema

### Existing Tables (Already Implemented)

#### `teams`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | Team name |
| logo_url | VARCHAR | Team logo URL |
| owner_id | UUID | FK to auth.users |
| company_id | UUID | FK to companies |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

#### `team_members`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| team_id | UUID | FK to teams |
| user_id | UUID | FK to auth.users |
| role | VARCHAR | 'owner', 'admin', 'member' |
| joined_at | TIMESTAMP | Join timestamp |

#### `team_invitations`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| team_id | UUID | FK to teams |
| email | VARCHAR | Invitee email |
| role | VARCHAR | 'admin', 'member' |
| token | VARCHAR | Unique invitation token |
| invited_by | UUID | FK to auth.users |
| status | VARCHAR | 'pending', 'accepted', 'expired', 'cancelled' |
| expires_at | TIMESTAMP | Expiration time (7 days) |
| created_at | TIMESTAMP | Creation timestamp |
| accepted_at | TIMESTAMP | When accepted |

### Entity Relationships

```
companies (1) ----< (1) teams (1) ----< (M) team_members (M) >---- (1) users
                          |
                          +----< (M) team_invitations
```

## API Endpoints

### Teams API

#### `GET /api/teams`
Fetch current user's teams.

**Response:**
```json
{
  "teams": [
    {
      "id": "uuid",
      "name": "Team Name",
      "logo_url": "https://...",
      "role": "owner",
      "member_count": 5,
      "company": { "id": "uuid", "name": "Company Name" }
    }
  ]
}
```

#### `POST /api/teams`
Create a new team (admin function).

**Request:**
```json
{
  "name": "Team Name",
  "company_id": "uuid",
  "logo_url": "https://..."
}
```

#### `PATCH /api/teams`
Update team details.

**Request:**
```json
{
  "id": "uuid",
  "name": "New Name",
  "logo_url": "https://..."
}
```

### Team Members API

#### `GET /api/teams/[teamId]/members`
Fetch team members with profile info.

**Response:**
```json
{
  "members": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "role": "owner",
      "joined_at": "2025-01-01T00:00:00Z",
      "user": {
        "email": "user@example.com",
        "full_name": "John Doe",
        "avatar_url": "https://..."
      }
    }
  ]
}
```

#### `PATCH /api/teams/[teamId]/members`
Update member role.

**Request:**
```json
{
  "user_id": "uuid",
  "role": "admin"
}
```

#### `DELETE /api/teams/[teamId]/members`
Remove team member.

**Query:** `?userId=uuid`

### Team Invitations API

#### `POST /api/teams/[teamId]/invite`
Send team invitations via email.

**Request:**
```json
{
  "emails": ["user1@example.com", "user2@example.com"],
  "role": "member"
}
```

**Response:**
```json
{
  "success": true,
  "sent": ["user1@example.com"],
  "failed": [{ "email": "user2@example.com", "reason": "Already a member" }]
}
```

#### `GET /api/teams/[teamId]/invite`
Get pending invitations.

**Response:**
```json
{
  "invitations": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "role": "member",
      "status": "pending",
      "expires_at": "2025-02-01T00:00:00Z",
      "created_at": "2025-01-25T00:00:00Z"
    }
  ]
}
```

#### `DELETE /api/teams/[teamId]/invite`
Cancel invitation.

**Query:** `?invitationId=uuid`

#### `POST /api/teams/accept-invite`
Accept team invitation.

**Request:**
```json
{
  "token": "invitation_token"
}
```

## Email Flow with Resend

### Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Invitation Flow                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Admin clicks "Invite"                                        │
│          │                                                       │
│          v                                                       │
│  2. API validates & creates invitation record                    │
│          │                                                       │
│          v                                                       │
│  3. API calls Resend with React Email template                   │
│          │                                                       │
│          v                                                       │
│  4. Resend sends email to invitee                                │
│          │                                                       │
│          v                                                       │
│  5. Invitee clicks link → /invite/[token]                        │
│          │                                                       │
│          v                                                       │
│  6. Accept invitation page loads invitation data                 │
│          │                                                       │
│          v                                                       │
│  7. User authenticates (if needed)                               │
│          │                                                       │
│          v                                                       │
│  8. User accepts → added to team_members                         │
│          │                                                       │
│          v                                                       │
│  9. Welcome email sent via Resend                                │
│          │                                                       │
│          v                                                       │
│  10. Redirect to dashboard                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Email Templates

#### Team Invitation Email
- Subject: "You're invited to join {teamName} on ChainLinked"
- Contains: Inviter name, team info, company logo, CTA button
- Expiration notice: "This invitation expires in 7 days"

#### Welcome to Team Email
- Subject: "Welcome to {teamName}!"
- Contains: Team info, next steps, helpful links

### Resend Configuration

```typescript
// lib/email/resend.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Send with React Email templates
await resend.emails.send({
  from: 'ChainLinked <team@chainlinked.io>',
  to: email,
  subject: `You're invited to join ${teamName} on ChainLinked`,
  react: TeamInvitationEmail({ props }),
});
```

## Security Considerations

### Invitation Token Security
- Tokens are 64-character hex strings generated with `crypto.getRandomValues()`
- Tokens expire after 7 days
- One-time use (status updated to 'accepted' after use)
- Tokens are not exposed in URLs except the invite link

### Authorization Rules
| Action | Required Role |
|--------|---------------|
| View team | owner, admin, member |
| Invite members | owner, admin |
| Remove members | owner, admin |
| Change roles | owner |
| Delete team | owner |
| Update team settings | owner, admin |

### Email Verification
- Invitation email must match authenticated user's email
- If email mismatch, user is prompted to sign out and use correct account

### Rate Limiting
- Max 20 invitations per team per hour
- Max 5 invitations per email per day

## Component Hierarchy

```
app/dashboard/team/page.tsx
├── TeamManagement (main container)
│   ├── TeamHeader
│   │   ├── TeamLogo
│   │   ├── TeamName
│   │   └── TeamSettings (gear icon)
│   │
│   ├── InviteTeamModal
│   │   ├── EmailInputList
│   │   │   └── EmailInputRow (email + role selector)
│   │   ├── RoleLegend
│   │   └── ActionButtons
│   │
│   ├── TeamMemberList
│   │   └── TeamMemberRow
│   │       ├── Avatar
│   │       ├── MemberInfo
│   │       ├── RoleBadge
│   │       └── MemberActions (dropdown)
│   │
│   └── PendingInvitations
│       └── InvitationRow
│           ├── Email
│           ├── StatusBadge
│           ├── ExpiresAt
│           └── InvitationActions
```

## Hooks Structure

### `use-team.ts`
```typescript
interface UseTeamReturn {
  team: Team | null;
  members: TeamMemberWithUser[];
  isLoading: boolean;
  error: string | null;
  updateTeam: (data: TeamUpdate) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  updateMemberRole: (userId: string, role: TeamMemberRole) => Promise<void>;
  refetch: () => Promise<void>;
}
```

### `use-team-invitations.ts`
```typescript
interface UseTeamInvitationsReturn {
  invitations: TeamInvitation[];
  isLoading: boolean;
  error: string | null;
  sendInvitations: (emails: string[], role: TeamMemberRole) => Promise<SendResult>;
  cancelInvitation: (id: string) => Promise<void>;
  resendInvitation: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}
```

## Data Flow

### Sending Invitations

```
User Input (emails, role)
        │
        v
useTeamInvitations.sendInvitations()
        │
        v
POST /api/teams/[teamId]/invite
        │
        ├── Validate user permissions
        ├── Check for existing members
        ├── Check for pending invitations
        ├── Generate secure tokens
        ├── Insert invitation records
        ├── Send emails via Resend
        │
        v
Return success/failure for each email
```

### Accepting Invitations

```
User clicks invite link
        │
        v
/invite/[token] page loads
        │
        v
GET invitation by token
        │
        ├── Check expiration
        ├── Check if already accepted
        ├── Check user authentication
        │
        v
User clicks "Accept"
        │
        v
POST /api/teams/accept-invite
        │
        ├── Verify email matches
        ├── Add to team_members
        ├── Update invitation status
        ├── Send welcome email
        │
        v
Redirect to dashboard
```

## Error Handling

### API Errors
| Error Code | Description | User Message |
|------------|-------------|--------------|
| 401 | Unauthorized | "Please log in to continue" |
| 403 | Forbidden | "You don't have permission for this action" |
| 404 | Not Found | "Team or invitation not found" |
| 409 | Conflict | "This email is already a team member" |
| 429 | Rate Limited | "Too many invitations. Please wait." |
| 500 | Server Error | "Something went wrong. Please try again." |

### Email Errors
- Resend API failure: Queue for retry, show user feedback
- Invalid email: Validate before API call, show inline error
- Bounced email: Track in invitation record for analytics

## Performance Considerations

### Caching
- Team members list: Cache for 30 seconds
- Pending invitations: No cache (needs real-time updates)
- Team info: Cache for 1 minute

### Optimistic Updates
- Member removal: Immediate UI update, rollback on failure
- Role changes: Immediate UI update, rollback on failure
- Invitation cancellation: Immediate UI update

### Batch Operations
- Send multiple invitations in single API call
- Fetch member profiles in parallel

## Testing Checklist

- [ ] Send single invitation
- [ ] Send bulk invitations (5+)
- [ ] Handle duplicate emails
- [ ] Handle existing member emails
- [ ] Verify email delivery
- [ ] Test invitation link click
- [ ] Accept invitation (new user)
- [ ] Accept invitation (existing user)
- [ ] Handle expired invitations
- [ ] Handle cancelled invitations
- [ ] Test role assignment
- [ ] Test member removal
- [ ] Test role change
- [ ] Verify permissions enforcement
- [ ] Test mobile responsiveness
- [ ] Test dark mode
- [ ] Test accessibility

## Environment Variables

```env
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxx

# App URLs
NEXT_PUBLIC_APP_URL=https://app.chainlinked.io

# Email Configuration
EMAIL_FROM_NAME=ChainLinked
EMAIL_FROM_ADDRESS=team@chainlinked.io
```
