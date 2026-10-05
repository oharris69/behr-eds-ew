# gallery

Custom **gallery** block. Purpose: color-in-real-homes-gallery.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: Row 1 (one cell): <h3> heading, optional <p> copy, <p><a>Add to project :icon:</a></p> (the link text is the button label; the link target is ignored, the button saves the page color from the rgbhex / color-code / color-name metadata). Rows 2+: [picture] | [optional caption text, shown as a small label on the photo]. Pictures may carry a data-title="data-focal:x,y" focal point.

Layout: Desktop (1024px+): 12-column grid, intro in columns 1-3 with an inline black Add to project pill, slider in columns 5-12 (3:2 photos, 24px radius) with 56px thumbnails right-aligned below. Below 1024px: intro stacked above the slider (2:3 photos on mobile, 1:1 on tablet, 16px radius; 56px / 122px thumbnails) and a full-width Add to project pill bar below. Swipeable scroll-snap track; the pill saves the page color to My Projects (aria-pressed).

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
