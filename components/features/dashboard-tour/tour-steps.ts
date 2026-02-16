/**
 * Tour Step Definitions
 * @description Data-only step config for the dashboard walkthrough tour
 * @module components/features/dashboard-tour/tour-steps
 */

/**
 * Position preference for tooltip placement relative to the target element
 */
export type TourPosition = 'top' | 'bottom' | 'left' | 'right'

/**
 * Single step in the dashboard tour
 */
export interface TourStep {
  /** Unique step identifier */
  id: string
  /** CSS selector to find the target element (data-tour attribute) */
  targetSelector: string
  /** Step title displayed in the tooltip */
  title: string
  /** Step description text */
  description: string
  /** Preferred tooltip position relative to target */
  position: TourPosition
}

/**
 * All steps in the dashboard tour, ordered sequentially
 */
export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetSelector: '[data-tour="welcome-section"]',
    title: 'Welcome to ChainLinked',
    description: 'This is your command center for LinkedIn content. Get a quick overview of your performance and upcoming posts.',
    position: 'bottom',
  },
  {
    id: 'quick-create',
    targetSelector: '[data-tour="quick-create"]',
    title: 'Create Content Fast',
    description: 'Start composing a new LinkedIn post with AI-powered suggestions and templates.',
    position: 'right',
  },
  {
    id: 'sidebar-overview',
    targetSelector: '[data-tour="sidebar-overview"]',
    title: 'Your Overview Hub',
    description: 'Access Dashboard, Analytics, Posts, Compose, Schedule, and Team pages from here.',
    position: 'right',
  },
  {
    id: 'sidebar-content',
    targetSelector: '[data-tour="sidebar-content"]',
    title: 'Content Tools',
    description: 'Find Templates, Inspiration, Discover trending topics, Swipe for ideas, and create Carousels.',
    position: 'right',
  },
  {
    id: 'quick-stats',
    targetSelector: '[data-tour="quick-stats"]',
    title: 'Your LinkedIn Metrics',
    description: 'Track impressions, followers, engagement rate, and profile views at a glance.',
    position: 'bottom',
  },
  {
    id: 'widgets-row',
    targetSelector: '[data-tour="widgets-row"]',
    title: 'Streak, Schedule & Pipeline',
    description: 'Monitor your posting streak, upcoming scheduled posts, and content pipeline all in one row.',
    position: 'top',
  },
  {
    id: 'activity-feed',
    targetSelector: '[data-tour="activity-feed"]',
    title: 'Recent Activity',
    description: 'See your latest posts and engagement metrics. Keep track of what\'s performing well.',
    position: 'top',
  },
]
