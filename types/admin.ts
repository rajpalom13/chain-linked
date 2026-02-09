/**
 * Admin Panel Type Definitions
 * @description Types for admin dashboard, user management, prompt management, and settings
 * @module types/admin
 */

/**
 * Overview metric card data displayed on the admin dashboard
 */
export interface AdminMetric {
  /** Display label for the metric */
  label: string
  /** Current value of the metric */
  value: number
  /** Formatted display value */
  displayValue: string
  /** Change from previous period as a percentage */
  change: number
  /** Direction of the trend */
  trend: "up" | "down" | "neutral"
}

/**
 * User record displayed in the admin user management table
 */
export interface AdminUser {
  /** Unique user identifier */
  id: string
  /** Full name of the user */
  name: string
  /** Email address */
  email: string
  /** Date the user joined */
  joinedAt: string
  /** Number of posts created */
  postsCount: number
  /** Last time the user was active */
  lastActive: string
  /** Account status */
  status: "active" | "inactive" | "suspended"
  /** Whether user has connected their LinkedIn account */
  linkedinConnected: boolean
  /** Optional avatar URL */
  avatarUrl?: string
  /** Whether onboarding is completed */
  onboardingCompleted?: boolean
  /** Current onboarding step (1-4) */
  onboardingStep?: number
}

/**
 * System prompt record for AI generation
 */
export interface AdminPrompt {
  /** Unique prompt identifier */
  id: string
  /** Display name of the prompt */
  name: string
  /** Type of content the prompt is used for */
  type: "post" | "carousel" | "remix"
  /** The actual prompt text */
  content: string
  /** Whether this is the active/default prompt for its type */
  isActive: boolean
  /** Version number */
  version: number
  /** Array of previous versions */
  versionHistory: PromptVersion[]
  /** Number of times this prompt has been used */
  usageCount: number
  /** Last updated timestamp */
  updatedAt: string
  /** Created timestamp */
  createdAt: string
}

/**
 * A single version entry in prompt version history
 */
export interface PromptVersion {
  /** Version number */
  version: number
  /** Prompt content at this version */
  content: string
  /** Timestamp when this version was saved */
  savedAt: string
}

/**
 * Content overview statistics
 */
export interface ContentStats {
  /** Total posts created across all users */
  totalPosts: number
  /** Total carousel posts */
  totalCarousels: number
  /** Total AI-generated content pieces */
  totalAiGenerated: number
  /** Average engagement rate */
  avgEngagement: number
}

/**
 * Top performing post data
 */
export interface TopPost {
  /** Post ID */
  id: string
  /** Author name */
  author: string
  /** Post content preview */
  preview: string
  /** Number of impressions */
  impressions: number
  /** Number of engagements */
  engagements: number
  /** Post creation date */
  createdAt: string
}

/**
 * Admin settings key-value pair
 */
export interface AdminSetting {
  /** Setting key */
  key: string
  /** Setting display label */
  label: string
  /** Setting value */
  value: string | boolean | number
  /** Description of what this setting controls */
  description: string
  /** Type of the setting for UI rendering */
  type: "text" | "select" | "toggle" | "number"
  /** Available options for select type */
  options?: string[]
}

/**
 * Feature flag for toggling features
 */
export interface FeatureFlag {
  /** Feature flag key */
  key: string
  /** Display name */
  name: string
  /** Description */
  description: string
  /** Whether the feature is enabled */
  enabled: boolean
}

/**
 * Recent activity event for the admin dashboard feed
 */
export interface AdminActivityEvent {
  /** Event ID */
  id: string
  /** Type of event */
  type: "signup" | "post_created" | "ai_generation" | "linkedin_connected"
  /** Description of what happened */
  description: string
  /** User who triggered the event */
  userName: string
  /** Timestamp of the event */
  timestamp: string
}

/**
 * Platform-wide statistics for admin dashboard
 */
export interface PlatformStats {
  /** Total registered users */
  totalUsers: number
  /** Total users change percentage from previous period */
  totalUsersChange: number
  /** Users active in the last 7 days */
  activeUsers7d: number
  /** Active users change percentage */
  activeUsersChange: number
  /** Total posts created on the platform */
  totalPosts: number
  /** Total posts change percentage */
  totalPostsChange: number
  /** Posts scheduled but not yet published */
  scheduledPosts: number
  /** Scheduled posts change percentage */
  scheduledPostsChange: number
  /** Total AI generation runs */
  aiGenerations: number
  /** AI generations change percentage */
  aiGenerationsChange: number
  /** Users with LinkedIn connected */
  linkedinConnections: number
  /** LinkedIn connections change percentage */
  linkedinConnectionsChange: number
}

/**
 * User growth data point for charts
 */
export interface UserGrowthDataPoint {
  /** Month or date label */
  month: string
  /** Total user count at this point */
  users: number
}

/**
 * Weekly activity data point for charts
 */
export interface WeeklyActivityDataPoint {
  /** Day label (e.g., "Mon", "Tue") */
  day: string
  /** Number of posts created */
  posts: number
  /** Number of AI generations */
  aiGenerations: number
}

/**
 * System health status for a single service
 */
export interface ServiceHealth {
  /** Service name */
  name: string
  /** Current status */
  status: "operational" | "degraded" | "outage"
  /** Uptime percentage */
  uptime: number
  /** Response time in milliseconds */
  responseTime: number
  /** Last checked timestamp */
  lastChecked: string
  /** Optional error message */
  errorMessage?: string
}

/**
 * Overall system health data
 */
export interface SystemHealth {
  /** Overall system status */
  overallStatus: "operational" | "degraded" | "outage"
  /** Individual service health statuses */
  services: ServiceHealth[]
  /** API error rate percentage */
  errorRate: number
  /** Average API response time in ms */
  avgResponseTime: number
  /** Total requests in current period */
  totalRequests: number
}

/**
 * Daily signup data point for growth charts
 */
export interface DailySignupDataPoint {
  /** Date label (e.g., "Jan 15") */
  date: string
  /** Number of signups on this day */
  signups: number
}

/**
 * Content type breakdown for posts
 */
export interface ContentTypeBreakdown {
  /** Post type (text, carousel, image, video) */
  type: string
  /** Number of posts of this type */
  count: number
  /** Percentage of total posts */
  percentage: number
}

/**
 * Top performing post for admin dashboard
 */
export interface TopPerformingPost {
  /** Post ID */
  id: string
  /** Post author name */
  authorName: string
  /** Post content preview (first 100 chars) */
  contentPreview: string
  /** Total engagement (reactions + comments + reposts) */
  totalEngagement: number
  /** Number of impressions */
  impressions: number
  /** Engagement rate percentage */
  engagementRate: number
  /** Post creation date */
  createdAt: string
}

/**
 * Onboarding funnel step data
 */
export interface OnboardingFunnelStep {
  /** Step number (1-4) */
  step: number
  /** Step label/name */
  label: string
  /** Number of users at this step */
  usersAtStep: number
  /** Number of users who completed this step */
  usersCompleted: number
  /** Completion rate for this step */
  completionRate: number
}

/**
 * Onboarding funnel data
 */
export interface OnboardingFunnel {
  /** Total users who started onboarding */
  totalStarted: number
  /** Total users who completed all steps */
  totalCompleted: number
  /** Overall completion rate */
  overallCompletionRate: number
  /** Data for each step */
  steps: OnboardingFunnelStep[]
}

/**
 * Content metrics for admin dashboard
 */
export interface ContentMetrics {
  /** Breakdown by content type */
  contentTypeBreakdown: ContentTypeBreakdown[]
  /** Top performing posts */
  topPerformingPosts: TopPerformingPost[]
  /** Average engagement rate across all posts */
  averageEngagementRate: number
  /** Total posts in the period */
  totalPosts: number
}

/**
 * Extended platform stats with 30-day active users
 */
export interface ExtendedPlatformStats extends PlatformStats {
  /** Users active in the last 30 days */
  activeUsers30d: number
  /** 30-day active users change percentage */
  activeUsers30dChange: number
  /** Average engagement rate */
  averageEngagementRate: number
}

/**
 * Admin dashboard data response
 */
export interface AdminDashboardData {
  /** Platform statistics */
  stats: PlatformStats
  /** Extended platform stats with 30-day metrics */
  extendedStats?: ExtendedPlatformStats
  /** User growth chart data */
  userGrowth: UserGrowthDataPoint[]
  /** Weekly activity chart data */
  weeklyActivity: WeeklyActivityDataPoint[]
  /** Recent platform activity */
  recentActivity: AdminActivityEvent[]
  /** System health information */
  systemHealth: SystemHealth
  /** Daily signup data for the last 30 days */
  dailySignups?: DailySignupDataPoint[]
  /** Content metrics */
  contentMetrics?: ContentMetrics
  /** Onboarding funnel data */
  onboardingFunnel?: OnboardingFunnel
}
