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
    description: 'This is your command center for LinkedIn content. See your greeting, today\'s date, and get a quick overview of everything happening.',
    position: 'bottom',
  },
  {
    id: 'quick-create',
    targetSelector: '[data-tour="quick-create"]',
    title: 'Create a Post',
    description: 'Start composing a new LinkedIn post with AI-powered suggestions and templates. This is the fastest way to create content.',
    position: 'right',
  },
  {
    id: 'sidebar-overview',
    targetSelector: '[data-tour="sidebar-overview"]',
    title: 'Overview Hub',
    description: 'Navigate to your Dashboard, Analytics & Goals tracking, and Team Activity pages from here.',
    position: 'right',
  },
  {
    id: 'sidebar-content',
    targetSelector: '[data-tour="sidebar-content"]',
    title: 'Content Tools',
    description: 'Access your Saved Drafts, Inspiration feed, Carousel Creator, and Template Library to supercharge your content.',
    position: 'right',
  },
  {
    id: 'quick-stats',
    targetSelector: '[data-tour="quick-stats"]',
    title: 'Your LinkedIn Metrics',
    description: 'Track your key metrics at a glance — Impressions, Followers, Engagement Rate, and Profile Views with weekly change indicators.',
    position: 'bottom',
  },
  {
    id: 'schedule',
    targetSelector: '[data-tour="schedule-section"]',
    title: 'Schedule & Upcoming Posts',
    description: 'Plan your content calendar and see upcoming scheduled posts. Click any date to start composing a post for that day.',
    position: 'top',
  },
]
