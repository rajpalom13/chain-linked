/**
 * Forgot Password Page
 * @description Password reset request page with branded design matching login
 * @module app/forgot-password
 */

'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IconLoader2, IconMail, IconArrowLeft, IconCheck, IconMailForward, IconShieldLock } from '@tabler/icons-react'
import { toast } from 'sonner'

/**
 * Inner forgot password form that uses useSearchParams
 * @returns Forgot password form JSX
 */
function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const searchParams = useSearchParams()

  // Show error from query params (e.g., redirected from expired recovery link)
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      toast.error(errorParam)
    }
  }, [searchParams])

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  /**
   * Handle password reset request
   */
  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to send reset email')
        setIsLoading(false)
        return
      }

      setEmailSent(true)
      setCountdown(60)
      toast.success('Check your email for the reset link')
    } catch (error) {
      console.error('Password reset error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle resending the reset email
   */
  const handleResend = async () => {
    if (countdown > 0) return
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to resend email')
      } else {
        setCountdown(60)
        toast.success('Reset link resent!')
      }
    } catch (error) {
      console.error('Resend error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

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
        className="w-full max-w-lg"
      >
        <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-xl">
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
              <AnimatePresence mode="wait">
                {emailSent ? (
                  <motion.div
                    key="sent"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                      Check your inbox
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                      >
                        <IconMailForward className="size-5 text-primary" />
                      </motion.span>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      We sent a password reset link to
                    </CardDescription>
                    <p className="text-sm font-medium text-foreground mt-1">{email}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                      Reset your password
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 400 }}
                      >
                        <IconShieldLock className="size-5 text-primary" />
                      </motion.span>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Enter your email and we&apos;ll send you a link to reset your password
                    </CardDescription>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-6 px-8 pb-8">
            <AnimatePresence mode="wait">
              {emailSent ? (
                <motion.div
                  key="success"
                  className="space-y-5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Email sent confirmation */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <IconCheck className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Email sent successfully</p>
                        <p className="text-xs text-muted-foreground">
                          Click the link in the email to reset your password. The link expires in 1 hour.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    Didn&apos;t receive it? Check your spam folder or try resending.
                  </p>

                  {/* Resend button with cooldown */}
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Button
                      variant="outline"
                      className="w-full h-11 border-border/50 hover:bg-accent/50 transition-all duration-200"
                      onClick={handleResend}
                      disabled={isLoading || countdown > 0}
                    >
                      {isLoading ? (
                        <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <IconMail className="mr-2 h-4 w-4" />
                      )}
                      {countdown > 0 ? `Resend in ${countdown}s` : 'Resend reset link'}
                    </Button>
                  </motion.div>

                  {/* Try different email */}
                  <Button
                    variant="ghost"
                    className="w-full hover:bg-accent/50 transition-all duration-200 text-muted-foreground"
                    onClick={() => {
                      setEmailSent(false)
                      setCountdown(0)
                    }}
                  >
                    Use a different email address
                  </Button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </div>

                  <Link href="/login" className="block">
                    <Button variant="ghost" className="w-full hover:bg-accent/50 transition-all duration-200">
                      <IconArrowLeft className="mr-2 h-4 w-4" />
                      Back to sign in
                    </Button>
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  className="space-y-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                >
                  {/* Email form */}
                  <form onSubmit={handleResetRequest} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        autoComplete="email"
                        autoFocus
                        required
                        className="h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Button
                        type="submit"
                        className="w-full h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <IconMail className="mr-2 h-4 w-4" />
                        )}
                        Send Reset Link
                      </Button>
                    </motion.div>
                  </form>

                  {/* Divider */}
                  <motion.div
                    className="relative"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                  >
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">or</span>
                    </div>
                  </motion.div>

                  {/* Back to login */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                  >
                    <Link href="/login" className="block">
                      <Button variant="outline" className="w-full h-11 border-border/50 hover:bg-accent/50 transition-all duration-200">
                        <IconArrowLeft className="mr-2 h-4 w-4" />
                        Back to sign in
                      </Button>
                    </Link>
                  </motion.div>

                  {/* Help text */}
                  <motion.p
                    className="text-xs text-center text-muted-foreground"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7, duration: 0.3 }}
                  >
                    Remember your password?{' '}
                    <Link href="/login" className="text-primary hover:underline font-medium transition-colors">
                      Sign in
                    </Link>
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

/**
 * Forgot password page component
 * Wraps the form in Suspense for useSearchParams compatibility
 * @returns Forgot password page JSX
 */
export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  )
}
