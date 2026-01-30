/**
 * Email Verification Email Template
 * @description React Email template for account verification
 * @module components/emails/email-verification
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

/**
 * Props for the EmailVerificationEmail component
 */
export interface EmailVerificationEmailProps {
  /** User's name (optional) */
  userName?: string
  /** User's email address */
  email: string
  /** Full verification link */
  verificationLink: string
  /** Expiration time in hours */
  expiresInHours?: number
}

/**
 * Email Verification Email Component
 *
 * Email template for verifying user email addresses.
 * Uses React Email components for cross-client compatibility.
 *
 * @param props - Email template props
 * @returns Email template JSX
 * @example
 * <EmailVerificationEmail
 *   userName="John"
 *   email="john@example.com"
 *   verificationLink="https://app.chainlinked.io/api/auth/callback?code=abc123"
 *   expiresInHours={24}
 * />
 */
export function EmailVerificationEmail({
  userName,
  email,
  verificationLink,
  expiresInHours = 24,
}: EmailVerificationEmailProps) {
  const previewText = `Verify your email address for ChainLinked`
  const displayName = userName || email.split('@')[0]

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with logo */}
          <Section style={logoSection}>
            <div style={logoPlaceholder}>
              <Text style={logoPlaceholderText}>CL</Text>
            </div>
          </Section>

          {/* Main content */}
          <Section style={contentSection}>
            <Heading style={heading}>
              Verify your email address
            </Heading>

            <Text style={paragraph}>
              Hi <strong>{displayName}</strong>,
            </Text>

            <Text style={paragraph}>
              Thanks for signing up for ChainLinked! Please verify your email address
              by clicking the button below.
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={verificationLink}>
                Verify Email Address
              </Button>
            </Section>

            <Text style={paragraphSmall}>
              This link will expire in <strong>{expiresInHours} hours</strong>.
            </Text>

            <Section style={linkBox}>
              <Text style={linkBoxTitle}>Or copy and paste this link:</Text>
              <Text style={linkText}>{verificationLink}</Text>
            </Section>

            <Text style={paragraphSmall}>
              If you did not create an account with ChainLinked, you can safely ignore this email.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This email was sent to {email} because you signed up for ChainLinked.
            </Text>
            <Text style={footerLinks}>
              <Link href="https://chainlinked.io" style={link}>
                ChainLinked
              </Link>
              {' | '}
              <Link href="https://chainlinked.io/privacy" style={link}>
                Privacy Policy
              </Link>
              {' | '}
              <Link href="https://chainlinked.io/terms" style={link}>
                Terms of Service
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
export default EmailVerificationEmail

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

const logoPlaceholder = {
  width: '60px',
  height: '60px',
  borderRadius: '12px',
  backgroundColor: '#0077b5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  margin: '0 auto',
}

const logoPlaceholderText = {
  color: '#ffffff',
  fontSize: '20px',
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
  margin: '0 0 16px',
}

const paragraphSmall = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 12px',
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

const linkBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '24px 0',
}

const linkBoxTitle = {
  color: '#525f7f',
  fontSize: '12px',
  fontWeight: '600',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}

const linkText = {
  color: '#0077b5',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: 0,
  textAlign: 'center' as const,
  wordBreak: 'break-all' as const,
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
