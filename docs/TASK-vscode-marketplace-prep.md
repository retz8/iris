# Track C: Marketplace Preparation

**Stream:** 4 (from TODO.md)
**Scope:** `packages/iris-vscode/package.json`, assets, license
**Dependencies:** None
**Blocks:** None

## Objective

Prepare and publish the IRIS VS Code extension to the marketplace. This includes configuring publisher metadata, creating extension assets (icon, screenshots), setting up activation events, implementing first-run experience, expanding language support, and adding a license.

**Current State:**
- Basic extension works locally
- No marketplace-specific configuration
- No publisher account set up
- No extension icon or branding assets
- No first-run onboarding experience
- Language support limited (currently Python, JavaScript, TypeScript, JSX/TSX)

## Context

Publishing to VS Code Marketplace requires specific package.json fields (publisher, repository, homepage, icon), a Microsoft publisher account, and extension assets. Once published, the extension becomes the primary user acquisition channel and gates all Week 2 validation activities (user recruitment, telemetry, retention metrics).

**Key Files:**
- `packages/iris-vscode/package.json` - Extension manifest
- `packages/iris-vscode/README.md` - Marketplace description page
- `packages/iris-vscode/CHANGELOG.md` - Version history
- Extension assets (icon, screenshots) - New files to create

## Phase 0: Exploration

Follow these steps to understand the current state:

1. Read `packages/iris-vscode/package.json` to see current configuration
2. Read `packages/iris-vscode/README.md` to understand current description
3. Check VS Code Marketplace publishing docs (what fields are required)
4. Check `backend/src/parser/` to see what languages Tree-sitter already supports
5. Review strategy doc positioning: "comprehension layer that completes the AI coding stack"
6. Check current activation events in package.json
7. Research VS Code extension best practices (icon size, screenshot requirements)

## Phase 1: Discovery/Discussion (with human engineer)

### Topics to Discuss

Based on Phase 0 exploration, discuss and generate specific questions for:

1. **Publisher Account** - Account ownership, publisher ID, setup status
2. **Branding** - Icon design, screenshots, marketplace description emphasis
3. **First-Run Experience** - Welcome message, API key prompting, onboarding guide
4. **Language Expansion** - Languages to add, backend support verification, package.json vs prompt tuning
5. **License** - License choice, decision maker
6. **Activation Events** - Current events, desired behavior, performance impact

Document specific questions and design decisions here after discussion.

## Phase 2: Implementation Planning

**Will be filled in after Phase 1 discussion.** Should include:
- Publisher account setup steps
- Asset creation plan (icon, screenshots)
- package.json fields to add
- First-run experience implementation approach
- Language expansion steps
- Publishing checklist

## Phase 3: Execution

**Will be filled in after Phase 2 planning.** Should include:
- package.json updates
- Asset creation and placement
- First-run experience code
- License file addition
- Publishing commands and steps

## Phase 4: Testing & Verification

**Will be filled in after Phase 3 execution.** Should include:
- Test extension packaging (`vsce package`)
- Verify marketplace listing preview
- Test first-run experience on clean install
- Verify all languages activate correctly
- Validation before final publish

## Acceptance Criteria

- [ ] **Marketplace Ready:**
  - Extension has all required package.json fields (publisher, repository, homepage, icon, etc.)
  - Icon and branding assets created and in place
  - README.md formatted for marketplace (clear value prop, installation instructions, usage guide)
  - CHANGELOG.md exists with initial version entry

- [ ] **Publisher Account:**
  - Microsoft publisher account created and verified
  - Publisher ID configured in package.json
  - Extension name is available and reserved

- [ ] **First-Run Experience:**
  - Extension shows appropriate welcome/onboarding on first activation
  - Missing API key prompts user with actionable message
  - User can easily find settings and configure API key

- [ ] **Language Support:**
  - All major LLM-supported languages added (Python, JavaScript, TypeScript, Go, Rust, Java, C#, C/C++, at minimum)
  - Extension activates correctly for files in supported languages
  - No errors or crashes when analyzing different language files

- [ ] **License:**
  - LICENSE file added to repository root
  - package.json includes correct license field
  - License is appropriate for intended distribution model

- [ ] **Published:**
  - Extension successfully published to VS Code Marketplace
  - Marketplace listing is live and accessible
  - Users can install via "Install Extension" in VS Code

## Files Likely to Modify

Based on scope:
- `packages/iris-vscode/package.json` - Add publisher, icon, repository, homepage, categories, keywords, activationEvents, supported languages
- `packages/iris-vscode/README.md` - Rewrite for marketplace audience (value prop, installation, usage)
- `packages/iris-vscode/CHANGELOG.md` - Create initial version entry
- `packages/iris-vscode/src/extension.ts` - Add first-run experience (welcome message, API key check)
- `LICENSE` (root) - Add chosen license
- New files: Extension icon (PNG), screenshots, `.vscodeignore` (exclude unnecessary files from package)

## Claude Code Session Instructions

### Skills to Use

- **vscode-extension-expert** - For marketplace publishing requirements, activation events, extension manifest
- **frontend-design** (if creating icon) - For extension icon design

### Recommended Agents

- **General-purpose agent** - For package.json updates, first-run UX, publishing workflow
- **Explore agent** - For checking backend language support

### Tools Priority

- **Read** - Check current package.json, README, extension.ts
- **Edit** - Update package.json, README, CHANGELOG
- **Write** - Create LICENSE, CHANGELOG if not exists
- **Bash** - Package extension (`vsce package`), publish (`vsce publish`)
- **Grep** - Search for activation patterns, language support in backend

### Testing Commands

```bash
# Install vsce (VS Code Extension CLI) if not installed
npm install -g @vscode/vsce

# Package extension (test packaging)
cd packages/iris-vscode
vsce package

# Publish to marketplace (after package.json is ready)
vsce publish

# Test extension locally (after packaging)
code --install-extension iris-X.X.X.vsix
```

### Coordination

- **Before starting:** Read `docs/tasks/UPDATES.md` to check for relevant updates
- **After completing:** Append summary to `docs/tasks/UPDATES.md` with:
  - Publisher account details (publisher ID)
  - Marketplace URL once published
  - Languages added
  - License chosen
  - Files modified

## Notes

- This track is independent - can run in parallel with Tracks A, B, H
- Publishing to marketplace **gates** Week 2 validation activities (user recruitment, telemetry)
- First-run UX should be lightweight - don't over-engineer onboarding for MVP
- Language expansion is mostly package.json changes - backend already supports via LLM (no Tree-sitter limitation)
- Follow VS Code extension publishing best practices (check official docs)
