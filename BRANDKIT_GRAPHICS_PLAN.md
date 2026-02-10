# Implementation Plan: Brand Kit Templates & Graphics Library

## Overview
Two features to implement:
1. **Brand Kit Custom Templates** - Auto-generate carousel templates from a saved brand kit (using extracted logo, fonts, colors)
2. **Graphics/Image Library** - An open-source image/icon/shape library (like Canva's) integrated into the carousel editor

---

## Feature 1: Brand Kit Custom Template Generator

### Goal
When a user saves a brand kit (with colors, fonts, logo), automatically generate a set of carousel templates that use those exact brand assets. These appear as "Your Brand" templates in the template selector.

### Files to Create
1. `lib/canvas-templates/brand-kit-template-generator.ts` - Core function that takes a BrandKit and produces CanvasTemplate[] (5 template variants)
2. `hooks/use-brand-kit-templates.ts` - Hook that fetches active brand kit and generates templates

### Files to Modify
1. `components/features/canvas-editor/template-selector-modal.tsx` - Add a "Your Brand" tab/section showing brand-kit-generated templates
2. `lib/canvas-templates/index.ts` - Export the generator utility
3. `types/canvas-editor.ts` - Add 'brand' to TemplateCategory union type

### Template Variants to Generate (5 templates per brand kit)
Each variant reuses the brand kit's `primaryColor`, `secondaryColor`, `accentColor`, `backgroundColor`, `textColor`, `fontPrimary`, `fontSecondary`, and `logoUrl`.

1. **Brand Professional** - Clean layout: logo top-left, primary color title slide bg, white content slides, accent dividers
2. **Brand Bold** - Dark background, large text in primaryColor accent highlights, logo watermark bottom-right
3. **Brand Minimal** - White bg, text in textColor, thin primaryColor accent lines, logo top-left, lots of whitespace
4. **Brand Story** - Narrative arc style: hook slide with primary bg + logo, content slides with subtle brand color borders, CTA slide with accent bg
5. **Brand Data** - Data/stats focused: dark bg, primaryColor for big stat numbers, accentColor tags, logo in footer

### How It Works
```
BrandKit (from Supabase via /api/brand-kit)
  -> brandKitTemplateGenerator(brandKit)
  -> CanvasTemplate[] (5 variants)
  -> Shown in "Your Brand" section of template selector modal
```

### Template Generation Logic
- Each template is a function that takes a BrandKit object and returns a CanvasTemplate
- Logo is placed as a CanvasImageElement (using logoUrl) on title and CTA slides
- Font family mapped from brandKit.fontPrimary -> headings, fontSecondary -> body text (fallback to 'Inter' if null)
- Colors mapped: primaryColor -> hero backgrounds & accent shapes, secondaryColor -> subtitles, accentColor -> tags/badges, backgroundColor -> content slide bg, textColor -> body text
- Each slide gets a consistent bottom bar or accent element with brand color

---

## Feature 2: Open-Source Graphics/Image Library

### Goal
Provide a Canva-like image/graphics browser inside the carousel editor. Users can search and insert free images, icons, and shapes into their carousel slides.

### API Integration
Use **Unsplash API** (free tier, 50 req/hr) for photos and curated icon/shape collections from Tabler + Lucide (already in the project).

### Files to Create
1. `types/graphics-library.ts` - Types for graphics library (UnsplashImage, IconAsset, ShapeAsset)
2. `app/api/graphics-library/route.ts` - API route that proxies Unsplash search (keeps API key server-side)
3. `lib/graphics-library/unsplash.ts` - Unsplash API client wrapper
4. `lib/graphics-library/icon-collection.ts` - Curated set of ~80 SVG icons for carousel use (arrows, business, charts, social, etc.)
5. `lib/graphics-library/shape-collection.ts` - Pre-built decorative shapes (dividers, badges, banners, frames)
6. `hooks/use-graphics-library.ts` - Hook for searching Unsplash + browsing icons/shapes
7. `components/features/canvas-editor/graphics-library-panel.tsx` - Main panel UI with Photos/Icons/Shapes tabs

### Files to Modify
1. `components/features/canvas-editor/canvas-editor.tsx` - Add graphics panel state, toggle, wire insertion
2. `components/features/canvas-editor/canvas-toolbar.tsx` - Add "Graphics" button to toolbar

### Graphics Library Panel Layout
- Tabs: Photos | Icons | Shapes
- Search bar at top (searches Unsplash for photos, filters icons/shapes by name)
- Responsive grid of thumbnails (4 columns)
- Click to insert element onto current slide
- "Load More" pagination for Unsplash results
- Category quick-filters per tab

### Photos Tab
- Search powered by Unsplash API via `/api/graphics-library?q=...`
- Display thumbnail grid
- Click to insert as CanvasImageElement on current slide
- Attribution line (Unsplash TOS)
- Quick categories: Business, Technology, Nature, People, Abstract, Workspace

### Icons Tab
- Curated collection rendered as SVG data URLs
- Categories: Business, Social Media, Arrows, Communication, Charts, General
- Search by icon name
- Click to insert as CanvasImageElement (inline SVG data URL)

### Shapes Tab
- Pre-built decorative elements (CanvasShapeElement configs)
- Categories: Dividers, Badges/Labels, Frames, Arrows, Decorative
- Click to insert as CanvasShapeElement on current slide

---

## Parallel Agent Assignment

### Agent 1: Brand Kit Template Generator
1. Add 'brand' to TemplateCategory type in `types/canvas-editor.ts`
2. Create `lib/canvas-templates/brand-kit-template-generator.ts` with 5 full template generators
3. Create `hooks/use-brand-kit-templates.ts`
4. Modify `components/features/canvas-editor/template-selector-modal.tsx` to show "Your Brand" section
5. Update `lib/canvas-templates/index.ts` exports

### Agent 2: Graphics Library
1. Create `types/graphics-library.ts`
2. Create `lib/graphics-library/unsplash.ts`
3. Create `lib/graphics-library/icon-collection.ts`
4. Create `lib/graphics-library/shape-collection.ts`
5. Create `app/api/graphics-library/route.ts`
6. Create `hooks/use-graphics-library.ts`
7. Create `components/features/canvas-editor/graphics-library-panel.tsx`
8. Modify `components/features/canvas-editor/canvas-editor.tsx` to wire graphics panel
9. Modify `components/features/canvas-editor/canvas-toolbar.tsx` to add button

---

## Environment Variables Needed
```
UNSPLASH_ACCESS_KEY=<unsplash-access-key>
```

## No Database Changes Required
- Brand kit templates are generated on-the-fly from existing brand_kits table
- Graphics library is stateless (Unsplash API + bundled icons/shapes)
