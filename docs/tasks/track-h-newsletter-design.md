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

## Open Questions to Resolve

### 1. Newsletter Name & Branding

**Decision Needed:**
- Newsletter name (independent brand vs IRIS-branded?)
  - Option A: "Can you read this?" (provocative, format-driven)
  - Option B: "[IRIS] Code Insights" (product-branded)
  - Option C: Something else entirely
- Visual identity separate from IRIS or aligned?
- Tone: Technical/academic vs conversational/approachable

**Considerations:**
- Independent brand allows pivot if IRIS positioning changes
- IRIS-branded builds direct product awareness
- Name should resonate with mid-level engineers (not beginners, not seniors)

**Output:** Newsletter name, branding approach (independent vs IRIS-linked), tone guidelines

### 2. Language Support Strategy

**Decision Needed:**
- Which written languages to support? (en confirmed, ko mentioned, others?)
- Which programming languages to offer at signup?
  - From thoughts.md: Python, TypeScript, C++, others?
  - Popular languages (JavaScript, Python, Go, Rust, Java)?
  - Niche languages (Haskell, Elixir, Zig)?
- Start with 1-2 languages or launch with full menu?

**Considerations:**
- More languages = smaller audience per language = harder to find good snippets
- Mid-level engineers typically know 2-3 languages well
- Strategy doc mentions language expansion as 1-hour task (for IRIS extension)
- Quality over quantity for MVP validation

**Output:** Written languages (en, ko, others), programming languages for launch (3-5 recommended), expansion plan

### 3. Category System

**Decision Needed (from thoughts.md open question):**
- Start with categories from day one, or add after proving the format works?
- If yes to categories, which ones?
  - From thoughts.md: Concurrency, Memory Management, Data Structures, Metaprogramming, Error Handling, Performance Tricks, API Design, Algorithms
- How many categories is too many? (cognitive overload in signup form)
- Allow multiple category selection or single choice?

**Considerations:**
- Categories enable better targeting (user gets snippets they care about)
- But adds complexity to signup, matching logic (Workflow 2), and content sourcing (Workflow 1)
- Can always add categories later as feature enhancement
- Strategy: prove format works first, then optimize matching

**Output:** Category system decision (yes/no), if yes: initial category list (recommend 5-8 max), multi-select or single

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

### Phase 1: Context Review (with human engineer)
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
