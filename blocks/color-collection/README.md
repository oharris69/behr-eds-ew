# color-collection

Custom **color-collection** block. Purpose: color-palette-swatches.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

## Content model

| Row | Content |
| --- | --- |
| 1 | Heading (h2) |
| 2 | Bulleted list of color links. Link text: `CODE|Name|HEX`, e.g. `T27-01|Grounded|565344`, linking to `/colors/color-detail/t27-01` |

Links that are not in `CODE|Name|HEX` form render as plain text links. To make the section an anchor target (`#trends`), add section metadata `id | trends`.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
