# Design direction — for your feedback before deep styling

The current build is a **restrained baseline**, not a finished visual system. It's
deliberately plain so it's cheap to redirect. Before I invest in styling, I need
your call on the questions below.

## What's in place now

- **Type:** Spectral (serif, via Google Fonts) for display + body; system sans
  for UI/nav/bylines. Modular scale ~1.25.
- **Palette:** warm paper `#fbfaf7`, near-black ink, nautical navy accent
  `#0b2b4e`, signal red `#8a1c1c` for kickers/labels.
- **Structure:** centered masthead wordmark, double-rule under the header,
  section headings as sans caps with a heavy underline, hairline rules between
  stories. Article pages use a centered headline block + full-width hero.

All tokens live in `web/src/styles/tokens.css` — palette and type are one file to
change.

## Decisions I need from you

### 1. Typographic personality

| Direction | Feels like | Display face candidates |
|---|---|---|
| **A. Traditional broadsheet** | The Crimson, NYT | Spectral / Source Serif 4 / a Times-like |
| **B. Modern editorial** | The Georgetown Voice, The Atlantic | Canela / Tiempos / GT Super (licensed) or Fraunces (free) |
| **C. Wire-service utilitarian** | Reuters, AP | Mostly sans — Inter / Söhne — serif only for long reads |

Current build ≈ **A** with Spectral. Which direction?

### 2. Masthead / wordmark

- Set "The Caravel" in the display face (now), or **commission a custom
  logotype / get the existing Squarespace logo** as SVG?
- Keep the tagline + dateline under the wordmark, or strip to just the wordmark?
- Any nautical mark (caravel ship, compass rose) beside the wordmark? The favicon
  is a placeholder compass star.

### 3. Color

- Is navy + red right, or does the paper have established brand colors from
  Squarespace I should match?
- How much color on the page — accent only (current), or colored section labels
  per desk (e.g. each region gets a hue)?

### 4. Homepage density

Current homepage: 1 hero + 3 secondary + 8-item latest grid + 4 region rows +
Compass band + map. Is that about right, denser (more headlines above the fold,
Reuters-style), or airier (fewer, larger stories)?

### 5. Fonts hosting

Google Fonts now (one request). For production I'd **self-host** the chosen faces
in `web/public/fonts/` (privacy, speed, no FOUT). Confirm the faces first.

## Reference sites you mentioned

- The Georgetown Voice — modern, lots of white space, big photos
- The Harvard Crimson — dense, traditional, strong section hierarchy
- Reuters / AP — utilitarian, headline-forward, minimal ornament

Send notes inline on this file or just reply, and I'll do a styling pass.
