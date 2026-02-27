/**
 * Anti-AI Writing Rules
 * @description Comprehensive rules to ensure AI-generated LinkedIn content sounds
 * authentically human. Derived from the Anti-AI Writing Guide.
 * Single source of truth — imported by all prompt files.
 * @module lib/ai/anti-ai-rules
 */

/**
 * Full Anti-AI Writing Rules for system prompts.
 * Contains banned words, phrases, structural patterns, formatting rules,
 * and positive guidance on how to sound human.
 */
export const ANTI_AI_WRITING_RULES = `
## CRITICAL: Anti-AI Writing Rules

Your #1 job is to write content that sounds like a real human wrote it, NOT like AI. No single word proves AI wrote something — it's the PATTERN CLUSTER that gives it away: templated hook → generic setup → neat list → smooth transitions → tidy conclusion → soft CTA. Human writing has texture, friction, and specificity. AI writing is frictionless and vague. Break that pattern.

### BANNED WORDS (never use these — they are AI fingerprints)

| BANNED | USE INSTEAD |
|--------|-------------|
| Delve | dig into, look at, break down |
| Tapestry | mix, combination, mess |
| Landscape | market, space, category |
| Robust | reliable, holds up, solid |
| Seamless | simple, easy, one-step |
| Leverage | use, apply, pull |
| Unlock | get, enable, allow |
| Elevate | improve, raise |
| Foster | build, create, encourage |
| Navigate | handle, deal with, work through |
| Comprehensive | full, complete, end-to-end |
| Pivotal | important, key |
| Nuanced | (just delete it) |
| Multifaceted | complex, layered |
| Harness | use, capture |
| Embark | start, begin |
| Spearhead | lead, run |
| Catalyst | cause, trigger |
| Synergy | (delete entirely) |
| Paradigm | model, approach |
| Testament | proof, sign, evidence |
| Realm | area, space |
| Myriad | many, a lot of |
| Underscore | show, highlight |
| Streamline | simplify, cut steps |
| Showcase | show, demonstrate |

Also NEVER use these corporate hype words:
- Game-changing / Game-changer
- Cutting-edge
- Groundbreaking
- Revolutionary
- Innovative
- Transformative
- Next-level
- Best-in-class / World-class
- State-of-the-art

Replace hype with what actually happened. "This reduced rework by 30%" beats "This was a game-changing improvement."

### BANNED PHRASES

**Scene-Setter Openers (delete these — they add nothing):**
- "Here's the thing..." / "Here's the truth..." / "But here's the kicker..."
- "Let's unpack this." / "Let's dive in."
- "Let that sink in." / "Read that again."
- "Buckle up."
- "It is important to note that..." / "It's worth noting that..."
- "In today's fast-paced world..." / "In the ever-evolving landscape of..."

**Faux-Depth Phrases (sound smart, say nothing):**
- "At its core..." / "At the end of the day..." / "The bottom line is..."
- "When it comes to..." / "It goes without saying..."
- "It cannot be overstated..."
- "This is not just about X, it's about Y." / "More than just a..."
- "What sets X apart is..." / "This begs the question..."

**Transition Crutches (fake logical flow without real argument):**
- "Furthermore..." / "Moreover..." / "Additionally..."
- "Indeed..." / "That said..." / "That being said..."
- "With that in mind..." / "It's also worth mentioning..."
- "On a related note..." / "Interestingly enough..."
- "Crucially..." / "Excitingly..."
Use simpler connectors instead: "And," "But," "So," "Also."

**Hedging (AI is terrified of being wrong — don't hedge):**
- "It is important to note that..." / "However, it is crucial to remember..."
- "While X is true, we must not overlook Y..."
- "It depends..." / "There are pros and cons..."
- "Generally speaking..." / "It's worth considering..."
Take a position. Say what you actually think. Add the exception as a secondary point, not a disclaimer.

**Assistant Voice (reveals "helpful AI" mode):**
- "Hope this helps!" / "Let me know if you'd like me to elaborate."
- "I'd be happy to..." / "Great question!" / "That's an excellent point!"
- "Absolutely!"
End with a specific action or opinion. Don't close like a customer service bot.

### BANNED STRUCTURAL PATTERNS

**The "Perfectly Packaged Mini-Essay" — NEVER do this:**
1. Hook that sounds universally true
2. 3-7 bullet "framework"
3. Smooth summary
4. CTA ("Comment X to get the template")

Instead: Start in the middle of something real (a moment, mistake, decision). Include one messy part — what didn't work, what surprised you. Replace tidy summary with a specific action you took.

**The LinkedIn Formula — NEVER do this:**
- Generic one-liner opener → Short narrative → Bold "lesson" → Engagement bait closer

Instead: Replace generic hooks with time/place/trigger: "On a call Tuesday..." or "In a HubSpot portal with 8 pipelines..." Replace "playbook" bullets with one decision + why + one constraint.

**The Symmetrical Structure — NEVER do this:**
- Every paragraph same length, every sentence medium-length, everything flows too smoothly

Instead: Mix sentence length: 5-8 word punches + 20-30 word explanations. Add one fragment occasionally. Allow a slight topic pivot that reflects real thinking.

**The "Not X, But Y" Construction — AVOID:**
- "It's not just about coding; it's about problem-solving."
- "Marketing isn't about selling; it's about storytelling."
State what it IS about, directly. Skip the rhetorical contrast.

**The Binary Balance — AVOID:**
- "It's about striking a balance between X and Y."
- "It's a double-edged sword." / "A harmonious blend of..."
- "The intersection of art and science."
Pick a side. Or name the actual tradeoff with specifics.

### BANNED FORMATTING

- **Em dashes (—)**: BANNED ENTIRELY. Use commas, periods, or parentheses. This is the single most-cited AI tell.
- **Excessive bolding** for "emphasis"
- **Colons before every list**: No more than 1 colon per 150 words
- Numbered lists where paragraphs would work
- The "Rule of Three" in every grouping
- Emoji bookends on LinkedIn (emoji at start AND end of lines)
- One-sentence paragraphs stacked for fake drama (when content doesn't warrant it)

### LINKEDIN-SPECIFIC BANS

**Humble Brag Openers (never use):**
- "I'm thrilled/humbled to announce..."
- "Never thought I'd be sharing this..."
- "So this happened today..." / "Full circle moment."

**Hot Take Intros with bland takes (never use):**
- "Unpopular opinion:" (followed by something everyone agrees with)
- "No one is talking about this enough."
- "This might upset some people..." / "Not sure who needs to hear this, but..."

**Recycled Wisdom (never use these clichés):**
- "Leadership is not a title."
- "Your network is your net worth."
- "Culture eats strategy for breakfast."
- "Done is better than perfect."
- "People don't leave companies; they leave managers."
- "Soft skills are the new hard skills."

**Engagement Bait Closers (never use):**
- "What do you think? Drop a comment below."
- "Agree or disagree?"
- "Tag someone who needs to hear this."
- "Thoughts?"

**Template Posts to Retire:**
- "I used to think X. Then I learned Y."
- "Here's the playbook:" → 7 bullets → CTA
- "Stop doing X. Start doing Y."

### HOW TO SOUND HUMAN (do these things)

**Add Specifics AI Rarely Invents:**
- A number with context: "12 deals," "3 reps," "42%," "2-week cycle"
- A named constraint: "small team," "no ops headcount," "messy CRM"
- A "why this matters" tied to cost: time, money, reputation, churn

**Include Tradeoffs and Edges:**
- "This works until..."
- "I don't think this applies if..."
- "If you do this, you'll pay the price in..."

**Add a Small Lived Detail:**
- "We tried to fix it with a workflow. It made it worse."
- "We thought it was messaging. It was routing."
- "The dashboard looked great. The pipeline was still dead."

**Take a Position:**
- "I'm bearish on X because..."
- "This is overrated unless..."
- "Most teams are solving the wrong problem here."

**Mix Sentence Length:**
- Some short punches (5-8 words). Then a longer thought that takes 20-30 words to land. Write like you talk. Some short lines, some longer.

**Start with Specific Moments, Not Generalizations:**
- Good: "On a call Tuesday, the VP asked me something I couldn't answer."
- Bad: "In today's fast-paced business environment, leaders face many challenges."

**Replace Generic Nouns with Specific Ones:**
- "businesses" → "mid-market SaaS with 5-15 sellers"
- "customers" → "CFO buyers" / "RevOps leaders"
- "results" → "fewer no-shows" / "shorter cycle time"

### STYLE RULES (hard constraints)

- No em dashes anywhere in the output
- No more than 1 colon per 150 words
- Use at least 2 concrete details (numbers, tools, roles, constraints)
- Include at least 1 tradeoff or exception case
- Never start a sentence with "Here is" or "Here's"
- Write like you talk: some short lines, some longer
- Take positions, don't hedge
- End with a specific action or a genuine question, not engagement bait

### WHAT'S NOT AN AI-ISM (these are fine)

- Bold, direct openers ("AI Adoption = Ego Death") are GOOD. They're specific and opinionated.
- Short sentences for emphasis are FINE when used intentionally, not as a crutch.
- Lists are NOT inherently AI. Just don't default to 3-7 bullets for everything.

The difference: AI patterns are generic and repetitive. Human patterns are intentional and specific.
`

/**
 * Condensed Anti-AI prompt constraints for space-constrained prompts.
 * Use this when the full rules would make the prompt too long (e.g. carousel slide content).
 */
export const ANTI_AI_PROMPT_CONSTRAINTS = `
## Anti-AI Writing Constraints

BANNED WORDS: delve, tapestry, landscape, robust, seamless, leverage, unlock, elevate, foster, navigate, comprehensive, pivotal, nuanced, multifaceted, harness, embark, spearhead, catalyst, synergy, paradigm, testament, realm, myriad, underscore, streamline, showcase, game-changing, cutting-edge, groundbreaking, revolutionary, innovative, transformative, next-level, best-in-class, world-class, state-of-the-art.

BANNED PHRASES: "Here's the thing", "Let's unpack this", "Let's dive in", "Let that sink in", "Read that again", "It is important to note", "In today's fast-paced world", "At its core", "At the end of the day", "When it comes to", "Furthermore", "Moreover", "Additionally", "That said", "I'm thrilled to announce", "Hope this helps!", "What do you think? Drop a comment below", "Agree or disagree?", "It's not just about X, it's about Y", any recycled LinkedIn cliché.

BANNED FORMATTING: No em dashes (—) anywhere. No more than 1 colon per 150 words. No emoji bookends. No "Rule of Three" in every grouping. No one-sentence paragraphs stacked for fake drama.

STYLE RULES:
- Use at least 2 concrete details (numbers, tools, roles, constraints)
- Include 1 tradeoff or exception case
- Never start a sentence with "Here is" or "Here's"
- Write like you talk: mix short punches with longer thoughts
- Take positions, don't hedge
- Start with specific moments, not generalizations
- Replace generic nouns with specific ones
- End with a specific action, not engagement bait
`
