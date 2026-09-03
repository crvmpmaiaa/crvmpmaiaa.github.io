# Build Different: design plan

Subject: a small web and software studio that sells permanence. Audience: founders and owners who have been
burned by templated sites and are paying for a point of view. The page's single job: make the visitor feel
the difference between rendered and carved, then ask them to start a project.

## Tokens

Colour (marble greys sampled from the baked statue albedo, sky the only saturated colour, ink carries the sky's hue):

| name | hex | role |
|---|---|---|
| quarry | #0b0b0c | canvas fallback, video hand off, footer |
| marble | #dedcd8 | section grounds below the hero |
| vein | #474748 | rules, secondary text |
| vein light | #999b9e | captions, disabled |
| ink | #14202e | body text and headlines over the sky, a slate that belongs to the sky rather than pure black |
| sky top | #2a63c4 | the one saturated colour, top of the gradient |
| sky horizon | #dbe9f6 | horizon, and the hero's ground where copy sits |

Type:

- Display: Cormorant Garamond, regular, set large and tight. Real stroke contrast, the closest a web face gets to
  incised roman without going to Trajan caps. Used only for the hero copy and section headings.
- Body: Hanken Grotesk. A neutral grotesque with slightly more warmth and width than Inter, so body copy reads
  as ours rather than as every other product page.
- Utility: none. Captions and the scroll hint use the body face one step down.

Scale: 1.25 ratio from 1rem, seven steps, headline clamps to viewport width. Measure 34ch on the hero, 60ch below.

## Layout

```
+------------------------------------------------------------------+
|  sky, clouds on a wall clock                                     |
|                                        [statue, right of centre]  |
|  copy column (34ch, left)                                         |
|  headline / block 1 / block 2 (right) / block 3                   |
|                                        [column + laptop]          |
|                         [screen fills viewport]  -> video, CTA    |
+------------------------------------------------------------------+
|  marble ground                                                    |
|  Work        plain list, one line per project, what changed       |
|  Approach    three sentences from the hero, then three commitments|
|  Contact     one address                                          |
+------------------------------------------------------------------+
```

The hero owns all the motion and all the boldness. Everything below is set in two columns at most, no cards,
no numbered markers (nothing below is a sequence), no eyebrows.

## Signature

The vaporise and rebuild: a marble figure torn into a GPU point cloud and reassembled as a column with a
laptop on it, then the camera going through the screen. Nothing else on the page competes with it.

## Critique against the defaults

- Cream ground with terracotta: not used. The ground is a blue sky because the client asked for it, and the
  marble grey below is sampled from the asset, not picked from a palette.
- Black with an acid accent: not used. The darkest surface is the video hand off.
- Broadsheet hairlines and dense columns: not used. Sections are one column of prose with a single rule between.
- Inter as body: replaced with Hanken Grotesk. Cormorant Garamond stays because the brief asks for stroke
  contrast that reads as inscription, and the risk is spent on the hero, not on a novelty display face.
- Ink was pure neutral; now a slate pulled toward the sky so the text and the world share a temperature.

## Notes to future passes

- The marble reads flat and white under the current key light. Look-dev owed: lower exposure, stronger AO
  contribution, warmer key, cooler fill from the sky.
- Clouds are noise cumulus; they pass at page scale but a second, sharper layer near the horizon would sell depth.
