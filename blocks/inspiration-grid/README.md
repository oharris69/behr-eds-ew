# inspiration-grid

Custom **inspiration-grid** block. Purpose: filterable-inspiration-gallery.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)

## Content model

Key/value rows (cards are not authored; they come from the query index):

| Inspiration Grid | |
| --- | --- |
| sticky-title | Inspiration |
| prefilters | comma-separated tag keys, e.g. `project-area/bathroom, project-area/kitchen` (may be empty) |
| source | optional index URL, default `/inspiration/cards/query-index.json` |
| tags | optional tag sheet URL, default `/docs/library/tagging.json` |

- Index rows: `path`, `title`, `image`, `image-alt`, `description`, `headline`, `tags[]`,
  `priority`, `lastModified`, `color[]` (`CODE|Name|HEX`), `colorPlacement[]`.
- Sorted by `priority` (ascending, empty last) then `lastModified` (newest first); 12 cards per page
  with a "Load more" button.
- Prefilters are applied up front and their namespaces are not offered again in the tray.
- Filter tray: one chip group per tag namespace (project-area, style, mood, color, then others),
  labels from the tag sheet (`key` -> `value`, group label = row whose key is the namespace).
  OR within a group, AND across groups. Changes apply with "View N results"; Escape / close discards.
- Empty states: "No results match your current filters" and a graceful message when the index
  cannot be loaded.
