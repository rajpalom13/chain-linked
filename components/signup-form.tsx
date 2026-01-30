"use client"

/**
 * Signup Form
 * @description Collects name and email for onboarding
 * @module components/signup-form
 */

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

/**
 * Props for SignupForm
 */
interface SignupFormProps {
  /** Prefilled full name */
  fullname?: string
  /** Prefilled email */
  email?: string
  /** Callback when values change */
  onChange?: (data: { fullname: string; email: string }) => void
  /** Optional error message */
  error?: string
}

/**
 * Signup form component
 * @param props - Component props
 * @returns Signup form JSX element
 */
export function SignupForm({
  fullname = "",
  email = "",
  onChange,
  error,
  ...props
}: SignupFormProps) {
  const [formData, setFormData] = useState({ fullname, email })

  useEffect(() => {
    setFormData({ fullname, email })
  }, [fullname, email])

  /**
   * Updates local state and notifies parent
   * @param event - Input change event
   */
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target
    const updatedData = {
      ...formData,
      [id === "name" ? "fullname" : "email"]: value,
    }
    setFormData(updatedData)
    onChange?.(updatedData)
  }

  useEffect(() => {
    onChange?.(formData)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Card {...props} className="bg-transparent border-none shadow-none">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to continue onboarding.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                required
                value={formData.fullname}
                onChange={handleChange}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={formData.email}
                onChange={handleChange}
              />
              <FieldDescription>
                We&apos;ll use this to personalize your experience.
              </FieldDescription>
              {error ? (
                <p className="text-sm text-red-500 mt-1" role="alert">
                  {error}
                </p>
              ) : null}
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
