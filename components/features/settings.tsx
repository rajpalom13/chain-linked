"use client"

import Image from "next/image"

import * as React from "react"
import {
  IconAlertCircle,
  IconBell,
  IconBrandLinkedin,
  IconCamera,
  IconCheck,
  IconCookie,
  IconEye,
  IconEyeOff,
  IconKey,
  IconLoader2,
  IconMail,
  IconPalette,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconUser,
  IconUsers,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * Team member role type
 */
type TeamMemberRole = "owner" | "admin" | "member"

/**
 * Team member data structure
 */
interface TeamMember {
  /** Unique identifier for the team member */
  id: string
  /** Display name of the team member */
  name: string
  /** Email address of the team member */
  email: string
  /** Role within the team */
  role: TeamMemberRole
  /** Optional avatar image URL */
  avatarUrl?: string
}

/**
 * User profile data structure
 */
interface UserProfile {
  /** User's display name */
  name: string
  /** User's email address */
  email: string
  /** Optional avatar image URL */
  avatarUrl?: string
}

/**
 * Props for the Settings component
 */
export interface SettingsProps {
  /** Current user profile information */
  user?: UserProfile
  /** Whether LinkedIn account is connected */
  linkedinConnected?: boolean
  /** List of team members */
  teamMembers?: TeamMember[]
  /** Callback fired when settings are saved with the settings object */
  onSave?: (settings: Record<string, unknown>) => void
}

/**
 * Default user profile when none is provided
 */
const DEFAULT_USER: UserProfile = {
  name: "John Doe",
  email: "john.doe@example.com",
  avatarUrl: undefined,
}

/**
 * Default team members when none are provided
 */
const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@example.com",
    role: "owner",
    avatarUrl: undefined,
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    role: "admin",
    avatarUrl: undefined,
  },
  {
    id: "3",
    name: "Bob Wilson",
    email: "bob.wilson@example.com",
    role: "member",
    avatarUrl: undefined,
  },
]

/**
 * Notification preferences state structure
 */
interface NotificationPreferences {
  emailNotifications: boolean
  postPublished: boolean
  postScheduled: boolean
  weeklyDigest: boolean
  teamActivity: boolean
  systemUpdates: boolean
}

/**
 * Brand kit state structure
 */
interface BrandKit {
  primaryColor: string
  secondaryColor: string
  logoUrl?: string
}

/**
 * Gets initials from a name string
 * @param name - Full name to extract initials from
 * @returns Up to 2 character initials
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Maps role to badge variant and display text
 * @param role - Team member role
 * @returns Object with variant and label
 */
function getRoleBadgeProps(role: TeamMemberRole): {
  variant: "default" | "secondary" | "outline"
  label: string
} {
  switch (role) {
    case "owner":
      return { variant: "default", label: "Owner" }
    case "admin":
      return { variant: "secondary", label: "Admin" }
    case "member":
      return { variant: "outline", label: "Member" }
  }
}

/**
 * A comprehensive settings screen with tabbed navigation for managing
 * user profile, LinkedIn connection, API keys, brand kit, team, and notifications.
 *
 * Features:
 * - 6 organized tabs for different setting categories
 * - Profile management with avatar upload placeholder
 * - LinkedIn connection status and refresh functionality
 * - Secure API key management with masked input
 * - Brand kit customization with color pickers
 * - Team member management with role assignment
 * - Notification toggle preferences
 *
 * @example
 * ```tsx
 * // Basic usage with defaults
 * <Settings />
 *
 * // With user data and callbacks
 * <Settings
 *   user={{
 *     name: "Jane Doe",
 *     email: "jane@example.com",
 *     avatarUrl: "/avatars/jane.jpg"
 *   }}
 *   linkedinConnected={true}
 *   teamMembers={[
 *     { id: "1", name: "Jane Doe", email: "jane@example.com", role: "owner" }
 *   ]}
 *   onSave={(settings) => console.log("Settings saved:", settings)}
 * />
 * ```
 */
export function Settings({
  user = DEFAULT_USER,
  linkedinConnected = false,
  teamMembers = DEFAULT_TEAM_MEMBERS,
  onSave,
}: SettingsProps) {
  // Profile state
  const [profileName, setProfileName] = React.useState(user.name)
  const [profileEmail, setProfileEmail] = React.useState(user.email)

  // LinkedIn state
  const [isRefreshingLinkedIn, setIsRefreshingLinkedIn] = React.useState(false)
  const [cookieStatus, setCookieStatus] = React.useState<"valid" | "expired" | "missing">(
    linkedinConnected ? "valid" : "missing"
  )

  // API Keys state
  const [openaiKey, setOpenaiKey] = React.useState("")
  const [apiKeyError, setApiKeyError] = React.useState<string | null>(null)
  const [showApiKey, setShowApiKey] = React.useState(false)
  const [hasApiKey, setHasApiKey] = React.useState(false)

  // Brand Kit state
  const [brandKit, setBrandKit] = React.useState<BrandKit>({
    primaryColor: "#0066cc",
    secondaryColor: "#00aa55",
    logoUrl: undefined,
  })

  // Team state
  const [members, setMembers] = React.useState<TeamMember[]>(teamMembers)

  // Notifications state
  const [notifications, setNotifications] = React.useState<NotificationPreferences>({
    emailNotifications: true,
    postPublished: true,
    postScheduled: true,
    weeklyDigest: false,
    teamActivity: true,
    systemUpdates: true,
  })

  // Saving state
  const [isSaving, setIsSaving] = React.useState(false)

  /**
   * Handles refreshing the LinkedIn connection
   */
  const handleRefreshLinkedIn = async () => {
    setIsRefreshingLinkedIn(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setCookieStatus("valid")
    setIsRefreshingLinkedIn(false)
  }

  /**
   * Handles saving the API key with validation
   */
  const handleSaveApiKey = () => {
    const key = openaiKey.trim()

    // Validate OpenAI API key format (sk-... or sk-proj-...)
    if (!key) {
      setApiKeyError("API key is required")
      return
    }

    if (!key.startsWith("sk-")) {
      setApiKeyError("Invalid API key format. OpenAI keys start with 'sk-'")
      return
    }

    if (key.length < 20) {
      setApiKeyError("API key appears to be too short")
      return
    }

    // Clear any previous errors and save
    setApiKeyError(null)
    setHasApiKey(true)
    setShowApiKey(false)
  }

  /**
   * Handles deleting the API key
   */
  const handleDeleteApiKey = () => {
    setOpenaiKey("")
    setHasApiKey(false)
  }

  /**
   * Handles updating a team member's role
   */
  const handleUpdateRole = (memberId: string, newRole: TeamMemberRole) => {
    setMembers((prev) =>
      prev.map((member) =>
        member.id === memberId ? { ...member, role: newRole } : member
      )
    )
  }

  /**
   * Handles saving all settings
   */
  const handleSave = async (section: string) => {
    setIsSaving(true)

    const settings: Record<string, unknown> = {
      section,
      timestamp: new Date().toISOString(),
    }

    switch (section) {
      case "profile":
        settings.profile = { name: profileName, email: profileEmail }
        break
      case "linkedin":
        settings.linkedin = { connected: linkedinConnected, cookieStatus }
        break
      case "apiKeys":
        settings.apiKeys = { openaiConfigured: hasApiKey }
        break
      case "brandKit":
        settings.brandKit = brandKit
        break
      case "team":
        settings.team = { members }
        break
      case "notifications":
        settings.notifications = notifications
        break
    }

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800))
    onSave?.(settings)
    setIsSaving(false)
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-1 mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <IconUser className="size-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="gap-2">
            <IconBrandLinkedin className="size-4" />
            LinkedIn
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-2">
            <IconKey className="size-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="brand-kit" className="gap-2">
            <IconPalette className="size-4" />
            Brand Kit
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <IconUsers className="size-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <IconBell className="size-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your personal information and avatar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-4">
                <Avatar className="size-20">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={profileName} />
                  ) : null}
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {getInitials(profileName)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm">
                    <IconCamera className="size-4" />
                    Upload Photo
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max size 2MB.
                  </p>
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="profile-name">Display Name</Label>
                <Input
                  id="profile-name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email Address</Label>
                <div className="relative">
                  <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="profile-email"
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => handleSave("profile")} disabled={isSaving}>
                  {isSaving ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconCheck className="size-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LinkedIn Tab */}
        <TabsContent value="linkedin">
          <Card>
            <CardHeader>
              <CardTitle>LinkedIn Connection</CardTitle>
              <CardDescription>
                Manage your LinkedIn account connection and authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "size-10 rounded-full flex items-center justify-center",
                      linkedinConnected ? "bg-[#0077b5]" : "bg-muted"
                    )}
                  >
                    <IconBrandLinkedin
                      className={cn(
                        "size-6",
                        linkedinConnected ? "text-white" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div>
                    <p className="font-medium">LinkedIn Account</p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={linkedinConnected ? "default" : "destructive"}
                        className={cn(
                          linkedinConnected && "bg-green-600 hover:bg-green-600"
                        )}
                      >
                        {linkedinConnected ? "Connected" : "Not Connected"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant={linkedinConnected ? "outline" : "default"}
                  onClick={handleRefreshLinkedIn}
                  disabled={isRefreshingLinkedIn}
                >
                  {isRefreshingLinkedIn ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconRefresh className="size-4" />
                  )}
                  {linkedinConnected ? "Refresh" : "Connect"}
                </Button>
              </div>

              {/* Cookie Status */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                    <IconCookie className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Authentication Cookie</p>
                    <p className="text-sm text-muted-foreground">
                      Required for posting to LinkedIn
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    cookieStatus === "valid"
                      ? "default"
                      : cookieStatus === "expired"
                      ? "secondary"
                      : "destructive"
                  }
                  className={cn(cookieStatus === "valid" && "bg-green-600 hover:bg-green-600")}
                >
                  {cookieStatus === "valid"
                    ? "Valid"
                    : cookieStatus === "expired"
                    ? "Expired"
                    : "Missing"}
                </Badge>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => handleSave("linkedin")} disabled={isSaving}>
                  {isSaving ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconCheck className="size-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Configure your own API keys for AI-powered features (BYOK)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OpenAI API Key */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">OpenAI API Key</h4>
                    <p className="text-sm text-muted-foreground">
                      Used for AI content generation and suggestions
                    </p>
                  </div>
                  {hasApiKey && (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                      Configured
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <IconKey className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={openaiKey}
                      onChange={(e) => {
                        setOpenaiKey(e.target.value)
                        // Clear error when user starts typing
                        if (apiKeyError) setApiKeyError(null)
                      }}
                      placeholder={hasApiKey ? "sk-********...****" : "sk-..."}
                      className={cn(
                        "pl-10 pr-10 font-mono",
                        apiKeyError && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <IconEyeOff className="size-4" />
                      ) : (
                        <IconEye className="size-4" />
                      )}
                    </Button>
                  </div>
                  {hasApiKey ? (
                    <Button variant="destructive" onClick={handleDeleteApiKey}>
                      <IconTrash className="size-4" />
                      Delete
                    </Button>
                  ) : (
                    <Button onClick={handleSaveApiKey} disabled={!openaiKey.trim()}>
                      <IconCheck className="size-4" />
                      Save
                    </Button>
                  )}
                </div>

                {/* API Key Error Message */}
                {apiKeyError && (
                  <p className="text-sm text-red-500 flex items-center gap-1.5">
                    <IconAlertCircle className="size-4" />
                    {apiKeyError}
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  Your API key is encrypted and stored securely. We never share your keys
                  with third parties.
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => handleSave("apiKeys")} disabled={isSaving}>
                  {isSaving ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconCheck className="size-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Kit Tab */}
        <TabsContent value="brand-kit">
          <Card>
            <CardHeader>
              <CardTitle>Brand Kit</CardTitle>
              <CardDescription>
                Customize your brand colors and logo for consistent posts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Color Pickers */}
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Primary Color */}
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="size-10 rounded-lg border shadow-sm"
                      style={{ backgroundColor: brandKit.primaryColor }}
                    />
                    <Input
                      id="primary-color"
                      type="color"
                      value={brandKit.primaryColor}
                      onChange={(e) =>
                        setBrandKit((prev) => ({ ...prev, primaryColor: e.target.value }))
                      }
                      className="h-10 w-20 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={brandKit.primaryColor}
                      onChange={(e) =>
                        setBrandKit((prev) => ({ ...prev, primaryColor: e.target.value }))
                      }
                      className="flex-1 font-mono uppercase"
                      maxLength={7}
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <div className="flex items-center gap-3">
                    <div
                      className="size-10 rounded-lg border shadow-sm"
                      style={{ backgroundColor: brandKit.secondaryColor }}
                    />
                    <Input
                      id="secondary-color"
                      type="color"
                      value={brandKit.secondaryColor}
                      onChange={(e) =>
                        setBrandKit((prev) => ({ ...prev, secondaryColor: e.target.value }))
                      }
                      className="h-10 w-20 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={brandKit.secondaryColor}
                      onChange={(e) =>
                        setBrandKit((prev) => ({ ...prev, secondaryColor: e.target.value }))
                      }
                      className="flex-1 font-mono uppercase"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Brand Logo</Label>
                <div className="flex items-center gap-4 p-4 rounded-lg border border-dashed">
                  {brandKit.logoUrl ? (
                    <Image
                      src={brandKit.logoUrl}
                      alt="Brand logo"
                      width={64}
                      height={64}
                      className="size-16 object-contain rounded"
                      unoptimized
                    />
                  ) : (
                    <div className="size-16 rounded bg-muted flex items-center justify-center">
                      <IconPalette className="size-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Button variant="outline" size="sm">
                      <IconCamera className="size-4" />
                      Upload Logo
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      SVG, PNG or JPG. Recommended 200x200px.
                    </p>
                  </div>
                </div>
              </div>

              {/* Color Preview */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div
                      className="h-12 flex-1 rounded-lg flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: brandKit.primaryColor }}
                    >
                      Primary Button
                    </div>
                    <div
                      className="h-12 flex-1 rounded-lg flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: brandKit.secondaryColor }}
                    >
                      Secondary Button
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => handleSave("brandKit")} disabled={isSaving}>
                  {isSaving ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconCheck className="size-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>Manage your team and their permissions</CardDescription>
              </div>
              <Button>
                <IconPlus className="size-4" />
                Invite Member
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Team Members List */}
              {members.map((member) => {
                const { variant, label } = getRoleBadgeProps(member.role)
                const isOwner = member.role === "owner"

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        {member.avatarUrl ? (
                          <AvatarImage src={member.avatarUrl} alt={member.name} />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isOwner ? (
                        <Badge variant={variant}>{label}</Badge>
                      ) : (
                        <Select
                          value={member.role}
                          onValueChange={(value: TeamMemberRole) =>
                            handleUpdateRole(member.id, value)
                          }
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {!isOwner && (
                        <Button variant="ghost" size="icon-sm">
                          <IconTrash className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => handleSave("team")} disabled={isSaving}>
                  {isSaving ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconCheck className="size-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications Master Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconMail className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, emailNotifications: checked }))
                  }
                />
              </div>

              {/* Individual Notification Toggles */}
              <div className="space-y-4">
                <NotificationToggle
                  title="Post Published"
                  description="Get notified when your post is published to LinkedIn"
                  checked={notifications.postPublished}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, postPublished: checked }))
                  }
                  disabled={!notifications.emailNotifications}
                />

                <NotificationToggle
                  title="Post Scheduled"
                  description="Get notified when a post is scheduled"
                  checked={notifications.postScheduled}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, postScheduled: checked }))
                  }
                  disabled={!notifications.emailNotifications}
                />

                <NotificationToggle
                  title="Weekly Digest"
                  description="Receive a weekly summary of your post performance"
                  checked={notifications.weeklyDigest}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, weeklyDigest: checked }))
                  }
                  disabled={!notifications.emailNotifications}
                />

                <NotificationToggle
                  title="Team Activity"
                  description="Get notified about team member actions"
                  checked={notifications.teamActivity}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, teamActivity: checked }))
                  }
                  disabled={!notifications.emailNotifications}
                />

                <NotificationToggle
                  title="System Updates"
                  description="Receive updates about new features and improvements"
                  checked={notifications.systemUpdates}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, systemUpdates: checked }))
                  }
                  disabled={!notifications.emailNotifications}
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => handleSave("notifications")} disabled={isSaving}>
                  {isSaving ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconCheck className="size-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Props for the NotificationToggle component
 */
interface NotificationToggleProps {
  /** Title of the notification setting */
  title: string
  /** Description of what the notification does */
  description: string
  /** Whether the toggle is checked */
  checked: boolean
  /** Callback when the toggle changes */
  onCheckedChange: (checked: boolean) => void
  /** Whether the toggle is disabled */
  disabled?: boolean
}

/**
 * A reusable notification toggle row component
 */
function NotificationToggle({
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: NotificationToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-3 border-b last:border-b-0",
        disabled && "opacity-50"
      )}
    >
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
