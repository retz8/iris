---
goal: Implement Double Opt-In Email Confirmation System
version: 1.1
date_created: 2026-02-17
last_updated: 2026-02-17
owner: Track E - Frontend Team
status: Planned
tags: [feature, security, gdpr, email-verification, legal-compliance]
changelog:
  - v1.1 (2026-02-17): Updated to reflect simplified schema (removed written_language, single Google Sheet with status column)
  - v1.0 (2026-02-17): Initial version
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Implement a double opt-in email confirmation system for Snippet newsletter subscriptions to ensure legal compliance (GDPR, CAN-SPAM), prevent email abuse, and maintain high-quality subscriber lists. Currently, users are immediately subscribed upon email submission, which creates security risks and potential legal issues. This plan transforms the flow to require explicit email confirmation before adding users to the newsletter list.

**Implementation Note:** This plan uses a simplified schema with single Google Sheet and status-based state machine (pending/confirmed/unsubscribed). Written language support has been removed for MVP - newsletter is English-only with 3 content variants (Python, JS/TS, C/C++).

## 1. Requirements & Constraints

**Functional Requirements**

- **REQ-001**: User must confirm email ownership before receiving newsletters
- **REQ-002**: Confirmation email must be sent immediately after signup form submission
- **REQ-003**: Confirmation link must contain unique, secure token
- **REQ-004**: Token must expire after 48 hours
- **REQ-005**: User must see clear messaging at each step (pending → confirmed)
- **REQ-006**: Confirmed users see next delivery day (Mon/Wed/Fri logic)
- **REQ-007**: System must handle edge cases: expired tokens, already confirmed, invalid tokens

**Legal/Compliance Requirements**

- **LEG-001**: GDPR compliance - explicit consent required before sending newsletters
- **LEG-002**: CAN-SPAM compliance - must prove user requested subscription
- **LEG-003**: Prevent unauthorized subscriptions (can't subscribe someone else's email)
- **LEG-004**: Maintain audit trail of confirmation timestamps

**Technical Requirements**

- **TEC-001**: Use secure token generation (UUID or cryptographic hash)
- **TEC-002**: Frontend: React (TypeScript) with React Router
- **TEC-003**: Backend: n8n webhook integration at https://n8n.iris-codes.com
- **TEC-004**: Store subscriptions with status-based state machine (pending/confirmed/unsubscribed)
- **TEC-005**: Email template must be mobile-responsive and accessible

**UX Requirements**

- **UX-001**: Success message after signup must clearly instruct "Check your email to confirm"
- **UX-002**: Confirmation page must show success state with next delivery day
- **UX-003**: Error states must be clear and actionable
- **UX-004**: Maintain existing design system aesthetic (Spectral serif, minimal, elegant)

**Security Requirements**

- **SEC-001**: Tokens must be unpredictable (use UUID v4 or similar)
- **SEC-002**: Tokens must be single-use (invalidated after confirmation)
- **SEC-003**: Rate limiting on confirmation endpoint to prevent token guessing
- **SEC-004**: No sensitive data in URL parameters (only token)

**Constraints**

- **CON-001**: Must maintain backward compatibility with existing SignupForm component structure
- **CON-002**: Backend changes require Track F team coordination
- **CON-003**: Must work with existing newsletter schedule (Mon/Wed/Fri 7am)
- **CON-004**: Email delivery relies on n8n email service (external dependency)

**Guidelines**

- **GUD-001**: Follow existing component patterns in SignupForm.tsx
- **GUD-002**: Use existing design tokens from globals.css and components.css
- **GUD-003**: Maintain consistent error handling patterns
- **GUD-004**: Keep success messages concise and reassuring

## 2. Implementation Steps

### Phase 1: Update SignupForm Success State

**GOAL-001**: Modify SignupForm to show "Check your email to confirm" message instead of "You're subscribed!"

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Read web/src/components/snippet/SignupForm.tsx to understand current success state | | |
| TASK-002 | Update success state UI to show pending confirmation message | | |
| TASK-003 | Change heading from "You're subscribed!" to "Check your email" | | |
| TASK-004 | Change message to "We sent a confirmation link to {email}. Click it to complete your subscription." | | |
| TASK-005 | Remove "First Snippet arrives [day]" from success message (show after confirmation) | | |
| TASK-006 | Add "Didn't receive it? Check spam folder" hint text | | |
| TASK-007 | Keep email display in success message for user verification | | |

### Phase 2: Create Confirmation Page Component

**GOAL-002**: Build new ConfirmationPage component to handle token verification and display confirmation status

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Create web/src/pages/ConfirmationPage.tsx file | | |
| TASK-009 | Add route for /confirm in web/src/App.tsx | | |
| TASK-010 | Add state management: isVerifying (boolean), isConfirmed (boolean), error (string \| null) | | |
| TASK-011 | Add useEffect to extract token from URL query parameter (?token=xyz) | | |
| TASK-012 | Implement verifyToken async function that calls backend confirmation endpoint | | |
| TASK-013 | Add loading state UI: "Confirming your subscription..." with spinner | | |
| TASK-014 | Add success state UI: "You're confirmed!" with next delivery day (use getNextDeliveryDay logic) | | |
| TASK-015 | Add error state UI for expired token: "This link has expired. Please sign up again." | | |
| TASK-016 | Add error state UI for already confirmed: "You're already subscribed!" | | |
| TASK-017 | Add error state UI for invalid token: "Invalid confirmation link. Please sign up again." | | |
| TASK-018 | Add "Go to homepage" link in all states | | |

### Phase 3: Define Webhook API Contract

**GOAL-003**: Document backend API contract for Track F team to implement

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-019 | Document POST /webhook/subscribe endpoint changes (creates pending subscription) | | |
| TASK-020 | Document POST /webhook/confirm endpoint for token verification | | |
| TASK-021 | Define request/response schemas for both endpoints | | |
| TASK-022 | Define token generation strategy (UUID v4 recommended) | | |
| TASK-023 | Define token expiration policy (48 hours recommended) | | |
| TASK-024 | Define Google Sheets schema with status column (pending/confirmed/unsubscribed) | | |
| TASK-025 | Define confirmation email template requirements | | |
| TASK-026 | Create API documentation file: docs/track-f/api-double-optin.md | | |

### Phase 4: Implement Frontend API Integration

**GOAL-004**: Integrate frontend with backend confirmation endpoints

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-027 | Update SignupForm webhook call to handle pending response (status: "pending") | | |
| TASK-028 | Update success logic to check for "pending" vs "confirmed" status | | |
| TASK-029 | Implement verifyToken function in ConfirmationPage (POST /webhook/confirm) | | |
| TASK-030 | Add error handling for network failures during confirmation | | |
| TASK-031 | Add timeout handling (10 second timeout recommended) | | |
| TASK-032 | Add retry logic for network errors (optional) | | |

### Phase 5: Add Email Confirmation Template

**GOAL-005**: Define email template for confirmation message (Track F implementation)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-033 | Design email template with clear CTA: "Confirm Your Subscription" button | | |
| TASK-034 | Include confirmation link: https://iris-codes.com/confirm?token={token} | | |
| TASK-035 | Add fallback text link in case button doesn't render | | |
| TASK-036 | Add expiration notice: "This link expires in 48 hours" | | |
| TASK-037 | Add support contact or help link | | |
| TASK-038 | Ensure mobile-responsive design | | |
| TASK-039 | Test email rendering in major clients (Gmail, Outlook, Apple Mail) | | |

### Phase 6: Handle Edge Cases

**GOAL-006**: Implement robust error handling for all edge cases

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-040 | Handle missing token parameter: show "Invalid link" error | | |
| TASK-041 | Handle expired token: show "Link expired, sign up again" with signup link | | |
| TASK-042 | Handle already confirmed token: show "Already subscribed!" success message | | |
| TASK-043 | Handle invalid token format: show "Invalid link" error | | |
| TASK-044 | Handle backend errors (500, network failures): show retry option | | |
| TASK-045 | Add analytics tracking for confirmation funnel drop-off | | |

### Phase 7: Testing & Validation

**GOAL-007**: Verify all flows work correctly and handle edge cases

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-046 | Test happy path: signup → confirmation email → click link → confirmed | | |
| TASK-047 | Test expired token scenario (manually expire or wait 48 hours) | | |
| TASK-048 | Test already confirmed scenario (click link twice) | | |
| TASK-049 | Test invalid token scenario (random token string) | | |
| TASK-050 | Test missing token scenario (navigate to /confirm without token) | | |
| TASK-051 | Test email deliverability (check inbox, spam folder) | | |
| TASK-052 | Test mobile responsive design on confirmation page | | |
| TASK-053 | Test confirmation email rendering in multiple email clients | | |
| TASK-054 | Verify GDPR compliance: user must confirm before receiving newsletters | | |
| TASK-055 | Load test: submit multiple signups, verify all confirmation emails sent | | |

### Phase 8: Documentation & Deployment

**GOAL-008**: Document the new flow and deploy to production

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-056 | Update user-facing documentation about confirmation process | | |
| TASK-057 | Update internal documentation for support team (handling confirmation issues) | | |
| TASK-058 | Create rollback plan in case of issues | | |
| TASK-059 | Deploy frontend changes to staging environment | | |
| TASK-060 | Coordinate with Track F for backend deployment | | |
| TASK-061 | Monitor confirmation rate for first week after launch | | |
| TASK-062 | Set up alerts for low confirmation rates (< 50% may indicate issues) | | |

## 3. Alternatives

**ALT-001: Single Opt-In with CAPTCHA**
- Add CAPTCHA to prevent bot abuse but keep immediate subscription
- **Rejected**: Doesn't prevent malicious humans from subscribing others; questionable GDPR compliance; poor UX

**ALT-002: Email Verification Code (6-digit code)**
- User enters 6-digit code sent to email instead of clicking link
- **Rejected**: More complex UX (requires staying on site); higher friction; same backend complexity as double opt-in

**ALT-003: Passwordless Authentication Link (Magic Link)**
- Treat confirmation like authentication, store session
- **Rejected**: Over-engineered for newsletter subscription; no user accounts needed

**ALT-004: SMS Verification**
- Send confirmation code via SMS instead of email
- **Rejected**: Requires phone numbers (more invasive); higher cost; email is industry standard for newsletters

**ALT-005: Social Login (Sign in with Google/GitHub)**
- Use OAuth for email verification
- **Rejected**: Over-engineered; creates dependency on external providers; not standard for newsletters

## 4. Dependencies

**External Dependencies**

- **DEP-001**: n8n webhook service for email sending (Track F)
- **DEP-002**: Email service provider (SMTP configuration in n8n)
- **DEP-003**: Google Sheets for storing subscriptions with status column (Track F backend)
- **DEP-004**: Token generation (crypto.randomUUID in n8n Code node)

**Internal Dependencies**

- **DEP-005**: Existing SignupForm.tsx component
- **DEP-006**: Existing design system (globals.css, components.css)
- **DEP-007**: React Router for /confirm route
- **DEP-008**: getNextDeliveryDay function from SignupForm.tsx (reuse)

**Track Dependencies**

- **DEP-009**: Track F team must implement backend endpoints
- **DEP-010**: Track F team must implement email template
- **DEP-011**: Track F team must implement token management system
- **DEP-012**: Track F team must implement Google Sheets with status-based state machine

**Coordination Required**

- **DEP-013**: API contract must be agreed upon by Track E (frontend) and Track F (backend)
- **DEP-014**: Email template must be approved by design/product team
- **DEP-015**: GDPR compliance must be verified by legal (if available)

## 5. Files

**New Files**

- **FILE-001**: web/src/pages/ConfirmationPage.tsx
  - New page component for /confirm route
  - Handles token verification and displays confirmation status
  - Implements loading, success, and error states

**Modified Files**

- **FILE-002**: web/src/components/snippet/SignupForm.tsx
  - Update success state to show "Check your email" message
  - Remove immediate "You're subscribed" confirmation
  - Display pending confirmation status

- **FILE-003**: web/src/App.tsx
  - Add new route: /confirm for ConfirmationPage

- **FILE-004**: web/src/styles/components.css (optional)
  - May need new styles for confirmation page states
  - Reuse existing .success-message, .error-msg classes

**Backend Files (Track F Responsibility)**

- **FILE-005**: n8n workflow: subscribe endpoint
  - Create pending subscription
  - Generate confirmation token
  - Send confirmation email

- **FILE-006**: n8n workflow: confirm endpoint
  - Verify token validity
  - Check expiration
  - Update status from "pending" to "confirmed"
  - Generate unsubscribe_token

- **FILE-007**: Email template: confirmation-email.html
  - HTML email with confirmation link
  - Mobile-responsive design
  - Clear CTA button

**Documentation Files**

- **FILE-008**: docs/track-f/api-double-optin.md
  - API contract documentation
  - Request/response schemas
  - Error codes and handling

- **FILE-009**: docs/track-e/double-optin-user-flow.md
  - User flow documentation
  - Screenshots of each step
  - Error handling documentation

## 6. Testing

**Unit Testing**

- **TEST-001**: SignupForm shows correct success message after submission
  - **Expected**: Message says "Check your email to confirm"
  - **Expected**: Email address is displayed

- **TEST-002**: ConfirmationPage extracts token from URL correctly
  - **Expected**: Token extracted from ?token=xyz query parameter

- **TEST-003**: ConfirmationPage handles missing token
  - **Expected**: Shows error message "Invalid confirmation link"

**Integration Testing**

- **TEST-004**: Full happy path flow
  - **Steps**: Submit email → receive confirmation email → click link → see confirmed
  - **Expected**: User is confirmed and added to newsletter list

- **TEST-005**: Expired token handling
  - **Steps**: Submit email → wait 48+ hours → click link
  - **Expected**: Error message: "This link has expired. Please sign up again."

- **TEST-006**: Already confirmed handling
  - **Steps**: Submit email → confirm → click link again
  - **Expected**: Message: "You're already subscribed!"

- **TEST-007**: Invalid token handling
  - **Steps**: Navigate to /confirm?token=invalid-random-string
  - **Expected**: Error message: "Invalid confirmation link"

**Email Testing**

- **TEST-008**: Confirmation email delivered to inbox
  - **Expected**: Email arrives within 1 minute of signup

- **TEST-009**: Confirmation email renders correctly
  - **Test in**: Gmail, Outlook, Apple Mail, Yahoo Mail
  - **Expected**: CTA button visible, link clickable

- **TEST-010**: Confirmation link works from email
  - **Expected**: Clicking link navigates to /confirm page and confirms subscription

**Load Testing**

- **TEST-011**: Multiple concurrent signups
  - **Steps**: Submit 100 signups simultaneously
  - **Expected**: All confirmation emails sent successfully

- **TEST-012**: Token uniqueness
  - **Steps**: Submit 1000 signups
  - **Expected**: All tokens are unique (no collisions)

**Security Testing**

- **TEST-013**: Token guessing prevention
  - **Steps**: Try to guess valid tokens by brute force
  - **Expected**: Rate limiting prevents guessing

- **TEST-014**: Token reuse prevention
  - **Steps**: Use same token twice
  - **Expected**: Second use fails with "already confirmed" message

**Accessibility Testing**

- **TEST-015**: ConfirmationPage keyboard navigation
  - **Expected**: Can navigate and interact with keyboard only

- **TEST-016**: Screen reader compatibility
  - **Expected**: Status messages announced correctly

**Cross-Browser Testing**

- **TEST-017**: ConfirmationPage works in all major browsers
  - **Test in**: Chrome, Firefox, Safari, Edge
  - **Expected**: Consistent behavior and appearance

## 7. Risks & Assumptions

**Risks**

- **RISK-001**: Email deliverability issues (confirmation emails go to spam)
  - **Impact**: High - users can't confirm, can't receive newsletters
  - **Mitigation**: Use reputable email service, implement SPF/DKIM/DMARC, test in multiple email clients
  - **Probability**: Medium

- **RISK-002**: Lower conversion rate due to additional friction
  - **Impact**: Medium - some users won't complete confirmation
  - **Mitigation**: Clear messaging, simple process, send reminder emails
  - **Probability**: High
  - **Acceptable**: Yes - quality over quantity, legal compliance

- **RISK-003**: Token expiration too short/long
  - **Impact**: Low-Medium - users frustrated if too short, security risk if too long
  - **Mitigation**: Use industry standard 48 hours, monitor user feedback
  - **Probability**: Low

- **RISK-004**: Backend delay in sending confirmation email
  - **Impact**: High - poor user experience if email takes too long
  - **Mitigation**: Monitor email send times, set up alerts for delays > 2 minutes
  - **Probability**: Low

- **RISK-005**: Google Sheets fills up with expired pending subscriptions
  - **Impact**: Medium - need cleanup job for expired pending subscriptions
  - **Mitigation**: Implement daily cleanup job to update expired status or delete old rows
  - **Probability**: Low

- **RISK-006**: User confusion about confirmation process
  - **Impact**: Medium - support tickets, poor UX
  - **Mitigation**: Clear messaging at every step, FAQ documentation
  - **Probability**: Medium

**Assumptions**

- **ASSUMPTION-001**: Track F team can implement backend endpoints within 2 weeks
  - **Validation**: Coordinate with Track F lead before starting frontend work

- **ASSUMPTION-002**: Email service can handle volume of confirmation emails
  - **Validation**: Check email service limits, plan for scaling

- **ASSUMPTION-003**: 48-hour expiration is acceptable to users
  - **Validation**: Industry standard, used by Mailchimp, Substack, etc.

- **ASSUMPTION-004**: Most users check email within 24 hours
  - **Validation**: Monitor time between signup and confirmation

- **ASSUMPTION-005**: Confirmation rate will be 60-80% (industry average)
  - **Validation**: Monitor actual rate after launch, adjust if needed

- **ASSUMPTION-006**: Users understand "double opt-in" flow from other newsletters
  - **Validation**: This is standard practice, but provide clear instructions

- **ASSUMPTION-007**: No authentication/user accounts needed
  - **Validation**: Newsletter subscription only, no login required

- **ASSUMPTION-008**: Email is the only communication channel
  - **Validation**: No SMS or other channels planned

## 8. Related Specifications / Further Reading

**Internal Documentation**

- Track F: n8n Webhook Implementation (backend endpoints)
- Track E: SignupForm Component (current implementation)
- `docs/implementation-plans/feature-unsubscribe-confirmation-1.md` (related flow)

**External Standards**

- [GDPR Article 7: Conditions for consent](https://gdpr-info.eu/art-7-gdpr/)
- [CAN-SPAM Act Requirements](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- [Email Confirmation Best Practices - Mailchimp](https://mailchimp.com/help/about-double-opt-in/)
- [Double Opt-In vs Single Opt-In - Campaign Monitor](https://www.campaignmonitor.com/resources/knowledge-base/what-is-double-opt-in/)

**Technical References**

- [React Router v6 useSearchParams](https://reactrouter.com/en/main/hooks/use-search-params)
- [UUID v4 Specification](https://datatracker.ietf.org/doc/html/rfc4122)
- [Email Template Best Practices](https://www.emailonacid.com/blog/article/email-development/email-development-best-practices-2/)

**Design Patterns**

- Confirmation pattern (two-step verification)
- Token-based authentication
- Graceful degradation (if email fails, provide alternative)
- Clear user communication at each step
