# bento-grid

Custom **bento-grid** block. Purpose: curated-color-showcase.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: Row 1 (one cell): <h3> heading. Rows 2+: [<ul><li><a href="/colors/color-detail/<code>">CODE|Name|HEX</a></li></ul>] | [room picture, optionally with data-title="data-focal:x,y" focal point]. The link href is the Discover target; HEX tints the chip and the block.

Layout: Desktop (1024px+): one row of cards (25:11, 8px gap, 24px radius) as a flex accordion; the hovered / focused card grows (flex 7 -> 11), shows a bottom gradient with a white outline Discover pill and a white Add to project pill, and tints the block background with its color. Below 1024px: cards stack on scroll inside a sticky viewport (4:5 on mobile, 1:1 on tablet, 16px radius), the background blends between card colors; tapping the chip expands it over the card into a panel with Discover, Visualize and Add to project. Text switches to white on dark colors.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
