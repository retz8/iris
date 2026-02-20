# Snippet

Snippet is a newsletter product. This folder contains all operational documentation for the Snippet newsletter — workflows, schemas, and content generation guides.

## Folder Structure

```
snippet/
├── README.md                  # This file
├── snippet-prd.md             # Product requirements document
│
├── schema/                    # Google Sheets data schemas
│   ├── google-sheets-subscribers-schema.md   # Newsletter Subscribers sheet
│   ├── google-sheets-drafts-schema.md        # Newsletter Drafts sheet
│   └── google-sheets-send-errors-schema.md   # Send Errors sheet
│
└── n8n-workflows/             # n8n workflow documentation (node-by-node)
    ├── manual-content-generation.md          # Manual newsletter content authoring guide
    ├── workflow-subscription-double-optin.md # Subscriber signup and confirmation flow
    ├── workflow-confirmation.md              # Email confirmation and welcome email
    ├── workflow-unsubscribe-token-based.md   # Token-based unsubscribe handler
    ├── workflow-gmail-drafts-to-sheet.md     # Gmail drafts → Newsletter Drafts sheet
    └── workflow-send-newsletter.md           # Scheduled newsletter send
```
