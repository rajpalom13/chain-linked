/**
 * Email Verification Page
 * @description Displayed after signup to prompt user to check their email for a verification link
 * @module app/verify-email
 */

'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { IconMail, IconMailForward, IconLoader2, IconArrowLeft } from '@tabler/icons-react'
import { toast } from 'sonner'

/**
 * Inner verify email content that uses useSearchParams
 * @returns Verify email card JSX
 */
function VerifyEmailContent() {
  const [isResending, setIsResending] = useState(false)
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  /**
   * Handle resending the verification email via the existing API endpoint
   */
  const handleResendVerification = async () => {
    const targetEmail = email || window.prompt('Enter your email address:')
    if (!targetEmail) return

    setIsResending(true)
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to resend verification email')
      } else {
        toast.success(data.message || 'Verification email sent! Please check your inbox.')
      }
    } catch (err) {
      console.error('Resend verification error:', err)
      toast.error('Failed to resend verification email')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Card className="w-full max-w-lg border-border/50 bg-card/95 backdrop-blur-sm shadow-xl">
      <CardHeader className="text-center space-y-4 px-8 pb-2">
        <motion.div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 shadow-sm"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
        >
          <Image src="/logo.png" alt="ChainLinked" width={32} height={32} className="size-8" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <CardTitle className="text-2xl font-bold">
            Your email address is not verified
          </CardTitle>
          <CardDescription className="mt-2">
            Please verify your email address to continue
          </CardDescription>
        </motion.div>
      </CardHeader>

      <CardContent className="space-y-8 px-8 pb-8">
        {/* Mail icon and message */}
        <motion.div
          className="flex flex-col items-center gap-4 py-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <motion.div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <IconMail className="h-10 w-10 text-primary" />
          </motion.div>

          <p className="text-sm text-muted-foreground text-center max-w-xs">
            We&apos;ve sent a verification link to your email address. Please check your inbox and click the link to verify your account.
          </p>

          {email && (
            <p className="text-sm text-muted-foreground text-center">
              Sent to <span className="font-medium text-foreground">{email}</span>
            </p>
          )}
        </motion.div>

        {/* Resend button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <Button
            variant="outline"
            className="w-full h-11 border-border/50 hover:bg-accent/50 transition-all duration-200"
            onClick={handleResendVerification}
            disabled={isResending}
          >
            {isResending ? (
              <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <IconMailForward className="mr-2 h-4 w-4" />
            )}
            Resend verification email
          </Button>
        </motion.div>

        {/* Back to login link */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium transition-colors"
          >
            <IconArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </motion.div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for verify email page
 */
function VerifyEmailSkeleton() {
  return (
    <Card className="w-full max-w-lg border-border/50 bg-card/95 backdrop-blur-sm shadow-xl">
      <CardHeader className="text-center space-y-4 px-8 pb-2">
        <Skeleton className="mx-auto h-14 w-14 rounded-full" />
        <Skeleton className="mx-auto h-8 w-64" />
        <Skeleton className="mx-auto h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-8 px-8 pb-8">
        <div className="flex flex-col items-center gap-4 py-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-11 w-full" />
      </CardContent>
    </Card>
  )
}

/**
 * Email verification page component
 * @description Shows a confirmation message after signup, with an option to resend the verification email
 * @returns Email verification page JSX
 */
export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-secondary/10 via-transparent to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Suspense fallback={<VerifyEmailSkeleton />}>
          <VerifyEmailContent />
        </Suspense>
      </motion.div>
    </div>
  )
}
