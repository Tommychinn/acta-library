# tools

Pull a **public** Notion page's full block tree, then render it to readable text.
No auth needed — these hit Notion's unauthenticated web API, so they only work on
pages shared publicly.

```bash
node fetch-notion.js <page-id-with-dashes> out.json
node render-md.js out.json out.md
```

The page id is the 32-hex string at the end of the Notion URL, with dashes
inserted as 8-4-4-4-12.

Use this when a source Notion doc changes and a page here needs re-syncing.
The HTML in this repo is hand-authored from the rendered output, not generated —
these scripts get you the current source text to diff against.
