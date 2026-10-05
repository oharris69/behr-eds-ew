# color-summary

Custom **color-summary** block. Purpose: color-detail-summary.

## Authoring (Document Authoring)

Model: `standalone`

Single block table.

- Row 1: optional eyebrow paragraph + the statement heading.
- Row 2 (optional): "What you'll love" list. Each item is an optional `:icon:` shorthand
  (e.g. `:star:`) followed by the label. A nested list under an item becomes that item's
  info tooltip text, e.g. `:star: Interior One-Coat Hide*` with a nested
  `Guaranteed ONE-COAT HIDE when…` item.

Shared "What you'll love" items and the "Why Behr paint?" copy come from fragments; the
"Color information" values come from page metadata. UI strings (column titles, the
LRV/RGB/HEX tooltip copy) live in the block's `LABELS` constant.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
