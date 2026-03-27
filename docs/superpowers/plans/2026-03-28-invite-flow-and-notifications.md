# Invite Flow Fix + Team Email Notifications

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the invite flow so non-registered users seamlessly sign up, connect LinkedIn, and auto-join the team without re-clicking the invite link. Add email notifications for team join requests, member joins, and scheduled post publication.

**Architecture:** Preserve the invite token through signup and onboarding via URL query params (`?invite=TOKEN`). Shorten onboarding to LinkedIn-connect-only when invite param is present, then auto-accept the invite. Add 3 new React Email templates triggered at existing API endpoints.

**Tech Stack:** Next.js 16 App Router, Supabase Auth, Resend email, React Email templates

---

## Task 1: Fix Invite Page — Auto-Redirect Non-Authenticated Users to Signup

**Files:**
- Modify: `app/invite/[token]/page.tsx`

- [ ] **Step 1: Update the not_authenticated case to auto-redirect to signup**

In `app/invite/[token]/page.tsx`, find the `case 'not_authenticated':` block (around line 280). Replace the current rendering with an auto-redirect to signup, keeping a manual login option:

```tsx
case 'not_authenticated':
  return (
    <div className="space-y-6">
      {/* Invitation Details */}
      {invitation?.team && (
        <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
          {invitation.team.company?.logo_url ? (
            <div className="size-12 rounded-lg overflow-hidden border bg-background">
              <Image
                src={invitation.team.company.logo_url}
                alt={invitation.team.company.name}
                width={48}
                height={48}
                className="object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <IconUserPlus className="size-6 text-primary" />
            </div>
          )}
          <div>
            <p className="font-medium">{invitation.team.company?.name || invitation.team.name}</p>
            <p className="text-sm text-muted-foreground">
              Team: {invitation.team.name}
            </p>
          </div>
        </div>
      )}

      {invitation?.inviter && (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Avatar className="size-6">
            {invitation.inviter.avatar_url ? (
              <AvatarImage src={invitation.inviter.avatar_url} alt={invitation.inviter.name || ''} />
            ) : null}
            <AvatarFallback className="text-xs">
              {getInitials(invitation.inviter.name || invitation.inviter.email)}
            </AvatarFallback>
          </Avatar>
          <span>
            Invited by {invitation.inviter.name || invitation.inviter.email}
          </span>
        </div>
      )}

      <p className="text-center text-muted-foreground">
        Create an account to join this team.
      </p>

      <div className="flex flex-col gap-3">
        <Button
          onClick={() => router.push(`/signup?invite=${token}`)}
          className="w-full h-11"
        >
          Create Account
        </Button>
        <Button
          onClick={() => router.push(`/login?redirect=/invite/${token}`)}
          variant="outline"
          className="w-full h-11"
        >
          Already have an account? Sign In
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Make sure to use the email address <strong>{invitation?.email}</strong>
      </p>
    </div>
  )
```

- [ ] **Step 2: Commit**

```bash
git add app/invite/[token]/page.tsx
git commit -m "feat(invite): redirect non-authenticated users to signup with invite token"
```

---

## Task 2: Preserve Invite Token Through Signup

**Files:**
- Modify: `app/signup/page.tsx`

- [ ] **Step 1: Read the invite query param and preserve it through signup**

In `app/signup/page.tsx`:

1. Add `useSearchParams` import from `next/navigation`
2. Read the `invite` param at the top of the component
3. In `handleEmailSignup`, redirect to `/onboarding?invite={invite}` instead of `/onboarding`
4. In `handleGoogleSignup`, pass the invite token through the OAuth callback URL

Find the imports and add `useSearchParams`:
```tsx
import { useSearchParams } from 'next/navigation'
```

Inside the component function, add:
```tsx
const searchParams = useSearchParams()
const inviteToken = searchParams.get('invite')
```

In `handleEmailSignup`, change the redirect (around line 140):
```tsx
// OLD: router.push('/onboarding')
// NEW:
router.push(inviteToken ? `/onboarding?invite=${inviteToken}` : '/onboarding')
```

In `handleGoogleSignup`, update the `redirectTo` (around line 162):
```tsx
const callbackUrl = inviteToken
  ? `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(`/onboarding?invite=${inviteToken}`)}`
  : `${window.location.origin}/api/auth/callback`

const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: callbackUrl,
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add app/signup/page.tsx
git commit -m "feat(signup): preserve invite token through email and Google signup flows"
```

---

## Task 3: Shorten Onboarding When Invite Token Present

**Files:**
- Modify: `app/onboarding/page.tsx`

- [ ] **Step 1: Detect invite param and skip role selection**

In `app/onboarding/page.tsx`:

1. Add `useSearchParams` import
2. Read the `invite` param
3. If `invite` is present, skip role selection, auto-set `onboarding_type: 'member'`, and redirect to step1 with the invite token

Add to imports:
```tsx
import { useSearchParams } from 'next/navigation'
```

Inside the component, read the param:
```tsx
const searchParams = useSearchParams()
const inviteToken = searchParams.get('invite')
```

Add a new `useEffect` early in the component (after the existing auth/profile checks, before the role selection render). Place it after the existing redirect logic that handles `profile.onboarding_type`:

```tsx
// If invite token present, skip role selection and go straight to LinkedIn connect
useEffect(() => {
  if (inviteToken && !isLoading && user) {
    const skipToLinkedIn = async () => {
      try {
        const supabase = createClient()
        await supabase
          .from('profiles')
          .update({ onboarding_type: 'member' })
          .eq('id', user.id)
        router.replace(`/onboarding/step1?invite=${inviteToken}`)
      } catch (err) {
        console.error('Failed to set onboarding type for invite:', err)
        router.replace(`/onboarding/step1?invite=${inviteToken}`)
      }
    }
    skipToLinkedIn()
  }
}, [inviteToken, isLoading, user, router])
```

- [ ] **Step 2: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "feat(onboarding): skip role selection when invite token is present"
```

---

## Task 4: Auto-Accept Invite After LinkedIn Connect

**Files:**
- Modify: `app/onboarding/step1/page.tsx`

- [ ] **Step 1: Read invite param and auto-accept after LinkedIn connect**

In `app/onboarding/step1/page.tsx`:

1. Add `useSearchParams` import
2. Read the `invite` param
3. Modify `handleNext` to accept the invite and complete onboarding when invite token is present

Add to imports:
```tsx
import { useSearchParams } from 'next/navigation'
```

Inside the component:
```tsx
const searchParams = useSearchParams()
const inviteToken = searchParams.get('invite')
```

Replace the `handleNext` function:
```tsx
const handleNext = async () => {
  setSaving(true)

  if (!linkedinConnected) {
    toast.error("Connect LinkedIn to continue.")
    setSaving(false)
    return
  }

  try {
    if (inviteToken) {
      // Invite flow: accept invite, complete onboarding, go to dashboard
      const acceptRes = await fetch('/api/teams/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: inviteToken }),
      })

      const acceptResult = await acceptRes.json()

      if (!acceptRes.ok) {
        // Invite failed (expired, email mismatch, etc.) — still complete onboarding
        console.error('Invite accept failed:', acceptResult.error)
        toast.error(acceptResult.error || 'Failed to join team. You can try the invite link again.')
      } else {
        toast.success(`Joined ${acceptResult.team_name}!`)
      }

      // Mark onboarding as complete
      await completeOnboardingInDatabase()
      await refreshProfile()

      router.push('/dashboard')
    } else {
      // Normal flow: continue to step 2
      await updateOnboardingStepInDatabase(2)
      await refreshProfile()
      trackOnboardingStep(CURRENT_STEP, true)
      router.push('/onboarding/step2')
    }
  } catch (err) {
    console.error('Error in step 1:', err)
    toast.error('Failed to save progress. Please try again.')
    setSaving(false)
  }
}
```

Make sure `completeOnboardingInDatabase` is imported from `@/services/onboarding`:
```tsx
import { updateOnboardingStepInDatabase, completeOnboardingInDatabase } from '@/services/onboarding'
```

4. Update the button text when invite token is present:

Find the Next button and change its label:
```tsx
<Button onClick={handleNext} disabled={saving || !linkedinConnected}>
  {saving ? 'Saving...' : inviteToken ? 'Connect & Join Team' : 'Next'}
</Button>
```

- [ ] **Step 2: Commit**

```bash
git add app/onboarding/step1/page.tsx
git commit -m "feat(onboarding): auto-accept invite after LinkedIn connect"
```

---

## Task 5: Create "Member Joined Team" Email Template

**Files:**
- Create: `components/emails/member-joined-team.tsx`

- [ ] **Step 1: Create the email template**

Create `components/emails/member-joined-team.tsx` following the exact same pattern as `components/emails/team-invitation.tsx` (same imports, same style objects, same layout structure):

```tsx
/**
 * Member Joined Team Email
 * @description Sent to team owner when a new member joins their team
 * @module components/emails/member-joined-team
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface MemberJoinedTeamEmailProps {
  /** Name of the new member */
  memberName: string
  /** Email of the new member */
  memberEmail: string
  /** Name of the team */
  teamName: string
  /** Company name (if different from team) */
  companyName?: string
  /** Company logo URL */
  companyLogoUrl?: string
  /** Role assigned to the new member */
  role: 'admin' | 'member'
  /** Dashboard URL */
  dashboardUrl: string
}

/**
 * Email template notifying team owner that a new member joined
 */
export function MemberJoinedTeamEmail({
  memberName,
  memberEmail,
  teamName,
  companyName,
  companyLogoUrl,
  role,
  dashboardUrl,
}: MemberJoinedTeamEmailProps) {
  const previewText = `${memberName || memberEmail} has joined ${teamName}`
  const displayName = memberName || memberEmail

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            {companyLogoUrl ? (
              <Img src={companyLogoUrl} width="60" height="60" alt={companyName || teamName} style={companyLogo} />
            ) : (
              <div style={logoPlaceholder}>
                <Text style={logoPlaceholderText}>
                  {(companyName || teamName).charAt(0).toUpperCase()}
                </Text>
              </div>
            )}
          </Section>

          <Section style={contentSection}>
            <Heading style={heading}>New team member joined</Heading>

            <Text style={paragraph}>
              <strong>{displayName}</strong> has joined{' '}
              <strong>{teamName}</strong>
              {companyName && companyName !== teamName && (
                <> at <strong>{companyName}</strong></>
              )}{' '}
              as a <strong>{role}</strong>.
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={dashboardUrl}>
                Go to Dashboard
              </Button>
            </Section>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              This is an automated notification from ChainLinked.
            </Text>
            <Text style={footerLinks}>
              <Link href="https://chainlinked.ai" style={link}>ChainLinked</Link>
              {' | '}
              <Link href="https://chainlinked.ai/privacy" style={link}>Privacy Policy</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles (same as team-invitation.tsx)
const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 0 48px', marginBottom: '64px', borderRadius: '8px', border: '1px solid #e6ebf1' }
const logoSection = { padding: '32px 48px 0' }
const companyLogo = { borderRadius: '8px', objectFit: 'contain' as const }
const logoPlaceholder = { width: '60px', height: '60px', backgroundColor: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const logoPlaceholderText = { color: '#ffffff', fontSize: '24px', fontWeight: '700' as const, margin: '0', lineHeight: '60px', textAlign: 'center' as const }
const contentSection = { padding: '0 48px' }
const heading = { fontSize: '24px', fontWeight: '600' as const, color: '#1a1a1a', marginTop: '24px' }
const paragraph = { fontSize: '16px', lineHeight: '26px', color: '#4a4a4a' }
const buttonSection = { textAlign: 'center' as const, margin: '32px 0' }
const button = { backgroundColor: '#3b82f6', borderRadius: '8px', color: '#fff', fontSize: '16px', fontWeight: '600' as const, textDecoration: 'none', textAlign: 'center' as const, display: 'inline-block', padding: '12px 32px' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
const footer = { padding: '0 48px' }
const footerText = { fontSize: '12px', lineHeight: '16px', color: '#8898aa' }
const footerLinks = { fontSize: '12px', lineHeight: '16px', color: '#8898aa' }
const link = { color: '#3b82f6', textDecoration: 'underline' }
```

- [ ] **Step 2: Commit**

```bash
git add components/emails/member-joined-team.tsx
git commit -m "feat(email): add member-joined-team notification template"
```

---

## Task 6: Create "Post Published" Email Template

**Files:**
- Create: `components/emails/post-published.tsx`

- [ ] **Step 1: Create the email template**

Create `components/emails/post-published.tsx`:

```tsx
/**
 * Post Published Email
 * @description Sent to user when their scheduled post is published on LinkedIn
 * @module components/emails/post-published
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface PostPublishedEmailProps {
  /** User's name */
  userName: string
  /** First 200 chars of the post content */
  contentPreview: string
  /** When the post was published (formatted string) */
  publishedAt: string
  /** LinkedIn post URL (if available) */
  linkedinUrl?: string
  /** Dashboard URL */
  dashboardUrl: string
}

/**
 * Email template notifying user their scheduled post was published
 */
export function PostPublishedEmail({
  userName,
  contentPreview,
  publishedAt,
  linkedinUrl,
  dashboardUrl,
}: PostPublishedEmailProps) {
  const previewText = 'Your scheduled post was published on LinkedIn'

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <div style={logoPlaceholder}>
              <Text style={logoPlaceholderText}>C</Text>
            </div>
          </Section>

          <Section style={contentSection}>
            <Heading style={heading}>Your post is live!</Heading>

            <Text style={paragraph}>
              Hi {userName}, your scheduled post was published on LinkedIn.
            </Text>

            <Section style={previewBox}>
              <Text style={previewText_style}>{contentPreview}</Text>
              <Text style={timestampText}>Published {publishedAt}</Text>
            </Section>

            <Section style={buttonSection}>
              {linkedinUrl ? (
                <Button style={button} href={linkedinUrl}>
                  View on LinkedIn
                </Button>
              ) : (
                <Button style={button} href={dashboardUrl}>
                  Go to Dashboard
                </Button>
              )}
            </Section>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              This is an automated notification from ChainLinked.
            </Text>
            <Text style={footerLinks}>
              <Link href="https://chainlinked.ai" style={link}>ChainLinked</Link>
              {' | '}
              <Link href="https://chainlinked.ai/privacy" style={link}>Privacy Policy</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '0 auto', padding: '20px 0 48px', marginBottom: '64px', borderRadius: '8px', border: '1px solid #e6ebf1' }
const logoSection = { padding: '32px 48px 0' }
const logoPlaceholder = { width: '60px', height: '60px', backgroundColor: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const logoPlaceholderText = { color: '#ffffff', fontSize: '24px', fontWeight: '700' as const, margin: '0', lineHeight: '60px', textAlign: 'center' as const }
const contentSection = { padding: '0 48px' }
const heading = { fontSize: '24px', fontWeight: '600' as const, color: '#1a1a1a', marginTop: '24px' }
const paragraph = { fontSize: '16px', lineHeight: '26px', color: '#4a4a4a' }
const previewBox = { backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '16px', margin: '24px 0', border: '1px solid #e6ebf1' }
const previewText_style = { fontSize: '14px', lineHeight: '22px', color: '#4a4a4a', margin: '0', whiteSpace: 'pre-wrap' as const }
const timestampText = { fontSize: '12px', color: '#8898aa', marginTop: '8px', marginBottom: '0' }
const buttonSection = { textAlign: 'center' as const, margin: '32px 0' }
const button = { backgroundColor: '#3b82f6', borderRadius: '8px', color: '#fff', fontSize: '16px', fontWeight: '600' as const, textDecoration: 'none', textAlign: 'center' as const, display: 'inline-block', padding: '12px 32px' }
const hr = { borderColor: '#e6ebf1', margin: '20px 0' }
const footer = { padding: '0 48px' }
const footerText = { fontSize: '12px', lineHeight: '16px', color: '#8898aa' }
const footerLinks = { fontSize: '12px', lineHeight: '16px', color: '#8898aa' }
const link = { color: '#3b82f6', textDecoration: 'underline' }
```

- [ ] **Step 2: Commit**

```bash
git add components/emails/post-published.tsx
git commit -m "feat(email): add post-published notification template"
```

---

## Task 7: Send "Member Joined" Email to Team Owner

**Files:**
- Modify: `app/api/teams/accept-invite/route.ts`

- [ ] **Step 1: Add notification email to team owner after member joins**

In `app/api/teams/accept-invite/route.ts`, after the welcome email is sent to the new member (around line 252), add a notification to the team owner.

Add the import at the top of the file:
```tsx
import { MemberJoinedTeamEmail } from '@/components/emails/member-joined-team'
```

After the existing `sendEmail` call for the welcome email, add:

```tsx
// Notify team owner that a new member joined
try {
  const { data: ownerMember } = await adminClient
    .from('team_members')
    .select('user_id')
    .eq('team_id', invitation.team_id)
    .eq('role', 'owner')
    .single()

  if (ownerMember) {
    const { data: ownerProfile } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', ownerMember.user_id)
      .single()

    if (ownerProfile?.email) {
      await sendEmail({
        to: ownerProfile.email,
        subject: `${userProfile?.full_name || user.email} joined ${team?.name}`,
        react: MemberJoinedTeamEmail({
          memberName: userProfile?.full_name || '',
          memberEmail: user.email || '',
          teamName: team?.name || 'the team',
          companyName: company?.name,
          companyLogoUrl: company?.logo_url || team?.logo_url || undefined,
          role: invitation.role as 'admin' | 'member',
          dashboardUrl,
        }),
      })
    }
  }
} catch (emailErr) {
  // Non-fatal: member already joined, just log the error
  console.error('[accept-invite] Failed to notify owner:', emailErr)
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/teams/accept-invite/route.ts
git commit -m "feat(email): notify team owner when a new member joins"
```

---

## Task 8: Send "Post Published" Email After Scheduled Post Goes Live

**Files:**
- Modify: `lib/inngest/functions/publish-scheduled-posts.ts`

- [ ] **Step 1: Add email notification after successful post publication**

In `lib/inngest/functions/publish-scheduled-posts.ts`, add the import at the top:

```tsx
import { sendEmail } from '@/lib/email/resend'
import { PostPublishedEmail } from '@/components/emails/post-published'
```

After the success path where the post is marked as 'posted' and logged to `my_posts` (around line 177, before `return 'published' as const`), add:

```tsx
// Send notification email to post author
try {
  const { data: authorProfile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', post.user_id)
    .single()

  if (authorProfile?.email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://chainlinked.ai'
    const linkedinUrl = apiResult.linkedinPostUrn
      ? `https://www.linkedin.com/feed/update/${apiResult.linkedinPostUrn}`
      : undefined

    await sendEmail({
      to: authorProfile.email,
      subject: 'Your scheduled post was published on LinkedIn',
      react: PostPublishedEmail({
        userName: authorProfile.full_name || 'there',
        contentPreview: post.content.slice(0, 200) + (post.content.length > 200 ? '...' : ''),
        publishedAt: new Date().toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short',
        }),
        linkedinUrl,
        dashboardUrl: `${appUrl}/dashboard`,
      }),
    })
  }
} catch (emailErr) {
  // Non-fatal: post already published, just log
  console.error(`[PublishScheduled] Failed to send notification for post ${post.id}:`, emailErr)
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/inngest/functions/publish-scheduled-posts.ts
git commit -m "feat(email): notify user when scheduled post is published"
```

---

## Task 9: Build Verification

**Files:** All modified files

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Fix any TypeScript errors.

- [ ] **Step 2: Verify invite flow manually**

1. Open `/invite/some-token` while not logged in — should see "Create Account" button linking to `/signup?invite=some-token`
2. Go to `/signup?invite=test` — after signup, should redirect to `/onboarding?invite=test`
3. Go to `/onboarding?invite=test` — should skip role selection and go to step1 with invite param
4. On step1 with invite param — button should say "Connect & Join Team"

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build issues from invite flow and notification changes"
```
