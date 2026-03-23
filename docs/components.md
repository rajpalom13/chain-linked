# ChainLinked Component Documentation

Comprehensive reference for all React components in the ChainLinked project, organized by category. Each entry includes the component name, file path, purpose, key props, client/server designation, and notable dependencies.

---

## Table of Contents

1. [UI Components (shadcn/ui)](#1-ui-components-shadcnui)
2. [Layout Components](#2-layout-components)
3. [Landing Page Components](#3-landing-page-components)
4. [Email Components](#4-email-components)
5. [Feature Components](#5-feature-components)
   - [Analytics](#51-analytics)
   - [Post Composer](#52-post-composer)
   - [Compose Advanced](#53-compose-advanced)
   - [Canvas Editor](#54-canvas-editor)
   - [Carousel Creator](#55-carousel-creator)
   - [Template Library](#56-template-library)
   - [Discover & Inspiration](#57-discover--inspiration)
   - [Swipe Interface](#58-swipe-interface)
   - [Team Management](#59-team-management)
   - [Onboarding](#510-onboarding)
   - [Brand Kit & Settings](#511-brand-kit--settings)
   - [AI & Prompts](#512-ai--prompts)
   - [Scheduling & Drafts](#513-scheduling--drafts)
   - [Dashboard Tour](#514-dashboard-tour)
6. [Shared Components](#6-shared-components)
7. [Utility / Provider Components](#7-utility--provider-components)

---

## 1. UI Components (shadcn/ui)

Base design-system primitives built on Radix UI and styled with Tailwind CSS. Located in `components/ui/`.

### Alert

- **File**: `components/ui/alert.tsx`
- **Description**: Contextual alert banner with icon support and variant styling.
- **Key Props**: `variant` ("default" | "destructive"), standard `div` props.
- **Exports**: `Alert`, `AlertTitle`, `AlertDescription`
- **Server Component**: Yes (no "use client" directive)
- **Dependencies**: `class-variance-authority`, `@/lib/utils`

### AlertDialog

- **File**: `components/ui/alert-dialog.tsx`
- **Description**: Modal confirmation dialog built on Radix AlertDialog. Used for destructive actions requiring explicit user confirmation.
- **Key Props**: Radix AlertDialog primitives (open, onOpenChange, etc.)
- **Exports**: `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogPortal`, `AlertDialogOverlay`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-alert-dialog`, `Button` (buttonVariants)

### AnimatedThemeToggler

- **File**: `components/ui/animated-theme-toggler.tsx`
- **Description**: Dark/light mode toggle button with a circular clip-path View Transition animation.
- **Key Props**: `duration` (animation duration in ms, default 400), standard button props.
- **Client Component**: Yes
- **Dependencies**: `lucide-react` (Sun, Moon), `react-dom` (flushSync)

### Avatar

- **File**: `components/ui/avatar.tsx`
- **Description**: User avatar with image and fallback display.
- **Key Props**: Radix Avatar primitives (src, alt, fallback content).
- **Exports**: `Avatar`, `AvatarImage`, `AvatarFallback`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-avatar`

### Badge

- **File**: `components/ui/badge.tsx`
- **Description**: Inline status indicator or label pill.
- **Key Props**: `variant` ("default" | "secondary" | "destructive" | "outline"), `asChild`.
- **Exports**: `Badge`, `badgeVariants`
- **Server Component**: Yes
- **Dependencies**: `class-variance-authority`, `@radix-ui/react-slot`

### Breadcrumb

- **File**: `components/ui/breadcrumb.tsx`
- **Description**: Navigation breadcrumb trail with separator and ellipsis support.
- **Key Props**: Standard nav/ol/li props, `asChild` on BreadcrumbLink.
- **Exports**: `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis`
- **Server Component**: Yes
- **Dependencies**: `lucide-react` (ChevronRight, MoreHorizontal), `@radix-ui/react-slot`

### Button

- **File**: `components/ui/button.tsx`
- **Description**: Primary interactive button with multiple variants and sizes. Includes an `AnimatedButton` variant with Framer Motion hover/tap micro-interactions.
- **Key Props**: `variant` ("default" | "destructive" | "outline" | "secondary" | "ghost" | "link"), `size` ("default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg"), `asChild`.
- **Exports**: `Button`, `AnimatedButton`, `buttonVariants`
- **Server Component**: Yes (AnimatedButton requires client context via framer-motion)
- **Dependencies**: `class-variance-authority`, `@radix-ui/react-slot`, `framer-motion`, `@/lib/animations`

### Card

- **File**: `components/ui/card.tsx`
- **Description**: Content container card with optional hover lift effect.
- **Key Props**: `hover` (boolean, enables lift + shadow on hover).
- **Exports**: `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardAction`, `CardDescription`, `CardContent`
- **Server Component**: Yes
- **Dependencies**: `@/lib/utils`

### Chart

- **File**: `components/ui/chart.tsx`
- **Description**: Recharts wrapper providing theme-aware chart colors via CSS variables and a context-based configuration system.
- **Key Props**: `config` (ChartConfig mapping data keys to labels, icons, and colors), `children` (Recharts chart element).
- **Exports**: `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend`, `ChartLegendContent`, `ChartStyle`
- **Types**: `ChartConfig`
- **Client Component**: Yes
- **Dependencies**: `recharts`

### Checkbox

- **File**: `components/ui/checkbox.tsx`
- **Description**: Checkbox input built on Radix Checkbox.
- **Key Props**: Radix Checkbox root props (checked, onCheckedChange, disabled).
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-checkbox`, `lucide-react` (CheckIcon)

### Collapsible

- **File**: `components/ui/collapsible.tsx`
- **Description**: Expandable/collapsible content section.
- **Exports**: `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-collapsible`

### ConfirmDialog

- **File**: `components/ui/confirm-dialog.tsx`
- **Description**: Reusable confirmation dialog replacing `window.confirm()`. Supports default, destructive, and warning variants with async confirm handlers. Also exports a `useConfirmDialog` hook for promise-based usage.
- **Key Props**: `open`, `onOpenChange`, `title`, `description`, `confirmText`, `cancelText`, `variant` ("default" | "destructive" | "warning"), `onConfirm`, `isLoading`.
- **Exports**: `ConfirmDialog`, `useConfirmDialog`
- **Types**: `ConfirmDialogProps`, `ConfirmDialogVariant`
- **Client Component**: Yes
- **Dependencies**: `AlertDialog` components, `@tabler/icons-react`

### ContextMenu

- **File**: `components/ui/context-menu.tsx`
- **Description**: Right-click context menu built on Radix ContextMenu.
- **Exports**: `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuCheckboxItem`, `ContextMenuRadioItem`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuSub`, `ContextMenuSubTrigger`, `ContextMenuSubContent`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-context-menu`, `lucide-react`

### Dialog

- **File**: `components/ui/dialog.tsx`
- **Description**: Modal dialog with overlay, close button, and animated enter/exit transitions.
- **Exports**: `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`, `DialogPortal`, `DialogOverlay`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-dialog`, `@tabler/icons-react` (IconX)

### Drawer

- **File**: `components/ui/drawer.tsx`
- **Description**: Slide-out drawer panel supporting all four directions (top, bottom, left, right). Built on Vaul.
- **Exports**: `Drawer`, `DrawerTrigger`, `DrawerContent`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription`, `DrawerClose`, `DrawerPortal`, `DrawerOverlay`
- **Client Component**: Yes
- **Dependencies**: `vaul`

### DropdownMenu

- **File**: `components/ui/dropdown-menu.tsx`
- **Description**: Dropdown menu built on Radix DropdownMenu with sub-menus, checkboxes, and radio items.
- **Exports**: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuRadioGroup`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-dropdown-menu`, `lucide-react`

### Field

- **File**: `components/ui/field.tsx`
- **Description**: Form field layout primitives with consistent spacing, labeling, error display, and orientation variants (vertical, horizontal, responsive).
- **Key Props (Field)**: `orientation` ("vertical" | "horizontal" | "responsive").
- **Exports**: `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldGroup`, `FieldLegend`, `FieldSeparator`, `FieldSet`, `FieldContent`, `FieldTitle`
- **Client Component**: Yes
- **Dependencies**: `class-variance-authority`, `Label`, `Separator`

### Input

- **File**: `components/ui/input.tsx`
- **Description**: Styled text input element.
- **Key Props**: Standard `input` HTML props (type, placeholder, disabled, etc.).
- **Server Component**: Yes
- **Dependencies**: `@/lib/utils`

### Label

- **File**: `components/ui/label.tsx`
- **Description**: Form label built on Radix Label.
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-label`

### PartialLoader

- **File**: `components/ui/partial-loader.tsx`
- **Description**: Progressive loading wrapper with staggered skeleton animations, error state with retry, delay before showing skeleton (prevents flash for fast loads), and minimum loading duration.
- **Key Props**: `isLoading`, `error`, `onRetry`, `skeleton` (custom skeleton ReactNode), `skeletonCount`, `delay`, `minDuration`, `staggerDelay`.
- **Exports**: `PartialLoader`, `AnimatedSkeleton`, `StaggeredContainer`, `StaggeredItem`
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `Skeleton`, `Button`, `@tabler/icons-react`

### Popover

- **File**: `components/ui/popover.tsx`
- **Description**: Floating popover panel built on Radix Popover.
- **Exports**: `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-popover`

### Progress

- **File**: `components/ui/progress.tsx`
- **Description**: Progress bar with animated fill and variant colors.
- **Key Props**: `value` (0-100), `max`, `variant` ("default" | "success" | "error").
- **Exports**: `Progress`, `ProgressProps`
- **Client Component**: Yes
- **Dependencies**: `@/lib/utils`

### RadioGroup

- **File**: `components/ui/radio-group.tsx`
- **Description**: Radio button group built on Radix RadioGroup.
- **Exports**: `RadioGroup`, `RadioGroupItem`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-radio-group`, `lucide-react` (CircleIcon)

### ScrollArea

- **File**: `components/ui/scroll-area.tsx`
- **Description**: Custom scrollable container with styled scrollbar.
- **Exports**: `ScrollArea`, `ScrollBar`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-scroll-area`

### Select

- **File**: `components/ui/select.tsx`
- **Description**: Styled select dropdown built on Radix Select.
- **Exports**: `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-select`, `lucide-react`

### Separator

- **File**: `components/ui/separator.tsx`
- **Description**: Visual horizontal or vertical divider.
- **Key Props**: `orientation` ("horizontal" | "vertical"), `decorative`.
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-separator`

### Sheet

- **File**: `components/ui/sheet.tsx`
- **Description**: Side panel overlay (slide-out sheet) built on Radix Dialog with directional variants.
- **Exports**: `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-dialog`, `lucide-react` (XIcon)

### Sidebar

- **File**: `components/ui/sidebar.tsx`
- **Description**: Full-featured collapsible sidebar system with cookie-based persistence, mobile sheet mode, keyboard shortcut, grouped menus, and tooltip integration. Exports a context provider, hook, and 20+ sub-components.
- **Key Exports**: `SidebarProvider`, `Sidebar`, `SidebarTrigger`, `SidebarContent`, `SidebarHeader`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarMenuAction`, `SidebarSeparator`, `useSidebar`
- **Client Component**: Yes
- **Dependencies**: `Sheet`, `Button`, `Input`, `Separator`, `Skeleton`, `Tooltip`, `@/hooks/use-mobile`

### Skeleton

- **File**: `components/ui/skeleton.tsx`
- **Description**: Animated loading placeholder with shimmer effect.
- **Key Props**: Standard `div` props with className.
- **Server Component**: Yes
- **Dependencies**: `@/lib/utils`

### Slider

- **File**: `components/ui/slider.tsx`
- **Description**: Range slider input built on Radix Slider. Supports single and multi-thumb configurations.
- **Key Props**: `value`, `defaultValue`, `min`, `max`, `step`, `onValueChange`.
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-slider`

### Sonner (Toaster)

- **File**: `components/ui/sonner.tsx`
- **Description**: Toast notification provider using the Sonner library with theme-aware styling and custom icons for success, info, warning, error, and loading states.
- **Exports**: `Toaster`
- **Client Component**: Yes
- **Dependencies**: `sonner`, `next-themes`, `lucide-react`

### Switch

- **File**: `components/ui/switch.tsx`
- **Description**: Toggle switch input built on Radix Switch.
- **Key Props**: Radix Switch root props (checked, onCheckedChange, disabled).
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-switch`

### Table

- **File**: `components/ui/table.tsx`
- **Description**: Styled HTML table with responsive overflow container.
- **Exports**: `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`
- **Client Component**: Yes
- **Dependencies**: `@/lib/utils`

### Tabs

- **File**: `components/ui/tabs.tsx`
- **Description**: Tab navigation built on Radix Tabs with styled trigger buttons and content panels.
- **Exports**: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-tabs`

### Textarea

- **File**: `components/ui/textarea.tsx`
- **Description**: Styled multi-line text input.
- **Key Props**: Standard `textarea` HTML props.
- **Server Component**: Yes
- **Dependencies**: `@/lib/utils`

### Toggle

- **File**: `components/ui/toggle.tsx`
- **Description**: Two-state toggle button built on Radix Toggle.
- **Key Props**: `variant` ("default" | "outline"), `size` ("default" | "sm" | "lg").
- **Exports**: `Toggle`, `toggleVariants`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-toggle`, `class-variance-authority`

### ToggleGroup

- **File**: `components/ui/toggle-group.tsx`
- **Description**: Group of mutually exclusive or independent toggle buttons.
- **Key Props**: `variant`, `size`, `spacing` (gap between items), `type` ("single" | "multiple").
- **Exports**: `ToggleGroup`, `ToggleGroupItem`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-toggle-group`, `Toggle` (toggleVariants)

### Tooltip

- **File**: `components/ui/tooltip.tsx`
- **Description**: Hover tooltip built on Radix Tooltip with arrow indicator.
- **Key Props**: `sideOffset`, standard Radix Tooltip Content props.
- **Exports**: `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`
- **Client Component**: Yes
- **Dependencies**: `@radix-ui/react-tooltip`

---

## 2. Layout Components

Structural components that form the application shell.

### AppSidebar

- **File**: `components/app-sidebar.tsx`
- **Description**: Main navigation sidebar for the dashboard with collapsible sections, tree connectors, animated expand/collapse, and active-state highlighting based on current route.
- **Client Component**: Yes
- **Dependencies**: `NavUser`, `Sidebar` (ui), `Collapsible` (ui), `useAuthContext`, `framer-motion`, `@tabler/icons-react`

### SiteHeader

- **File**: `components/site-header.tsx`
- **Description**: Top navigation header with sidebar trigger and auto-generated breadcrumbs derived from the current pathname.
- **Client Component**: Yes
- **Dependencies**: `SidebarTrigger`, `Breadcrumb` components, `usePathname`

### UserMenu

- **File**: `components/user-menu.tsx`
- **Description**: Dropdown menu showing user avatar, profile info, theme toggle, settings link, and logout action. Falls back to a "Sign In" button when unauthenticated.
- **Client Component**: Yes
- **Dependencies**: `useAuthContext`, `Avatar`, `DropdownMenu`, `Skeleton`, `next-themes`

### NavMain

- **File**: `components/nav-main.tsx`
- **Description**: Primary sidebar navigation group with a "Quick Create" CTA button and a list of main navigation links with active-state highlighting.
- **Key Props**: `items` (array of `{ title, url, icon }`)
- **Client Component**: Yes
- **Dependencies**: `Sidebar` sub-components, `usePathname`

### NavSecondary

- **File**: `components/nav-secondary.tsx`
- **Description**: Secondary sidebar navigation group for lower-priority items (settings, help, feedback).
- **Key Props**: `items` (array of `{ title, url, icon }`)
- **Client Component**: Yes
- **Dependencies**: `Sidebar` sub-components, `usePathname`

### NavContent

- **File**: `components/nav-content.tsx`
- **Description**: Collapsible sidebar navigation group for content-related links with active-state highlighting.
- **Key Props**: `items` (array of `NavContentItem` with title, url, icon), `title`, `defaultOpen`
- **Types**: `NavContentItem`
- **Client Component**: Yes
- **Dependencies**: `Collapsible`, `Sidebar` sub-components, `usePathname`

### NavDocuments

- **File**: `components/nav-documents.tsx`
- **Description**: Sidebar navigation group for document items with individual context menus for sharing and deleting.
- **Key Props**: `items` (array of `{ name, url, icon }`)
- **Client Component**: Yes
- **Dependencies**: `DropdownMenu`, `Sidebar` sub-components

### NavUser

- **File**: `components/nav-user.tsx`
- **Description**: User profile section in the sidebar footer with avatar, name, email, and a dropdown menu providing settings, help, and sign-out actions.
- **Client Component**: Yes
- **Dependencies**: `Avatar`, `DropdownMenu`, `Sidebar` sub-components, `useAuthContext`

### OnboardingNavbar

- **File**: `components/onboarding-navbar.tsx`
- **Description**: Minimal branded navbar used during the onboarding flow with ChainLinked logo and theme toggler.
- **Key Props**: `className`
- **Client Component**: Yes
- **Dependencies**: `AnimatedThemeToggler`, `@tabler/icons-react` (IconLink)

### SkipLinks

- **File**: `components/skip-links.tsx`
- **Description**: Accessibility skip-navigation links (WCAG 2.1 AA) that appear on keyboard focus, allowing users to jump to main content or sidebar navigation.
- **Key Props**: `className`
- **Client Component**: Yes
- **Dependencies**: `@/lib/utils`

---

## 3. Landing Page Components

Public-facing marketing page components. Located in `components/landing/`.

### Navbar

- **File**: `components/landing/navbar.tsx`
- **Description**: Sticky navigation bar with glass-morphism effect, mobile hamburger menu, and animated mobile menu panel. Links to Features, About, and Pricing sections.
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `Button`, `@tabler/icons-react`, `@/lib/animations`

### Hero

- **File**: `components/landing/hero.tsx`
- **Description**: Main hero section with animated headline, floating stat badges, CTA buttons, and staggered entrance animations.
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `Button`, `@tabler/icons-react`, `@/lib/animations`

### FeaturesGrid

- **File**: `components/landing/features-grid.tsx`
- **Description**: Responsive grid of feature cards showcasing platform capabilities (Analytics, Scheduling, Templates, etc.) with scroll-triggered animations.
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `react-intersection-observer`, `@tabler/icons-react`, `@/lib/animations`

### AboutSection

- **File**: `components/landing/about-section.tsx`
- **Description**: Company mission, core values grid, and a testimonial quote with scroll-triggered stagger animations.
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `react-intersection-observer`, `@tabler/icons-react`, `@/lib/animations`

### CTABanner

- **File**: `components/landing/cta-banner.tsx`
- **Description**: Final call-to-action banner with gradient background and animated entrance.
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `react-intersection-observer`, `Button`, `@/lib/animations`

### Footer

- **File**: `components/landing/footer.tsx`
- **Description**: Site footer with navigation link groups (Product, Company, Legal) and social media icons.
- **Client Component**: Yes
- **Dependencies**: `@tabler/icons-react`

---

## 4. Email Components

React Email templates for transactional emails. Located in `components/emails/`.

### EmailVerification

- **File**: `components/emails/email-verification.tsx`
- **Description**: Account verification email with confirmation link and branding.
- **Key Props**: `name` (optional), `verificationUrl`
- **Server Component**: Yes (rendered server-side for email sending)
- **Dependencies**: `@react-email/components`

### TeamInvitation

- **File**: `components/emails/team-invitation.tsx`
- **Description**: Team invitation email with inviter info, team details, and accept link.
- **Key Props**: `inviterName`, `teamName`, `inviteUrl`, `teamLogoUrl` (optional)
- **Server Component**: Yes
- **Dependencies**: `@react-email/components`

### WelcomeToTeam

- **File**: `components/emails/welcome-to-team.tsx`
- **Description**: Confirmation email sent after accepting a team invitation.
- **Key Props**: `userName`, `teamName`, `dashboardUrl`, `teamLogoUrl` (optional)
- **Server Component**: Yes
- **Dependencies**: `@react-email/components`

### Welcome

- **File**: `components/emails/welcome.tsx`
- **Description**: Welcome email sent to new users after signup with onboarding guidance.
- **Key Props**: `name`, `loginUrl`
- **Server Component**: Yes
- **Dependencies**: `@react-email/components`

### PasswordReset

- **File**: `components/emails/password-reset.tsx`
- **Description**: Password reset request email with secure reset link.
- **Key Props**: `email`, `resetUrl`
- **Server Component**: Yes
- **Dependencies**: `@react-email/components`

---

## 5. Feature Components

Domain-specific components organized by feature area. Located in `components/features/`.

### 5.1 Analytics

#### AnalyticsCards

- **File**: `components/features/analytics-cards.tsx`
- **Description**: Grid of animated stat cards displaying key LinkedIn metrics (impressions, reach, reactions, followers, etc.) with sparklines, trend badges, and gradient backgrounds.
- **Client Component**: Yes
- **Dependencies**: `Card`, `Badge`, `Tooltip`, `framer-motion`, `@/lib/animations`

#### AnalyticsChart

- **File**: `components/features/analytics-chart.tsx`
- **Description**: Performance Trend area chart with single-metric selection dropdown, time-range toggle (7d/30d/90d), and responsive layout.
- **Client Component**: Yes
- **Dependencies**: `recharts` (Area, AreaChart), `ChartContainer`, `Select`, `ToggleGroup`, `Skeleton`

#### AnalyticsCharts

- **File**: `components/features/analytics-charts.tsx`
- **Description**: Multi-chart analytics section including engagement breakdown over time, posting frequency vs performance, content type comparison, and best posting days. Uses composed and bar charts.
- **Client Component**: Yes
- **Dependencies**: `recharts` (Area, Bar, ComposedChart, Line), `Card`, `ChartContainer`, `framer-motion`

#### AnalyticsDataTable

- **File**: `components/features/analytics-data-table.tsx`
- **Description**: TanStack React Table displaying analytics data with sortable columns, pagination, multi-column "all metrics" mode, granularity toggle, and CSV export.
- **Client Component**: Yes
- **Dependencies**: `@tanstack/react-table`, `Table`, `Button`, `Card`, `framer-motion`

#### AnalyticsFilterBar

- **File**: `components/features/analytics-filter-bar.tsx`
- **Description**: Top-level filter controls for the analytics dashboard with metric selector, time period toggle, content type filter, and compare toggle.
- **Key Props**: Uses `AnalyticsV2Filters` type from `use-analytics-v2` hook
- **Client Component**: Yes
- **Dependencies**: `Select`, `ToggleGroup`, `Popover`, `Input`, `Label`, `useSearchParams`

#### AnalyticsSummaryBar

- **File**: `components/features/analytics-summary-bar.tsx`
- **Description**: Summary statistics bar showing total, average, and percentage change for the selected metric with animated number transitions.
- **Client Component**: Yes
- **Dependencies**: `AnimatedNumber`, `LottieEmptyState`, `Card`, `Skeleton`, `framer-motion`

#### AnalyticsTrendChart

- **File**: `components/features/analytics-trend-chart.tsx`
- **Description**: Recharts area chart displaying the selected metric over time with gradient fill, optional comparison overlay, multi-line "all metrics" mode, and tooltips.
- **Client Component**: Yes
- **Dependencies**: `recharts` (Area, AreaChart, ComposedChart, Line), `ChartContainer`, `Card`, `framer-motion`

### 5.2 Post Composer

#### PostComposer

- **File**: `components/features/post-composer.tsx`
- **Description**: Rich text editor for composing LinkedIn posts with formatting toolbar (bold, italic, lists, Unicode fonts), emoji picker, media upload, LinkedIn preview panel, character counter, auto-save, scheduling, and AI assistance integration.
- **Client Component**: Yes
- **Dependencies**: `Avatar`, `Button`, `Card`, `Tooltip`, `framer-motion`, `useDraft`, `useAutoSave`, `@/lib/unicode-fonts`, `@/lib/analytics`

#### PostTypeSelector

- **File**: `components/features/post-type-selector.tsx`
- **Description**: Dropdown component for selecting a LinkedIn post type, displaying each type with its icon, label, description, and category grouping.
- **Key Props**: `value` (PostTypeId), `onValueChange`
- **Client Component**: Yes
- **Dependencies**: `Select`, `@/lib/ai/post-types`

#### PostGoalSelector

- **File**: `components/features/post-goal-selector.tsx`
- **Description**: Visual card-based selector for choosing post goals (narrative, educational, engagement, visual) with optional format refinement chips and stagger animations.
- **Key Props**: `selectedGoal` (GoalCategory), `onGoalChange`, `selectedFormat` (PostTypeId), `onFormatChange`
- **Client Component**: Yes
- **Dependencies**: `Badge`, `framer-motion`, `@/lib/ai/post-types`, `@/lib/animations`

#### PostActionsMenu

- **File**: `components/features/post-actions-menu.tsx`
- **Description**: Dropdown actions menu for composed posts with copy-to-clipboard and open-in-LinkedIn options.
- **Key Props**: `content` (post text), `children` (trigger element)
- **Client Component**: Yes
- **Dependencies**: `DropdownMenu`, `Button`, `@/lib/toast-utils`

#### PostDetailModal

- **File**: `components/features/post-detail-modal.tsx`
- **Description**: Full-screen dialog displaying an inspiration post with author info, engagement metrics, category badges, and actions to remix, save, or share.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `Avatar`, `Badge`, `Button`, `date-fns`

#### PostPerformance

- **File**: `components/features/post-performance.tsx`
- **Description**: Slide-over panel showing detailed performance analytics for a single LinkedIn post, including time-series line charts, engagement metrics, and top comments.
- **Client Component**: Yes
- **Dependencies**: `recharts` (LineChart, Line), `Avatar`, `Badge`, `Button`, `date-fns`

### 5.3 Compose Advanced

#### ComposeBasicMode

- **File**: `components/features/compose/compose-basic-mode.tsx`
- **Description**: Simplified one-shot post generation panel with tone, length, topic, and additional context fields. Calls the AI generation API.
- **Key Props**: `onGenerated` callback, `isLoading`
- **Types**: `BasicModeGenerationContext`
- **Client Component**: Yes
- **Dependencies**: `ComposeToneSelector`, `ToggleGroup`, `Textarea`, `Label`, `Button`

#### ComposeAdvancedMode

- **File**: `components/features/compose/compose-advanced-mode.tsx`
- **Description**: Conversation-first chat interface for AI post generation using streaming. Renders tool call results as MCQ options and post preview cards with accept/edit actions.
- **Key Props**: `onPostGenerated`, `onEditPost`
- **Client Component**: Yes
- **Dependencies**: `@ai-sdk/react` (useChat), `framer-motion`, `ComposeToneSelector`, `@/lib/animations`

#### ComposeSeriesMode

- **File**: `components/features/compose/compose-series-mode.tsx`
- **Description**: Chat interface for generating a series of related posts using the compose-series API endpoint with tool-based interactions.
- **Client Component**: Yes
- **Dependencies**: `@ai-sdk/react` (useChat), `framer-motion`, `ComposeToneSelector`

#### ComposeModeToggle

- **File**: `components/features/compose/compose-mode-toggle.tsx`
- **Description**: Animated tab toggle for switching between Basic, Advanced, and Series compose modes with a sliding pill indicator using Framer Motion layoutId.
- **Key Props**: `mode` (ComposeMode), `onModeChange`
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `@tabler/icons-react`

#### ComposeGradientBackdrop

- **File**: `components/features/compose/compose-gradient-backdrop.tsx`
- **Description**: Ambient gradient background that smoothly transitions between blue (basic) and warm red (advanced) modes using CSS transitions and oklch colors.
- **Key Props**: `mode` (ComposeMode)
- **Client Component**: Yes
- **Dependencies**: None (pure CSS)

#### ComposeToneSelector

- **File**: `components/features/compose/compose-tone-selector.tsx`
- **Description**: Shared tone selector with pill-style toggle buttons. Supports tones: Match My Style, Professional, Casual, Inspiring, Educational, Thought-Provoking.
- **Key Props**: `value`, `onValueChange`, `disabled`, `compact`
- **Client Component**: Yes
- **Dependencies**: `ToggleGroup`, `Label`

#### PostSeriesComposer

- **File**: `components/features/compose/post-series-composer.tsx`
- **Description**: Two-column layout for creating a series of related LinkedIn posts. Left: AI chat for series planning. Right: carousel of generated posts with copy, schedule, and save actions.
- **Client Component**: Yes
- **Dependencies**: `ComposeSeriesMode`, `SeriesPostCarousel`, `Card`, `Button`, `framer-motion`

#### SeriesPostCarousel

- **File**: `components/features/compose/series-post-carousel.tsx`
- **Description**: Carousel component for navigating and editing posts in a series with a LinkedIn-style preview card and left/right navigation.
- **Client Component**: Yes
- **Dependencies**: `Avatar`, `Button`, `framer-motion`

#### EditWithAIPopup

- **File**: `components/features/compose/edit-with-ai-popup.tsx`
- **Description**: Floating popup that appears near selected text in the post editor. Shows an "Edit with AI" button that expands into an instruction input with send button.
- **Key Props**: `isVisible`, `position` ({top, left}), `selectedText`, `onSubmit`, `isLoading`, `onClose`
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `Button`

#### InlineDiffView

- **File**: `components/features/compose/inline-diff-view.tsx`
- **Description**: Copilot-style inline diff preview for AI text edits. Shows original text with strikethrough and the AI suggestion highlighted, with Accept/Reject controls.
- **Key Props**: `content`, `selectionStart`, `selectionEnd`, `suggestion`, `onAccept`, `onReject`
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `Button`

### 5.4 Canvas Editor

Full-featured Canva/Figma-inspired carousel editor. Located in `components/features/canvas-editor/`.

#### CanvasEditor

- **File**: `components/features/canvas-editor/canvas-editor.tsx`
- **Description**: Main orchestrating component for the carousel editor. Manages slide state, element selection, AI generation, template loading, PDF/image export workflows, and coordinates all sub-panels.
- **Client Component**: Yes
- **Dependencies**: `useCanvasEditor`, `useCarouselTemplates`, `EditorLeftPanel`, `EditorFloatingToolbar`, `EditorTopActions`, `PropertyPanel`, `TemplateSelectorModal`, `ExportDialog`, `AiContentGenerator`, `SaveTemplateDialog`, `PostToLinkedInDialog`, `CanvasStage` (dynamic import)

#### CanvasStage

- **File**: `components/features/canvas-editor/canvas-stage.tsx`
- **Description**: Konva Stage wrapper that renders all slide elements (text, shapes, images) with responsive sizing, optional grid overlay, zoom controls, and image drop support.
- **Key Props**: `slide` (CanvasSlide), `selectedElementId`, `onElementSelect`, `onElementUpdate`, `showGrid`, `zoom`
- **Client Component**: Yes
- **Dependencies**: `react-konva` (Stage, Layer, Rect, Line), `CanvasTextElement`, `CanvasShapeElement`, `CanvasImageElement`

#### CanvasTextElement

- **File**: `components/features/canvas-editor/canvas-text-element.tsx`
- **Description**: Editable text element on the Konva canvas with inline editing, selection highlighting, and drag/resize transformation handles.
- **Key Props**: `element` (CanvasTextElement type), `isSelected`, `onSelect`, `onChange`
- **Client Component**: Yes
- **Dependencies**: `react-konva` (Text, Transformer, Rect)

#### CanvasImageElement

- **File**: `components/features/canvas-editor/canvas-image-element.tsx`
- **Description**: Image element on the canvas with transformation handles and tint color support via offscreen canvas compositing.
- **Key Props**: `element` (CanvasImageElement type), `isSelected`, `onSelect`, `onChange`
- **Client Component**: Yes
- **Dependencies**: `react-konva` (Image, Transformer)

#### CanvasShapeElement

- **File**: `components/features/canvas-editor/canvas-shape-element.tsx`
- **Description**: Shape elements (rectangles, circles, lines) on the Konva canvas with selection and transformation handles.
- **Key Props**: `element` (CanvasShapeElement type), `isSelected`, `onSelect`, `onChange`
- **Client Component**: Yes
- **Dependencies**: `react-konva` (Rect, Circle, Line, Transformer)

#### EditorTopActions

- **File**: `components/features/canvas-editor/editor-top-actions.tsx`
- **Description**: Top-right floating action bar with Reset, Save Template, Export, and Post to LinkedIn buttons.
- **Key Props**: `onReset`, `onSaveTemplate`, `onExport`, `onPostToLinkedIn`
- **Client Component**: Yes
- **Dependencies**: `Button`, `@tabler/icons-react`

#### EditorLeftPanel

- **File**: `components/features/canvas-editor/editor-left-panel.tsx`
- **Description**: Composes the icon rail with an animated expandable content area that shows the active panel (templates, AI, graphics, uploads, slides).
- **Key Props**: `activeTab` (LeftPanelTab | null), `onTabChange`, template/AI/graphics/upload/slide panel props
- **Client Component**: Yes
- **Dependencies**: `EditorIconRail`, `PanelTemplates`, `PanelAiGenerate`, `PanelGraphics`, `PanelUploads`, `PanelSlides`, `framer-motion`

#### EditorIconRail

- **File**: `components/features/canvas-editor/editor-icon-rail.tsx`
- **Description**: Vertical icon tab strip for the left panel with tooltips for Templates, AI, Graphics, Uploads, and Slides tabs.
- **Client Component**: Yes
- **Dependencies**: `Tooltip`, `@tabler/icons-react`

#### EditorFloatingToolbar

- **File**: `components/features/canvas-editor/editor-floating-toolbar.tsx`
- **Description**: Bottom-center floating toolbar with undo/redo, zoom controls, grid toggle, and slide navigation.
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `Button`, `Separator`, `Tooltip`, `@tabler/icons-react`

#### PropertyPanel

- **File**: `components/features/canvas-editor/property-panel.tsx`
- **Description**: Right sidebar for editing element and slide properties with collapsible sections, font previews, visual alignment buttons, typography controls, and color picker.
- **Client Component**: Yes
- **Dependencies**: `EnhancedColorPicker`, `Select`, `Input`, `Slider`, `Button`, `@tabler/icons-react`

#### PanelTemplates

- **File**: `components/features/canvas-editor/panel-templates.tsx`
- **Description**: Inline template browser for the editor left panel with search, category badges, and brand-kit template support.
- **Client Component**: Yes
- **Dependencies**: `Input`, `Badge`, `ScrollArea`, `useCarouselTemplates`, `useBrandKitTemplates`, `framer-motion`

#### PanelAiGenerate

- **File**: `components/features/canvas-editor/panel-ai-generate.tsx`
- **Description**: Inline AI content generator panel with topic input, visual tone selector, animated generation progress, and clear visual hierarchy.
- **Types**: `AiGenerationState`
- **Client Component**: Yes
- **Dependencies**: `Button`, `Label`, `Textarea`, `@tabler/icons-react`

#### PanelGraphics

- **File**: `components/features/canvas-editor/panel-graphics.tsx`
- **Description**: Inline graphics library with tabbed sections for Photos, Icons, and Shapes with search functionality and external source attribution.
- **Client Component**: Yes
- **Dependencies**: `Input`, `Badge`, `Button`, `ScrollArea`, `Tabs`

#### PanelUploads

- **File**: `components/features/canvas-editor/panel-uploads.tsx`
- **Description**: Drag-and-drop image upload panel supporting file selection, URL import, and uploaded image management.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Input`, `Label`, `ScrollArea`

#### PanelSlides

- **File**: `components/features/canvas-editor/panel-slides.tsx`
- **Description**: Enhanced slide manager with larger previews, drag reordering, context menu actions (duplicate, delete), and add slide button.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Badge`, `ScrollArea`, `ContextMenu`, `framer-motion`

#### AiContentGenerator

- **File**: `components/features/canvas-editor/ai-content-generator.tsx`
- **Description**: Simple dialog for generating content for the current template with topic input, tone selection, and slide preview.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Label`, `Textarea`

#### AiCarouselGenerator

- **File**: `components/features/canvas-editor/ai-carousel-generator.tsx`
- **Description**: Dialog for generating carousel slide content using AI with topic input, slide count, tone selection, and optional template application.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `Button`, `Input`, `Label`, `Textarea`, `@tabler/icons-react`

#### EnhancedAiCarouselGenerator

- **File**: `components/features/canvas-editor/enhanced-ai-carousel-generator.tsx`
- **Description**: Multi-step wizard dialog for AI-powered carousel content generation with step indicators, animated transitions, and template-aware generation.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `TemplateSelectionStep`, `TopicInputStep`, `ToneCtaStep`, `PreviewStep`

#### TemplateSelectionStep

- **File**: `components/features/canvas-editor/template-selection-step.tsx`
- **Description**: Step 1 of AI carousel generation wizard for selecting a base template.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Badge`

#### TopicInputStep

- **File**: `components/features/canvas-editor/topic-input-step.tsx`
- **Description**: Step 2 of AI carousel generation wizard for entering topic and context.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Input`, `Label`, `Textarea`, `Badge`

#### ToneCtaStep

- **File**: `components/features/canvas-editor/tone-cta-step.tsx`
- **Description**: Step 3 of AI carousel generation wizard for configuring tone and call-to-action.
- **Client Component**: Yes
- **Dependencies**: `Button`, `@tabler/icons-react`

#### PreviewStep

- **File**: `components/features/canvas-editor/preview-step.tsx`
- **Description**: Step 4 of AI carousel generation wizard for previewing and applying generated content.
- **Client Component**: Yes
- **Dependencies**: `Button`, `ScrollArea`

#### SaveTemplateDialog

- **File**: `components/features/canvas-editor/save-template-dialog.tsx`
- **Description**: Modal for saving the current carousel as a reusable template with category selection and custom category creation.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `Button`, `Input`, `Label`

#### PostToLinkedInDialog

- **File**: `components/features/canvas-editor/post-to-linkedin-dialog.tsx`
- **Description**: Two-panel compose dialog for posting carousel content to LinkedIn. Left panel: AI caption generation. Right panel: live LinkedIn-style preview with editable caption, formatting toolbar, and navigable carousel slides.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `Button`, `Avatar`, `@tabler/icons-react`

#### ExportDialog

- **File**: `components/features/canvas-editor/export-dialog.tsx`
- **Description**: Modal for configuring carousel export settings (PDF/PNG format, quality) and initiating download with progress indicator.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `Button`, `@tabler/icons-react`

#### TemplateSelectorModal

- **File**: `components/features/canvas-editor/template-selector-modal.tsx`
- **Description**: Full template browser modal with favorites, recently used, preview, category filtering, and Framer Motion animations for tab switching.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `framer-motion`, `@tabler/icons-react`

#### EnhancedColorPicker

- **File**: `components/features/canvas-editor/enhanced-color-picker.tsx`
- **Description**: Popover-based color picker with HSV spectrum, opacity slider, hex input, preset color palette, and recent colors history.
- **Client Component**: Yes
- **Dependencies**: `react-colorful` (HexColorPicker), `Popover`, `Button`, `Input`, `Slider`

### 5.5 Carousel Creator

#### CarouselCreator

- **File**: `components/features/carousel-creator.tsx`
- **Description**: Carousel builder for creating LinkedIn PDF carousel posts with slide management, theme selection, and export functionality.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Card`, `@tabler/icons-react`

#### CarouselDocumentPreview

- **File**: `components/features/carousel-document-preview.tsx`
- **Description**: LinkedIn-style carousel document preview with prev/next slide navigation, page counter, and remove button. Used in the post composer for attached carousels.
- **Key Props**: `slideImages` (string[]), `onRemove`, `className`
- **Client Component**: Yes
- **Dependencies**: `Button`, `next/image`

### 5.6 Template Library

Post template management system. Located in `components/features/template-library/`.

#### TemplateLibrary

- **File**: `components/features/template-library/template-library.tsx`
- **Description**: Full template management UI with dual grid/list views, search, category filter pills, sort, bulk select, Framer Motion animations, and kebab action menus.
- **Client Component**: Yes
- **Dependencies**: `TemplateCard`, `CategoryFilterBar`, `TemplateFormDialog`, `TemplatePreviewDialog`, `TemplateEmptyState`, `framer-motion`

#### TemplateLibrary (barrel export)

- **File**: `components/features/template-library/index.tsx`
- **Description**: Re-exports the main `TemplateLibrary` component and key types.

#### TemplateCard

- **File**: `components/features/template-library/template-card.tsx`
- **Description**: Individual template card with gradient background, category badge, kebab dropdown menu (edit, preview, duplicate, delete), bulk-select checkbox, and fixed height layout.
- **Server Component**: Yes (no "use client")
- **Dependencies**: `Badge`, `Checkbox`, `DropdownMenu`, `framer-motion`

#### TemplateGrid

- **File**: `components/features/template-library/template-grid.tsx`
- **Description**: Responsive grid layout wrapper for template cards (1/2/3 columns).
- **Key Props**: `children` (ReactNode)
- **Server Component**: Yes

#### TemplateFormDialog

- **File**: `components/features/template-library/template-form-dialog.tsx`
- **Description**: Create/edit template dialog with title, content, category selection, and inline "+ New Category" creation flow.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `Button`, `Input`, `Textarea`, `Checkbox`, `Select`

#### TemplatePreviewDialog

- **File**: `components/features/template-library/template-preview-dialog.tsx`
- **Description**: Modal dialog for previewing a template's full content with category badge, visibility indicator, and edit action.
- **Server Component**: Yes (no "use client")
- **Dependencies**: `Dialog`, `Badge`, `Button`

#### TemplateEmptyState

- **File**: `components/features/template-library/template-empty-state.tsx`
- **Description**: Friendly empty state shown when no templates match the current filter, with a "Create New" CTA.
- **Key Props**: `searchQuery`, `categoryFilter`, `onCreateNew`
- **Server Component**: Yes (no "use client")
- **Dependencies**: `Button`, `@tabler/icons-react`

#### TemplateGridSkeleton

- **File**: `components/features/template-library/template-grid-skeleton.tsx`
- **Description**: Loading skeleton placeholder for the template grid.
- **Server Component**: Yes (no "use client")
- **Dependencies**: `Skeleton`

#### CategoryFilterBar

- **File**: `components/features/template-library/category-filter-bar.tsx`
- **Description**: Horizontal scrollable pills for filtering templates by category with an inline "+" button to manage custom categories via a popover.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Input`, `Popover`

#### AITemplatesSection

- **File**: `components/features/template-library/ai-templates-section.tsx`
- **Description**: Unified AI template section with grid/list views, category filter pills, search, and stagger animations. Merges hardcoded templates with dynamically generated ones.
- **Client Component**: Yes
- **Dependencies**: `Input`, `AITemplateCard`, `framer-motion`

#### AITemplateCard

- **File**: `components/features/template-library/ai-template-card.tsx`
- **Description**: AI template card with gradient background, category badge with dot, and kebab menu for copy/use actions. Available in card and row variants.
- **Server Component**: Yes (no "use client")
- **Dependencies**: `Badge`, `DropdownMenu`

### 5.7 Discover & Inspiration

#### DiscoverNewsCard

- **File**: `components/features/discover-news-card.tsx`
- **Description**: Perplexity-sourced news article card with compact and featured variants, clickable to open detail dialog.
- **Key Props**: `article` (NewsArticle), `onRemix`, `onOpenDetail`, `variant` ("compact" | "featured")
- **Client Component**: Yes
- **Dependencies**: `Badge`, `Button`

#### DiscoverTrendingSidebar

- **File**: `components/features/discover-trending-sidebar.tsx`
- **Description**: Right sidebar for the discover page showing top headlines and trending topic chips.
- **Key Props**: `articles`, `topics`, `activeTopic`, `onTopicClick`
- **Client Component**: Yes
- **Dependencies**: `Badge`

#### DiscoverContentCard

- **File**: `components/features/discover-content-card.tsx`
- **Description**: Enhanced content card with author profile, engagement metrics, expandable content, and action buttons (like, comment, remix, save).
- **Client Component**: Yes
- **Dependencies**: `Avatar`, `Badge`, `Button`, `date-fns`

#### DiscoverNewsItem

- **File**: `components/features/discover-news-item.tsx`
- **Description**: Single news/article item in compact or featured variant for the LinkedIn-style discover feed with markdown content rendering.
- **Client Component**: Yes
- **Dependencies**: `Avatar`, `Badge`, `Button`, `MarkdownContent`

#### ArticleDetailDialog

- **File**: `components/features/article-detail-dialog.tsx`
- **Description**: Full-screen dialog displaying complete article details including headline, summary, source citations, relevance tags, and remix action button.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `Badge`, `Button`

#### ResearchSection

- **File**: `components/features/research-section.tsx`
- **Description**: Deep research interface using Inngest workflow for discovering content. Uses Tavily for search, Perplexity for enrichment, and OpenAI for post generation. Features real-time progress tracking.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Card`, `@tabler/icons-react`

#### InspirationFeed

- **File**: `components/features/inspiration-feed.tsx`
- **Description**: Curated grid of viral LinkedIn posts with search, category filtering, bookmark support, and pagination with stagger animations.
- **Client Component**: Yes
- **Dependencies**: `Badge`, `Button`, `Card`, `Input`, `framer-motion`

#### InspirationPostCard

- **File**: `components/features/inspiration-post-card.tsx`
- **Description**: Card for displaying viral posts with author avatar, engagement metrics overlay, bookmark toggle, remix button, and follow/unfollow influencer action.
- **Client Component**: Yes
- **Dependencies**: `Avatar`, `Badge`, `Button`, `framer-motion`, `date-fns`

#### FollowInfluencerDialog

- **File**: `components/features/follow-influencer-dialog.tsx`
- **Description**: Modal dialog for following a new LinkedIn influencer by URL with validation and loading states.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `Button`, `Input`

#### FollowedInfluencersPanel

- **File**: `components/features/followed-influencers-panel.tsx`
- **Description**: Instagram Stories-style horizontal avatar feed showing followed LinkedIn influencers with gradient ring indicators for new posts and selection support for feed filtering.
- **Client Component**: Yes
- **Dependencies**: `Avatar`, `Badge`, `FollowInfluencerDialog`

#### ManageTopicsModal

- **File**: `components/features/manage-topics-modal.tsx`
- **Description**: Modal for managing user's followed topics in the Discover page with add, remove, and reorder support.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `Button`, `Input`, `Label`

#### TopicSelectionOverlay

- **File**: `components/features/topic-selection-overlay.tsx`
- **Description**: Full-screen overlay for first-time topic selection on the Discover page. Users select 3-10 topics to personalize their content feed.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Badge`, `@tabler/icons-react`

### 5.8 Swipe Interface

#### SwipeCard

- **File**: `components/features/swipe-card.tsx`
- **Description**: Tinder-style swipe card for AI-generated post suggestions with rich animations, engagement prediction badges, and accept/reject gestures.
- **Key Types**: `SwipeCardData` (id, content, topic, postType, tone, engagementScore, tags)
- **Client Component**: Yes
- **Dependencies**: `Badge`, `Card`, `framer-motion`

### 5.9 Team Management

#### TeamManagement

- **File**: `components/features/team-management.tsx`
- **Description**: Main team management UI with tabbed views for members, pending invitations, and settings.
- **Client Component**: Yes
- **Dependencies**: `Badge`, `Button`, `Card`, `Tabs`, `Avatar`

#### TeamHeader

- **File**: `components/features/team-header.tsx`
- **Description**: Floating card-style team header with gradient banner, brand kit logo, team name, member count, and action dropdown (invite, settings, leave team).
- **Client Component**: Yes
- **Dependencies**: `Button`, `Badge`, `DropdownMenu`, `Avatar`

#### TeamMemberList

- **File**: `components/features/team-member-list.tsx`
- **Description**: List of team members with role badges (owner, admin, member), role change dropdown, and remove member action.
- **Client Component**: Yes
- **Dependencies**: `Avatar`, `Badge`, `Button`, `DropdownMenu`, `date-fns`

#### TeamMembersPreview

- **File**: `components/features/team-members-preview.tsx`
- **Description**: Quick preview card with avatar stack, role badges, and member count for the team overview.
- **Client Component**: Yes
- **Dependencies**: `Avatar`, `Card`, `Badge`, `Skeleton`, `Tooltip`

#### TeamSettingsPanel

- **File**: `components/features/team-settings-panel.tsx`
- **Description**: Settings panel for team configuration including general info, company info, quick actions, danger zone, and inline team name editing for admins/owners.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Card`, `Input`, `@tabler/icons-react`, `sonner`

#### TeamSearch

- **File**: `components/features/team-search.tsx`
- **Description**: Debounced search for discoverable teams with result list. Used in the member onboarding join flow.
- **Client Component**: Yes
- **Dependencies**: `Input`, `Button`, `Avatar`

#### NoTeamState

- **File**: `components/features/no-team-state.tsx`
- **Description**: Empty state when user has no team. Shows pending join request status for individual users and team creation option for organization users.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Input`, `Card`, `date-fns`, `sonner`

#### InviteTeamModal

- **File**: `components/features/invite-team-modal.tsx`
- **Description**: Modal for inviting team members via email with multi-email input, role selection, and batch sending.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `Button`, `Input`

#### InviteTeamDialog

- **File**: `components/features/invite-team-dialog.tsx`
- **Description**: Simplified dialog variant for inviting a single team member via email with validation and status feedback.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `Button`, `Input`, `sonner`

#### InviteTeammatesForm

- **File**: `components/features/invite-teammates-form.tsx`
- **Description**: Multi-row form for inviting team members via email during the onboarding flow.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Input`, `@tabler/icons-react`

#### PendingInvitations

- **File**: `components/features/pending-invitations.tsx`
- **Description**: Table/list of pending team invitations with role badges, expiration timestamps, and resend/cancel actions.
- **Client Component**: Yes
- **Dependencies**: `Avatar`, `Badge`, `Button`, `DropdownMenu`, `date-fns`

#### PendingInvitationsCard

- **File**: `components/features/pending-invitations-card.tsx`
- **Description**: Card view of pending invitations with quick resend and cancel actions.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Card`, `Badge`, `sonner`

#### PendingApprovalScreen

- **File**: `components/features/pending-approval-screen.tsx`
- **Description**: Animated waiting screen shown while a join request is pending. Polls status every 10 seconds and auto-redirects on approval.
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `Button`, `sonner`, `useRouter`

#### JoinRequestsList

- **File**: `components/features/join-requests-list.tsx`
- **Description**: Admin view of pending team join requests with approve/reject action buttons.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Avatar`, `date-fns`

### 5.10 Onboarding

#### OnboardingProgress

- **File**: `components/OnboardingProgress.tsx`
- **Description**: Step-by-step progress indicator with labels (Connect, Company, Brand Kit, Review), animated transitions, and responsive design (dots-only on mobile, full labels on desktop).
- **Key Props**: `step` (1-based current step), `totalSteps`
- **Client Component**: Yes
- **Dependencies**: `lucide-react` (Check)

#### ConnectTools

- **File**: `components/ConnectTools.tsx`
- **Description**: Onboarding tool connection card for LinkedIn OAuth. Shows connection status, handles OAuth flow callbacks, and provides reconnect functionality.
- **Key Props**: `onLinkedInStatusChange`, callback for save state
- **Client Component**: Yes
- **Dependencies**: `Card`, `Button`, `Badge`, `Alert`, `sonner`

#### SignupForm

- **File**: `components/signup-form.tsx`
- **Description**: Form collecting name and email for onboarding with prefilled values and change callback.
- **Key Props**: `fullname`, `email`, `onChange`, `error`
- **Client Component**: Yes
- **Dependencies**: `Card`, `Field`, `Input`

#### CompanyOnboardingForm

- **File**: `components/features/company-onboarding-form.tsx`
- **Description**: Comprehensive company context form for onboarding with AI-powered website analysis to auto-populate fields (industry, target audience, value proposition, etc.). Uses react-hook-form with Zod validation.
- **Client Component**: Yes
- **Dependencies**: `react-hook-form`, `zod`, `Button`, `Card`, `Input`, `@tabler/icons-react`

#### CompanySetupForm

- **File**: `components/features/company-setup-form.tsx`
- **Description**: Form for creating a new company during onboarding with logo upload, name, and initial configuration.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Card`, `Input`, `Label`, `useCompany` hook

#### ExtensionInstallPrompt

- **File**: `components/features/extension-install-prompt.tsx`
- **Description**: Dismissible dialog prompting users to install the ChainLinked Chrome extension with feature highlights and download button.
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `Button`, `@tabler/icons-react`

### 5.11 Brand Kit & Settings

#### BrandKitPreview

- **File**: `components/features/brand-kit-preview.tsx`
- **Description**: Displays and edits extracted brand colors, fonts, and logo. Supports logo upload, color swatch editing, and font selection.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Card`, `Input`, `Label`, `next/image`

#### ApiKeySettings

- **File**: `components/features/api-key-settings.tsx`
- **Description**: BYOK (Bring Your Own Key) setup for OpenAI API keys with masked display, validation, save/delete actions, and status indicators.
- **Client Component**: Yes
- **Dependencies**: `Badge`, `Button`, `Card`, `Input`

#### LinkedInStatusBadge

- **File**: `components/features/linkedin-status-badge.tsx`
- **Description**: Badge displaying LinkedIn OAuth connection status (connected, expired, disconnected) with tooltip details and reconnect button.
- **Client Component**: Yes
- **Dependencies**: `Badge`, `Button`, `Tooltip`

#### FontPicker

- **File**: `components/features/font-picker.tsx`
- **Description**: Popover-based Unicode font style selector for the compose toolbar. Supports bold, italic, script, monospace, and double-struck LinkedIn-compatible formatting.
- **Client Component**: Yes
- **Dependencies**: `Popover`, `Button`, `@/lib/unicode-fonts`

#### DefaultHashtagsEditor

- **File**: `components/features/default-hashtags-editor.tsx`
- **Description**: UI for managing default hashtags that can be quickly added to posts. Persisted in Supabase with localStorage as a fast read cache.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Input`, `createClient` (Supabase), `useAuthContext`

#### ContentRulesEditor

- **File**: `components/features/content-rules-editor.tsx`
- **Description**: UI for managing AI content rules (adding, toggling, removing). Rules are injected into AI prompts as mandatory writing guidelines.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Input`, `sonner`

#### GoalsTracker

- **File**: `components/features/goals-tracker.tsx`
- **Description**: Posting goals tracker with progress bars, streak display, kebab action menus, and dialog-based goal editing.
- **Client Component**: Yes
- **Dependencies**: `Badge`, `Button`, `Card`, `Dialog`, `Progress`, `@tabler/icons-react`

### 5.12 AI & Prompts

#### AiGenerationDialog

- **File**: `components/features/ai-generation-dialog.tsx`
- **Description**: Modal for configuring and generating LinkedIn posts with AI, including post type selection for type-specific prompt templates.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `Button`, `Textarea`, `PostTypeSelector`

#### AiInlinePanel

- **File**: `components/features/ai-inline-panel.tsx`
- **Description**: Collapsible inline panel for AI post generation that replaces the modal approach. Provides topic, tone, and length options without leaving the editor context.
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `Button`, `Label`, `Textarea`

#### PromptPlayground

- **File**: `components/features/prompt-playground.tsx`
- **Description**: Interactive prompt testing surface with variable management, template library, response comparison, model parameter controls, run history, raw JSON output, export functionality, and database integration for prompt versioning.
- **Client Component**: Yes
- **Dependencies**: `Button`, `Card`, `Tabs`, `Input`, `Textarea`, `Select`, `@tabler/icons-react`

#### PromptAnalytics

- **File**: `components/features/prompt-analytics.tsx`
- **Description**: Dashboard for prompt usage statistics and metrics with time range filtering, usage charts, and per-feature breakdowns.
- **Client Component**: Yes
- **Dependencies**: `Card`, `Badge`, `usePromptAnalytics`, `usePromptAnalyticsWithRange`

#### PromptDiffViewer

- **File**: `components/features/prompt-diff-viewer.tsx`
- **Description**: Side-by-side comparison of two prompt versions with line-level diff highlighting, copy button, and version metadata.
- **Client Component**: Yes
- **Dependencies**: `Badge`, `ScrollArea`, `Button`, `date-fns`

#### PromptVersionHistory

- **File**: `components/features/prompt-version-history.tsx`
- **Description**: Version history list with diff view selection (checkboxes for comparing two versions), rollback capability, and metadata display (author, timestamp, activation status).
- **Client Component**: Yes
- **Dependencies**: `Button`, `Badge`, `ScrollArea`, `Skeleton`, `Checkbox`, `usePromptVersions`

### 5.13 Scheduling & Drafts

#### RemixModal

- **File**: `components/features/remix-modal.tsx`
- **Description**: Modal for AI-powered post remix with tone selection, custom instructions, and advanced settings.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `Button`, `@tabler/icons-react`, `useRouter`

#### RemixDialog

- **File**: `components/features/remix-dialog.tsx`
- **Description**: Simplified remix dialog that generates a remixed version and automatically navigates to the Composer with the content loaded.
- **Client Component**: Yes
- **Dependencies**: `Dialog`, `Button`

#### RemixPostButton

- **File**: `components/features/remix-post-button.tsx`
- **Description**: Self-contained button that opens RemixDialog for a given post. On successful remix, loads the result into the draft context and navigates to the Composer.
- **Client Component**: Yes
- **Dependencies**: `Button`, `RemixDialog`, `useDraft`, `useApiKeys`

#### MentionPopover

- **File**: `components/features/mention-popover.tsx`
- **Description**: Floating autocomplete dropdown for @mentioning people in the post composer. Appears when user types "@", filters as they type, and supports keyboard navigation.
- **Key Types**: `MentionSuggestion` (name, urn, headline, avatarUrl)
- **Client Component**: Yes
- **Dependencies**: `Avatar`, `@/lib/extension/linkedin-search`

#### MyRecentPosts

- **File**: `components/features/my-recent-posts.tsx`
- **Description**: Grid of user's recent LinkedIn posts with popup detail view. Shared between Dashboard and Analytics pages. Fetches data from Supabase.
- **Client Component**: Yes
- **Dependencies**: `Card`, `Avatar`, `Skeleton`, `Dialog`, `framer-motion`, `createClient` (Supabase)

#### GenerationProgress

- **File**: `components/features/generation-progress.tsx`
- **Description**: Multi-step progress indicator for AI suggestion generation with animated step transitions, progress bar, and error/success states.
- **Client Component**: Yes
- **Dependencies**: `Progress`, `Button`, `Card`, `framer-motion`

### 5.14 Dashboard Tour

Located in `components/features/dashboard-tour/`.

#### DashboardTour

- **File**: `components/features/dashboard-tour/dashboard-tour.tsx`
- **Description**: Main orchestrator that renders the tour overlay and tooltip via a portal to document.body. Manages tour state through the `useDashboardTour` hook.
- **Client Component**: Yes
- **Dependencies**: `TourOverlay`, `TourTooltip`, `useDashboardTour`, `framer-motion`, `createPortal`

#### TourOverlay

- **File**: `components/features/dashboard-tour/tour-overlay.tsx`
- **Description**: Full-screen SVG spotlight overlay with animated cutout highlighting the target element. Pointer-events are disabled so the tooltip remains interactive.
- **Key Types**: `TargetRect` (top, left, width, height)
- **Client Component**: Yes
- **Dependencies**: `framer-motion`

#### TourTooltip

- **File**: `components/features/dashboard-tour/tour-tooltip.tsx`
- **Description**: Floating tooltip card with step title/description, navigation dots, and Next/Skip controls. Auto-positions relative to the target element within viewport bounds.
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `Button`

---

## 6. Shared Components

Reusable components used across multiple features. Located in `components/shared/`.

### CrossNav

- **File**: `components/shared/cross-nav.tsx`
- **Description**: "Related Pages" navigation row that eliminates dead-end pages by providing contextual navigation links to related sections. Features colored card variants with stagger animations.
- **Key Props**: `items` (array of `{ title, description, href, icon, color }`)
- **Client Component**: Yes
- **Dependencies**: `Card`, `framer-motion`, `@/lib/animations`

### EmptyState

- **File**: `components/shared/empty-state.tsx`
- **Description**: Reusable empty state placeholder with icon, title, description, and optional primary/secondary CTAs. Features staggered entrance animations (icon bounce, text fade-slide, button reveal).
- **Key Props**: `icon` (Tabler Icon), `title`, `description`, `action` ({label, href/onClick}), `secondaryAction`
- **Client Component**: Yes
- **Dependencies**: `Button`, `framer-motion`

### LottieEmptyState

- **File**: `components/shared/lottie-empty-state.tsx`
- **Description**: Animated empty state using a Lottie bar-chart-growing animation for pages where data hasn't been synced yet. Lazy-loads the Lottie renderer.
- **Key Props**: `title`, `description`, `animationData` (optional custom Lottie JSON)
- **Client Component**: Yes
- **Dependencies**: `lottie-react` (lazy), `Card`, `Skeleton`, `framer-motion`

### AnimatedNumber

- **File**: `components/shared/animated-number.tsx`
- **Description**: Animated number counter with spring physics. Used across analytics summary bar, analytics cards, and dashboard metrics.
- **Key Props**: `value`, `decimals` (default 0), `suffix` (e.g., "%"), `prefix` (e.g., "$")
- **Client Component**: Yes
- **Dependencies**: `framer-motion` (useSpring, useTransform)

### MarkdownContent

- **File**: `components/shared/markdown-content.tsx`
- **Description**: Renders markdown-formatted text as properly styled HTML with Tailwind typography classes. Strips Perplexity-style citation references. Supports max-lines truncation with fade overlay and compact mode.
- **Key Props**: `content` (markdown string), `maxLines`, `compact`
- **Client Component**: Yes
- **Dependencies**: `react-markdown`

### PageContent

- **File**: `components/shared/page-content.tsx`
- **Description**: Standardized content wrapper for dashboard pages with consistent spacing. Page entrance animations are handled globally by `PageTransition`.
- **Key Props**: `children`, `className`
- **Client Component**: Yes
- **Dependencies**: `@/lib/utils`

---

## 7. Utility / Provider Components

Infrastructure components that provide context and services.

### Providers

- **File**: `components/providers.tsx`
- **Description**: Global provider wrapper composing all application-wide context providers in the correct order: ThemeProvider, AuthProvider, PostHogProvider, ApiKeysProvider, DraftProvider.
- **Key Props**: `children`
- **Client Component**: Yes
- **Dependencies**: `next-themes`, `Toaster`, `PostHogProvider`, `TooltipProvider`, `DraftProvider`, `AuthProvider`, `ApiKeysProvider`

### PostHogProvider

- **File**: `components/posthog-provider.tsx`
- **Description**: Initializes PostHog analytics with session replay, network recording, console log capture, performance monitoring, and user identification sync.
- **Key Props**: `children`
- **Client Component**: Yes
- **Dependencies**: `posthog-js`, `posthog-js/react`, `useAuthContext`

### PageTransition

- **File**: `components/page-transition.tsx`
- **Description**: Smooth page transition wrapper using Framer Motion's AnimatePresence. Uses inline animation objects (not variant labels) to prevent animation propagation to child motion components.
- **Key Props**: `children`, `className`
- **Client Component**: Yes
- **Dependencies**: `framer-motion`, `usePathname`

### ErrorBoundary

- **File**: `components/error-boundary.tsx`
- **Description**: React class-based error boundary that catches rendering errors and displays a friendly fallback UI with retry button.
- **Key Props**: `children`, `fallback` (optional), `onError` callback
- **Client Component**: Yes
- **Dependencies**: `Button`, `Card`

### SectionCards

- **File**: `components/section-cards.tsx`
- **Description**: Grid of summary stat cards displaying key metrics (revenue, customers, accounts, growth rate) with trend indicators and percentage badges. Demo/scaffold component.
- **Server Component**: Yes
- **Dependencies**: `Badge`, `Card`

### ChartAreaInteractive

- **File**: `components/chart-area-interactive.tsx`
- **Description**: Time-series area chart with desktop/mobile data series, configurable date range selector, and responsive mobile toggle. Demo/scaffold component.
- **Client Component**: Yes
- **Dependencies**: `recharts`, `Card`, `ChartContainer`, `Select`, `useIsMobile`

### DataTable

- **File**: `components/data-table.tsx`
- **Description**: Feature-rich data table built on TanStack React Table with drag-and-drop row reordering (dnd-kit), column visibility toggles, sorting, filtering, pagination, and expandable row details.
- **Client Component**: Yes
- **Dependencies**: `@tanstack/react-table`, `@dnd-kit/core`, `@dnd-kit/sortable`, `Table`, `Button`, `DropdownMenu`, `Tabs`

### AiAnalysis

- **File**: `components/AiAnalysis.tsx`
- **Description**: Rich text editor for reviewing AI-generated onboarding analysis using Lexical. Supports markdown import, formatting toolbar (bold, italic, headings, lists, code blocks), and export to markdown.
- **Client Component**: Yes
- **Dependencies**: `@lexical/react`, `@lexical/rich-text`, `@lexical/list`, `@lexical/code`, `@lexical/link`, `@lexical/markdown`, `Button`, `Tooltip`

### SessionReplayDebug

- **File**: `components/debug/session-replay-debug.tsx`
- **Description**: Development-only debug panel for monitoring PostHog session replay status with start/stop controls. Only renders in development mode.
- **Client Component**: Yes
- **Dependencies**: `@/lib/analytics`
