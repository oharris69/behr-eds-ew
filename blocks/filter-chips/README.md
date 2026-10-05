# filter-chips

Custom **filter-chips** block. Purpose: audience-filter.

## Authoring (Document Authoring)

Model: `standalone`

Single block table. Content: Row 1 (optional): [label <p>, e.g. "Featured Content:"]. Rows 2..n: [chip label, optionally <a href="?featured=slug">] | [optional <ul> of post links shown by this chip; no list = All]. Filters the next cards-post (pro) block after it by matching card post links (pathname, ignoring origin and trailing slash) against the chip list; reads/updates ?featured=slug with history.replaceState.

## Supported variations

No variations.

## Universal Editor fields

N/A (Document Authoring project)
