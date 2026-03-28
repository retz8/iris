---
name: create-implementation-plan
description: "Create structured implementation plans for features, refactoring, upgrades, design, architecture, or infrastructure. Generates machine-readable, deterministic plans for autonomous execution by AI agents or humans. Domains: software implementation, package upgrades, system refactoring, architecture design, infrastructure changes. Actions: create, generate, structure implementation plans. Keywords: implementation plan, technical spec, feature spec, upgrade plan, refactoring plan, architecture spec, infrastructure plan, design doc. Use when: planning new features, refactoring existing code, upgrading packages, designing architecture, documenting infrastructure changes."
---

# Create Implementation Plan

Generates structured, machine-readable implementation plans for autonomous execution by AI agents or humans.

## Primary Directive

Create implementation plans that are fully executable with zero ambiguity. All content must be deterministic, structured, and self-contained.

## Core Requirements

- Generate plans executable by AI agents or humans without interpretation
- Use deterministic language with zero ambiguity
- Structure all content for automated parsing and execution
- Ensure complete self-containment with no external dependencies for understanding

## Plan Structure Requirements

Plans consist of discrete, atomic phases containing executable tasks:
- Each phase must have measurable completion criteria
- Tasks within phases must be executable in parallel unless dependencies are specified
- All task descriptions must include specific file paths, function names, and exact implementation details
- No task should require human interpretation or decision-making

## AI-Optimized Implementation Standards

- Use explicit, unambiguous language with zero interpretation required
- Structure all content as machine-parseable formats (tables, lists, structured data)
- Include specific file paths, line numbers, and exact code references where applicable
- Define all variables, constants, and configuration values explicitly
- Provide complete context within each task description
- Use standardized prefixes for all identifiers (REQ-, TASK-, etc.)
- Include validation criteria that can be automatically verified

## Output File Specifications

**Naming Convention:** `[purpose]-[component]-[version].md`

**Purpose Prefixes:**
- `upgrade` - Package or dependency upgrades
- `refactor` - Code restructuring or cleanup
- `feature` - New feature implementation
- `data` - Data model or schema changes
- `infrastructure` - Infrastructure or deployment changes
- `process` - Process or workflow changes
- `architecture` - Architecture design or changes
- `design` - UI/UX or visual design

**Examples:**
- `upgrade-system-command-4.md`
- `feature-auth-module-1.md`
- `refactor-api-client-2.md`

## Mandatory Template Structure

All implementation plans must strictly adhere to the following template.

### Front Matter (Required)

```yaml
---
goal: [Concise Title Describing the Implementation Plan's Goal]
version: [Optional: e.g., 1.0, Date]
date_created: [YYYY-MM-DD]
last_updated: [Optional: YYYY-MM-DD]
owner: [Optional: Team/Individual responsible for this spec]
status: 'Completed'|'In progress'|'Planned'|'Deprecated'|'On Hold'
tags: [Optional: List of relevant tags, e.g., feature, upgrade, chore, architecture, migration, bug]
---
```

### Status Badge Colors

- `Completed` → bright green badge
- `In progress` → yellow badge
- `Planned` → blue badge
- `Deprecated` → red badge
- `On Hold` → orange badge

### Template

```markdown
# Introduction

![Status: <status>](https://img.shields.io/badge/status-<status>-<status_color>)

[A short concise introduction to the plan and the goal it is intended to achieve.]

## 1. Requirements & Constraints

[Explicitly list all requirements & constraints that affect the plan and constrain how it is implemented. Use bullet points or tables for clarity.]

- **REQ-001**: Requirement 1
- **SEC-001**: Security Requirement 1
- **[3 LETTERS]-001**: Other Requirement 1
- **CON-001**: Constraint 1
- **GUD-001**: Guideline 1
- **PAT-001**: Pattern to follow 1

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: [Describe the goal of this phase, e.g., "Implement feature X", "Refactor module Y", etc.]

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Description of task 1 | ✅ | 2025-04-25 |
| TASK-002 | Description of task 2 | |  |
| TASK-003 | Description of task 3 | |  |

### Implementation Phase 2

- GOAL-002: [Describe the goal of this phase]

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Description of task 4 | |  |
| TASK-005 | Description of task 5 | |  |

## 3. Alternatives

[A bullet point list of any alternative approaches that were considered and why they were not chosen. This helps to provide context and rationale for the chosen approach.]

- **ALT-001**: Alternative approach 1
- **ALT-002**: Alternative approach 2

## 4. Dependencies

[List any dependencies that need to be addressed, such as libraries, frameworks, or other components that the plan relies on.]

- **DEP-001**: Dependency 1
- **DEP-002**: Dependency 2

## 5. Files

[List the files that will be affected by the feature or refactoring task.]

- **FILE-001**: Description of file 1
- **FILE-002**: Description of file 2

## 6. Testing

[List the tests that need to be implemented to verify the feature or refactoring task.]

- **TEST-001**: Description of test 1
- **TEST-002**: Description of test 2

## 7. Risks & Assumptions

[List any risks or assumptions related to the implementation of the plan.]

- **RISK-001**: Risk 1
- **ASSUMPTION-001**: Assumption 1

## 8. Related Specifications / Further Reading

[Link to related spec 1]
[Link to relevant external documentation]
```

## Template Validation Rules

All implementation plans must validate against these rules:
- All front matter fields must be present and properly formatted
- All section headers must match exactly (case-sensitive)
- All identifier prefixes must follow the specified format
- Tables must include all required columns
- No placeholder text may remain in the final output

## Usage Guidelines

1. **When to Use:** Creating any implementation plan for features, refactoring, upgrades, or architectural changes
2. **Output Location:** Based on project conventions (check CLAUDE.md or project docs)
3. **Validation:** Ensure all sections are populated with specific, actionable content
4. **Completeness:** Plans must be self-contained and executable without additional context
