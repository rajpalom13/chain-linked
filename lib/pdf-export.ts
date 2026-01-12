import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, RGB } from "pdf-lib"

/**
 * Represents a single slide in a carousel
 */
export interface CarouselSlide {
  /** Unique identifier for the slide */
  id: string
  /** Title text displayed prominently on the slide */
  title: string
  /** Main content text of the slide */
  content: string
  /** Order/position of the slide in the carousel (0-indexed) */
  order: number
}

/**
 * Brand kit configuration for carousel styling
 */
export interface BrandKit {
  /** Primary brand color in hex format (e.g., "#0077B5") */
  primaryColor: string
  /** Secondary brand color in hex format */
  secondaryColor: string
  /** Font family name (optional, defaults to Helvetica) */
  fontFamily?: string
  /** URL to the brand logo image (optional) */
  logoUrl?: string
}

/**
 * Available template types for PDF export
 */
export type TemplateType = "bold" | "minimalist" | "data" | "story"

/**
 * Available format types for PDF page dimensions
 */
export type FormatType = "square" | "portrait" | "landscape"

/**
 * Options for exporting a carousel to PDF
 */
export interface PDFExportOptions {
  /** Array of slides to include in the PDF */
  slides: CarouselSlide[]
  /** Brand kit for styling the PDF */
  brandKit: BrandKit
  /** Template style to apply */
  template: TemplateType
  /** Page format/orientation (defaults to "square") */
  format?: FormatType
  /** Output filename (defaults to "carousel.pdf") */
  filename?: string
}

/**
 * Page dimensions in points (72 points = 1 inch)
 */
interface PageDimensions {
  width: number
  height: number
}

/** Page size configurations */
const PAGE_SIZES: Record<FormatType, PageDimensions> = {
  square: { width: 612, height: 612 },
  portrait: { width: 612, height: 792 },
  landscape: { width: 792, height: 612 },
}

/**
 * Converts a hex color string to RGB values for pdf-lib
 * @param hex - The hex color string (e.g., "#0077B5" or "0077B5")
 * @returns RGB object compatible with pdf-lib
 */
export function hexToRgb(hex: string): RGB {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, "")

  // Parse hex values
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255

  return rgb(r, g, b)
}

/**
 * Wraps text to fit within a specified width
 * @param text - The text to wrap
 * @param font - The PDF font to use for measurement
 * @param fontSize - The font size in points
 * @param maxWidth - The maximum width in points
 * @returns Array of text lines
 */
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let currentLine = ""

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const textWidth = font.widthOfTextAtSize(testLine, fontSize)

    if (textWidth <= maxWidth) {
      currentLine = testLine
    } else {
      if (currentLine) {
        lines.push(currentLine)
      }
      currentLine = word
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

/**
 * Draws the bold template style on a page
 * Large title, colored background (primaryColor), white text
 */
async function drawBoldTemplate(
  page: PDFPage,
  slide: CarouselSlide,
  slideNumber: number,
  totalSlides: number,
  brandKit: BrandKit,
  fonts: { regular: PDFFont; bold: PDFFont }
): Promise<void> {
  const { width, height } = page.getSize()
  const primaryColor = hexToRgb(brandKit.primaryColor)
  const whiteColor = rgb(1, 1, 1)
  const padding = 50

  // Draw colored background
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: primaryColor,
  })

  // Draw title (large, bold, centered)
  const titleFontSize = 42
  const titleLines = wrapText(
    slide.title,
    fonts.bold,
    titleFontSize,
    width - padding * 2
  )
  const titleLineHeight = titleFontSize * 1.3
  const titleBlockHeight = titleLines.length * titleLineHeight
  let titleY = height - padding - titleBlockHeight / 2 + height * 0.15

  for (const line of titleLines) {
    const textWidth = fonts.bold.widthOfTextAtSize(line, titleFontSize)
    page.drawText(line, {
      x: (width - textWidth) / 2,
      y: titleY,
      size: titleFontSize,
      font: fonts.bold,
      color: whiteColor,
    })
    titleY -= titleLineHeight
  }

  // Draw content (smaller, centered below title)
  if (slide.content) {
    const contentFontSize = 24
    const contentLines = wrapText(
      slide.content,
      fonts.regular,
      contentFontSize,
      width - padding * 2
    )
    const contentLineHeight = contentFontSize * 1.5
    let contentY = height * 0.4

    for (const line of contentLines) {
      const textWidth = fonts.regular.widthOfTextAtSize(line, contentFontSize)
      page.drawText(line, {
        x: (width - textWidth) / 2,
        y: contentY,
        size: contentFontSize,
        font: fonts.regular,
        color: whiteColor,
      })
      contentY -= contentLineHeight
    }
  }

  // Draw slide number at bottom
  const slideNumberText = `${slideNumber} / ${totalSlides}`
  const slideNumFontSize = 14
  const slideNumWidth = fonts.regular.widthOfTextAtSize(
    slideNumberText,
    slideNumFontSize
  )
  page.drawText(slideNumberText, {
    x: (width - slideNumWidth) / 2,
    y: 30,
    size: slideNumFontSize,
    font: fonts.regular,
    color: rgb(0.8, 0.8, 0.8),
  })
}

/**
 * Draws the minimalist template style on a page
 * White background, black text, thin accent line
 */
async function drawMinimalistTemplate(
  page: PDFPage,
  slide: CarouselSlide,
  slideNumber: number,
  totalSlides: number,
  brandKit: BrandKit,
  fonts: { regular: PDFFont; bold: PDFFont }
): Promise<void> {
  const { width, height } = page.getSize()
  const primaryColor = hexToRgb(brandKit.primaryColor)
  const textColor = rgb(0.1, 0.1, 0.1)
  const lightGray = rgb(0.98, 0.98, 0.98)
  const padding = 60

  // Draw light gray background
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: lightGray,
  })

  // Draw thin accent line on the left
  page.drawRectangle({
    x: padding - 20,
    y: height * 0.3,
    width: 4,
    height: height * 0.4,
    color: primaryColor,
  })

  // Draw title
  const titleFontSize = 32
  const titleLines = wrapText(
    slide.title,
    fonts.bold,
    titleFontSize,
    width - padding * 2 - 20
  )
  const titleLineHeight = titleFontSize * 1.4
  let titleY = height - padding - 60

  for (const line of titleLines) {
    page.drawText(line, {
      x: padding,
      y: titleY,
      size: titleFontSize,
      font: fonts.bold,
      color: textColor,
    })
    titleY -= titleLineHeight
  }

  // Draw content
  if (slide.content) {
    const contentFontSize = 18
    const contentLines = wrapText(
      slide.content,
      fonts.regular,
      contentFontSize,
      width - padding * 2
    )
    const contentLineHeight = contentFontSize * 1.6
    let contentY = height * 0.5

    for (const line of contentLines) {
      page.drawText(line, {
        x: padding,
        y: contentY,
        size: contentFontSize,
        font: fonts.regular,
        color: textColor,
      })
      contentY -= contentLineHeight
    }
  }

  // Draw slide number at bottom center
  const slideNumberText = `${slideNumber} / ${totalSlides}`
  const slideNumFontSize = 12
  const slideNumWidth = fonts.regular.widthOfTextAtSize(
    slideNumberText,
    slideNumFontSize
  )
  page.drawText(slideNumberText, {
    x: (width - slideNumWidth) / 2,
    y: 30,
    size: slideNumFontSize,
    font: fonts.regular,
    color: rgb(0.5, 0.5, 0.5),
  })
}

/**
 * Draws the data template style on a page
 * Numbered slides, clean layout with emphasis on data
 */
async function drawDataTemplate(
  page: PDFPage,
  slide: CarouselSlide,
  slideNumber: number,
  totalSlides: number,
  brandKit: BrandKit,
  fonts: { regular: PDFFont; bold: PDFFont }
): Promise<void> {
  const { width, height } = page.getSize()
  const primaryColor = hexToRgb(brandKit.primaryColor)
  const secondaryColor = hexToRgb(brandKit.secondaryColor)
  const textColor = rgb(0.1, 0.1, 0.1)
  const whiteColor = rgb(1, 1, 1)
  const padding = 50

  // Draw white background
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: whiteColor,
  })

  // Draw large slide number in top left
  const numberFontSize = 72
  const numberText = slideNumber.toString().padStart(2, "0")
  page.drawText(numberText, {
    x: padding,
    y: height - padding - 50,
    size: numberFontSize,
    font: fonts.bold,
    color: primaryColor,
  })

  // Draw horizontal accent line
  page.drawRectangle({
    x: padding,
    y: height - padding - 80,
    width: width - padding * 2,
    height: 3,
    color: secondaryColor,
  })

  // Draw title
  const titleFontSize = 28
  const titleLines = wrapText(
    slide.title,
    fonts.bold,
    titleFontSize,
    width - padding * 2
  )
  const titleLineHeight = titleFontSize * 1.4
  let titleY = height - padding - 130

  for (const line of titleLines) {
    page.drawText(line, {
      x: padding,
      y: titleY,
      size: titleFontSize,
      font: fonts.bold,
      color: textColor,
    })
    titleY -= titleLineHeight
  }

  // Draw content with larger font for data emphasis
  if (slide.content) {
    const contentFontSize = 20
    const contentLines = wrapText(
      slide.content,
      fonts.regular,
      contentFontSize,
      width - padding * 2
    )
    const contentLineHeight = contentFontSize * 1.6
    let contentY = height * 0.45

    for (const line of contentLines) {
      page.drawText(line, {
        x: padding,
        y: contentY,
        size: contentFontSize,
        font: fonts.regular,
        color: textColor,
      })
      contentY -= contentLineHeight
    }
  }

  // Draw slide number at bottom with accent bar
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height: 50,
    color: primaryColor,
  })

  const slideNumberText = `${slideNumber} of ${totalSlides}`
  const slideNumFontSize = 14
  const slideNumWidth = fonts.regular.widthOfTextAtSize(
    slideNumberText,
    slideNumFontSize
  )
  page.drawText(slideNumberText, {
    x: (width - slideNumWidth) / 2,
    y: 18,
    size: slideNumFontSize,
    font: fonts.regular,
    color: whiteColor,
  })
}

/**
 * Draws the story template style on a page
 * Gradient-like effect using rectangles, narrative flow
 */
async function drawStoryTemplate(
  page: PDFPage,
  slide: CarouselSlide,
  slideNumber: number,
  totalSlides: number,
  brandKit: BrandKit,
  fonts: { regular: PDFFont; bold: PDFFont }
): Promise<void> {
  const { width, height } = page.getSize()
  const primaryColor = hexToRgb(brandKit.primaryColor)
  const secondaryColor = hexToRgb(brandKit.secondaryColor)
  const whiteColor = rgb(1, 1, 1)
  const textColor = rgb(0.2, 0.2, 0.2)
  const padding = 50

  // Create gradient-like effect with overlapping rectangles
  // Draw primary color base
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: primaryColor,
  })

  // Draw secondary color overlay (diagonal effect)
  page.drawRectangle({
    x: width * 0.3,
    y: 0,
    width: width * 0.7,
    height: height,
    color: secondaryColor,
    opacity: 0.7,
  })

  // Draw white content area with slight transparency
  page.drawRectangle({
    x: padding,
    y: padding,
    width: width - padding * 2,
    height: height - padding * 2 - 40,
    color: whiteColor,
    opacity: 0.95,
  })

  // Draw title inside the white area
  const titleFontSize = 30
  const titleLines = wrapText(
    slide.title,
    fonts.bold,
    titleFontSize,
    width - padding * 4
  )
  const titleLineHeight = titleFontSize * 1.4
  let titleY = height - padding - 80

  for (const line of titleLines) {
    page.drawText(line, {
      x: padding * 2,
      y: titleY,
      size: titleFontSize,
      font: fonts.bold,
      color: textColor,
    })
    titleY -= titleLineHeight
  }

  // Draw content with narrative-style formatting
  if (slide.content) {
    const contentFontSize = 18
    const contentLines = wrapText(
      slide.content,
      fonts.regular,
      contentFontSize,
      width - padding * 4
    )
    const contentLineHeight = contentFontSize * 1.8
    let contentY = height * 0.5

    for (const line of contentLines) {
      page.drawText(line, {
        x: padding * 2,
        y: contentY,
        size: contentFontSize,
        font: fonts.regular,
        color: textColor,
      })
      contentY -= contentLineHeight
    }
  }

  // Draw slide indicator dots at bottom
  const dotRadius = 5
  const dotSpacing = 20
  const dotsWidth = totalSlides * dotSpacing
  const dotsStartX = (width - dotsWidth) / 2

  for (let i = 1; i <= totalSlides; i++) {
    const x = dotsStartX + i * dotSpacing
    page.drawCircle({
      x,
      y: 25,
      size: dotRadius,
      color: i === slideNumber ? whiteColor : rgb(0.7, 0.7, 0.7),
    })
  }
}

/**
 * Exports a carousel to a PDF document.
 *
 * Creates a multi-page PDF with one page per slide, applying the selected
 * template style and brand kit colors.
 *
 * @param options - The export configuration options
 * @returns A Blob containing the PDF data
 *
 * @example
 * ```typescript
 * const slides: CarouselSlide[] = [
 *   { id: "1", title: "Welcome", content: "Introduction slide", order: 0 },
 *   { id: "2", title: "Key Points", content: "Main content here", order: 1 },
 * ]
 *
 * const brandKit: BrandKit = {
 *   primaryColor: "#0077B5",
 *   secondaryColor: "#00A0DC",
 * }
 *
 * const pdfBlob = await exportCarouselToPDF({
 *   slides,
 *   brandKit,
 *   template: "bold",
 *   format: "square",
 * })
 *
 * downloadPDF(pdfBlob, "my-carousel.pdf")
 * ```
 */
export async function exportCarouselToPDF(
  options: PDFExportOptions
): Promise<Blob> {
  const {
    slides,
    brandKit,
    template,
    format = "square",
  } = options

  // Validate inputs
  if (!slides || slides.length === 0) {
    throw new Error("At least one slide is required to export a PDF")
  }

  // Sort slides by order
  const sortedSlides = [...slides].sort((a, b) => a.order - b.order)

  // Get page dimensions
  const pageSize = PAGE_SIZES[format]

  // Create PDF document
  const pdfDoc = await PDFDocument.create()

  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fonts = { regular: helvetica, bold: helveticaBold }

  // Add pages for each slide
  for (let i = 0; i < sortedSlides.length; i++) {
    const slide = sortedSlides[i]
    const page = pdfDoc.addPage([pageSize.width, pageSize.height])
    const slideNumber = i + 1
    const totalSlides = sortedSlides.length

    // Apply template style
    switch (template) {
      case "bold":
        await drawBoldTemplate(page, slide, slideNumber, totalSlides, brandKit, fonts)
        break
      case "minimalist":
        await drawMinimalistTemplate(page, slide, slideNumber, totalSlides, brandKit, fonts)
        break
      case "data":
        await drawDataTemplate(page, slide, slideNumber, totalSlides, brandKit, fonts)
        break
      case "story":
        await drawStoryTemplate(page, slide, slideNumber, totalSlides, brandKit, fonts)
        break
      default:
        await drawBoldTemplate(page, slide, slideNumber, totalSlides, brandKit, fonts)
    }
  }

  // Serialize to bytes
  const pdfBytes = await pdfDoc.save()

  // Convert Uint8Array to ArrayBuffer for Blob compatibility
  const arrayBuffer = new ArrayBuffer(pdfBytes.length)
  const view = new Uint8Array(arrayBuffer)
  view.set(pdfBytes)

  // Convert to Blob
  return new Blob([arrayBuffer], { type: "application/pdf" })
}

/**
 * Downloads a PDF blob to the user's device.
 *
 * Creates a temporary anchor element to trigger the browser's download
 * functionality with the specified filename.
 *
 * @param blob - The PDF blob to download
 * @param filename - The filename to use for the download (defaults to "carousel.pdf")
 *
 * @example
 * ```typescript
 * const pdfBlob = await exportCarouselToPDF(options)
 * downloadPDF(pdfBlob, "my-linkedin-carousel.pdf")
 * ```
 */
export function downloadPDF(blob: Blob, filename: string = "carousel.pdf"): void {
  // Ensure filename has .pdf extension
  const finalFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`

  // Create object URL for the blob
  const url = URL.createObjectURL(blob)

  // Create temporary anchor element
  const link = document.createElement("a")
  link.href = url
  link.download = finalFilename

  // Append to document, click, and remove
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up the object URL
  URL.revokeObjectURL(url)
}
