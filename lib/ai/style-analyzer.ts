/**
 * Writing Style Analyzer
 * @description Pure computation module that analyzes a user's writing patterns
 * from their own posts and saved/wishlisted posts to build a style profile.
 * Own posts are weighted 2x vs saved posts for style matching.
 * @module lib/ai/style-analyzer
 */

/**
 * Writing style analysis result
 */
export interface WritingStyleAnalysis {
  /** Average number of words per sentence */
  avgSentenceLength: number
  /** Vocabulary level classification */
  vocabularyLevel: "simple" | "moderate" | "advanced" | "technical"
  /** Overall tone of writing */
  tone: string
  /** Formatting patterns observed */
  formattingStyle: {
    usesLineBreaks: boolean
    avgParagraphLength: number
    usesBulletPoints: boolean
    usesNumberedLists: boolean
    usesBoldText: boolean
    usesEmoji: boolean
    usesHashtags: boolean
    hashtagCount: number
  }
  /** Common hook/opener patterns */
  hookPatterns: string[]
  /** Emoji usage style */
  emojiUsage: "none" | "minimal" | "moderate" | "heavy"
  /** Common CTA patterns */
  ctaPatterns: string[]
  /** Signature phrases that appear often */
  signaturePhrases: string[]
  /** Recurring content themes */
  contentThemes: string[]
}

/**
 * Split text into sentences
 * @param text - Text to split
 * @returns Array of sentences
 */
function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, ". ")
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
}

/**
 * Count emojis in text
 * @param text - Text to scan
 * @returns Number of emoji characters
 */
function countEmojis(text: string): number {
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu
  const matches = text.match(emojiRegex)
  return matches ? matches.length : 0
}

/**
 * Extract hashtags from text
 * @param text - Text to scan
 * @returns Array of hashtags found
 */
function extractHashtags(text: string): string[] {
  const matches = text.match(/#\w+/g)
  return matches || []
}

/**
 * Detect the hook/opening pattern of a post
 * @param text - Post content
 * @returns Hook pattern classification
 */
function detectHookPattern(text: string): string | null {
  const firstLine = text.split("\n")[0]?.trim() || ""
  if (!firstLine) return null

  if (firstLine.endsWith("?")) return "question-based"
  if (firstLine.match(/^(I |My |We )/i)) return "personal-opening"
  if (firstLine.match(/^\d+/)) return "number-leading"
  if (firstLine.match(/^(Here|This|The|Why|How|What)/i)) return "direct-statement"
  if (firstLine.match(/^(Unpopular|Hot take|Controversial|Bold)/i)) return "contrarian-opener"
  if (firstLine.match(/^"/)) return "quote-opener"
  if (firstLine.length < 50) return "short-punchy"
  return "narrative"
}

/**
 * Detect CTA pattern at the end of a post
 * @param text - Post content
 * @returns CTA pattern classification or null
 */
function detectCtaPattern(text: string): string | null {
  const lines = text.split("\n").filter((l) => l.trim().length > 0)
  const lastLines = lines.slice(-3).join(" ").toLowerCase()

  if (lastLines.match(/\?$/)) return "question-cta"
  if (lastLines.match(/(agree|disagree|thoughts|think)/i)) return "opinion-seeking"
  if (lastLines.match(/(share|repost|tag|comment)/i)) return "engagement-ask"
  if (lastLines.match(/(save|bookmark)/i)) return "save-prompt"
  if (lastLines.match(/(follow|connect|dm)/i)) return "follow-cta"
  if (lastLines.match(/(link|bio|check out)/i)) return "link-cta"
  return null
}

/**
 * Detect vocabulary level from word complexity
 * @param words - Array of words to analyze
 * @returns Vocabulary level classification
 */
function detectVocabularyLevel(words: string[]): WritingStyleAnalysis["vocabularyLevel"] {
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length
  const longWords = words.filter((w) => w.length > 8).length / words.length

  if (avgWordLength > 6.5 || longWords > 0.2) return "technical"
  if (avgWordLength > 5.5 || longWords > 0.12) return "advanced"
  if (avgWordLength > 4.5) return "moderate"
  return "simple"
}

/**
 * Detect overall tone from text patterns
 * @param texts - Array of post texts
 * @returns Tone description string
 */
function detectTone(texts: string[]): string {
  const combined = texts.join(" ").toLowerCase()
  const toneSignals: Record<string, number> = {
    professional: 0,
    conversational: 0,
    motivational: 0,
    analytical: 0,
    humorous: 0,
    educational: 0,
  }

  if (combined.match(/\b(data|research|study|percent|statistics)\b/gi)) toneSignals.analytical += 3
  if (combined.match(/\b(you|your|we|our|let's)\b/gi)) toneSignals.conversational += 2
  if (combined.match(/\b(lesson|tip|framework|step|guide)\b/gi)) toneSignals.educational += 2
  if (combined.match(/\b(hustle|grind|dream|achieve|success|growth)\b/gi)) toneSignals.motivational += 2
  if (combined.match(/\b(lol|haha|funny|joke|😂)\b/gi)) toneSignals.humorous += 3
  if (combined.match(/\b(strategy|implement|optimize|ROI|KPI)\b/gi)) toneSignals.professional += 2

  const sorted = Object.entries(toneSignals).sort(([, a], [, b]) => b - a)
  const top = sorted.filter(([, v]) => v > 0).slice(0, 2)

  if (top.length === 0) return "professional"
  if (top.length === 1) return top[0][0]
  return `${top[0][0]}, ${top[1][0]}`
}

/**
 * Find recurring phrases across posts
 * @param texts - Array of post texts
 * @param minOccurrences - Minimum times a phrase must appear
 * @returns Array of signature phrases
 */
function findSignaturePhrases(texts: string[], minOccurrences: number = 2): string[] {
  const phraseCounts: Record<string, number> = {}

  for (const text of texts) {
    const words = text.toLowerCase().split(/\s+/)
    // Check 2-4 word phrases
    for (let len = 2; len <= 4; len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(" ")
        // Skip phrases that are too generic
        if (phrase.match(/^(the |a |an |is |in |on |at |to |for |and |or |but )/)) continue
        if (phrase.length < 6) continue
        phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1
      }
    }
  }

  return Object.entries(phraseCounts)
    .filter(([, count]) => count >= minOccurrences)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([phrase]) => phrase)
}

/**
 * Detect recurring content themes
 * @param texts - Array of post texts
 * @returns Array of theme keywords
 */
function detectContentThemes(texts: string[]): string[] {
  const themeKeywords: Record<string, string[]> = {
    leadership: ["leader", "leadership", "team", "manage", "culture"],
    sales: ["sales", "revenue", "pipeline", "deal", "prospect", "close"],
    marketing: ["marketing", "brand", "content", "audience", "campaign"],
    technology: ["tech", "software", "AI", "automation", "digital"],
    entrepreneurship: ["startup", "founder", "entrepreneur", "build", "launch"],
    productivity: ["productivity", "time", "focus", "habits", "routine"],
    career: ["career", "job", "hire", "interview", "promotion"],
    growth: ["growth", "scale", "metrics", "KPI", "OKR"],
  }

  const combined = texts.join(" ").toLowerCase()
  const themeCounts: Record<string, number> = {}

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    const count = keywords.reduce((sum, kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, "gi")
      const matches = combined.match(regex)
      return sum + (matches ? matches.length : 0)
    }, 0)
    if (count > 0) themeCounts[theme] = count
  }

  return Object.entries(themeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([theme]) => theme)
}

/**
 * Analyzes writing style from a user's own posts and saved/wishlisted posts
 * Own posts are weighted 2x vs saved posts for style matching
 * @param ownPosts - Array of user's own post content strings
 * @param savedPosts - Array of saved/wishlisted post content strings
 * @returns WritingStyleAnalysis with computed style metrics
 * @example
 * ```typescript
 * const style = analyzeWritingStyle(myPosts, savedPosts)
 * console.log(style.tone) // "conversational, motivational"
 * ```
 */
export function analyzeWritingStyle(
  ownPosts: string[],
  savedPosts: string[]
): WritingStyleAnalysis {
  // Weight own posts 2x by duplicating them in analysis
  const weightedTexts = [...ownPosts, ...ownPosts, ...savedPosts].filter(
    (t) => t && t.trim().length > 0
  )

  if (weightedTexts.length === 0) {
    return {
      avgSentenceLength: 12,
      vocabularyLevel: "moderate",
      tone: "professional",
      formattingStyle: {
        usesLineBreaks: true,
        avgParagraphLength: 2,
        usesBulletPoints: false,
        usesNumberedLists: false,
        usesBoldText: false,
        usesEmoji: false,
        usesHashtags: false,
        hashtagCount: 0,
      },
      hookPatterns: [],
      emojiUsage: "none",
      ctaPatterns: [],
      signaturePhrases: [],
      contentThemes: [],
    }
  }

  // Sentence length analysis
  const allSentences = weightedTexts.flatMap(splitSentences)
  const sentenceLengths = allSentences.map((s) => s.split(/\s+/).length)
  const avgSentenceLength =
    sentenceLengths.length > 0
      ? Math.round(sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length)
      : 12

  // Vocabulary level
  const allWords = weightedTexts
    .join(" ")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
  const vocabularyLevel = detectVocabularyLevel(allWords)

  // Tone
  const tone = detectTone(weightedTexts)

  // Formatting analysis
  const lineBreakPosts = weightedTexts.filter((t) => t.includes("\n")).length
  const usesLineBreaks = lineBreakPosts / weightedTexts.length > 0.5

  const paragraphs = weightedTexts.flatMap((t) => t.split(/\n\n+/).filter((p) => p.trim()))
  const avgParagraphLength =
    paragraphs.length > 0
      ? Math.round(
          paragraphs.reduce((sum, p) => sum + p.split(/\n/).length, 0) / paragraphs.length
        )
      : 2

  const bulletPosts = weightedTexts.filter((t) => t.match(/^[\s]*[-•→]\s/m)).length
  const numberedPosts = weightedTexts.filter((t) => t.match(/^[\s]*\d+[\.\)]\s/m)).length
  const boldPosts = weightedTexts.filter((t) => t.match(/\*\*[^*]+\*\*/)).length

  // Emoji analysis
  const totalEmojis = weightedTexts.reduce((sum, t) => sum + countEmojis(t), 0)
  const emojiRatio = totalEmojis / weightedTexts.length
  const emojiUsage: WritingStyleAnalysis["emojiUsage"] =
    emojiRatio === 0 ? "none" : emojiRatio < 1 ? "minimal" : emojiRatio < 3 ? "moderate" : "heavy"

  // Hashtag analysis
  const allHashtags = weightedTexts.flatMap(extractHashtags)
  const avgHashtagCount =
    allHashtags.length > 0 ? Math.round(allHashtags.length / weightedTexts.length) : 0

  // Hook patterns
  const hookPatterns = weightedTexts
    .map(detectHookPattern)
    .filter((h): h is string => h !== null)
  const hookCounts: Record<string, number> = {}
  for (const hook of hookPatterns) {
    hookCounts[hook] = (hookCounts[hook] || 0) + 1
  }
  const topHookPatterns = Object.entries(hookCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([pattern]) => pattern)

  // CTA patterns
  const ctaPatterns = weightedTexts
    .map(detectCtaPattern)
    .filter((c): c is string => c !== null)
  const ctaCounts: Record<string, number> = {}
  for (const cta of ctaPatterns) {
    ctaCounts[cta] = (ctaCounts[cta] || 0) + 1
  }
  const topCtaPatterns = Object.entries(ctaCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([pattern]) => pattern)

  // Use only unweighted own posts for phrase analysis to avoid false positives from duplication
  const signaturePhrases = findSignaturePhrases(ownPosts, 2)
  const contentThemes = detectContentThemes(weightedTexts)

  return {
    avgSentenceLength,
    vocabularyLevel,
    tone,
    formattingStyle: {
      usesLineBreaks,
      avgParagraphLength,
      usesBulletPoints: bulletPosts / weightedTexts.length > 0.2,
      usesNumberedLists: numberedPosts / weightedTexts.length > 0.2,
      usesBoldText: boldPosts / weightedTexts.length > 0.2,
      usesEmoji: emojiUsage !== "none",
      usesHashtags: avgHashtagCount > 0,
      hashtagCount: avgHashtagCount,
    },
    hookPatterns: topHookPatterns,
    emojiUsage,
    ctaPatterns: topCtaPatterns,
    signaturePhrases,
    contentThemes,
  }
}

/**
 * Builds a style prompt fragment to inject into AI generation prompts
 * @param style - Writing style analysis
 * @returns Formatted prompt string for AI generation
 * @example
 * ```typescript
 * const fragment = buildStylePromptFragment(style)
 * const systemPrompt = BASE_PROMPT + "\n\n" + fragment
 * ```
 */
export function buildStylePromptFragment(style: WritingStyleAnalysis): string {
  const lines: string[] = ["WRITING STYLE REQUIREMENTS:"]

  // Tone
  lines.push(`- Write in a ${style.tone} tone`)

  // Sentence length
  lines.push(`- Keep sentences ${style.avgSentenceLength <= 10 ? "short" : style.avgSentenceLength <= 15 ? "moderate-length" : "longer"} (avg ${style.avgSentenceLength} words)`)

  // Hook patterns
  if (style.hookPatterns.length > 0) {
    const hookDescriptions: Record<string, string> = {
      "question-based": "question-based hooks",
      "personal-opening": "personal/first-person openers",
      "number-leading": "number-leading hooks",
      "direct-statement": "direct statement openers",
      "contrarian-opener": "contrarian/provocative openers",
      "quote-opener": "quote-based hooks",
      "short-punchy": "short, punchy one-liners",
      "narrative": "narrative-style openings",
    }
    const hookDesc = style.hookPatterns
      .map((h) => hookDescriptions[h] || h)
      .join(", ")
    lines.push(`- Open with ${hookDesc}`)
  }

  // CTA patterns
  if (style.ctaPatterns.length > 0) {
    const ctaDescriptions: Record<string, string> = {
      "question-cta": "engaging questions",
      "opinion-seeking": "opinion-seeking prompts (agree/disagree?)",
      "engagement-ask": "engagement requests (share/comment)",
      "save-prompt": "save/bookmark prompts",
      "follow-cta": "follow/connect invitations",
      "link-cta": "link/resource references",
    }
    const ctaDesc = style.ctaPatterns
      .map((c) => ctaDescriptions[c] || c)
      .join(", ")
    lines.push(`- End with ${ctaDesc}`)
  }

  // Formatting
  if (style.formattingStyle.usesLineBreaks) {
    lines.push(`- Use line breaks between every ${style.formattingStyle.avgParagraphLength} sentences`)
  }

  if (style.formattingStyle.usesBulletPoints) {
    lines.push("- Use bullet points for key points")
  }

  if (style.formattingStyle.usesNumberedLists) {
    lines.push("- Use numbered lists for sequential items")
  }

  if (style.formattingStyle.usesBoldText) {
    lines.push("- Use **bold** for emphasis on key phrases")
  }

  // Emoji
  if (style.emojiUsage === "moderate" || style.emojiUsage === "heavy") {
    lines.push(`- Include emojis (${style.emojiUsage} usage)`)
  } else if (style.emojiUsage === "minimal") {
    lines.push("- Use emojis sparingly (1-2 per post)")
  } else {
    lines.push("- Avoid emojis")
  }

  // Hashtags
  if (style.formattingStyle.usesHashtags) {
    lines.push(`- Include ${style.formattingStyle.hashtagCount} hashtags at the end`)
  }

  // Vocabulary
  const vocabDescriptions: Record<string, string> = {
    simple: "simple, everyday language",
    moderate: "accessible professional language",
    advanced: "sophisticated vocabulary",
    technical: "technical/industry-specific terminology",
  }
  lines.push(`- Use ${vocabDescriptions[style.vocabularyLevel]}`)

  return lines.join("\n")
}

/**
 * Determines whether a style profile should be refreshed
 * @param profile - Existing style profile with counts
 * @param currentPostCount - Current total number of user's posts
 * @returns True if the style should be refreshed (>20% new posts or >7 days stale)
 */
export function shouldRefreshStyle(
  profile: {
    posts_analyzed_count: number
    last_refreshed_at: string
  },
  currentPostCount: number
): boolean {
  // Check if >20% new posts since last analysis
  const newPostRatio =
    profile.posts_analyzed_count > 0
      ? (currentPostCount - profile.posts_analyzed_count) / profile.posts_analyzed_count
      : 1

  if (newPostRatio > 0.2) return true

  // Check if >7 days since last refresh
  const lastRefreshed = new Date(profile.last_refreshed_at)
  const daysSinceRefresh =
    (Date.now() - lastRefreshed.getTime()) / (1000 * 60 * 60 * 24)

  if (daysSinceRefresh > 7) return true

  return false
}
