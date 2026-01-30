/**
 * Welcome to Team Email Template
 * @description React Email template sent after accepting team invitation
 * @module components/emails/welcome-to-team
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
 * Props for the WelcomeToTeamEmail component
 */
export interface WelcomeToTeamEmailProps {
  /** Name of the new team member */
  memberName: string
  /** Email of the new team member (fallback) */
  memberEmail: string
  /** Name of the team */
  teamName: string
  /** Name of the company (optional) */
  companyName?: string
  /** Company logo URL (optional) */
  companyLogoUrl?: string
  /** Role assigned */
  role: 'admin' | 'member'
  /** Dashboard URL */
  dashboardUrl: string
}

/**
 * Welcome to Team Email Component
 *
 * Email template sent to users after they accept a team invitation.
 * Provides onboarding information and next steps.
 *
 * @param props - Email template props
 * @returns Email template JSX
 * @example
 * <WelcomeToTeamEmail
 *   memberName="Jane Smith"
 *   memberEmail="jane@example.com"
 *   teamName="Marketing Team"
 *   companyName="Acme Inc"
 *   role="member"
 *   dashboardUrl="https://app.chainlinked.io/dashboard"
 * />
 */
export function WelcomeToTeamEmail({
  memberName,
  memberEmail,
  teamName,
  companyName,
  companyLogoUrl,
  role,
  dashboardUrl,
}: WelcomeToTeamEmailProps) {
  const displayName = memberName || memberEmail.split('@')[0]
  const previewText = `Welcome to ${teamName} on ChainLinked!`

  const nextSteps = [
    {
      title: 'Explore the Dashboard',
      description: 'Get familiar with analytics, scheduling, and content tools.',
    },
    {
      title: 'Connect Your LinkedIn',
      description: 'Link your LinkedIn account to start posting and tracking performance.',
    },
    {
      title: 'Check Team Activity',
      description: "See what your teammates are posting and how content is performing.",
    },
  ]

  if (role === 'admin') {
    nextSteps.push({
      title: 'Invite More Teammates',
      description: 'Help grow your team by inviting colleagues to join.',
    })
  }

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

          {/* Welcome message */}
          <Section style={contentSection}>
            <Heading style={heading}>
              Welcome to {teamName}!
            </Heading>

            <Text style={paragraph}>
              Hi {displayName},
            </Text>

            <Text style={paragraph}>
              You have successfully joined <strong>{teamName}</strong>
              {companyName && companyName !== teamName && (
                <> at <strong>{companyName}</strong></>
              )}
              ! You are now part of the team and can start collaborating on LinkedIn content.
            </Text>

            <Section style={roleBox}>
              <Text style={roleTitle}>
                Your role: {role === 'admin' ? 'Admin' : 'Member'}
              </Text>
              <Text style={roleDescriptionText}>
                {role === 'admin'
                  ? 'You can invite new members, manage team settings, and access all team features.'
                  : 'You can collaborate on content, view analytics, and participate in team activities.'}
              </Text>
            </Section>
          </Section>

          {/* Next steps */}
          <Section style={stepsSection}>
            <Text style={stepsTitle}>Get Started</Text>
            {nextSteps.map((step, index) => (
              <Section key={index} style={stepItem}>
                <Text style={stepNumber}>{index + 1}</Text>
                <Section style={stepContent}>
                  <Text style={stepItemTitle}>{step.title}</Text>
                  <Text style={stepItemDescription}>{step.description}</Text>
                </Section>
              </Section>
            ))}
          </Section>

          {/* CTA Button */}
          <Section style={buttonSection}>
            <Button style={button} href={dashboardUrl}>
              Go to Dashboard
            </Button>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Need help? Check out our{' '}
              <Link href="https://chainlinked.io/help" style={link}>
                Help Center
              </Link>{' '}
              or reach out to your team admin.
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
export default WelcomeToTeamEmail

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
  fontSize: '28px',
  fontWeight: '600',
  lineHeight: '1.3',
  margin: '16px 0 24px',
  textAlign: 'center' as const,
}

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const roleBox = {
  backgroundColor: '#e8f5e9',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '24px 0',
  borderLeft: '4px solid #4caf50',
}

const roleTitle = {
  color: '#2e7d32',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 4px',
}

const roleDescriptionText = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: 0,
}

const stepsSection = {
  padding: '0 40px 24px',
}

const stepsTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 16px',
}

const stepItem = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '16px',
}

const stepNumber = {
  backgroundColor: '#0077b5',
  color: '#ffffff',
  borderRadius: '50%',
  width: '24px',
  height: '24px',
  fontSize: '12px',
  fontWeight: '600',
  textAlign: 'center' as const,
  lineHeight: '24px',
  marginRight: '12px',
  flexShrink: 0,
}

const stepContent = {
  flex: 1,
}

const stepItemTitle = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 2px',
}

const stepItemDescription = {
  color: '#525f7f',
  fontSize: '14px',
  lineHeight: '1.4',
  margin: 0,
}

const buttonSection = {
  textAlign: 'center' as const,
  padding: '0 40px 32px',
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
  margin: '0 40px 32px',
}

const footer = {
  padding: '0 40px',
}

const footerText = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}

const footerLinks = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: 0,
  textAlign: 'center' as const,
}

const link = {
  color: '#0077b5',
  textDecoration: 'underline',
}
