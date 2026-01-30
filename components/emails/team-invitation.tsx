/**
 * Team Invitation Email Template
 * @description React Email template for team invitations
 * @module components/emails/team-invitation
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

/**
 * Props for the TeamInvitationEmail component
 */
export interface TeamInvitationEmailProps {
  /** Name of the person who sent the invitation */
  inviterName: string
  /** Email of the inviter (fallback if name not available) */
  inviterEmail: string
  /** Name of the team */
  teamName: string
  /** Name of the company (optional) */
  companyName?: string
  /** Company logo URL (optional) */
  companyLogoUrl?: string
  /** Role being offered */
  role: 'admin' | 'member'
  /** Full invitation link */
  inviteLink: string
  /** Expiration date string */
  expiresAt: string
}

/**
 * Team Invitation Email Component
 *
 * Email template for inviting users to join a team.
 * Uses React Email components for cross-client compatibility.
 *
 * @param props - Email template props
 * @returns Email template JSX
 * @example
 * <TeamInvitationEmail
 *   inviterName="John Doe"
 *   inviterEmail="john@example.com"
 *   teamName="Marketing Team"
 *   companyName="Acme Inc"
 *   role="member"
 *   inviteLink="https://app.chainlinked.io/invite/abc123"
 *   expiresAt="February 1, 2025"
 * />
 */
export function TeamInvitationEmail({
  inviterName,
  inviterEmail,
  teamName,
  companyName,
  companyLogoUrl,
  role,
  inviteLink,
  expiresAt,
}: TeamInvitationEmailProps) {
  const previewText = `${inviterName || inviterEmail} invited you to join ${teamName} on ChainLinked`
  const displayName = inviterName || inviterEmail
  const roleDescription = role === 'admin'
    ? 'As an Admin, you will be able to invite members and manage team settings.'
    : 'As a Member, you will be able to collaborate on content and view team analytics.'

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with logo */}
          <Section style={logoSection}>
            {companyLogoUrl ? (
              <Img
                src={companyLogoUrl}
                width="60"
                height="60"
                alt={companyName || teamName}
                style={companyLogo}
              />
            ) : (
              <div style={logoPlaceholder}>
                <Text style={logoPlaceholderText}>
                  {(companyName || teamName).charAt(0).toUpperCase()}
                </Text>
              </div>
            )}
          </Section>

          {/* Main content */}
          <Section style={contentSection}>
            <Heading style={heading}>
              You have been invited to join {teamName}
            </Heading>

            <Text style={paragraph}>
              <strong>{displayName}</strong> has invited you to join{' '}
              <strong>{teamName}</strong>
              {companyName && companyName !== teamName && (
                <> at <strong>{companyName}</strong></>
              )}{' '}
              on ChainLinked.
            </Text>

            <Section style={roleBox}>
              <Text style={roleTitle}>Your role: {role === 'admin' ? 'Admin' : 'Member'}</Text>
              <Text style={roleDescriptionText}>{roleDescription}</Text>
            </Section>

            <Section style={buttonSection}>
              <Button style={button} href={inviteLink}>
                Accept Invitation
              </Button>
            </Section>

            <Text style={paragraphSmall}>
              This invitation will expire on <strong>{expiresAt}</strong>.
            </Text>

            <Text style={paragraphSmall}>
              If you were not expecting this invitation, you can safely ignore this email.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent by ChainLinked on behalf of {displayName}.
            </Text>
            <Text style={footerText}>
              If you have questions, please contact the person who invited you.
            </Text>
            <Text style={footerLinks}>
              <Link href="https://chainlinked.io" style={link}>
                ChainLinked
              </Link>
              {' | '}
              <Link href="https://chainlinked.io/privacy" style={link}>
                Privacy Policy
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

/**
 * Default export for Resend compatibility
 */
export default TeamInvitationEmail

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  maxWidth: '600px',
}

const logoSection = {
  padding: '32px 40px 0',
  textAlign: 'center' as const,
}

const companyLogo = {
  borderRadius: '8px',
  margin: '0 auto',
}

const logoPlaceholder = {
  width: '60px',
  height: '60px',
  borderRadius: '8px',
  backgroundColor: '#0077b5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
}

const logoPlaceholderText = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: 0,
  lineHeight: '60px',
  textAlign: 'center' as const,
}

const contentSection = {
  padding: '24px 40px',
}

const heading = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '16px 0 24px',
  textAlign: 'center' as const,
}

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 20px',
  textAlign: 'center' as const,
}

const paragraphSmall = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 12px',
  textAlign: 'center' as const,
}

const roleBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '24px 0',
}

const roleTitle = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px',
  textAlign: 'center' as const,
}

const roleDescriptionText = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: 0,
  textAlign: 'center' as const,
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#0077b5',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
}

const footer = {
  padding: '0 40px',
}

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}

const footerLinks = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '16px 0 0',
  textAlign: 'center' as const,
}

const link = {
  color: '#0077b5',
  textDecoration: 'underline',
}
