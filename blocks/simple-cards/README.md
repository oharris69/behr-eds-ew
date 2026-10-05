# simple-cards

Custom **cards** block. Purpose: tool-links-carousel.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

## Content model

| Simple Cards | |
| --- | --- |
| h2 + paragraph intro (single cell) | |
| black | h3, paragraph, link |
| slate-teal | h3, paragraph, link |
| green | h3, paragraph, link |

- Color tokens map to `--palette-black`, `--palette-slate-teal`, `--palette-green` in
  `styles/brand.css`; unknown or missing tokens fall back to black.
- The link makes the whole card clickable. Carousel behaviour (prev/next, "01/03" counter,
  arrow keys) is shared via `scripts/carousel.js`.
