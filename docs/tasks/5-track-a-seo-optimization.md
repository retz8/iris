# 5-Track-A — SEO Optimization

**Phase:** 5
**Track:** A
**Scope:** Optimize the Snippet landing page (`web/`) for search engine discoverability and social sharing.

**Dependencies:** Web app must be deployed to Vercel and live at `iris-codes.com`.

**Deliverables:**
- Updated `web/index.html` — improved meta tags, Open Graph, Twitter Card, canonical URL
- `web/public/robots.txt` — exclude transactional routes from indexing
- `web/public/sitemap.xml` — declare the canonical landing page URL
- Structured data (JSON-LD) — newsletter/website schema in `index.html`
- Favicon set — if missing, generate and add to `web/public/`

**Out of scope:**
- SSR / pre-rendering (overkill for a single landing page)
- Per-route meta tag management (only `/snippet` is indexable)
- Paid search or analytics setup

---

## Phase 1 — Explore

Read the following to understand current state:

1. `web/index.html` — audit existing meta tags, title, OG tags
2. `web/src/App.tsx` — understand routes; identify which are indexable vs transactional
3. `web/public/` — check for existing favicon, robots.txt, sitemap
4. `web/src/components/snippet/Hero.tsx` — read the copy to write accurate meta descriptions and OG content

After reading, answer:

- What is the current `<title>` and `<meta name="description">`? Are they accurate and compelling?
- What OG tags exist? What is missing (`og:image`, `og:site_name`, Twitter Card)?
- Is there a favicon? If not, what should it be?
- Which routes should be indexed? Which should be excluded via `robots.txt`?
- What keyword targets should the description and title optimize for?

---

## Phase 2 — Discuss

Present findings and agree on content before writing:

1. Proposed `<title>` — should it be "Snippet" or something more descriptive?
2. Proposed `<meta name="description">` — confirm copy (150–160 chars, keyword-rich, compelling)
3. `og:image` — do we have an image to use? What dimensions? Where is it hosted?
4. Structured data type — `NewsletterArticle`, `WebSite`, or `Organization`?
5. Keyword targets — what should someone search to find this?

---

## Phase 3 — Plan

Not needed. Changes are isolated to `index.html` and `public/` static files. Execute directly.

---

## Phase 4 — Execute

### `web/index.html`
- Update `<title>` to be descriptive and keyword-targeted
- Improve `<meta name="description">` (150–160 chars, includes keywords)
- Add `<link rel="canonical" href="https://iris-codes.com/snippet" />`
- Complete Open Graph tags: `og:title`, `og:description`, `og:url`, `og:image`, `og:site_name`, `og:type`
- Add Twitter Card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- Add JSON-LD structured data block (`<script type="application/ld+json">`)
- Add favicon `<link>` tags if missing

### `web/public/robots.txt`
```
User-agent: *
Allow: /snippet
Disallow: /snippet/confirm
Disallow: /snippet/unsubscribe
Sitemap: https://iris-codes.com/sitemap.xml
```

### `web/public/sitemap.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://iris-codes.com/snippet</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

### Verification
- Run `npm run build` in `web/` — no errors
- Open built `dist/index.html` and confirm all meta tags present
- Validate OG tags at opengraph.xyz (or similar)
- Validate structured data at schema.org validator
- Confirm `robots.txt` and `sitemap.xml` are in `dist/` after build
