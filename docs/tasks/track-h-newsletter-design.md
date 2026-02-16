# Track H: Newsletter Design Discussion

**Stream:** Newsletter Design Session (from parallel workflow plan)
**Scope:** Decision-making session (no code)
**Dependencies:** None
**Blocks:** Tracks E and F (both need branding/design decisions from this session)

## Objective

Finalize newsletter format, branding, naming, visual design, content strategy, and landing page approach through structured discussion. Document all decisions to enable Tracks E (landing page) and F (subscriber management) to proceed with clarity.

**Current State:**
- Newsletter format outlined in newsletter-n8n-plan.md and thoughts.md
- Target audience identified: mid-level engineers (2-5 YoE) from thoughts.md
- Sample C++ snippets drafted in thoughts.md
- Many open questions flagged in newsletter-n8n-plan.md

**Key Outputs:**
This session produces documented decisions that unblock:
- Track E: Landing page content, branding, signup form design
- Track F: Welcome email copy, newsletter name, language support
- Track G: Content style, snippet selection calibration

## Context

The newsletter is a pre-product audience builder for IRIS. It educates developers about code reading importance and builds a pool of potential extension users. Success criteria: qualified audience (mid-level engineers), not maximum reach.

**From Strategy & Thoughts Docs:**
- Positioning: "Code reading skills in the AI era"
- Target: Mid-level engineers (2-5 YoE) - sweet spot for conversion to IRIS
- Format: Code snippet, challenge ("Before scrolling"), breakdown (what/responsibility/clever part), project context
- Frequency: MWF (Mon/Wed/Fri) morning
- Delivery: Mobile-first (read on phone over morning coffee)

## Phase 0: Exploration

Follow these steps to understand the current state:

1. Read `docs/newsletter-n8n-plan.md` to understand newsletter technical architecture (n8n workflows, Google Sheets schema)
2. Read `docs/thoughts.md` to see content strategy, sample snippets, and mid-level engineer targeting
3. Read `docs/strategy-2026-02-10.md` to understand IRIS positioning and pre-product audience building goals
4. Identify what's already decided (format, frequency, target audience) vs what needs discussion
5. Review sample C++ snippets in thoughts.md to understand desired snippet complexity level
6. Check for any existing branding materials or naming preferences in documentation

## Open Questions to Resolve

### 1. Newsletter Name & Branding ✅ DECIDED

**Decision:**
- **Newsletter name**: "Snippet"
- **Sender name**: "Snippet" or "Snippet by IRIS"
- **Tagline** (for landing page): "Code reading challenges for the AI era"
- **Branding approach**: Independent brand with soft IRIS link
- **Tone**: Challenging, direct, educational

**Subject Line Format:**
- Standard: "Can you read this #NNN: <File Intent>"
  - Example: "Can you read this #001: Authentication helper"
  - Example: "Can you read this #003: Thread-safe cache wrapper"
- Challenge mode: "Can you read this #NNN: ???"
  - File Intent hidden to teach users its value through absence
  - NO reveal strategy - if hidden, stays hidden throughout email
  - Users experience difficulty of reading code without context
  - Validates IRIS's File Intent feature through firsthand experience

**Challenge Mode Cadence:**
- First month (issues #001-012): Always show File Intent (onboard users to format)
- Month 2+: Randomly hide File Intent in ~30-40% of issues
- Creates two difficulty modes: context-given vs context-hidden

**Rationale:**
- "Snippet" is short (one word), professional, developer-familiar
- Subject line format creates curiosity and challenges ego (perfect for mid-level engineers)
- Hiding File Intent occasionally is a product-led content strategy that demonstrates IRIS value
- Independent brand allows positioning flexibility while maintaining IRIS funnel connection

### 2. Language Support Strategy ✅ DECIDED

**Decision:**

**Written Languages (email copy language):**
- `en` (English)
- `ko` (Korean)
- Total: 2 options

**Programming Languages (code snippet language):**
- Python
- JS/TS (JavaScript/TypeScript combined as one option)
- C/C++ (C/C++ combined as one option)
- Total: 3 options
- **Users can select multiple programming languages** at signup

**Content Variants:**
- Base variants needed per issue: 2 written × 3 programming = 6 variants
- Subscriber receives: 1 email per MWF in their written language
- Email contains: 1 code snippet from one of their selected programming languages
- Workflow 2 matching: Match written_language exactly, then select from user's programming_languages list

**Signup Form Fields:**
- Written language: Radio button (single choice: en or ko)
- Programming languages: Checkboxes (multi-select: Python, JS/TS, C/C++)
- User must select at least 1 programming language

**Rationale:**
- Starting lean (2×3) validates format before scaling
- Leverages personal network (Korean, US-based)
- Multi-select programming languages increases flexibility without requiring multiple emails
- Mid-level engineers typically know 2-3 languages well
- Quality over quantity for MVP validation

**Future Expansion:**
- Written languages: Add ja (Japanese), zh (Chinese), es (Spanish) based on demand
- Programming languages: Add Go, Rust, Java after proving format works

### 3. Category System ✅ DECIDED

**Decision: NO categories for MVP**

**Content Strategy Instead:**
- Follow **trending tech news** of the week
- Source snippets from projects making waves in the developer community
- Examples: OpenClaw source code, Codex releases, viral GitHub repos
- Aligns with Workflow 1 (GitHub trending API)

**Rationale:**
- Simpler signup form (no category checkboxes)
- Easier content curation (trending = already newsworthy)
- More shareable (timely content creates conversation)
- Less complexity in Workflow 2 matching logic
- Can add categories later as v2 feature after proving format works

**Future Consideration:**
- Add category preferences in month 2-3 if user feedback shows demand
- Categories could be: Concurrency, Memory Management, Data Structures, Metaprogramming, Error Handling, Performance Tricks, API Design, Algorithms

### 4. Landing Page & Signup Form

**Decision Needed:**
- Landing page platform?
  - Option A: Simple HTML/CSS (fast, full control, hosted on iris-codes.com subdomain)
  - Option B: Carrd (no-code, beautiful templates, separate domain)
  - Option C: Notion public page (zero-code, but limited branding)
  - Option D: Integrated into iris-codes.com main landing page (unified experience)
- Signup form fields:
  - Email (required)
  - Name (required vs optional?)
  - Written language preference (required vs optional?)
  - Programming language preference (required vs optional?)
  - Categories (if category system = yes)
- Design aesthetic: Minimalist vs rich/illustrated vs code-themed

**Considerations:**
- Separate landing allows independent branding but fragments traffic
- Integrated landing page builds unified IRIS ecosystem
- Fewer form fields = higher conversion, but less targeting precision
- Mid-level engineers appreciate clean, fast, no-BS design

**Output:** Platform choice, signup form fields (required vs optional), design direction, domain/subdomain strategy

### 5. Content Format Refinement

**Decision Needed:**
- Email structure finalized?
  - From newsletter-n8n-plan.md: Snippet image, challenge, breakdown, project context
  - Should there be a footer? (unsubscribe, social links, IRIS plug?)
- Snippet length confirmed: 8-12 lines?
- Breakdown length confirmed: Under 100 words?
- Subject line format: "Can you read this? #NNN - [Title]" or different?
- Frequency confirmed: MWF or reconsider (2x/week, daily digest)?

**Considerations:**
- From thoughts.md: snippets should require 10-30 seconds of thinking (mid-level sweet spot)
- Mobile-first = brevity critical (3-5 min read time target)
- Footer should include unsubscribe (legally required) and preference management link

**Output:** Email structure confirmed, snippet/breakdown length confirmed, subject line format, frequency confirmed, footer elements

### 6. Code Image Rendering

**Decision Needed:**
- Carbon API vs ray.so vs custom screenshot?
  - Carbon (carbon.now.sh): popular, no official API (may need workarounds)
  - ray.so: clean, has API, good for code snippets
  - Playwright screenshot: full control, but more complex setup
- Image settings:
  - Dark theme confirmed?
  - Font size: 14-16px (from newsletter-n8n-plan.md)?
  - Syntax highlighting: default or custom theme?
  - Padding, shadow, border radius?

**Considerations:**
- Code images must render well on mobile (max width 600px for email)
- Dark theme preferred by many developers (easier on eyes)
- Image quality affects perceived professionalism

**Output:** Code image service chosen, visual settings (theme, font size, styling)

### 7. Welcome Email Content

**Decision Needed:**
- Welcome email tone: Formal vs friendly vs excited?
- What to include?
  - What to expect (MWF cadence, format)
  - Sample snippet or just text description?
  - How to manage preferences (language, categories, unsubscribe)
  - IRIS product mention (soft sell vs no mention)?
- Welcome email subject line?

**Considerations:**
- First impression sets expectations and tone
- Should align with overall newsletter branding
- Should not be pushy (no hard sell on IRIS)
- Should make it easy to unsubscribe (builds trust)

**Output:** Welcome email structure, tone, subject line, IRIS mention strategy

### 8. Unsubscribe Mechanism

**Decision Needed (legally required):**
- One-click unsubscribe link in footer?
- Preference management page (change languages/categories vs full unsubscribe)?
- Unsubscribe flow: instant removal or confirmation page?

**Considerations:**
- CAN-SPAM Act and GDPR require clear, easy unsubscribe
- Preference management can reduce unsubscribes (let users adjust frequency/categories instead of full opt-out)
- One-click unsubscribe is best UX but requires endpoint implementation

**Output:** Unsubscribe approach (one-click vs preference page), implementation plan (n8n webhook, Google Sheets update, confirmation)

## Discussion Structure

### Phase 1: Discovery/Discussion (with human engineer)
- Review newsletter-n8n-plan.md, thoughts.md, strategy doc positioning
- Align on goals: pre-product audience building, mid-level engineer targeting, IRIS funnel

### Phase 2: Decision-Making Session
- Work through 8 open questions above
- Document decisions with rationale
- Flag any decisions that need validation (e.g., test subject lines with users)

### Phase 3: Documentation
- Create summary document with all decisions
- Structure for easy reference by Tracks E, F, G
- Include examples where helpful (email mockup, subject line samples, welcome email draft)

## Deliverables

**After this session, produce:**

1. **Decisions Document** (`docs/newsletter-design-decisions.md`)
   - All 8 questions answered with clear decisions
   - Rationale for each decision
   - Examples and templates where applicable

2. **Brand Guidelines** (lightweight)
   - Newsletter name
   - Tone and voice (3-5 adjectives + examples)
   - Visual direction (colors, typography if relevant)

3. **Content Templates**
   - Email structure template (HTML outline or wireframe)
   - Subject line format and examples
   - Welcome email draft

4. **Signup Form Spec**
   - Required vs optional fields
   - Language and category options
   - Form copy (headline, subheadline, CTA button text)

## Acceptance Criteria

- [ ] **All Questions Resolved:**
  - Newsletter name chosen and documented
  - Language support strategy defined (written + programming languages)
  - Category system decision made (yes/no, if yes: which categories)
  - Landing page platform chosen
  - Signup form fields defined
  - Content format confirmed (structure, length, frequency)
  - Code image service chosen with settings
  - Welcome email content drafted

- [ ] **Documented for Handoff:**
  - Decisions document created and saved in `docs/`
  - Tracks E and F can reference clear, unambiguous guidance
  - No open questions remaining that block implementation

- [ ] **Aligned with Strategy:**
  - Newsletter positioning aligns with IRIS verification narrative
  - Target audience (mid-level engineers) clearly defined
  - Quality over quantity (qualified audience, not max reach)

## Files to Create

- `docs/newsletter-design-decisions.md` - Summary of all decisions
- `docs/newsletter-email-template-draft.html` - Email structure mockup (optional)
- `docs/newsletter-welcome-email.md` - Welcome email copy

## Claude Code Session Instructions

### Skills to Use

- **product-manager** - For positioning, messaging, audience targeting decisions
- **frontend-design** - For visual direction, email template mockup (if creating)

### Tools Priority

- **Read** - Review newsletter-n8n-plan.md, thoughts.md, strategy-2026-02-10.md
- **Write** - Create decisions document, templates, brand guidelines
- No code implementation in this track

### Workflow

1. **Read context documents** (newsletter plan, thoughts, strategy)
2. **Discuss each question** with human engineer
3. **Document decisions** as they're made
4. **Create templates** (email mockup, welcome email, signup form copy)
5. **Update UPDATES.md** with session summary and link to decisions doc

### Coordination

- **Before starting:**
  - No dependencies (can start immediately in Phase 1)
  - This is the first session to kick off parallel work

- **After completing:** Append summary to `docs/tasks/UPDATES.md` with:
  - Newsletter name chosen
  - Languages supported (written + programming)
  - Category system decision
  - Landing page platform
  - Link to `docs/newsletter-design-decisions.md`
  - Confirmation that Tracks E and F are unblocked

## Notes

- **BLOCKS Tracks E and F** - Both need decisions from this session before starting implementation
- Pure discussion session, no code
- Expected time: 1-2 hours for thorough decision-making
- Output quality matters more than speed (clarity unblocks downstream work)
- Decisions should align with strategy doc: mid-level engineers, pre-product audience building, IRIS funnel
- Can revisit decisions later if validation shows they need adjustment (not set in stone)
