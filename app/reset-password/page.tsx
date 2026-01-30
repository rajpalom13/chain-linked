/**
 * Reset Password Page
 * @description Password reset form for users with reset token
 * @module app/reset-password
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IconLoader2, IconLink, IconLock, IconCheck } from '@tabler/icons-react'
import { toast } from 'sonner'

/**
 * Reset password page component
 * @returns Reset password page JSX
 */
export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const router = useRouter()

  /**
   * Calculate password strength
   * @param pwd - Password to evaluate
   * @returns strength score (0-4) and label
   */
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: '', color: '' }

    let score = 0

    // Length check
    if (pwd.length >= 6) score++
    if (pwd.length >= 10) score++

    // Has uppercase and lowercase
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++

    // Has numbers
    if (/\d/.test(pwd)) score++

    // Has special characters
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    // Map score to strength label
    const strengthMap = {
      0: { label: '', color: '' },
      1: { label: 'Weak', color: 'bg-destructive' },
      2: { label: 'Fair', color: 'bg-yellow-500' },
      3: { label: 'Good', color: 'bg-primary' },
      4: { label: 'Strong', color: 'bg-green-600' },
      5: { label: 'Very Strong', color: 'bg-green-600' },
    }

    return { score, ...strengthMap[Math.min(score, 5) as keyof typeof strengthMap] }
  }

  const passwordStrength = getPasswordStrength(password)

  // Check if user has a valid session (from reset link)
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setHasSession(!!session)
    }
    checkSession()
  }, [])

  /**
   * Handle password update
   */
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password) {
      toast.error('Please enter a new password')
      return
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        console.error('Password update error:', error)
        toast.error(error.message || 'Failed to update password')
        setIsLoading(false)
        return
      }

      setIsSuccess(true)
      toast.success('Password updated successfully')
    } catch (error) {
      console.error('Password update error:', error)
      toast.error('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <IconCheck className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Password updated</CardTitle>
              <CardDescription className="mt-2">
                Your password has been successfully updated
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => router.push('/dashboard')}
            >
              Continue to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <IconLock className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Invalid or expired link</CardTitle>
              <CardDescription className="mt-2">
                This password reset link is invalid or has expired
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/forgot-password" className="block">
              <Button className="w-full">
                Request a new reset link
              </Button>
            </Link>
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full">
                Back to sign in
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <IconLink className="h-8 w-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
            <CardDescription className="mt-2">
              Enter your new password below
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
                required
                minLength={6}
              />
              {password && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                          i < passwordStrength.score
                            ? passwordStrength.color
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.label && (
                    <p className="text-xs text-muted-foreground">
                      Password strength: <span className="font-medium">{passwordStrength.label}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <IconLock className="mr-2 h-4 w-4" />
              )}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
