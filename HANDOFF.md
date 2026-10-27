# Handoff – Read Aloud (Oct 27, 2026)

## Latest (v14): item-tile text fit
- Long labels on Signs (and other `.items` grids) no longer clip: `fitItemTiles()` scales
  the label font down until `scrollWidth` fits the tile; CSS centers text and clips overflow.
  Covered: Signs, Menu, Forms, Level 2 words, Word Bank. Screenshot: `screenshots/29-signs-tiles-fit.png`.
- Test: `tools/tile-fit-test.mjs`. Cache **`read-aloud-v14-`** (same audio as v13).

## Still true (v13 / v12)
- Mic-check: say-it checks speech; 👍 Continue anyway after 2 soft fails; recent result scored.
- Adult tone + lesson WebPs. Human letter sounds — leave alone.

Live: https://jeffsievertson.github.io/reading-app/

## Next
Whitney’s longer write-up. On phone: open twice for v14; confirm RESTROOM/CLOSED/DANGER fully visible on Signs.
