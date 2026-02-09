/**
 * Brand Kit Template Generator
 * Auto-generates 5 carousel template variants from a user's saved brand kit.
 * Each variant has a distinct visual style while using the brand's colors, fonts, and logo.
 * @module lib/canvas-templates/brand-kit-template-generator
 */

import type { BrandKit } from '@/types/brand-kit'
import type {
  CanvasTemplate,
  CanvasSlide,
  CanvasElement,
  CanvasTextElement,
  CanvasShapeElement,
  CanvasImageElement,
} from '@/types/canvas-editor'

/**
 * Resolved brand kit values with all nulls replaced by sensible defaults.
 * Used internally to avoid null-checking throughout the generator functions.
 */
interface ResolvedBrandKit {
  /** Primary brand color (hex) - always present */
  primaryColor: string
  /** Secondary brand color (hex) - fallback: lighter primary */
  secondaryColor: string
  /** Accent color (hex) - fallback: primary */
  accentColor: string
  /** Background color (hex) - fallback: #ffffff */
  backgroundColor: string
  /** Text color (hex) - fallback: #1a1a1a */
  textColor: string
  /** Primary font family - fallback: Inter */
  fontPrimary: string
  /** Secondary font family - fallback: Inter */
  fontSecondary: string
  /** Logo URL or null if no logo */
  logoUrl: string | null
}

/**
 * Lightens a hex color by a given amount.
 * Used to generate fallback secondary colors from the primary color.
 * @param hex - Hex color string (e.g., '#3b82f6')
 * @param amount - Amount to lighten (0-255)
 * @returns Lightened hex color string
 */
function lightenColor(hex: string, amount: number): string {
  const sanitized = hex.replace('#', '')
  const r = Math.min(255, parseInt(sanitized.substring(0, 2), 16) + amount)
  const g = Math.min(255, parseInt(sanitized.substring(2, 4), 16) + amount)
  const b = Math.min(255, parseInt(sanitized.substring(4, 6), 16) + amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Resolves a BrandKit with nullable fields into a ResolvedBrandKit
 * where all values have sensible defaults applied.
 * @param brandKit - The raw brand kit with potentially null fields
 * @returns A resolved brand kit with all defaults applied
 */
function resolveBrandKit(brandKit: BrandKit): ResolvedBrandKit {
  const primaryColor = brandKit.primaryColor
  return {
    primaryColor,
    secondaryColor: brandKit.secondaryColor ?? lightenColor(primaryColor, 60),
    accentColor: brandKit.accentColor ?? primaryColor,
    backgroundColor: brandKit.backgroundColor ?? '#ffffff',
    textColor: brandKit.textColor ?? '#1a1a1a',
    fontPrimary: brandKit.fontPrimary ?? 'Inter',
    fontSecondary: brandKit.fontSecondary ?? 'Inter',
    logoUrl: brandKit.logoUrl ?? null,
  }
}

/**
 * Creates a CanvasTextElement with the given properties.
 * Reduces boilerplate when building slide element arrays.
 * @param id - Unique element identifier
 * @param x - Horizontal position in pixels
 * @param y - Vertical position in pixels
 * @param width - Element width in pixels
 * @param height - Element height in pixels
 * @param text - The text content
 * @param fontSize - Font size in pixels
 * @param fontFamily - Font family name
 * @param fontWeight - Font weight value
 * @param fill - Text color (hex)
 * @param align - Text alignment
 * @param lineHeight - Optional line height multiplier
 * @returns A complete CanvasTextElement
 */
function createText(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: CanvasTextElement['fontWeight'],
  fill: string,
  align: CanvasTextElement['align'],
  lineHeight?: number
): CanvasTextElement {
  return {
    id,
    type: 'text',
    x,
    y,
    width,
    height,
    rotation: 0,
    text,
    fontSize,
    fontFamily,
    fontWeight,
    fill,
    align,
    ...(lineHeight !== undefined ? { lineHeight } : {}),
  }
}

/**
 * Creates a CanvasShapeElement (rectangle) with the given properties.
 * @param id - Unique element identifier
 * @param x - Horizontal position in pixels
 * @param y - Vertical position in pixels
 * @param width - Element width in pixels
 * @param height - Element height in pixels
 * @param fill - Fill color (hex)
 * @param cornerRadius - Optional corner radius in pixels
 * @returns A complete CanvasShapeElement
 */
function createRect(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  cornerRadius?: number
): CanvasShapeElement {
  return {
    id,
    type: 'shape',
    x,
    y,
    width,
    height,
    rotation: 0,
    shapeType: 'rect',
    fill,
    ...(cornerRadius !== undefined ? { cornerRadius } : {}),
  }
}

/**
 * Creates a CanvasImageElement for a logo.
 * @param id - Unique element identifier
 * @param x - Horizontal position in pixels
 * @param y - Vertical position in pixels
 * @param width - Element width in pixels
 * @param height - Element height in pixels
 * @param src - Image source URL
 * @returns A complete CanvasImageElement
 */
function createImage(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  src: string
): CanvasImageElement {
  return {
    id,
    type: 'image',
    x,
    y,
    width,
    height,
    rotation: 0,
    src,
    alt: 'Brand logo',
  }
}

// ---------------------------------------------------------------------------
// Template Variant Generators
// ---------------------------------------------------------------------------

/**
 * Generates the "Brand Professional" template variant.
 * Clean corporate layout with primary color title/CTA slides,
 * white content slides, and thin accent dividers.
 * @param kit - Resolved brand kit with defaults applied
 * @returns A complete CanvasTemplate for the professional variant
 */
function generateBrandProfessional(kit: ResolvedBrandKit): CanvasTemplate {
  const prefix = 'brand-professional'

  const slide1Elements: CanvasElement[] = [
    createText(
      `${prefix}-slide-1-title`,
      80, 380, 920, 100,
      '5 Key Insights',
      72, kit.fontPrimary, 'bold', '#ffffff', 'center'
    ),
    createText(
      `${prefix}-slide-1-subtitle`,
      80, 500, 920, 60,
      'That Will Transform Your Approach',
      36, kit.fontSecondary, 'normal', lightenColor(kit.primaryColor, 80), 'center'
    ),
    createText(
      `${prefix}-slide-1-author`,
      80, 900, 920, 40,
      'By Your Name',
      24, kit.fontSecondary, 'normal', '#ffffffb3', 'center'
    ),
  ]
  if (kit.logoUrl) {
    slide1Elements.unshift(
      createImage(`${prefix}-slide-1-logo`, 80, 80, 100, 100, kit.logoUrl)
    )
  }

  const slide1: CanvasSlide = {
    id: `${prefix}-slide-1`,
    backgroundColor: kit.primaryColor,
    elements: slide1Elements,
  }

  /**
   * Builds a content slide for the professional variant.
   * @param slideNum - Slide number (2-4)
   * @param numberLabel - Display number (e.g., '01')
   * @param heading - Slide heading text
   * @param body - Slide body text
   * @returns A complete CanvasSlide
   */
  const buildContentSlide = (
    slideNum: number,
    numberLabel: string,
    heading: string,
    body: string
  ): CanvasSlide => ({
    id: `${prefix}-slide-${slideNum}`,
    backgroundColor: kit.backgroundColor,
    elements: [
      createText(
        `${prefix}-slide-${slideNum}-number`,
        80, 100, 120, 120,
        numberLabel,
        96, kit.fontPrimary, 'bold', kit.primaryColor, 'left'
      ),
      createText(
        `${prefix}-slide-${slideNum}-heading`,
        80, 280, 920, 80,
        heading,
        48, kit.fontPrimary, 'bold', kit.textColor, 'left'
      ),
      createText(
        `${prefix}-slide-${slideNum}-body`,
        80, 400, 920, 200,
        body,
        28, kit.fontSecondary, 'normal', lightenColor(kit.textColor, 60), 'left',
        1.5
      ),
      createRect(
        `${prefix}-slide-${slideNum}-divider`,
        80, 680, 100, 4, kit.primaryColor, 2
      ),
    ],
  })

  const slide2 = buildContentSlide(2, '01', 'First Key Insight', 'Explain your first insight here. Keep it concise and impactful. Use simple language that resonates with your audience.')
  const slide3 = buildContentSlide(3, '02', 'Second Key Insight', 'Share your second insight with supporting details. Make it actionable so readers can apply it immediately.')
  const slide4 = buildContentSlide(4, '03', 'Third Key Insight', 'Continue building on your message. Each slide should flow naturally into the next for maximum impact.')

  const slide5: CanvasSlide = {
    id: `${prefix}-slide-5`,
    backgroundColor: kit.primaryColor,
    elements: [
      createText(
        `${prefix}-slide-5-title`,
        80, 340, 920, 100,
        'Ready to Get Started?',
        56, kit.fontPrimary, 'bold', '#ffffff', 'center'
      ),
      createText(
        `${prefix}-slide-5-cta`,
        80, 480, 920, 60,
        'Follow for more insights \u2192',
        32, kit.fontSecondary, 'normal', lightenColor(kit.primaryColor, 80), 'center'
      ),
      createText(
        `${prefix}-slide-5-handle`,
        80, 900, 920, 40,
        '@yourhandle',
        24, kit.fontSecondary, 'normal', '#ffffffb3', 'center'
      ),
    ],
  }

  return {
    id: 'brand-professional',
    name: 'Brand Professional',
    description: 'Clean corporate layout with your brand colors and logo',
    category: 'brand',
    brandColors: [kit.primaryColor, kit.secondaryColor, kit.backgroundColor, kit.textColor, kit.accentColor],
    fonts: [kit.fontPrimary, kit.fontSecondary],
    defaultSlides: [slide1, slide2, slide3, slide4, slide5],
  }
}

/**
 * Generates the "Brand Bold" template variant.
 * Dark, high-impact design with large text, primaryColor accents,
 * and a dark background throughout.
 * @param kit - Resolved brand kit with defaults applied
 * @returns A complete CanvasTemplate for the bold variant
 */
function generateBrandBold(kit: ResolvedBrandKit): CanvasTemplate {
  const prefix = 'brand-bold'
  const darkBg = '#0a0a0a'

  const slide1Elements: CanvasElement[] = [
    createRect(`${prefix}-slide-1-accent-bar`, 0, 0, 1080, 8, kit.primaryColor),
    createText(
      `${prefix}-slide-1-title`,
      80, 350, 920, 140,
      'THE ULTIMATE\nGUIDE',
      80, kit.fontPrimary, '900', '#ffffff', 'left'
    ),
    createText(
      `${prefix}-slide-1-subtitle`,
      80, 540, 920, 60,
      'Everything you need to know',
      36, kit.fontPrimary, 'normal', '#a1a1aa', 'left'
    ),
  ]

  const slide1: CanvasSlide = {
    id: `${prefix}-slide-1`,
    backgroundColor: darkBg,
    elements: slide1Elements,
  }

  /**
   * Builds a content slide for the bold variant.
   * @param slideNum - Slide number (2-4)
   * @param numberLabel - Display number (e.g., '01')
   * @param heading - Slide heading text
   * @param body - Slide body text
   * @returns A complete CanvasSlide with optional logo
   */
  const buildContentSlide = (
    slideNum: number,
    numberLabel: string,
    heading: string,
    body: string
  ): CanvasSlide => {
    const elements: CanvasElement[] = [
      createText(
        `${prefix}-slide-${slideNum}-number`,
        80, 80, 200, 140,
        numberLabel,
        120, kit.fontPrimary, '900', kit.primaryColor, 'left'
      ),
      createText(
        `${prefix}-slide-${slideNum}-heading`,
        80, 280, 920, 80,
        heading,
        52, kit.fontPrimary, 'bold', '#ffffff', 'left'
      ),
      createText(
        `${prefix}-slide-${slideNum}-body`,
        80, 400, 920, 240,
        body,
        28, kit.fontPrimary, 'normal', '#d4d4d8', 'left',
        1.6
      ),
    ]
    if (kit.logoUrl) {
      elements.push(
        createImage(`${prefix}-slide-${slideNum}-logo`, 920, 920, 80, 80, kit.logoUrl)
      )
    }
    return {
      id: `${prefix}-slide-${slideNum}`,
      backgroundColor: darkBg,
      elements,
    }
  }

  const slide2 = buildContentSlide(2, '01', 'Start With Why', 'The foundation of every great strategy begins with understanding your purpose. Define it clearly before moving forward.')
  const slide3 = buildContentSlide(3, '02', 'Build Your System', 'Create repeatable processes that scale. Systems beat goals every single time when it comes to long-term success.')
  const slide4 = buildContentSlide(4, '03', 'Execute Relentlessly', 'Consistency compounds. Show up every day, refine your approach, and let momentum carry you to results.')

  const slide5Elements: CanvasElement[] = [
    createText(
      `${prefix}-slide-5-title`,
      80, 340, 920, 120,
      'TAKE ACTION\nTODAY',
      72, kit.fontPrimary, '900', darkBg, 'center'
    ),
    createText(
      `${prefix}-slide-5-cta`,
      80, 520, 920, 60,
      'Follow + Save this post',
      32, kit.fontPrimary, 'bold', '#0a0a0ab3', 'center'
    ),
    createText(
      `${prefix}-slide-5-handle`,
      80, 920, 920, 40,
      '@yourhandle',
      24, kit.fontPrimary, 'normal', '#0a0a0a99', 'center'
    ),
  ]

  const slide5: CanvasSlide = {
    id: `${prefix}-slide-5`,
    backgroundColor: kit.primaryColor,
    elements: slide5Elements,
  }

  return {
    id: 'brand-bold',
    name: 'Brand Bold',
    description: 'Dark, high-impact design with bold typography and your brand accent',
    category: 'brand',
    brandColors: [darkBg, kit.primaryColor, '#ffffff', '#d4d4d8', kit.accentColor],
    fonts: [kit.fontPrimary],
    defaultSlides: [slide1, slide2, slide3, slide4, slide5],
  }
}

/**
 * Generates the "Brand Minimal" template variant.
 * Clean whitespace-focused layout with subtle accent lines
 * and restrained use of color.
 * @param kit - Resolved brand kit with defaults applied
 * @returns A complete CanvasTemplate for the minimal variant
 */
function generateBrandMinimal(kit: ResolvedBrandKit): CanvasTemplate {
  const prefix = 'brand-minimal'
  const mutedGray = '#9ca3af'

  const slide1Elements: CanvasElement[] = [
    createRect(`${prefix}-slide-1-accent-line`, 80, 80, 60, 4, kit.primaryColor, 2),
    createText(
      `${prefix}-slide-1-title`,
      80, 340, 920, 100,
      'A Simple Framework',
      64, kit.fontPrimary, 'bold', kit.textColor, 'left'
    ),
    createText(
      `${prefix}-slide-1-subtitle`,
      80, 460, 920, 60,
      'For better results in less time',
      32, kit.fontSecondary, 'normal', mutedGray, 'left'
    ),
    createText(
      `${prefix}-slide-1-author`,
      80, 920, 920, 40,
      'By Your Name',
      22, kit.fontSecondary, 'normal', mutedGray, 'left'
    ),
  ]
  if (kit.logoUrl) {
    slide1Elements.unshift(
      createImage(`${prefix}-slide-1-logo`, 80, 120, 80, 80, kit.logoUrl)
    )
  }

  const slide1: CanvasSlide = {
    id: `${prefix}-slide-1`,
    backgroundColor: '#ffffff',
    elements: slide1Elements,
  }

  /**
   * Builds a content slide for the minimal variant.
   * @param slideNum - Slide number (2-4)
   * @param numberLabel - Display number (e.g., '01')
   * @param heading - Slide heading text
   * @param body - Slide body text
   * @returns A complete CanvasSlide with minimal decoration
   */
  const buildContentSlide = (
    slideNum: number,
    numberLabel: string,
    heading: string,
    body: string
  ): CanvasSlide => ({
    id: `${prefix}-slide-${slideNum}`,
    backgroundColor: '#ffffff',
    elements: [
      createText(
        `${prefix}-slide-${slideNum}-number`,
        80, 80, 100, 60,
        numberLabel,
        48, kit.fontPrimary, '300', mutedGray, 'left'
      ),
      createRect(`${prefix}-slide-${slideNum}-accent-line`, 80, 160, 40, 3, kit.primaryColor, 1),
      createText(
        `${prefix}-slide-${slideNum}-heading`,
        80, 220, 920, 80,
        heading,
        44, kit.fontPrimary, '600', kit.textColor, 'left'
      ),
      createText(
        `${prefix}-slide-${slideNum}-body`,
        80, 340, 920, 280,
        body,
        26, kit.fontSecondary, 'normal', '#6b7280', 'left',
        1.7
      ),
    ],
  })

  const slide2 = buildContentSlide(2, '01', 'Identify the Problem', 'Before you can fix anything, you need to understand what is actually broken. Take time to diagnose before prescribing.')
  const slide3 = buildContentSlide(3, '02', 'Design the Solution', 'Map out your approach step by step. The clearer your plan, the more confidently you can execute it.')
  const slide4 = buildContentSlide(4, '03', 'Measure and Iterate', 'Track what matters, ignore vanity metrics. Adjust your approach based on real feedback and data.')

  const slide5: CanvasSlide = {
    id: `${prefix}-slide-5`,
    backgroundColor: kit.textColor,
    elements: [
      createText(
        `${prefix}-slide-5-title`,
        80, 360, 920, 100,
        'Want more frameworks?',
        52, kit.fontPrimary, '600', '#ffffff', 'center'
      ),
      createText(
        `${prefix}-slide-5-cta`,
        80, 490, 920, 60,
        'Follow me for weekly insights',
        28, kit.fontSecondary, 'normal', '#ffffffcc', 'center'
      ),
      createText(
        `${prefix}-slide-5-handle`,
        80, 920, 920, 40,
        '@yourhandle',
        22, kit.fontSecondary, 'normal', '#ffffff99', 'center'
      ),
    ],
  }

  return {
    id: 'brand-minimal',
    name: 'Brand Minimal',
    description: 'Clean whitespace design with subtle accent lines and your brand palette',
    category: 'brand',
    brandColors: ['#ffffff', kit.primaryColor, kit.textColor, mutedGray, '#6b7280'],
    fonts: [kit.fontPrimary, kit.fontSecondary],
    defaultSlides: [slide1, slide2, slide3, slide4, slide5],
  }
}

/**
 * Generates the "Brand Story" template variant.
 * Narrative arc structure (hook, setup, conflict, turning point, lesson, CTA)
 * with colored badge labels and dramatic dark backgrounds.
 * @param kit - Resolved brand kit with defaults applied
 * @returns A complete CanvasTemplate for the story variant
 */
function generateBrandStory(kit: ResolvedBrandKit): CanvasTemplate {
  const prefix = 'brand-story'
  const darkBg = '#18181b'

  const slide1Elements: CanvasElement[] = [
    createText(
      `${prefix}-slide-1-hook`,
      80, 320, 920, 160,
      'I almost gave up\neverything.',
      68, kit.fontPrimary, 'bold', '#ffffff', 'center'
    ),
    createText(
      `${prefix}-slide-1-subhook`,
      80, 520, 920, 60,
      'Then one conversation changed it all.',
      30, kit.fontPrimary, 'normal', '#ffffffcc', 'center'
    ),
  ]
  if (kit.logoUrl) {
    slide1Elements.unshift(
      createImage(`${prefix}-slide-1-logo`, 490, 120, 100, 100, kit.logoUrl)
    )
  }

  const slide1: CanvasSlide = {
    id: `${prefix}-slide-1`,
    backgroundColor: kit.primaryColor,
    elements: slide1Elements,
  }

  /**
   * Builds a narrative slide for the story variant with a colored badge label.
   * @param slideNum - Slide number (2-4)
   * @param badgeLabel - Label text for the badge (e.g., 'THE SETUP')
   * @param badgeColor - Background color for the badge
   * @param body - Main body text for the slide
   * @returns A complete CanvasSlide with story structure
   */
  const buildNarrativeSlide = (
    slideNum: number,
    badgeLabel: string,
    badgeColor: string,
    body: string
  ): CanvasSlide => ({
    id: `${prefix}-slide-${slideNum}`,
    backgroundColor: darkBg,
    elements: [
      createRect(
        `${prefix}-slide-${slideNum}-badge-bg`,
        80, 100, badgeLabel.length * 18 + 40, 44,
        badgeColor, 8
      ),
      createText(
        `${prefix}-slide-${slideNum}-badge-text`,
        100, 108, badgeLabel.length * 18, 28,
        badgeLabel,
        18, kit.fontPrimary, 'bold', '#ffffff', 'left'
      ),
      createText(
        `${prefix}-slide-${slideNum}-body`,
        80, 220, 920, 400,
        body,
        32, kit.fontPrimary, 'normal', '#ffffff', 'left',
        1.6
      ),
    ],
  })

  const slide2 = buildNarrativeSlide(
    2,
    'THE SETUP',
    kit.primaryColor,
    'Two years ago, I was stuck in a role that drained me. Long hours, no growth, and a nagging feeling that I was meant for more.'
  )
  const slide3 = buildNarrativeSlide(
    3,
    'THE TURNING POINT',
    kit.accentColor,
    'A mentor told me something I will never forget: "You are not stuck. You are just building on the wrong foundation." That single sentence rewired how I thought about my career.'
  )
  const slide4 = buildNarrativeSlide(
    4,
    'THE LESSON',
    kit.secondaryColor,
    'I rebuilt everything from scratch. New skills, new network, new mindset. Within 6 months, I had tripled my income and found work I genuinely loved.'
  )

  const ctaColor = kit.accentColor !== kit.primaryColor ? kit.accentColor : kit.secondaryColor

  const slide5: CanvasSlide = {
    id: `${prefix}-slide-5`,
    backgroundColor: ctaColor,
    elements: [
      createText(
        `${prefix}-slide-5-title`,
        80, 340, 920, 120,
        'Your story is\nnot over yet.',
        60, kit.fontPrimary, 'bold', '#ffffff', 'center'
      ),
      createText(
        `${prefix}-slide-5-cta`,
        80, 520, 920, 60,
        'Follow for more real stories',
        30, kit.fontPrimary, 'normal', '#ffffffcc', 'center'
      ),
      createText(
        `${prefix}-slide-5-handle`,
        80, 920, 920, 40,
        '@yourhandle',
        24, kit.fontPrimary, 'normal', '#ffffff99', 'center'
      ),
    ],
  }

  return {
    id: 'brand-story',
    name: 'Brand Story',
    description: 'Narrative arc template with dramatic hooks and story beats using your brand',
    category: 'brand',
    brandColors: [kit.primaryColor, kit.accentColor, kit.secondaryColor, darkBg, '#ffffff'],
    fonts: [kit.fontPrimary],
    defaultSlides: [slide1, slide2, slide3, slide4, slide5],
  }
}

/**
 * Generates the "Brand Data" template variant.
 * Stats-focused layout with large stat numbers, dark backgrounds,
 * footer lines, and page numbers.
 * @param kit - Resolved brand kit with defaults applied
 * @returns A complete CanvasTemplate for the data variant
 */
function generateBrandData(kit: ResolvedBrandKit): CanvasTemplate {
  const prefix = 'brand-data'
  const darkBg = '#0f172a'

  const slide1Elements: CanvasElement[] = [
    createRect(`${prefix}-slide-1-accent-bar`, 0, 0, 1080, 6, kit.primaryColor),
    createText(
      `${prefix}-slide-1-title`,
      80, 320, 920, 100,
      'The Data Behind\nGreat Content',
      60, kit.fontPrimary, 'bold', '#ffffff', 'left'
    ),
    createRect(
      `${prefix}-slide-1-tag-bg`,
      80, 480, 220, 40, kit.accentColor, 6
    ),
    createText(
      `${prefix}-slide-1-tag-text`,
      94, 488, 192, 24,
      'DATA INSIGHTS',
      16, kit.fontPrimary, 'bold', '#ffffff', 'center'
    ),
    createRect(`${prefix}-slide-1-footer-line`, 80, 980, 920, 2, '#334155'),
    createText(
      `${prefix}-slide-1-page`,
      920, 1000, 80, 30,
      '1 / 5',
      16, kit.fontSecondary, 'normal', '#64748b', 'right'
    ),
  ]
  if (kit.logoUrl) {
    slide1Elements.push(
      createImage(`${prefix}-slide-1-logo`, 80, 1000, 60, 60, kit.logoUrl)
    )
  }

  const slide1: CanvasSlide = {
    id: `${prefix}-slide-1`,
    backgroundColor: darkBg,
    elements: slide1Elements,
  }

  /**
   * Builds a stat slide for the data variant.
   * @param slideNum - Slide number (2-4)
   * @param statValue - The large stat number to display
   * @param statLabel - Short label for the stat
   * @param body - Body text explaining the stat
   * @param pageLabel - Page indicator (e.g., '2 / 5')
   * @returns A complete CanvasSlide with stat emphasis
   */
  const buildStatSlide = (
    slideNum: number,
    statValue: string,
    statLabel: string,
    body: string,
    pageLabel: string
  ): CanvasSlide => {
    const elements: CanvasElement[] = [
      createText(
        `${prefix}-slide-${slideNum}-stat`,
        80, 120, 920, 160,
        statValue,
        120, kit.fontPrimary, '900', kit.primaryColor, 'left'
      ),
      createText(
        `${prefix}-slide-${slideNum}-label`,
        80, 300, 920, 50,
        statLabel,
        36, kit.fontPrimary, 'bold', '#ffffff', 'left'
      ),
      createText(
        `${prefix}-slide-${slideNum}-body`,
        80, 400, 920, 240,
        body,
        26, kit.fontSecondary, 'normal', '#94a3b8', 'left',
        1.6
      ),
      createRect(`${prefix}-slide-${slideNum}-footer-line`, 80, 980, 920, 2, '#334155'),
      createText(
        `${prefix}-slide-${slideNum}-page`,
        920, 1000, 80, 30,
        pageLabel,
        16, kit.fontSecondary, 'normal', '#64748b', 'right'
      ),
    ]
    if (kit.logoUrl) {
      elements.push(
        createImage(`${prefix}-slide-${slideNum}-logo`, 80, 1000, 60, 60, kit.logoUrl)
      )
    }
    return {
      id: `${prefix}-slide-${slideNum}`,
      backgroundColor: darkBg,
      elements,
    }
  }

  const slide2 = buildStatSlide(
    2,
    '73%',
    'Higher engagement rate',
    'Posts with carousel formats receive 73% more engagement than single-image posts on LinkedIn. Swipe-based content keeps readers invested.',
    '2 / 5'
  )
  const slide3 = buildStatSlide(
    3,
    '3.2x',
    'More reach per impression',
    'Data-driven content earns 3.2x more organic reach because it provides concrete proof points that audiences want to share.',
    '3 / 5'
  )
  const slide4 = buildStatSlide(
    4,
    '48hrs',
    'Peak performance window',
    'The first 48 hours after posting are critical. Engagement in this window determines whether the algorithm amplifies your content further.',
    '4 / 5'
  )

  const slide5: CanvasSlide = {
    id: `${prefix}-slide-5`,
    backgroundColor: kit.primaryColor,
    elements: [
      createText(
        `${prefix}-slide-5-title`,
        80, 320, 920, 120,
        'Want the\nfull report?',
        64, kit.fontPrimary, 'bold', darkBg, 'center'
      ),
      createText(
        `${prefix}-slide-5-cta`,
        80, 500, 920, 60,
        'Follow + Comment "DATA" below',
        30, kit.fontPrimary, '600', '#0f172ab3', 'center'
      ),
      createText(
        `${prefix}-slide-5-handle`,
        80, 920, 920, 40,
        '@yourhandle',
        24, kit.fontSecondary, 'normal', '#0f172a99', 'center'
      ),
      createRect(`${prefix}-slide-5-footer-line`, 80, 980, 920, 2, '#0f172a33'),
      createText(
        `${prefix}-slide-5-page`,
        920, 1000, 80, 30,
        '5 / 5',
        16, kit.fontSecondary, 'normal', '#0f172a80', 'right'
      ),
    ],
  }

  return {
    id: 'brand-data',
    name: 'Brand Data',
    description: 'Stats-focused layout with large numbers and data storytelling using your brand',
    category: 'brand',
    brandColors: [darkBg, kit.primaryColor, kit.accentColor, '#94a3b8', '#ffffff'],
    fonts: [kit.fontPrimary, kit.fontSecondary],
    defaultSlides: [slide1, slide2, slide3, slide4, slide5],
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates 5 carousel template variants from a user's saved brand kit.
 *
 * The generated variants are:
 * 1. **Brand Professional** - Clean corporate layout
 * 2. **Brand Bold** - Dark, high-impact design
 * 3. **Brand Minimal** - Clean whitespace design
 * 4. **Brand Story** - Narrative arc structure
 * 5. **Brand Data** - Stats-focused layout
 *
 * Each template includes 5 slides (title, 3 content, CTA) and uses the
 * brand kit's colors, fonts, and logo where available.
 *
 * @param brandKit - The user's saved brand kit from the database
 * @returns Array of 5 CanvasTemplate objects ready for the template selector
 * @example
 * const templates = generateBrandKitTemplates(activeBrandKit)
 * // templates[0].name === 'Brand Professional'
 * // templates[1].name === 'Brand Bold'
 * // ...
 */
export function generateBrandKitTemplates(brandKit: BrandKit): CanvasTemplate[] {
  const resolved = resolveBrandKit(brandKit)

  return [
    generateBrandProfessional(resolved),
    generateBrandBold(resolved),
    generateBrandMinimal(resolved),
    generateBrandStory(resolved),
    generateBrandData(resolved),
  ]
}
