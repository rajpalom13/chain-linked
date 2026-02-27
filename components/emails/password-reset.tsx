/**
 * Password Reset Email Template
 * @description React Email template for password reset requests
 * @module components/emails/password-reset
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
 * Props for the PasswordResetEmail component
 */
export interface PasswordResetEmailProps {
  /** User's email address */
  email: string
  /** Full password reset link */
  resetLink: string
  /** Expiration time in hours */
  expiresInHours?: number
}

/**
 * Password Reset Email Component
 * @param props - Email template props
 * @returns Email template JSX
 */
export function PasswordResetEmail({
  email,
  resetLink,
  expiresInHours = 1,
}: PasswordResetEmailProps) {
  const previewText = 'Reset your ChainLinked password'
  const displayName = email.split('@')[0]

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <div style={logoPlaceholder}>
              <Text style={logoPlaceholderText}>CL</Text>
            </div>
          </Section>

          <Section style={contentSection}>
            <Heading style={heading}>Reset your password</Heading>

            <Text style={paragraph}>
              Hi <strong>{displayName}</strong>,
            </Text>

            <Text style={paragraph}>
              We received a request to reset your password for your ChainLinked account.
              Click the button below to set a new password.
            </Text>

            <Section style={buttonSection}>
              <Button style={button} href={resetLink}>
                Reset Password
              </Button>
            </Section>

            <Text style={paragraphSmall}>
              This link will expire in <strong>{expiresInHours} hour{expiresInHours > 1 ? 's' : ''}</strong>.
            </Text>

            <Section style={linkBox}>
              <Text style={linkBoxTitle}>Or copy and paste this link:</Text>
              <Text style={linkText}>{resetLink}</Text>
            </Section>

            <Text style={paragraphSmall}>
              If you did not request a password reset, you can safely ignore this email.
              Your password will remain unchanged.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              This email was sent to {email} because a password reset was requested for your ChainLinked account.
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

export default PasswordResetEmail

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
