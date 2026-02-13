/**
 * Unicode Font Transformations for LinkedIn
 * @description Pure utility module for transforming text into Unicode
 * mathematical symbol variants that render as different "fonts" on LinkedIn.
 * Zero dependencies.
 * @module lib/unicode-fonts
 */

/**
 * Supported Unicode font style identifiers
 */
export type UnicodeFontStyle =
  | 'normal'
  | 'bold'
  | 'italic'
  | 'boldItalic'
  | 'monospace'
  | 'script'
  | 'doubleStruck'

/**
 * Defines a Unicode font with code point offsets for character mapping
 */
export interface UnicodeFontDef {
  /** Unique style identifier */
  id: UnicodeFontStyle
  /** Human-readable label */
  label: string
  /** Preview characters (e.g. "𝗔𝗮" for bold) */
  preview: string
  /** Code point for uppercase 'A' in this font */
  uppercaseStart: number
  /** Code point for lowercase 'a' in this font */
  lowercaseStart: number
  /** Code point for digit '0' in this font (some fonts have digits) */
  digitStart?: number
}

/**
 * Script capital letter exceptions — these have irregular code points
 * in the Mathematical Script block and need special handling.
 */
const SCRIPT_EXCEPTIONS: Record<string, number> = {
  B: 0x212C, // ℬ
  E: 0x2130, // ℰ
  F: 0x2131, // ℱ
  H: 0x210B, // ℋ
  I: 0x2110, // ℐ
  L: 0x2112, // ℒ
  M: 0x2133, // ℳ
  R: 0x211B, // ℛ
}

/**
 * Double-struck capital letter exceptions
 */
const DOUBLE_STRUCK_EXCEPTIONS: Record<string, number> = {
  C: 0x2102, // ℂ
  H: 0x210D, // ℍ
  N: 0x2115, // ℕ
  P: 0x2119, // ℙ
  Q: 0x211A, // ℚ
  R: 0x211D, // ℝ
  Z: 0x2124, // ℤ
}

/**
 * Unicode font definitions with code point offsets
 *
 * Each font maps A-Z and a-z to a block of Mathematical Alphanumeric Symbols.
 * Some also map 0-9.
 */
export const UNICODE_FONTS: Record<UnicodeFontStyle, UnicodeFontDef> = {
  normal: {
    id: 'normal',
    label: 'Normal',
    preview: 'Aa',
    uppercaseStart: 0x41,  // Standard ASCII A
    lowercaseStart: 0x61,  // Standard ASCII a
  },
  bold: {
    id: 'bold',
    label: 'Bold Sans',
    preview: '\u{1D5D4}\u{1D5EE}', // 𝗔𝗮
    uppercaseStart: 0x1D5D4,
    lowercaseStart: 0x1D5EE,
    digitStart: 0x1D7EC,
  },
  italic: {
    id: 'italic',
    label: 'Italic Sans',
    preview: '\u{1D608}\u{1D622}', // 𝘈𝘢
    uppercaseStart: 0x1D608,
    lowercaseStart: 0x1D622,
  },
  boldItalic: {
    id: 'boldItalic',
    label: 'Bold Italic',
    preview: '\u{1D63C}\u{1D656}', // 𝘼𝙖
    uppercaseStart: 0x1D63C,
    lowercaseStart: 0x1D656,
  },
  monospace: {
    id: 'monospace',
    label: 'Monospace',
    preview: '\u{1D670}\u{1D68A}', // 𝙰𝚊
    uppercaseStart: 0x1D670,
    lowercaseStart: 0x1D68A,
    digitStart: 0x1D7F6,
  },
  script: {
    id: 'script',
    label: 'Script',
    preview: '\u{1D49C}\u{1D4B6}', // 𝒜𝒶
    uppercaseStart: 0x1D49C,
    lowercaseStart: 0x1D4B6,
  },
  doubleStruck: {
    id: 'doubleStruck',
    label: 'Double-struck',
    preview: '\u{1D538}\u{1D552}', // 𝔸𝕒
    uppercaseStart: 0x1D538,
    lowercaseStart: 0x1D552,
    digitStart: 0x1D7D8,
  },
}

/**
 * Transforms a single character to the target Unicode font style
 * @param char - Single character to transform
 * @param style - Target font style
 * @returns Transformed character string
 */
function transformChar(char: string, style: UnicodeFontStyle): string {
  if (style === 'normal') return char

  const font = UNICODE_FONTS[style]
  const code = char.charCodeAt(0)

  // Handle uppercase A-Z
  if (code >= 0x41 && code <= 0x5A) {
    // Script capital exceptions
    if (style === 'script' && SCRIPT_EXCEPTIONS[char]) {
      return String.fromCodePoint(SCRIPT_EXCEPTIONS[char])
    }
    // Double-struck capital exceptions
    if (style === 'doubleStruck' && DOUBLE_STRUCK_EXCEPTIONS[char]) {
      return String.fromCodePoint(DOUBLE_STRUCK_EXCEPTIONS[char])
    }
    const offset = code - 0x41
    return String.fromCodePoint(font.uppercaseStart + offset)
  }

  // Handle lowercase a-z
  if (code >= 0x61 && code <= 0x7A) {
    const offset = code - 0x61
    return String.fromCodePoint(font.lowercaseStart + offset)
  }

  // Handle digits 0-9
  if (code >= 0x30 && code <= 0x39 && font.digitStart) {
    const offset = code - 0x30
    return String.fromCodePoint(font.digitStart + offset)
  }

  // Return unchanged for non-alphanumeric
  return char
}

/**
 * Checks if a code point belongs to any known Unicode math font block
 * @param cp - Unicode code point
 * @returns True if the code point is a Unicode math letter/digit
 */
function isMathAlphanumeric(cp: number): boolean {
  // Mathematical Alphanumeric Symbols: U+1D400–U+1D7FF
  if (cp >= 0x1D400 && cp <= 0x1D7FF) return true
  // Script exceptions
  if (cp === 0x212C || cp === 0x2130 || cp === 0x2131 || cp === 0x210B ||
      cp === 0x2110 || cp === 0x2112 || cp === 0x2133 || cp === 0x211B) return true
  // Double-struck exceptions
  if (cp === 0x2102 || cp === 0x210D || cp === 0x2115 || cp === 0x2119 ||
      cp === 0x211A || cp === 0x211D || cp === 0x2124) return true
  return false
}

/**
 * Reverses a Unicode math character back to its ASCII equivalent
 * @param cp - Code point to reverse
 * @returns ASCII character or null if not a math alphanumeric
 */
function reverseMathChar(cp: number): string | null {
  // Check script exceptions
  for (const [letter, exCp] of Object.entries(SCRIPT_EXCEPTIONS)) {
    if (cp === exCp) return letter
  }
  // Check double-struck exceptions
  for (const [letter, exCp] of Object.entries(DOUBLE_STRUCK_EXCEPTIONS)) {
    if (cp === exCp) return letter
  }

  if (cp < 0x1D400 || cp > 0x1D7FF) return null

  // Try each font to find a match
  for (const font of Object.values(UNICODE_FONTS)) {
    if (font.id === 'normal') continue

    // Check uppercase
    const upperOffset = cp - font.uppercaseStart
    if (upperOffset >= 0 && upperOffset < 26) {
      return String.fromCharCode(0x41 + upperOffset)
    }

    // Check lowercase
    const lowerOffset = cp - font.lowercaseStart
    if (lowerOffset >= 0 && lowerOffset < 26) {
      return String.fromCharCode(0x61 + lowerOffset)
    }

    // Check digits
    if (font.digitStart) {
      const digitOffset = cp - font.digitStart
      if (digitOffset >= 0 && digitOffset < 10) {
        return String.fromCharCode(0x30 + digitOffset)
      }
    }
  }

  return null
}

/**
 * Transforms text to the specified Unicode font style.
 * Only transforms ASCII letters (and digits for fonts that support them).
 * Non-alphanumeric characters pass through unchanged.
 *
 * @param text - The text to transform
 * @param style - Target font style
 * @returns Transformed text
 * @example
 * transformText('Hello', 'bold') // => '𝗛𝗲𝗹𝗹𝗼'
 */
export function transformText(text: string, style: UnicodeFontStyle): string {
  if (style === 'normal') return text

  // Spread into code points to handle existing Unicode chars correctly
  const chars = [...text]
  return chars.map((char) => {
    const cp = char.codePointAt(0)!
    // If the character is already a math alphanumeric, strip it first
    const ascii = isMathAlphanumeric(cp) ? reverseMathChar(cp) : null
    const baseChar = ascii ?? char
    return transformChar(baseChar, style)
  }).join('')
}

/**
 * Strips all Unicode font formatting, reverting text to plain ASCII.
 *
 * @param text - Text potentially containing Unicode math characters
 * @returns Plain ASCII text
 * @example
 * stripUnicodeFont('𝗛𝗲𝗹𝗹𝗼') // => 'Hello'
 */
export function stripUnicodeFont(text: string): string {
  const chars = [...text]
  return chars.map((char) => {
    const cp = char.codePointAt(0)!
    if (isMathAlphanumeric(cp)) {
      return reverseMathChar(cp) ?? char
    }
    return char
  }).join('')
}

/**
 * Transforms a selected range within a full text string to the specified font style.
 * Returns the new full text and the updated end position of the selection.
 *
 * @param fullText - The complete text content
 * @param start - Selection start index (code-point index)
 * @param end - Selection end index (code-point index)
 * @param style - Target font style
 * @returns Object with the new text and updated end position
 * @example
 * const result = transformSelection('Hello World', 0, 5, 'bold')
 * // result.text => '𝗛𝗲𝗹𝗹𝗼 World'
 */
export function transformSelection(
  fullText: string,
  start: number,
  end: number,
  style: UnicodeFontStyle
): { text: string; newEnd: number } {
  // We need to work with UTF-16 indices since that's what textarea uses
  const before = fullText.slice(0, start)
  const selected = fullText.slice(start, end)
  const after = fullText.slice(end)

  const transformed = transformText(selected, style)

  return {
    text: before + transformed + after,
    newEnd: start + transformed.length,
  }
}

/**
 * Converts markdown-style bold/italic syntax to Unicode font equivalents.
 * Replaces `**text**` with Unicode Bold Sans and `*text*` with Unicode Italic Sans.
 * This allows the textarea to show visually formatted text instead of raw asterisks.
 *
 * @param text - Text with markdown-style formatting
 * @returns Text with Unicode font characters instead of markdown syntax
 * @example
 * convertMarkdownToUnicode('Use **Notion** daily')
 * // => 'Use 𝗡𝗼𝘁𝗶𝗼𝗻 daily'
 */
export function convertMarkdownToUnicode(text: string): string {
  // Replace **bold** with Unicode Bold Sans (process bold before italic)
  let result = text.replace(/\*\*(.+?)\*\*/g, (_match, content: string) => {
    return transformText(content, 'bold')
  })
  // Replace *italic* (not preceded/followed by another *)
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, (_match, content: string) => {
    return transformText(content, 'italic')
  })
  return result
}

/**
 * Returns the code-point-aware length of a string.
 * Use this instead of `.length` for accurate LinkedIn character counting,
 * since Unicode math chars are surrogate pairs in UTF-16.
 *
 * @param text - Text to measure
 * @returns Code point count
 */
export function codePointLength(text: string): number {
  return [...text].length
}
