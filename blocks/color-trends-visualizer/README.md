# color-trends-visualizer

Custom **color-trends-visualizer** block. Purpose: interactive-room-paint-visualizer.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: one row, one cell of content.

## Content model (4 columns)

| Row | Cell 1 | Cell 2 | Cell 3 | Cell 4 |
| --- | --- | --- | --- | --- |
| Heading | h2 | | | |
| Intro | intro text | | | |
| Instruction | instruction text (shown under the room photo) | | | |
| One per room | `:bedroom:` icon + room name | base room photo | list: each item = surface name paragraph + alpha-mask picture (PNG) | shading/gel picture (transparent PNG) |
| Colors | list of color links `CODE|Name|HEX` (palette chips) | list with one color link (the default color) | | |

Rooms are detected by shape (a picture in cell 2). Surfaces without a mask picture are skipped. Every surface starts painted in the default color. Room icons: `bedroom`, `living-room`, `lobby` (in `/icons`). Masks and overlays must be the same size as the base photo and keep their transparency (PNG).

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
