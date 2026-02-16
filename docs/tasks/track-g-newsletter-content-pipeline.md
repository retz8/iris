# Track G: Newsletter Content Pipeline

**Stream:** Newsletter Workflow 1 (from newsletter-n8n-plan.md)
**Scope:** n8n workflow, GitHub API, Claude API, Carbon API, Gmail
**Dependencies:** Tracks E and F must complete first (landing page + subscribers validated)
**Blocks:** None

## Objective

Build n8n Workflow 1 to automate weekly newsletter content creation: fetch trending GitHub repos, extract code snippets, generate breakdowns via Claude API, render code images via Carbon API, create Gmail drafts, and track in Google Sheets. Reduces manual work from hours to 10-15 minutes of review per week.

**Current State:**
- Workflow 2 (Send Newsletter) complete
- Workflow 3 (Subscriber Management) will be complete after Track F
- No content automation yet (fully manual content creation)
- Google Sheets structure defined but drafts sheet not created

**From Newsletter Plan:**
- Runs every Sunday at 8pm
- Generates 3 issues (Mon/Wed/Fri) per batch
- Creates Gmail drafts for human review (NOT auto-send)
- Tracks drafts in Google Sheets for approval workflow

## Context

Workflow 1 is the most complex automation. It sources trending open-source code, uses LLM to explain it, renders it as images, and packages it into newsletter-ready Gmail drafts. Human reviews drafts in Gmail and approves by changing status in Google Sheets. Then Workflow 2 (already complete) sends to matched subscribers.

**Google Sheets Structure (from newsletter-n8n-plan.md):**
Sheet 1: Newsletter Drafts
- date
- day (Mon/Wed/Fri)
- status (draft / approved / sent)
- gmail_draft_id
- written_language (en, ko)
- programming_language (python, typescript, etc.)
- repo_name
- repo_url
- repo_description

**Snippet Selection Criteria (from newsletter-n8n-plan.md):**
- 8-12 lines max (fit on phone screen)
- Max 60 characters per line
- Self-contained (no missing imports/context)
- From recognizable projects
- Has one clear "aha" moment
- NOT: dense algorithms, config files, boilerplate

## Phase 0: Exploration

Follow these steps to understand the current state:

1. Review newsletter-n8n-plan.md Workflow 1 architecture in detail
2. Review thoughts.md snippet examples and selection criteria

## Phase 1: Discovery/Discussion (with human engineer)

### Topics to Discuss

Based on Phase 0 exploration, discuss and generate specific questions for:

1. **GitHub Trending API** - Official vs unofficial, search API alternatives, filtering approach, repo count
2. **Snippet Extraction Heuristics** - Quality detection logic, Claude role, avoiding boilerplate, candidate count
3. **Claude API Integration** - Model choice, prompt structure, token budget, error handling
4. **Code Image Rendering** - Service choice, image settings, rate limits, image format
5. **Gmail Draft Creation** - Template structure, mobile design, image embedding, subject format
6. **Human Review Workflow** - Review process, approval workflow, integration with Workflow 2

Document specific questions and design decisions here after discussion.

## Phase 2: Implementation Planning

**Will be filled in after Phase 1 discussion.** Should include:
- n8n Workflow 1 node structure (step-by-step)
- GitHub API query parameters
- Snippet extraction logic (Code node implementation)
- Claude API prompt template
- Carbon API request format
- Email HTML template
- Google Sheets draft tracking setup

## Phase 3: Execution

**Will be filled in after Phase 2 planning.** Should include:
- n8n workflow construction (Schedule Trigger -> GitHub -> Code -> Claude -> Carbon -> Gmail -> Google Sheets)
- Code node implementation (snippet extraction heuristics)
- Email template HTML creation
- Google Sheets Sheet 1 (Drafts) setup
- Workflow testing and refinement

## Phase 4: Testing & Verification

**Will be filled in after Phase 3 execution.** Should include:
- Dry run workflow (test with 1 language, verify 3 drafts created)
- Review Gmail drafts (check formatting, images, breakdown quality)
- Test approval workflow (change status to "approved" in Sheets)
- Verify Workflow 2 picks up approved drafts correctly
- Full end-to-end test (Sunday trigger -> Gmail drafts -> approve -> MWF send)

## Acceptance Criteria

- [ ] **n8n Workflow 1 Working:**
  - Triggers every Sunday at 8pm
  - Fetches trending repos for configured languages
  - Extracts 3 candidate snippets (Mon/Wed/Fri)
  - Generates breakdown for each via Claude API
  - Renders code image for each via Carbon/ray.so
  - Creates 3 Gmail drafts (one per MWF issue)
  - Writes 3 rows to Google Sheets (status: "draft")

- [ ] **Snippet Quality:**
  - Self-contained and understandable
  - From recognizable/trending projects
  - Not config files, boilerplate, or generated code

- [ ] **Breakdown Quality:**
  - Claude-generated breakdown is clear and concise
  - Covers: what it does, key responsibility, the clever part
  - Under 100 words total (per newsletter-n8n-plan.md)
  - Adds non-obvious insight (not just restating visible code)

- [ ] **Gmail Drafts:**
  - Mobile-responsive HTML (max-width 600px, inline CSS)
  - Code image renders correctly (dark theme, syntax highlighted)
  - Breakdown text formatted properly
  - Project context included (repo name, description)
  - Subject line follows format: "Can you read this? #NNN - [Title]"

- [ ] **Google Sheets Tracking:**
  - Sheet 1 (Drafts) has correct columns
  - Each draft has unique gmail_draft_id
  - Workflow writes date, day, status, language, repo metadata
  - Status starts as "draft" (ready for human review)

- [ ] **Human Review Process:**
  - Human can open Gmail, see 3 drafts, review in 10-15 minutes
  - Edits can be made directly in Gmail
  - Changing status to "approved" in Sheets enables Workflow 2 sending

## Files Likely to Modify/Create

Based on scope:

**n8n Workflow:**
- n8n Workflow 1 (configured in n8n UI, no code files)
- Workflow export JSON (for backup/version control)

**Email Template:**
- Email template HTML (could live in n8n Code node or separate file for version control)

**Google Sheets:**
- Newsletter Google Sheet - Sheet 1: Newsletter Drafts (create via Google Sheets UI)

**Code Assets (for snippet extraction heuristics):**
- Snippet extraction logic (lives in n8n Code node, but could be prototyped separately)

## Claude Code Session Instructions

### Skills to Use

- **n8n-skills-2.2.0** - For n8n workflow construction, HTTP Request nodes, Code nodes
- **frontend-design** - For email template HTML/CSS (mobile-first design)
- **sequential-thinking** - For debugging snippet extraction heuristics

### Recommended Agents

- **General-purpose agent** - For workflow design and email template
- **n8n specialist** (if available) - For complex workflow construction

### Tools Priority

- **Read** - Review newsletter-n8n-plan.md Workflow 1 details, thoughts.md snippet examples
- **Write** - Create email template HTML
- **WebFetch** - Test GitHub API, Claude API, Carbon API endpoints
- **Bash** - Not needed (n8n is no-code)

### n8n Workflow 1 Structure

From newsletter-n8n-plan.md:
```
Schedule Trigger (Sunday 8pm)
       |
       v
HTTP Request ---- GitHub Trending API
       |           (fetch trending repos by language)
       v
Code ------------ Filter & extract candidate files
       |           (pick files 8-15 lines, self-contained)
       v
HTTP Request ---- Fetch raw file content from GitHub
       |
       v
HTTP Request ---- Claude API (Anthropic)
       |           "What does this code do? 3 bullets."
       v
HTTP Request ---- Carbon API (code -> dark-mode image)
       |
       v
Code ------------ Compose full HTML email
       |           (mobile-first, inline CSS, embed image + breakdown)
       v
Gmail ----------- Create Draft (NOT send)
       |           (save as Gmail draft for human review)
       v
Google Sheets --- Write 3 rows (Mon/Wed/Fri)
                   [status: "draft", date, gmail_draft_id,
                    repo_name, repo_url, repo_description]
```

### Key API Endpoints

**GitHub:**
- Search API: `GET https://api.github.com/search/repositories?q=language:{lang} created:>={date}&sort=stars&order=desc&per_page=10`
- Raw file: `GET https://raw.githubusercontent.com/{owner}/{repo}/main/{filepath}`

**Claude (Anthropic):**
- Messages API: `POST https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`
- Model: `claude-3-haiku-20240307` or `claude-3-5-sonnet-20241022`

**Carbon API:**
- Endpoint: Research needed (carbon.now.sh doesn't have public API - may need ray.so or Playwright screenshot)

**Gmail:**
- n8n Gmail node: `resource: "draft"`, `operation: "create"`

### Coordination

- **Before starting:**
  - Read `docs/tasks/UPDATES.md` to confirm Tracks E and F are complete
  - Verify landing page is live (Track E) and subscriber system works (Track F)
  - Do NOT start until subscriber base is validated (no point automating content with no subscribers)

- **After completing:** Append summary to `docs/tasks/UPDATES.md` with:
  - n8n Workflow 1 created
  - GitHub trending approach chosen
  - Claude model used
  - Code image service used (Carbon/ray.so/Playwright)
  - Google Sheets Sheet 1 (Drafts) created
  - First test run results (draft quality, time taken)

## Notes

- **BLOCKED by Tracks E and F** - Need landing page live and subscribers validated before automating content
- Manual step is intentional: human reviews drafts in Gmail before approving for send
- Estimated time after automation: 10-15 minutes per week (from newsletter-n8n-plan.md)
- Newsletter targets mid-level engineers (2-5 YoE) per thoughts.md - snippets should require 10-30 seconds of thinking
- Build order from newsletter-n8n-plan.md: Workflow 2 (done), Workflow 3 (Track F), Workflow 1 (this track)
