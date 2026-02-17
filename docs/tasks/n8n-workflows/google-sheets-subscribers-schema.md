# Google Sheets Schema: Newsletter Subscribers

**Sheet Name:** Newsletter Subscribers
**Purpose:** Store all newsletter subscribers with their subscription state, preferences, and confirmation tokens.

## Overview

Single source of truth for all newsletter subscribers. Tracks full subscriber lifecycle from initial signup through confirmation and potential unsubscription. Uses status-based state machine with token-based confirmation for both subscription and unsubscription flows.

## Column Definitions

| Column Name | Data Type | Required | Description | Example |
|-------------|-----------|----------|-------------|---------|
| email | string | Yes | Subscriber email address (unique identifier) | user@example.com |
| programming_languages | string | Yes | Comma-separated list of preferred programming languages | Python,JS/TS,C/C++ |
| status | string | Yes | Current subscription state | pending, confirmed, unsubscribed, expired |
| confirmation_token | string | No | UUID v4 token for email confirmation (null after confirmed) | a7b3c4d5-e6f7-8901-2345-6789abcdef01 |
| token_expires_at | datetime | No | ISO 8601 timestamp when confirmation token expires (null after confirmed) | 2026-02-19T12:00:00Z |
| unsubscribe_token | string | No | UUID v4 token for unsubscribe link (generated when confirmed) | x9y8z7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4 |
| created_date | datetime | Yes | ISO 8601 timestamp when user first signed up | 2026-02-17T10:00:00Z |
| confirmed_date | datetime | No | ISO 8601 timestamp when user confirmed subscription (null if pending) | 2026-02-17T10:15:00Z |
| unsubscribed_date | datetime | No | ISO 8601 timestamp when user unsubscribed (null if active) | 2026-03-01T14:30:00Z |
| source | string | Yes | Where user signed up from | landing_page, referral, api |

## Status Values

| Status | Description | Next States | Token Fields |
|--------|-------------|-------------|--------------|
| pending | User signed up but hasn't confirmed email | confirmed, expired | confirmation_token, token_expires_at populated |
| confirmed | User confirmed email, actively subscribed | unsubscribed | confirmation_token cleared, unsubscribe_token populated |
| unsubscribed | User opted out of newsletter | pending (re-subscription) | All tokens cleared |
| expired | Confirmation token expired (48+ hours, no action) | pending (re-signup) | confirmation_token expired |

## State Transitions

```
Initial Signup
    ↓
pending (confirmation_token generated, 48hr expiration)
    ↓
    ├─ Click confirmation link → confirmed (unsubscribe_token generated)
    ├─ 48hr timeout → expired (cleanup job)
    └─ Re-signup before expiry → refresh token, reset timer

confirmed
    ↓
    └─ Click unsubscribe link (with unsubscribe_token) → unsubscribed

unsubscribed
    ↓
    └─ Re-signup from landing page → pending (new confirmation_token)
```

## Data Validation Rules

**Email:**
- Format: valid email regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- Case-insensitive comparison (normalize to lowercase for duplicate checks)
- Trimmed (no leading/trailing whitespace)

**Programming Languages:**
- Allowed values: `Python`, `JS/TS`, `C/C++`
- Stored as comma-separated string: `Python,JS/TS` or `Python,JS/TS,C/C++`
- At least one required

**Status:**
- Allowed values: `pending`, `confirmed`, `unsubscribed`, `expired`
- Default: `pending` on initial signup

**Tokens:**
- Format: UUID v4 (e.g., `a7b3c4d5-e6f7-8901-2345-6789abcdef01`)
- Generated using `crypto.randomUUID()` in n8n Code node
- Single-use (invalidated after verification)

**Timestamps:**
- Format: ISO 8601 with timezone (e.g., `2026-02-17T10:00:00Z`)
- Generated using `new Date().toISOString()` in n8n
- Token expiration: `created_date + 48 hours`

## Usage Examples

**New Subscription (Pending):**
| email | programming_languages | status | confirmation_token | token_expires_at | unsubscribe_token | created_date | confirmed_date | unsubscribed_date | source |
|-------|----------------------|--------|-------------------|-----------------|-------------------|--------------|----------------|-------------------|--------|
| user@example.com | Python,JS/TS | pending | a7b3...def01 | 2026-02-19T10:00:00Z | null | 2026-02-17T10:00:00Z | null | null | landing_page |

**Confirmed Subscription:**
| email | programming_languages | status | confirmation_token | token_expires_at | unsubscribe_token | created_date | confirmed_date | unsubscribed_date | source |
|-------|----------------------|--------|-------------------|-----------------|-------------------|--------------|----------------|-------------------|--------|
| user@example.com | Python,JS/TS | confirmed | null | null | x9y8...l5k4 | 2026-02-17T10:00:00Z | 2026-02-17T10:15:00Z | null | landing_page |

**Unsubscribed:**
| email | programming_languages | status | confirmation_token | token_expires_at | unsubscribe_token | created_date | confirmed_date | unsubscribed_date | source |
|-------|----------------------|--------|-------------------|-----------------|-------------------|--------------|----------------|-------------------|--------|
| user@example.com | Python,JS/TS | unsubscribed | null | null | null | 2026-02-17T10:00:00Z | 2026-02-17T10:15:00Z | 2026-03-01T14:30:00Z | landing_page |

## Queries

**Get all active subscribers (for newsletter sending):**
```
Filter: status = "confirmed"
```

**Get all pending confirmations:**
```
Filter: status = "pending"
```

**Get expired confirmations (cleanup job):**
```
Filter: status = "pending" AND token_expires_at < NOW()
```

**Check duplicate email (any status):**
```
Filter: email = "user@example.com"
```

**Get confirmation rate (analytics):**
```
Count: status = "confirmed" / (status = "confirmed" + status = "pending" + status = "expired")
```

## Maintenance

**Daily Cleanup Job (Optional):**
- Find rows with `status = "pending"` AND `token_expires_at < NOW()`
- Update `status = "expired"` (keeps data for analytics)
- Alternative: Delete rows older than 30 days

**Re-subscription Handling:**
- If email exists with `status = "unsubscribed"`, update same row:
  - Set `status = "pending"`
  - Generate new `confirmation_token`
  - Set new `token_expires_at` (NOW() + 48 hours)
  - Clear `unsubscribed_date`
  - Keep `created_date` (original signup)
  - Clear `confirmed_date` (will be reset on re-confirmation)

## Security Notes

- Tokens must be cryptographically random (UUID v4 or `crypto.randomBytes()`)
- Token expiration enforced server-side (never trust client timestamps)
- Email comparison is case-insensitive (prevent duplicate signups with different cases)
- Unsubscribe tokens prevent malicious unsubscribe attacks (can't unsubscribe with just email)
- All tokens are single-use (invalidated after verification)
