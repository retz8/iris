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
- Month 1+: Randomly hide File Intent in ~30-40% of issues
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
- Email contains: 1 code snippet from one of their selected programming languages (randomly decided among selected langugaes)
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

### 4. Landing Page & Signup Form ✅ DECIDED

**Decision:**

**Platform:**
- Simple HTML/CSS hosted at `iris-codes.com/snippet`
- Root domain (`iris-codes.com`) redirects to `/snippet` for now
- Full control over form submission to n8n webhook
- Fast, no external dependencies

**Signup Form Fields:**
- **Email** (required, text input)
- **Written language** (required, radio buttons: `en` or `ko`)
- **Programming languages** (required, checkboxes, multi-select: Python, JS/TS, C/C++, at least 1 required)
- **NO name field** (reduces friction, not needed for newsletter delivery)

**Design Aesthetic:**
- **Minimalist theme**
- **NO dark mode** (not MVP, adds implementation time)
- **Flexible on color palettes** - will iterate and experiment during implementation
- Mobile-first, fast-loading, clean
- One-page scroll: value prop, sample snippet, signup form

**Rationale:**
- Fewer form fields = higher conversion (3 fields total)
- Simple HTML/CSS = fastest to implement and iterate
- Unified domain (iris-codes.com) builds ecosystem
- Minimalist design matches mid-level engineer preferences (no-BS, fast)
- Flexibility on colors allows experimentation without committing to dark mode complexity

### 5. Content Format Refinement ✅ DECIDED

**Decision:**

**Email Structure:**
```
Subject: Can you read this #NNN: <File Intent or ???>

[Code block - formatted HTML text, 8-12 lines]

Before scrolling: what does this do?

The Breakdown
• What it does: [25-35 words]
• Key responsibility: [25-35 words]
• The clever part: [25-35 words]

Project Context
[40-50 words: repo name + description + why it's trending]

[Unsubscribe link]
```

**Email Length:** 2 minutes (not 3-5 minutes)
- Total word count: ~180 words
- Read time: 1.5-2 minutes (optimal for mobile morning reading)

**Breakdown Length:** 80-120 words
- 3 bullets, 25-35 words each
- Expanded from original 50-100 words to provide more depth

**Challenge Placement:** After code block, before breakdown
- Creates pause/interaction moment
- Triggers retrieval practice (educational psychology)

**Project Context:** Repo name + 1-line description + why it's trending
- 40-50 words total
- No GitHub stars/metrics (keep it simple)

**Footer:** No IRIS footer for now
- Only unsubscribe link (legally required)
- Clean, minimal, no product plug
- Will add IRIS mention later when extension is published

**Frequency:** MWF (Mon/Wed/Fri) mornings (confirmed)

**Sender Name:** "Snippet" (not "Snippet by IRIS")

**Rationale:**
- 2-minute target optimizes for mobile + coffee ritual
- Challenge placement supports educational goal
- Minimal footer reduces distraction from content
- Standalone "Snippet" brand builds independent value

### 6. Code Snippet Format ✅ DECIDED

**Decision: Formatted HTML Text (NOT image)**

**Why Not Images:**
- ❌ Users cannot copy/paste code to run it (breaks primary use case)
- ❌ Not accessible (screen readers can't read images)
- ❌ Not searchable (Cmd+F doesn't work)
- ❌ Slower (image generation + loading time)

**Implementation: `<pre><code>` with Inline Styles**

**HTML Structure:**
```html
<pre style="
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  background-color: #f6f8fa;
  padding: 16px;
  border-left: 3px solid #0969da;
  border-radius: 6px;
  overflow-x: auto;
  color: #24292f;
  margin: 20px 0;
"><code><span style="color: #cf222e;">def</span> authenticate(username, password):
    user = User.query.filter_by(username=username).first()
    <span style="color: #cf222e;">if</span> user:
        <span style="color: #cf222e;">return</span> generate_token(user)
    <span style="color: #cf222e;">return</span> <span style="color: #0550ae;">None</span></code></pre>
```

**Visual Settings:**
- **Background:** Light gray (#f6f8fa) - works across email clients
- **Font:** Monospace stack (Consolas, Monaco, Courier New)
- **Font size:** 14px
- **Line height:** 1.6
- **Border:** 3px left border (#0969da blue) for visual accent
- **Syntax highlighting:** Light colors via inline `<span style="color: ...">`
  - Keywords: #cf222e (red)
  - Functions: #8250df (purple)
  - Strings: #0a3069 (dark blue)
  - Literals: #0550ae (blue)
  - Comments: #6e7781 (gray)

**Email Client Compatibility:**
- ✅ Gmail (desktop + mobile)
- ✅ Outlook (Windows)
- ✅ Apple Mail (Mac + iOS)
- ✅ All major mobile email apps

**Benefits:**
- ✅ Users can copy/paste and run code
- ✅ Accessible to screen readers
- ✅ Searchable (Cmd+F works)
- ✅ Fast (no image loading)
- ✅ Clean, professional appearance
- ✅ No external dependencies (no Carbon API, no ray.so)

**Rationale:**
- Primary goal is educational (users should run the code)
- Function > form for mid-level engineers
- Copyable code is more valuable than pretty images
- Inline styles ensure consistent rendering across email clients

### 7. Welcome Email Content ✅ DECIDED

**Decision:**

**Subject:** You merge it. Can you read it fast enough?

**Email Body:**
```
You signed up for Snippet. Smart move.

AI generates code faster than you can read it.
But you're still the one who reviews it, merges it, owns it.

Can you read it well enough to trust it?

Every Mon/Wed/Fri, 7am:
→ One code snippet from a trending OSS project (8–12 lines)
→ Challenge: What's this actually doing?
→ Breakdown: The pattern you need to see faster

Copyable code. 2-minute read. Real skill-building.

First one Monday.

Train your eye. Ship with confidence.
Snippet

Python, JS/TS, C/C++ | Unsubscribe
```

**Tone:** Pragmatic Professional
- Authority framing: "You're the one who reviews, merges, owns it"
- Speed/trust balance: Combines reading speed with confidence
- Skill-building focus: "Train your eye" + "Real skill-building"
- No IRIS mention (clean, standalone brand)

**Key Elements:**
- **AI angle:** "AI generates code faster than you can read it" (speed asymmetry)
- **Responsibility:** "You review it, merges it, owns it" (ownership chain)
- **Core challenge:** "Can you read it well enough to trust it?" (trust + speed)
- **Value prop:** "The pattern you need to see faster" (efficiency + pattern recognition)
- **Sign-off:** "Train your eye. Ship with confidence." (two-part action call)

**Word Count:** 82 words (within 70-80 target)

**Rationale:**
- Provocative but not aggressive (pragmatic, not confrontational)
- AI relevance without being preachy
- Frames newsletter as skill-building, not just entertainment
- "Train your eye. Ship with confidence" = growth + outcome
- No IRIS plug maintains clean, content-first positioning

### 8. Unsubscribe Mechanism ✅ DECIDED

**Decision: Simple One-Click Unsubscribe (MVP)**

**Implementation Flow:**
```
User clicks "Unsubscribe" in email footer
    ↓
URL with encoded email: /unsubscribe?email=user@example.com
    ↓
n8n webhook receives request
    ↓
Google Sheets: Update subscriber row
    - Set status: active → unsubscribed
    - Add unsubscribed_date: timestamp
    ↓
Show confirmation page:
    "You're unsubscribed from Snippet."
    (Optional: "Changed your mind? Resubscribe here")
```

**Technical Details:**
- **n8n Webhook Node:** POST /webhook/unsubscribe
- **Validation:** Check email exists in subscribers sheet
- **Google Sheets Update:**
  - Match by email column
  - Set `status` = "unsubscribed"
  - Set `unsubscribed_date` = current timestamp
- **Confirmation Page:** Simple HTML (hosted at iris-codes.com/unsubscribed)
- **Legal Compliance:** CAN-SPAM and GDPR compliant (instant processing)

**Google Sheets Schema Update:**
Add columns to Subscribers sheet:
- `status` (active, unsubscribed, bounced)
- `unsubscribed_date` (timestamp, null if active)
- `unsubscribe_reason` (optional, for future feedback collection)

**Preference Management (Future Enhancement):**
Add preference management page ONLY if unsubscribe rate > 5% in first month.

**When to Build Preference Management:**
- Trigger: Unsubscribe rate exceeds 5% per month
- Features to add:
  - Change written language (en ↔ ko)
  - Change programming languages (add/remove Python, JS/TS, C/C++)
  - Pause for 2 weeks (temporary break)
  - Reduce frequency (MWF → weekly digest option)
  - Full unsubscribe (if preferences don't help)

**Why Start Simple:**
- Faster to implement (1-2 hours vs 1-2 days)
- Legally compliant
- Respects user time (no unnecessary steps)
- Most users who unsubscribe won't use preferences anyway
- Can add preferences later if data shows need

**Measuring Unsubscribe Rate:**

**Formula:**
```
Unsubscribe Rate (per email) = (Unsubscribes / Emails Sent) × 100

Monthly Rate = Total unsubscribes in month / Total emails sent in month × 100
```

**Data Sources:**
- Google Sheets subscribers tab: Track `status` changes
- Google Sheets drafts tab: Count emails marked "sent"
- Track both per-issue and cumulative rates

**Tracking Implementation:**
```
Per-Issue Tracking:
- Email sent on Mon, Feb 16 (100 subscribers)
- By Wed, Feb 18: 2 unsubscribed
- Per-issue rate: 2/100 = 2% (HIGH - investigate)

Monthly Tracking:
- Month 1: 12 emails sent, 300 total subscribers, 5 unsubscribed
- Monthly rate: 5/300 = 1.67% (acceptable)
```

**Benchmarks (Newsletter Industry Standards):**
| Rate | Status | Action |
|------|--------|--------|
| < 0.5% | ✅ Excellent | Keep current approach |
| 0.5-1% | ✅ Good | Monitor trends |
| 1-2% | ⚠️ Average | Review content quality |
| 2-5% | ⚠️ Concerning | Investigate specific issues |
| > 5% | ❌ Critical | Add preference management, review format |

**When to Review:**
- After first 10 emails: Establish baseline
- Monthly: Trend analysis (increasing or stable?)
- Spike detection: If single issue > 2%, investigate that specific content
- Quarterly: Compare across programming languages (is C/C++ higher than Python?)

**Additional Metrics to Track:**
- **Time-to-unsubscribe:** After how many emails do users leave?
  - Early churn (1-3 emails): Expectation mismatch
  - Mid churn (4-10 emails): Content not valuable
  - Late churn (10+ emails): Life circumstances change
- **Unsubscribe by language:** Do certain programming languages have higher churn?
- **Unsubscribe by day:** Do Friday emails get more unsubscribes than Monday?

**Automated Alerts (Optional):**
- If per-issue unsubscribe rate > 2%: Send alert email to team
- If monthly rate > 5%: Trigger preference management build
- If specific language has >3x average rate: Review content for that language

**Rationale:**
- Simple one-click = best UX, legally compliant
- Preference management added only when data justifies investment
- Measurement system provides early warning signals
- Industry benchmarks give clear action thresholds

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
