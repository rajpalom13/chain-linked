/**
 * Resend Email Client
 * @description Centralized email sending functionality using Resend
 * @module lib/email/resend
 */

import { Resend } from 'resend'

/**
 * Resend client instance (lazily initialized)
 * Only created when actually needed to avoid build-time errors
 */
let resendClient: Resend | null = null

/**
 * Get or create the Resend client
 * @returns Resend client instance
 * @throws Error if RESEND_API_KEY is not set
 */
function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

/**
 * Default email configuration
 */
const DEFAULT_FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || 'team@chainlinked.io'
const DEFAULT_FROM_NAME = process.env.EMAIL_FROM_NAME || 'ChainLinked'

/**
 * Constructs the "from" email address
 * @returns Formatted from address
 */
export function getFromAddress(): string {
  return `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`
}

/**
 * Email sending options
 */
export interface SendEmailOptions {
  /** Recipient email address */
  to: string
  /** Email subject line */
  subject: string
  /** React component for email body */
  react?: React.ReactElement
  /** HTML content (alternative to react) */
  html?: string
  /** Plain text content (fallback) */
  text?: string
  /** Reply-to address (optional) */
  replyTo?: string
  /** CC recipients (optional) */
  cc?: string[]
  /** BCC recipients (optional) */
  bcc?: string[]
}

/**
 * Email send result
 */
export interface SendEmailResult {
  /** Whether the email was sent successfully */
  success: boolean
  /** Message ID from Resend (if successful) */
  messageId?: string
  /** Error message (if failed) */
  error?: string
}

/**
 * Send an email using Resend
 * @param options - Email sending options
 * @returns Result of the send operation
 * @example
 * const result = await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome to ChainLinked',
 *   react: WelcomeEmail({ name: 'John' }),
 * })
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, react, html, text, replyTo, cc, bcc } = options

  // Validate that we have at least one content type
  if (!react && !html && !text) {
    return {
      success: false,
      error: 'Email must have react, html, or text content',
    }
  }

  const fromAddr = getFromAddress()
  console.log(`[Email] Sending email:`)
  console.log(`[Email]   From: ${fromAddr}`)
  console.log(`[Email]   To: ${to}`)
  console.log(`[Email]   Subject: ${subject}`)
  console.log(`[Email]   Content type: ${react ? 'react' : html ? 'html' : 'text'}`)
  console.log(`[Email]   API key present: ${!!process.env.RESEND_API_KEY}`)
  console.log(`[Email]   API key prefix: ${process.env.RESEND_API_KEY?.slice(0, 10)}...`)

  try {
    const resend = getResendClient()
    const { data, error } = await resend.emails.send({
      from: fromAddr,
      to,
      subject,
      react,
      html,
      text,
      replyTo: replyTo,
      cc,
      bcc,
    })

    if (error) {
      console.error('[Email] Resend API error:', JSON.stringify(error, null, 2))
      return {
        success: false,
        error: error.message,
      }
    }

    console.log(`[Email] Sent successfully! Message ID: ${data?.id}`)
    return {
      success: true,
      messageId: data?.id,
    }
  } catch (err) {
    console.error('[Email] Exception during send:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error sending email',
    }
  }
}

/**
 * Send multiple emails in batch
 * @param emails - Array of email options
 * @returns Array of results for each email
 * @example
 * const results = await sendBatchEmails([
 *   { to: 'user1@example.com', subject: 'Hello', text: 'Hi!' },
 *   { to: 'user2@example.com', subject: 'Hello', text: 'Hi!' },
 * ])
 */
export async function sendBatchEmails(emails: SendEmailOptions[]): Promise<SendEmailResult[]> {
  const results = await Promise.all(emails.map(sendEmail))
  return results
}

/**
 * Resend client getter export for advanced usage
 */
export const resend = getResendClient
