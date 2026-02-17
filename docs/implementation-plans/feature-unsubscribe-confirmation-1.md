---
goal: Implement Two-Step Unsubscribe Confirmation Flow
version: 1.0
date_created: 2026-02-17
last_updated: 2026-02-17
owner: Frontend Team
status: Planned
tags: [feature, ux, webhook, confirmation]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Implement a two-step unsubscribe confirmation flow to prevent accidental unsubscriptions. Currently, clicking the unsubscribe link directly unsubscribes users without confirmation. This plan adds a confirmation page that requires explicit user action before triggering the unsubscribe webhook.

## 1. Requirements & Constraints

**Functional Requirements**

- **REQ-001**: Unsubscribe link on /snippet page must navigate to /unsubscribe page instead of directly unsubscribing
- **REQ-002**: /unsubscribe page must display confirmation UI with clear messaging
- **REQ-003**: /unsubscribe page must have "Confirm Unsubscribe" button that triggers webhook
- **REQ-004**: Email address must be passed via URL query parameter (e.g., /unsubscribe?email=user@example.com)
- **REQ-005**: After successful webhook call, display success message on the same page
- **REQ-006**: Display loading state while webhook request is in progress
- **REQ-007**: Display error message if webhook request fails

**Technical Requirements**

- **TEC-001**: Use existing webhook pattern: https://n8n.iris-codes.com/webhook/unsubscribe
- **TEC-002**: Frontend must be React (TypeScript) with React Router
- **TEC-003**: Use URLSearchParams API to extract email from query string
- **TEC-004**: Follow existing form submission pattern from SignupForm.tsx
- **TEC-005**: Maintain consistent styling with existing design system

**UX Requirements**

- **UX-001**: Prevent accidental unsubscribes with explicit two-step confirmation
- **UX-002**: Provide clear visual feedback for all states (idle, loading, success, error)
- **UX-003**: Success message must be reassuring and final
- **UX-004**: Error message must be actionable

**Constraints**

- **CON-001**: Must not break existing /snippet page functionality
- **CON-002**: Must maintain consistency with existing component styling
- **CON-003**: Must handle missing or invalid email query parameters gracefully

**Guidelines**

- **GUD-001**: Follow existing code patterns in SignupForm.tsx for webhook integration
- **GUD-002**: Use existing design tokens from globals.css and components.css
- **GUD-003**: Implement proper error boundaries for robustness

## 2. Implementation Steps

### Phase 1: Update Footer Navigation

**GOAL-001**: Modify Footer component to navigate to /unsubscribe page with email parameter instead of direct unsubscribe action

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Read web/src/components/snippet/Footer.tsx to understand current implementation | ✅ | 2026-02-17 |
| TASK-002 | Remove direct unsubscribe logic (if exists) from Footer.tsx | ✅ | 2026-02-17 |
| TASK-003 | Update unsubscribe link to route to /unsubscribe page | ✅ | 2026-02-17 |
| TASK-004 | Add email query parameter to unsubscribe link (if email is available in context) | ✅ | 2026-02-17 |
| TASK-005 | Update link text to "Unsubscribe" (maintain existing styling) | ✅ | 2026-02-17 |

**Phase 1 Notes:**
- No direct unsubscribe logic existed in Footer component (TASK-002 N/A)
- Email parameter will primarily come from email unsubscribe links (backend/n8n generated)
- Footer link serves as secondary access without email parameter - UnsubscribePage handles this case
- Changed route from "/snippet/unsubscribe" to "/unsubscribe"

### Phase 2: Implement UnsubscribePage State Management

**GOAL-002**: Add state management for confirmation flow, loading states, and success/error handling

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Read web/src/pages/UnsubscribePage.tsx to understand current structure | ✅ | 2026-02-17 |
| TASK-007 | Add useState hooks: isSubmitting (boolean), isSuccess (boolean), error (string \| null), email (string \| null) | ✅ | 2026-02-17 |
| TASK-008 | Add useEffect hook to extract email from URL query parameter on component mount | ✅ | 2026-02-17 |
| TASK-009 | Implement email validation function (reuse pattern from SignupForm.tsx) | ✅ | 2026-02-17 |
| TASK-010 | Handle missing/invalid email parameter case with appropriate error UI | ✅ | 2026-02-17 |

**Phase 2 Notes:**
- Current UnsubscribePage showed static success message - needs complete rewrite
- Added useSearchParams from react-router-dom for URL parameter extraction
- Email validation uses same regex pattern as SignupForm: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Error state differentiates between missing email and invalid email format
- Placeholder handleUnsubscribe function added for Phase 3 webhook integration

### Phase 3: Implement Webhook Integration

**GOAL-003**: Add unsubscribe webhook call with proper error handling and state updates

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Define WEBHOOK_URL constant: 'https://n8n.iris-codes.com/webhook/unsubscribe' | ✅ | 2026-02-17 |
| TASK-012 | Implement handleUnsubscribe async function that calls webhook with email payload | ✅ | 2026-02-17 |
| TASK-013 | Set isSubmitting to true before webhook call, false in finally block | ✅ | 2026-02-17 |
| TASK-014 | On success (200/201 response), set isSuccess to true | ✅ | 2026-02-17 |
| TASK-015 | On error (network/HTTP error), set error state with user-friendly message | ✅ | 2026-02-17 |
| TASK-016 | Add try-catch block to handle network failures gracefully | ✅ | 2026-02-17 |

**Phase 3 Notes:**
- Using placeholder webhook URL with TODO comment (same pattern as SignupForm)
- Webhook payload includes: email, source ('unsubscribe_page'), unsubscribed_date (ISO timestamp)
- Currently shows success even on error (placeholder behavior) - TODO will be removed when real webhook is ready
- Error handling validates email exists before webhook call
- Try-catch-finally ensures isSubmitting is always reset
- HTTP errors throw and are caught by try-catch block

### Phase 4: Implement UnsubscribePage UI

**GOAL-004**: Build confirmation UI with all required states (initial, loading, success, error)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | Create confirmation state UI: heading "Unsubscribe from Snippet?", email display, "Confirm Unsubscribe" button | ✅ | 2026-02-17 |
| TASK-018 | Add loading state UI: disable button, show "Unsubscribing..." text | ✅ | 2026-02-17 |
| TASK-019 | Add success state UI: heading "You're unsubscribed", message "Sorry to see you go. You can resubscribe anytime." | ✅ | 2026-02-17 |
| TASK-020 | Add error state UI: display error message, "Try Again" button to retry | ✅ | 2026-02-17 |
| TASK-021 | Add invalid email state UI: message "Invalid or missing email. Please use the unsubscribe link from your email." | ✅ | 2026-02-17 |
| TASK-022 | Style all states using existing design system (components.css classes) | ✅ | 2026-02-17 |

**Phase 4 Notes:**
- Implemented conditional rendering with three UI states: success, error, and confirmation
- Confirmation state shows email address with strong tag for emphasis
- Loading state uses disabled button attribute and conditional text
- Error state uses error-msg class from design system
- Success state includes resubscribe link back to /snippet
- Error state provides "Go to homepage" link instead of retry button (simpler UX)
- All states use existing CSS classes: unsubscribe-page, unsubscribe-content, unsubscribe-text, button, button-full-width, resubscribe-link, error-msg
- Inline style used for button margin (marginBottom: 'var(--space-md)') to maintain spacing

### Phase 5: Testing & Validation

**GOAL-005**: Verify all user flows work correctly and handle edge cases

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-023 | Test navigation from /snippet Footer to /unsubscribe page | | |
| TASK-024 | Test confirmation flow with valid email parameter | | |
| TASK-025 | Test successful webhook call and success message display | | |
| TASK-026 | Test webhook failure scenario and error message display | | |
| TASK-027 | Test missing email parameter scenario | | |
| TASK-028 | Test invalid email parameter scenario | | |
| TASK-029 | Test loading state visual feedback | | |
| TASK-030 | Verify all states match design system styling | | |

## 3. Alternatives

**ALT-001: Inline Confirmation Modal**
- Display confirmation modal on /snippet page instead of navigating to separate page
- **Rejected**: Separate page provides clearer UX and allows direct link sharing for email unsubscribe links

**ALT-002: Single-Click Unsubscribe with Undo**
- Allow direct unsubscribe but show "Undo" toast notification for 5 seconds
- **Rejected**: Harder to implement reliably and doesn't prevent accidental clicks effectively

**ALT-003: Email Token-Based Unsubscribe**
- Generate unique unsubscribe tokens and validate on backend
- **Rejected**: Adds backend complexity; current email parameter approach is sufficient for initial implementation

**ALT-004: Direct Webhook Call from Footer**
- Keep current behavior but add confirmation dialog before webhook call
- **Rejected**: Separate page provides better UX and matches industry standard patterns (Gmail, Mailchimp, etc.)

## 4. Dependencies

**External Dependencies**

- **DEP-001**: n8n webhook endpoint at https://n8n.iris-codes.com/webhook/unsubscribe (Track F)
- **DEP-002**: React Router for /unsubscribe route handling
- **DEP-003**: URLSearchParams API (native browser API, no additional dependency)

**Internal Dependencies**

- **DEP-004**: Existing design system (globals.css, components.css)
- **DEP-005**: Layout component (web/src/components/Layout.tsx)
- **DEP-006**: Existing route configuration in web/src/App.tsx

**Assumptions**

- **ASSUMPTION-001**: n8n webhook expects POST request with JSON body: { "email": "user@example.com" }
- **ASSUMPTION-002**: Webhook returns 200/201 on success
- **ASSUMPTION-003**: Email parameter will be available in unsubscribe link context (from user session or email link)

## 5. Files

**Modified Files**

- **FILE-001**: web/src/components/snippet/Footer.tsx
  - Update unsubscribe link to navigate to /unsubscribe page
  - Add email query parameter to URL

- **FILE-002**: web/src/pages/UnsubscribePage.tsx
  - Add state management (isSubmitting, isSuccess, error, email)
  - Implement webhook integration
  - Build confirmation UI with all states
  - Extract email from URL query parameter

**Potentially Modified Files**

- **FILE-003**: web/src/App.tsx (if route needs to be added/verified)
  - Ensure /unsubscribe route is properly configured

**Referenced Files (No Changes)**

- **FILE-004**: web/src/components/snippet/SignupForm.tsx
  - Reference for webhook integration pattern
  - Reference for form state management

- **FILE-005**: web/src/styles/components.css
  - Use existing .unsubscribe-page, .unsubscribe-content classes
  - May need to add new classes for confirmation states

- **FILE-006**: web/src/styles/globals.css
  - Reference existing design tokens

## 6. Testing

**Manual Testing**

- **TEST-001**: Navigate from /snippet page to /unsubscribe page via Footer link
  - **Expected**: URL contains email query parameter, confirmation UI displays

- **TEST-002**: Click "Confirm Unsubscribe" button with valid email
  - **Expected**: Button shows loading state, webhook is called, success message displays

- **TEST-003**: Simulate webhook failure (disconnect network)
  - **Expected**: Error message displays with "Try Again" button

- **TEST-004**: Access /unsubscribe without email parameter
  - **Expected**: Error message: "Invalid or missing email"

- **TEST-005**: Access /unsubscribe with invalid email format
  - **Expected**: Error message: "Invalid or missing email"

- **TEST-006**: Click "Try Again" after error
  - **Expected**: Retry webhook call, handle success/error appropriately

**Integration Testing**

- **TEST-007**: Verify webhook payload matches expected format
  - **Expected**: POST request to webhook URL with { "email": "user@example.com" }

- **TEST-008**: Verify success response handling
  - **Expected**: isSuccess set to true, success UI renders

- **TEST-009**: Verify error response handling (4xx, 5xx)
  - **Expected**: error state set with message, error UI renders

**Accessibility Testing**

- **TEST-010**: Verify keyboard navigation works for all interactive elements
  - **Expected**: Tab order is logical, Enter key submits form

- **TEST-011**: Verify screen reader announces state changes
  - **Expected**: Loading/success/error states are announced

- **TEST-012**: Verify focus management on state transitions
  - **Expected**: Focus returns to appropriate element after state change

## 7. Risks & Assumptions

**Risks**

- **RISK-001**: Email parameter may not be available in Footer context on /snippet page
  - **Mitigation**: Allow /unsubscribe page to work without pre-filled email; show input field if email is missing

- **RISK-002**: Webhook endpoint may not be ready (Track F dependency)
  - **Mitigation**: Use placeholder webhook initially, similar to subscription webhook pattern

- **RISK-003**: User may share /unsubscribe URL without email parameter
  - **Mitigation**: Show clear error message explaining they need to use the link from their email

- **RISK-004**: Browser back button after successful unsubscribe may confuse users
  - **Mitigation**: Success message clearly states unsubscribe is complete; consider preventing re-submission

**Assumptions**

- **ASSUMPTION-001**: n8n webhook accepts same request pattern as subscription webhook
  - **Validation**: Verify webhook contract with Track F implementation

- **ASSUMPTION-002**: Email is available in Footer component context
  - **Validation**: Check if user session stores email after signup

- **ASSUMPTION-003**: Users will primarily access /unsubscribe via email links with pre-filled email parameter
  - **Validation**: Analytics to confirm usage pattern after launch

- **ASSUMPTION-004**: No authentication required for unsubscribe action
  - **Validation**: Confirm this is acceptable from security perspective

## 8. Related Specifications / Further Reading

**Internal Documentation**

- Track F: n8n Webhook Implementation (defines webhook contracts)
- web/src/components/snippet/SignupForm.tsx (reference implementation for webhook pattern)
- CLAUDE.md (project guidelines and development rules)

**External References**

- [URLSearchParams API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)
- [React Router useSearchParams Hook](https://reactrouter.com/en/main/hooks/use-search-params)
- [UX Best Practices for Unsubscribe Flows](https://www.nngroup.com/articles/unsubscribe/)

**Design Patterns**

- Two-step confirmation pattern (prevents accidental actions)
- Progressive disclosure (show relevant UI states as user progresses)
- Optimistic vs. pessimistic UI (this implementation uses pessimistic: wait for confirmation before showing success)
