# LinkedIn Content Prompt Template Research

> Comprehensive research findings to inform production-ready AI prompt templates for LinkedIn content generation.

**Last Updated:** January 2026
**Research Sources:** Web analysis of 2024-2025 LinkedIn algorithm studies, prompt engineering best practices, and content performance data.

---

## Table of Contents

1. [LinkedIn Algorithm Insights (2024-2025)](#1-linkedin-algorithm-insights-2024-2025)
2. [AI Prompt Engineering Best Practices](#2-ai-prompt-engineering-best-practices)
3. [Tone Analysis](#3-tone-analysis)
4. [Post Type Analysis](#4-post-type-analysis)
5. [Anti-Patterns to Avoid](#5-anti-patterns-to-avoid)
6. [Implementation Recommendations](#6-implementation-recommendations)

---

## 1. LinkedIn Algorithm Insights (2024-2025)

### 1.1 Major Algorithm Changes

The 2024-2025 period marked the most significant algorithmic shift in LinkedIn's history. Key changes include:

- **Reach Decline:** Overall organic reach dropped ~50% year-over-year
- **Anti-Virality Focus:** The algorithm is specifically designed to prevent content from going viral; it prioritizes relevant professional advice over sensational content
- **Expertise Prioritization:** Content with original insights, industry trends, or actionable advice receives larger audience reach
- **Consumption Rate Tracking:** LinkedIn now measures how completely content is consumed, not just initial engagement

### 1.2 Content Performance Metrics

| Content Type | Average Engagement Rate | Notes |
|--------------|------------------------|-------|
| Multi-image posts | 6.60% | Highest performing format |
| Native documents (PDFs/Carousels) | 6.10% | Strong for educational content |
| Video posts | 5.60% | Up from 4.00% in 2023 |
| Text-only posts | Lower baseline | Underperforms without visual elements |

**Key Performance Insights:**
- Content delivering real expertise with concrete data points generates **3.7x more reach** than generalized content
- Native video receives a **+69% performance boost**, especially when branding appears in the first 4 seconds
- Posts triggering **meaningful conversations** (3+ comment exchanges between different participants) receive **5.2x amplification**
- Visual storytelling combined with authentic vulnerability generates engagement rates up to **596% higher** than traditional text-only posts

### 1.3 Optimal Post Length

| Content Type | Optimal Length | Notes |
|--------------|----------------|-------|
| Standard text posts | 1,300-1,600 characters | Matches ~30-45 second read time |
| 2025 sweet spot | 800-1,200 characters | Shorter trending upward |
| Carousel caption | Under 500 characters | Beyond this, lose 10% reach per additional 500 chars |
| Video | 1.2 minutes (80 seconds) | +40% engagement, 70% retention rate |
| Short posts | 150-300 characters | Can perform exceptionally well |

**The "See More" Threshold:**
- Cutoff appears around 140-210 characters depending on device
- **60-70% of potential readers are lost** at this decision point
- First lines must hook readers immediately

### 1.4 Hashtag Strategy

**Optimal Usage:**
- Use **3-5 highly relevant hashtags** per post
- Place hashtags at the end of the post (not in comments - this is outdated)
- Mix 1-2 broad industry hashtags with 2-3 niche-specific tags
- Write in PascalCase (#DigitalMarketing not #digitalmarketing) for accessibility
- Rotate hashtags based on post topic; repeating the same set signals laziness

**2024-2025 Platform Changes:**
- LinkedIn has de-emphasized hashtags in favor of keywords
- Features like following hashtags have been removed
- Content quality, keyword-rich captions, and interaction now matter more than hashtag volume
- Dwell time (how long users view content) is a key algorithm signal

### 1.5 The Four-Stage Distribution Process

1. **Quality Check (0-60 minutes):** Initial evaluation of content quality
2. **Golden Window (60-120 minutes):** Critical engagement period; comments are 15x more valuable than likes
3. **8-Hour Review:** Extended evaluation phase
4. **Final Push (24 hours):** Algorithm decides final reach

**Critical Timing Insights:**
- Within 90 minutes, the algorithm decides if content is worth showing to more people
- Peak posting times: Tuesday-Thursday, 9-11 AM ET
- Posting new content can prematurely cut off reach from previous posts
- Most should aim for 2-5 posts per week

### 1.6 Engagement Patterns

**What Drives Engagement:**
- Ending posts with a question increases engagement by 20-40%
- Posts asking questions or sharing personal stories get more comments
- Every external link reduces initial reach by ~30%
- Limit @mentions to 5 per post and only mention people likely to respond

**Engagement Bait Detection:**
- LinkedIn detects and penalizes obvious engagement bait (e.g., "Comment YES if you agree!")
- Meaningful conversations are prioritized over superficial metrics

---

## 2. AI Prompt Engineering Best Practices

### 2.1 Core Principles

#### Provide Context and Be Specific
The more descriptive and detailed the prompt, the better the results. This is particularly important when seeking a desired outcome or style.

#### Use Persona/Role Assignment
Assigning the model a specific identity or expertise shapes the tone, vocabulary, and depth of the response. Example: "You are an expert LinkedIn storytelling coach..."

#### Use Positive Instruction Framing
Instead of saying what NOT to do, say what TO do. This encourages specificity and focuses on details that lead to good responses.

```
BAD:  Don't use cliches
GOOD: Use specific, concrete examples from real experience
```

#### Provide Examples (Few-Shot Prompting)
Incorporating examples steers AI responses in the desired direction. This is particularly useful for creative tasks where the desired output might be ambiguous.

### 2.2 Temperature Settings for Creative Writing

| Temperature | Use Case | Characteristics |
|-------------|----------|-----------------|
| 0.0-0.3 | Factual, consistent output | Deterministic, predictable, focused |
| 0.4-0.6 | Balanced creativity | Good for most LinkedIn content |
| 0.7-0.9 | Creative, varied output | More unexpected, diverse language |
| 1.0+ | Highly creative | Risk of hallucinations, needs editing |

**Recommendations for LinkedIn Content:**
- **Story posts:** 0.6-0.8 (allow creative language)
- **How-to guides:** 0.3-0.5 (need accuracy and consistency)
- **Contrarian takes:** 0.5-0.7 (creative but coherent)
- **Data-driven posts:** 0.2-0.4 (factual accuracy priority)
- **Carousels:** 0.4-0.6 (balanced for educational content)

**Important:** Higher temperature affects word-level creativity, not necessarily idea-level creativity. Always review output regardless of temperature setting.

### 2.3 Prompt Structure for Consistent Output

#### Recommended Structure:
1. **Role Definition:** Establish the AI's expertise and persona
2. **Task Description:** Clear statement of what to produce
3. **Structure/Format:** Explicit outline of expected structure
4. **Style Rules:** Specific guidelines for tone, vocabulary, formatting
5. **Examples:** 1-2 examples of the desired output pattern
6. **Constraints:** Character limits, what to avoid
7. **Output Format:** How to return the result

#### Variable Usage Patterns:
```
## User Context
- Industry/niche: {{industry}}
- Target audience: {{audience}}
- Tone preference: {{tone}}
- Company/brand: {{company}}
```

### 2.4 Iteration and Refinement

- Start with simple prompts and add complexity as needed
- Break complex tasks into subtasks
- Use step-by-step reasoning for multi-part content
- Keep relevant details only; too many unnecessary details can confuse the model

---

## 3. Tone Analysis

### 3.1 Professional vs. Casual Balance

**The Sweet Spot:**
LinkedIn content should aim for a "casual-professional tone" -- not too stuffy, but still professional. Different platforms call for different approaches, but LinkedIn uniquely rewards content that feels authentic while maintaining credibility.

**Professional Tone Characteristics:**
- Formal language and industry terminology
- Polished, corporate-appropriate voice
- Focus on data, insights, and professional value
- Clear logic and progression
- Avoids slang and contractions

**Casual Tone Characteristics:**
- Conversational language, contractions
- Personal touches and relatable moments
- Appropriate emoji usage (sparingly)
- Authentic and approachable
- "You" and "I" to create connection

### 3.2 The Authenticity Equation

**What Works:**
- Share personal stories; authentic stories about your journey resonate
- Authenticity and vulnerability resonate; professionals appreciate honesty and growth
- Sound like a real person, not a corporate press release
- Conversational style sets you apart and helps build connections

**What Doesn't Work:**
- Overly casual tone from leaders can erode credibility
- A selfie without a compelling narrative is just a picture
- "Authentic looking" tactics (casual tone, behind-the-scenes visuals) rarely lift engagement alone when stronger cues are missing
- Purely AI-generated posts lacking genuine personal insights average **45% fewer interactions**

### 3.3 Inspiring Content Without Being Cliche

**Effective Inspiring Content:**
- Use empowering language that inspires action
- Share encouraging perspectives and success stories
- Make the reader feel capable and motivated
- Ground inspiration in specific, real experiences
- One clear takeaway, not a laundry list of advice

**Avoid:**
- Generic motivational quotes
- Vague aspirational language
- Performative positivity
- Lecture-like tone

### 3.4 Educational Content Patterns

**What Works:**
- Break down complex concepts into digestible parts
- Use clear, structured formatting (bullets, numbered lists)
- Include actionable takeaways
- Provide how-to guidance and practical tips
- Build from basic to advanced
- Use analogies and examples

**Structure:**
- State the desirable outcome upfront
- Brief context on why it matters
- Clear, numbered steps
- Pro tips for advanced users
- Invite questions or sharing

### 3.5 Thought-Provoking Content (Not Rage-Bait)

**Effective Thought Leadership:**
- Challenge conventional wisdom with evidence-based arguments
- Pose questions that make readers think differently
- Share unique perspectives and contrarian views
- Encourage deeper reflection
- Start conversations and debates

**The Line Between Provocative and Rage-Bait:**
- Challenge ideas, not people
- Back up claims with specifics (numbers, examples, experiences)
- Show intellectual honesty by acknowledging counterpoints
- Genuine insight beats outrage
- Take a clear position without excessive hedging

**Dangers of Contrarian for Its Own Sake:**
- Your point of view should resonate with your audience
- Being contrarian just to stand out fails
- Making baseless claims for "shock value" doesn't drive business results
- Must be grounded in reality and supported by data or experiences

---

## 4. Post Type Analysis

### 4.1 Story Posts

**Optimal Narrative Structure:**

1. **Hook:** Open with a vivid, specific moment in time (date, place, or emotion)
2. **Build-up:** Create tension or curiosity; what was at stake?
3. **Turning point:** Reveal the pivotal moment or decision
4. **Lesson:** Share the insight or transformation
5. **Bridge:** Connect the personal lesson to the reader's life
6. **CTA:** Ask readers to share a similar experience

**Style Guidelines:**
- Write in first person ("I")
- Use present tense for the hook to create immediacy
- Include sensory details (what you saw, felt, heard)
- Keep vulnerability authentic but professional
- One clear takeaway, not a laundry list

**Example Hook Patterns:**
```
"It was 2 AM on a Tuesday."
"3 years ago, I made a decision that changed my career forever."
"Last week, I got a message that stopped me cold."
```

**Why Stories Work:**
- Neuroscientific research shows when you tell a story, the entire brain activates (vs. just language centers for feature lists)
- Stories make abstract concepts concrete and relatable
- The LinkedIn algorithm favors storytelling content because stories naturally generate meaningful engagement

### 4.2 Listicle Posts

**Optimal Structure:**
1. **Hook:** Bold statement with the number of items
2. **Items:** Each on its own line, numbered, with 1-2 sentence explanation
3. **Bonus:** Optional bonus item for extra value
4. **CTA:** Ask which item resonated most, or invite additions

**Performance Data:**
- Articles starting with a number get highest engagement (BuzzSumo study)
- Odd numbers (5, 7, 9) perform better than even numbers
- Each item should stand alone; readers skim

**Formatting:**
```
7 tools that save me 10+ hours every week:

1. **Tool Name** - What it does and why it matters

2. **Tool Name** - Brief explanation

[Continue...]

Bonus: [Extra item]

Which one are you trying first? Drop a number below.
```

### 4.3 How-To Guides

**Optimal Structure:**
1. **Hook:** State the desirable outcome ("Here's how to...")
2. **Context:** Brief explanation of why this matters (1-2 lines)
3. **Steps:** Numbered, clear steps with brief explanations
4. **Pro tip:** One advanced insight for those who want to go deeper
5. **CTA:** Invite questions or ask readers to share their approach

**Step Writing Guidelines:**
- Start each step with an action verb
- Keep steps concrete and specific (no vague advice)
- Include expected outcomes or timeframes where relevant
- Write for someone who has never done this before
- Number every step clearly

**Example:**
```
Here's the exact process I use to close 6-figure deals:

Step 1: Research the company for 30 minutes
[Brief explanation of why this works]

Step 2: Identify 3 specific pain points
[Brief explanation]

[Continue...]

Pro tip: [Advanced insight]

Save this for later. What step will you start with?
```

### 4.4 Contrarian Takes

**Effective Structure:**
1. **Hook:** Bold, contrarian statement that stops the scroll
2. **Acknowledge:** Briefly validate the conventional view ("Most people think...")
3. **Counter-argument:** Present your perspective with 2-3 supporting points
4. **Evidence:** Include data, personal experience, or case studies
5. **Nuance:** Acknowledge where the conventional wisdom IS correct
6. **CTA:** Invite debate and alternative viewpoints

**Key Guidelines:**
- Be provocative but respectful
- Back up claims with specifics
- Show intellectual honesty
- Avoid rage-bait
- Take a clear position

**Example Hook Patterns:**
```
"Unpopular opinion: hustle culture is ruining the tech industry."
"Everyone says [X]. I think they're wrong."
"The advice that almost ruined my career:"
```

### 4.5 Case Studies

**Optimal Structure:**
1. **Hook:** Lead with the headline result (specific metric or outcome)
2. **Context:** Describe the starting situation or problem (2-3 lines)
3. **Approach:** What was done differently (3-5 key actions)
4. **Results:** Specific, measurable outcomes with numbers
5. **Takeaways:** 2-3 lessons anyone can apply
6. **CTA:** Ask if readers have seen similar results

**Metrics That Impress:**
- Use before/after comparisons
- Include specific timeframes
- Percentage improvements
- Revenue/cost impacts
- Time saved

**Example:**
```
We increased [metric] by 340% in 6 months.

Here's the backstory:

6 months ago, we were struggling with [problem].
[Briefly describe the situation.]

Here's what we changed:

1. [Action + brief explanation]
2. [Action + brief explanation]
3. [Action + brief explanation]

The results:
- [Metric 1]: [Before] -> [After]
- [Metric 2]: [Before] -> [After]

Key takeaways:
- [Lesson 1]
- [Lesson 2]

Has anyone tried a similar approach?
```

### 4.6 Personal Reflections

**Vulnerability Balance:**

**What Works:**
- Genuine introspection, not performative
- Vulnerability without being self-pitying
- Connection to universal professional themes
- Warm and conversational tone
- One clear insight per post

**When to Share:**
- If you still feel shame, resentment, or victimhood, it's probably too soon
- Let experience settle so words come from clarity, not raw emotion
- Combine vulnerability with demonstrated expertise

**What to Avoid:**
- Oversharing personal information
- Controversial or divisive opinions
- Personal rants
- Inappropriate content

**Structure:**
1. **Hook:** A thought-provoking statement or realization
2. **Context:** What prompted this reflection
3. **Old mindset:** What you used to believe
4. **Shift:** The moment of changing perspective
5. **New perspective:** The insight you now hold
6. **CTA:** Invite readers to reflect on their own experience

### 4.7 Data-Driven Posts

**Optimal Structure:**
1. **Hook:** Lead with the most surprising statistic
2. **Source:** Briefly cite where data comes from (credibility)
3. **Context:** Explain what data means in practical terms
4. **Analysis:** Share your interpretation and 2-3 key insights
5. **Implications:** What should professionals do with this information?
6. **CTA:** Ask for readers' interpretation

**Style Guidelines:**
- Cite specific numbers, not vague claims ("73% of..." not "most...")
- Name your sources for credibility
- Translate data into "so what?"
- Use comparisons to make numbers tangible
- Pick 2-3 powerful stats, not overwhelming lists

**Source Citation:**
- Always name the source
- Include study name/organization
- Add year if relevant

### 4.8 Question Posts

**Engagement-Driving Question Types:**

**Effective Questions:**
- Open-ended (not yes/no)
- Related to current trends or shared experiences
- No obvious answer
- Lower the barrier to responding

**Structure:**
1. **Hook:** Set up context or brief observation (1-2 lines)
2. **Question:** Ask one clear, thought-provoking question
3. **Your answer:** Share your own brief perspective (2-3 lines)
4. **Options:** (optional) Provide 2-4 response options
5. **Invitation:** Encourage comments

**CTA Best Practices:**
- Include a verb (subscribe, read, click, hear, start, learn)
- Keep it direct and concise
- Make it clear how to take action
- Be authentic; ask questions you genuinely want answered
- Reply to all comments to keep conversation going

### 4.9 Carousels

**Optimal Specifications:**

| Aspect | Recommendation |
|--------|----------------|
| Slide count | 6-12 slides (research shows 12.4 is ideal average) |
| Maximum slides | 20 allowed |
| Dimensions | 1080 x 1350 pixels (4:5 aspect ratio) |
| Text per slide | 25-50 words maximum |
| Colors | 1-3 colors for clean look |
| Fonts | 1-3 fonts for consistency |
| Format | PDF upload since December 2023 |

**Structure (The Rule of Three Sections):**

1. **Hook Slide:** Start with a question, bold claim, or relevant statistics
2. **Body Slides:** Break down topic with simple language and consistent flow
3. **CTA Slide:** Include "Follow for more," "DM me," or "link in comments"

**Frameworks:**
- AIDA: Attention, Interest, Desire, Action
- PAS: Problem, Agitation, Solution
- Problem -> Solution -> Benefits -> CTA

**Hook Slide Guidelines:**
- Every great carousel starts with a powerful first slide that hooks immediately
- Surprising statistic, bold statement, or question that resonates
- Don't ask direct questions; create curiosity instead

**Rehook Slides:**
- Mid-carousel slides designed to re-engage viewers
- Remind audience why they should keep swiping

**Performance:**
- Carousel posts generate **24.42% average engagement** (vs. 6.67% for text posts)
- A 5-slide carousel viewed completely outperforms a 100-slide carousel where users only see the first 10 slides

---

## 5. Anti-Patterns to Avoid

### 5.1 Cliches That Signal Low-Quality Content

**Phrases to Eliminate:**
- "I'm excited to announce..."
- "I'm thrilled to share..."
- "Delighted to..."
- "Game-changing insights"
- "Let me be very clear"
- "This changed everything for me"
- "Read this before you post today"
- "I wish someone told me this earlier"
- "Soft skills are the new hard skills"
- "This is your sign"
- "Passionate, results-driven strategist"
- "Elevating brand experiences"

**The First-Line Test:**
Look at your first two lines and ask if they could be swapped with the first two lines of a hundred other posts. If yes, they are probably doing more harm than good.

### 5.2 AI-Sounding Phrases to Avoid

**Telltale Signs of AI-Generated Content:**
- Emoji at the beginning, enthusiastic title, and emoji at the end
- Dramatic opening, short narrative, bold "lesson," closing line engineered for comments
- Flowery, empty phrases with shopping-list buzzwords
- Excessive parenthetical phrases
- Universal AI jokes (always terrible)

**Structural Red Flags:**
- Same structure every post: hook, narrative, lesson, CTA
- Well written but predictable and similar to countless other posts
- Generic statements without specific examples

**Research Finding:** 54% of longer English-language LinkedIn posts were written by AI, leading to a flood of similar posts lacking personality.

### 5.3 Formatting Mistakes

**Common Errors:**
- Walls of text without visual breaks
- Text-only posts under 1,000 characters (25% reach drop)
- Including external links in the post body (-30% reach)
- Exceeding 5 hashtags
- Putting hashtags in comments (outdated)
- Inconsistent posting schedule
- Posting at low-activity times

**Proper Formatting:**
- Double line breaks between sections
- Short paragraphs (1-3 sentences max)
- Bullet points for lists
- Bold sparingly (2-3 times max)
- Mobile-optimized content

### 5.4 Tone-Deaf Approaches

**What Fails:**
- Overly promotional content without value
- Jumping straight into sales pitches
- Exaggerated claims your post can't deliver on
- Using the same hook type repeatedly
- Performative vulnerability
- Lecture-like condescension
- Corporate jargon without substance

**The Authenticity Trap:**
- "Authentic looking" tactics without genuine insight underperform
- Casual tone without compelling narrative falls flat
- Selfies and behind-the-scenes content need context and story

### 5.5 Engagement Bait That Backfires

**Detected and Penalized:**
- "Comment YES if you agree!"
- "Like if you..."
- "Share with someone who..."
- "Tag 3 friends"
- Countdown timers for "automatic agreement"
- Pre-checked consent mechanisms

**The Algorithm Knows:**
LinkedIn is getting better at detecting engagement bait and prioritizes meaningful conversations instead.

---

## 6. Implementation Recommendations

### 6.1 Prompt Template Architecture

Based on this research, prompts should be structured with:

```
1. ROLE DEFINITION
   - Expert persona with specific LinkedIn expertise
   - Clear mission statement

2. STRUCTURE SECTION
   - Numbered steps matching post type
   - Clear component labels (Hook, Build-up, Lesson, CTA)

3. STYLE RULES
   - Specific, actionable guidelines
   - Written as positive instructions (do this, not don't do that)

4. EXAMPLE PATTERN
   - Template showing expected structure
   - Placeholders for variable content

5. FORMATTING RULES
   - Character limits
   - Line break guidelines
   - Hashtag rules

6. QUALITY STANDARDS
   - Anti-pattern list (what to avoid)
   - Specificity requirements

7. OUTPUT FORMAT
   - Clear instruction on what to return
   - No explanations or meta-commentary
```

### 6.2 Variable System for Personalization

**Required Variables:**
- `{{industry}}` - User's industry or niche
- `{{audience}}` - Target audience description
- `{{tone}}` - Tone preference (professional, casual, etc.)

**Optional Variables:**
- `{{company}}` - Company or brand name
- `{{headline}}` - User's job title
- `{{user_posts}}` - Recent posts for style matching
- `{{custom_instructions}}` - User-specific requirements

### 6.3 Temperature Recommendations by Post Type

| Post Type | Recommended Temperature | Rationale |
|-----------|------------------------|-----------|
| Story | 0.7 | Higher creativity for narrative |
| Listicle | 0.5 | Balanced for clear list items |
| How-To | 0.4 | Precision for instructions |
| Contrarian | 0.6 | Creative but coherent arguments |
| Case Study | 0.3 | Accuracy for metrics and data |
| Reflection | 0.6 | Authentic, warm tone |
| Data-Driven | 0.3 | Factual accuracy priority |
| Question | 0.5 | Natural conversation starter |
| Carousel | 0.5 | Balanced for educational content |

### 6.4 Quality Assurance Checklist

Before deploying any prompt template, verify:

- [ ] Hook appears in first 140 characters (before "See more")
- [ ] No AI cliches in example patterns
- [ ] Positive instruction framing used
- [ ] Character limits specified
- [ ] Specific examples included
- [ ] CTA guidelines present
- [ ] Formatting rules clear
- [ ] Anti-patterns listed
- [ ] Variable placeholders documented

### 6.5 Testing Protocol

1. **Generate 10+ outputs** with each prompt template
2. **Check for consistency** in structure adherence
3. **Verify anti-pattern avoidance** (no cliches, no AI tells)
4. **Test with different variable values** (industries, tones)
5. **Measure output length** against optimal ranges
6. **Review hooks** for the first-line test
7. **A/B test** against previous prompt versions

### 6.6 Iteration Strategy

- Start simple, add complexity as needed
- Document what works and what doesn't
- Update prompts based on real engagement data
- Review generated content before posting
- Never accept first output; push for alternatives

---

## Sources

### LinkedIn Algorithm & Best Practices
- [How the LinkedIn Algorithm Works in 2025 - Hootsuite](https://blog.hootsuite.com/linkedin-algorithm/)
- [LinkedIn Algorithm 2025 - Sprout Social](https://sproutsocial.com/insights/linkedin-algorithm/)
- [LinkedIn Content Strategy 2025 - Postiv AI](https://postiv.ai/blog/linkedin-content-strategy-2025)
- [LinkedIn Benchmarks 2025 - Social Insider](https://www.socialinsider.io/social-media-benchmarks/linkedin)

### Post Length & Formatting
- [Ideal LinkedIn Post Length - Supergrow](https://www.supergrow.ai/blog/how-long-should-a-linkedin-post-be)
- [LinkedIn Post Length Guide - Ciela AI](https://www.ciela.ai/blogs/linkedin-post-length)
- [LinkedIn Post Statistics - AuthoredUp](https://authoredup.com/blog/linkedin-post-statistics)

### Hooks & Engagement
- [LinkedIn Hook Examples - AuthoredUp](https://authoredup.com/blog/linkedin-hook-examples)
- [Viral LinkedIn Post Framework - Justin Welsh](https://www.justinwelsh.me/newsletter/the-anatomy-of-a-viral-linkedin-post)
- [LinkedIn CTA Strategies - SalesRobot](https://www.salesrobot.co/blogs/linkedin-call-to-action)

### Prompt Engineering
- [Effective Prompts for AI - MIT Sloan](https://mitsloanedtech.mit.edu/ai/basics/effective-prompts/)
- [Best Practices for Prompt Engineering - OpenAI](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-the-openai-api)
- [LLM Temperature - IBM](https://www.ibm.com/think/topics/llm-temperature)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)

### Carousels
- [LinkedIn Carousel Guide 2025 - PostNitro](https://postnitro.ai/blog/post/linkedin-carousel-posts-ultimate-professional-guide-for-2025)
- [Viral Carousel Analysis - Contentdrips](https://contentdrips.com/blog/2024/12/how-to-make-viral-carousel-post-linkedin/)

### Cliches & Anti-Patterns
- [LinkedIn Cliches to Avoid 2026 - Medium](https://medium.com/@brandazuka/44-linkedin-clich%C3%A9s-to-avoid-in-2026-to-sound-original-47b92de9228e)
- [AI-Generated LinkedIn Post Mistakes - Team Lewis](https://www.teamlewis.com/magazine/5-common-mistakes-to-avoid-in-ai-generated-linkedin-posts/)

### Storytelling & Authenticity
- [LinkedIn Storytelling Strategies - Autoposting AI](https://autoposting.ai/linkedin-storytelling/)
- [Vulnerability on LinkedIn - LSE](https://blogs.lse.ac.uk/impactofsocialsciences/2024/05/01/why-is-vulnerability-trending-on-linkedin/)
- [Authenticity Balance - Molly Godfrey](https://mollygodfrey.com/blog/how-to-balance-authentic-and-professional-online)

---

*This research document should be updated quarterly as LinkedIn's algorithm and best practices continue to evolve.*
