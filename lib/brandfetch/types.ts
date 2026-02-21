/**
 * Brandfetch API Types
 * @description TypeScript types for Brandfetch API responses
 * @module lib/brandfetch/types
 */

/**
 * Logo format returned by Brandfetch
 */
export interface BrandfetchLogoFormat {
  /** Image URL */
  src: string
  /** Background color or null */
  background: string | null
  /** Image format (svg, png, jpeg) */
  format: string
  /** Image height in pixels */
  height: number | null
  /** Image width in pixels */
  width: number | null
  /** File size in bytes */
  size: number
}

/**
 * Logo entry from Brandfetch
 */
export interface BrandfetchLogo {
  /** Theme the logo is intended for */
  theme: 'light' | 'dark' | string
  /** Available format variants */
  formats: BrandfetchLogoFormat[]
  /** Logo tags (e.g., "logo", "icon", "symbol") */
  tags: string[]
}

/**
 * Color entry from Brandfetch
 */
export interface BrandfetchColor {
  /** Hex color value */
  hex: string
  /** Color type / role */
  type: 'accent' | 'brand' | 'dark' | 'light' | 'vibrant' | 'customDark' | 'customLight' | string
  /** Brightness value 0-255 */
  brightness: number
}

/**
 * Font entry from Brandfetch
 */
export interface BrandfetchFont {
  /** Font family name */
  name: string
  /** Font role */
  type: 'title' | 'body' | string
  /** Font origin (google, custom, etc.) */
  origin: string
  /** Origin identifier */
  originId: string | null
  /** Available font weights */
  weights: number[]
}

/**
 * Image entry from Brandfetch
 */
export interface BrandfetchImage {
  /** Available format variants */
  formats: BrandfetchLogoFormat[]
  /** Image tags (e.g., "banner") */
  tags: string[]
}

/**
 * Full Brandfetch API response for a brand
 */
export interface BrandfetchBrandResponse {
  /** Brand name */
  name: string
  /** Brand domain */
  domain: string
  /** Whether the brand is claimed/verified */
  claimed: boolean
  /** Short description */
  description: string | null
  /** Long description */
  longDescription: string | null
  /** Brand links */
  links: { name: string; url: string }[]
  /** Brand logos */
  logos: BrandfetchLogo[]
  /** Brand colors */
  colors: BrandfetchColor[]
  /** Brand fonts */
  fonts: BrandfetchFont[]
  /** Brand images */
  images: BrandfetchImage[]
}

/**
 * Normalized brand data extracted from Brandfetch
 */
export interface BrandfetchExtractedData {
  /** Brand name */
  name: string | null
  /** Primary logo URL (prefers SVG, then large PNG) */
  logoUrl: string | null
  /** Icon/symbol URL */
  iconUrl: string | null
  /** Primary brand color hex */
  primaryColor: string | null
  /** Secondary / accent color hex */
  secondaryColor: string | null
  /** Dark variant color hex */
  darkColor: string | null
  /** Light variant color hex */
  lightColor: string | null
  /** All brand colors */
  allColors: BrandfetchColor[]
  /** Primary / title font */
  fontPrimary: string | null
  /** Body font */
  fontSecondary: string | null
  /** All fonts */
  allFonts: BrandfetchFont[]
  /** Short brand description */
  description: string | null
}
