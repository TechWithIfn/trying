# Search Console investigation requirements

No Google Search Console account, export, or API credentials are available in this repository or environment. Therefore this project does not claim that any Downloadit page is indexed, ranking, receiving impressions, or affected by a manual action.

## Required exports

Request the last 3–6 months of Search Console data for:

- Performance by query and page: clicks, impressions, CTR, average position, country and device.
- Page indexing: indexed, crawled-not-indexed, discovered-not-indexed, duplicate/canonical-selected and blocked URLs.
- Sitemaps: submitted URL count, discovered URL count and errors.
- Manual actions and Security issues.
- Core Web Vitals by mobile and desktop.

## Classification to apply

- **Not discovered:** inspect internal links, sitemap inclusion, response status and crawlability.
- **Crawled but not indexed:** improve uniqueness/usefulness, canonical consistency and rendering.
- **Indexed with no impressions:** validate search intent and page differentiation.
- **Impressions with low CTR:** test accurate titles/descriptions without clickbait.
- **Irrelevant queries:** tighten page copy and internal anchors; do not add unrelated keywords.

## Safe next step

Submit the canonical sitemap after deployment, request indexing for the four platform pages, and revisit the report after enough impressions accumulate. Do not create country pages or claim traffic gains without evidence.
