# ChainLinked Development Rules

## Project Overview
ChainLinked is a LinkedIn content management platform for teams. This project uses Next.js 16, React 19, shadcn/ui components, Tailwind CSS v4, Recharts, and Supabase.

## Technology Stack
- **Framework**: Next.js 16.1.1 with App Router
- **UI Library**: React 19.2.3
- **Components**: shadcn/ui (new-york style)
- **Styling**: Tailwind CSS v4 with CSS variables
- **Charts**: Recharts 2.15.4
- **Database**: Supabase PostgreSQL
- **Icons**: Tabler Icons + Lucide React
- **State Management**: React hooks (useState, useContext)
- **Form Validation**: Zod
- **Tables**: TanStack React Table

## Code Standards

### JSDoc Documentation
All functions, components, and types MUST have JSDoc documentation:

```typescript
/**
 * Component description explaining its purpose
 * @param props - Component props
 * @param props.propName - Description of the prop
 * @returns JSX element description
 * @example
 * <ComponentName propName="value" />
 */
```

### File Structure
```
app/
  (routes)/
    page.tsx          # Page component
    layout.tsx        # Layout if needed
    loading.tsx       # Loading state
    error.tsx         # Error boundary
components/
  ui/                 # shadcn/ui components
  features/           # Feature-specific components
  shared/             # Shared/reusable components
lib/
  supabase/          # Supabase client and utilities
  utils.ts           # Utility functions
  constants.ts       # App constants
hooks/               # Custom React hooks
types/               # TypeScript type definitions
```

### Component Guidelines
1. Use "use client" directive only when interactivity is needed
2. Prefer Server Components for data fetching
3. Keep components small and focused (single responsibility)
4. Use compound component patterns for complex UI
5. Extract reusable logic into custom hooks

### Naming Conventions
- **Files**: kebab-case (e.g., `post-composer.tsx`)
- **Components**: PascalCase (e.g., `PostComposer`)
- **Functions**: camelCase (e.g., `handleSubmit`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_POST_LENGTH`)
- **Types/Interfaces**: PascalCase with descriptive names (e.g., `PostAnalyticsData`)

### TypeScript Requirements
1. Strict mode enabled
2. No `any` types (use `unknown` if type is truly unknown)
3. All props must be typed
4. Use type inference where obvious
5. Export types from dedicated type files

### Styling Guidelines
1. Use Tailwind CSS utility classes
2. Use CSS variables for theming (defined in globals.css)
3. Use container queries for responsive design (@container)
4. Follow mobile-first approach
5. Use cn() utility for conditional classes

### Error Handling
1. Use try-catch for async operations
2. Display user-friendly error messages via toast (sonner)
3. Log errors for debugging
4. Implement proper loading states
5. Use error boundaries for component-level errors

### Performance
1. Use React.memo for expensive pure components
2. Use useMemo/useCallback appropriately
3. Implement pagination for large datasets
4. Use Suspense for code splitting
5. Optimize images with next/image

### Supabase Integration
1. Use server-side client for data fetching in Server Components
2. Use browser client for real-time subscriptions and client mutations
3. Always handle Supabase errors gracefully
4. Use Row Level Security (RLS) policies
5. Type database responses with generated types

### Testing Checklist (QA)
Before committing any feature:
- [ ] Component renders without errors
- [ ] All props are properly typed
- [ ] Loading states work correctly
- [ ] Error states are handled
- [ ] Responsive design works (mobile, tablet, desktop)
- [ ] Dark mode works correctly
- [ ] Accessibility basics (focus states, aria labels)
- [ ] No console errors or warnings
- [ ] Build succeeds without errors

### Git Commit Standards
- Use conventional commits format
- Commit message format: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore
- Example: `feat(analytics): add personal analytics dashboard`

### Feature Development Workflow
1. Read the Linear issue requirements
2. Design component structure
3. Implement with proper types and JSDoc
4. Add loading and error states
5. Test all functionality
6. Run build to verify no errors
7. Commit with conventional commit message
8. Update CHANGELOG.md

## Supabase Configuration
- Project ID: baurjucvzdboavbcuxjh
- URL: https://baurjucvzdboavbcuxjh.supabase.co
- Region: ap-south-1
- Environment variables should be in .env.local

## Database Tables (from LinkedIn extension)
- users
- linkedin_profiles
- linkedin_analytics
- analytics_history
- post_analytics
- audience_data
- audience_history
- connections
- feed_posts
- my_posts
- comments
- followers
- captured_apis
- capture_stats
- extension_settings
- sync_metadata

## Chart Colors (from CSS variables)
- chart-1: Primary analytics color
- chart-2: Secondary analytics color
- chart-3: Tertiary color
- chart-4: Quaternary color
- chart-5: Quinary color

## Key Features to Implement
1. Analytics Dashboard - Personal and team performance tracking
2. Team Activity Feed - Real-time teammate posts and metrics
3. Post Composer - Rich text editor with LinkedIn preview
4. Post Queue/Scheduling - pg_cron based scheduling
5. Swipe Interface - Tinder-style post suggestions
6. Inspiration Tab - Curated viral posts
7. Settings Screens - Profile, team, notifications
8. Template Library - CRUD for post templates
9. Carousel Creator - PDF export for LinkedIn carousels
