# Nav bar — 3 layout options

Pick one (or mix). The current build ships **Option 1**. All three use the same
data (`web/src/lib/nav.ts`): About / Regions / Sections / Compass groups + Latest
+ Search.

---

## Option 1 — Single dark bar, dropdowns *(currently built)*

```
┌───────────────────────────────────────────────────────────────────────┐
│              Wednesday, September 2, 2026    The Caravel    Subscribe   │   ← masthead
│                     Georgetown's international affairs paper            │
├───────────────────────────────────────────────────────────────────────┤
│ LATEST   ABOUT ▾   REGIONS ▾   SECTIONS ▾   COMPASS ▾          🔍 SEARCH│   ← sticky nav
└───────────────────────────────────────────────────────────────────────┘
        hover/click ▾ opens a panel:  REGIONS ▾
                                      ┌──────────────────────────┐
                                      │ Regions overview         │
                                      │ Africa                   │
                                      │ Eastern Europe & C. Asia │
                                      │ …                        │
                                      └──────────────────────────┘
```

- **Pros:** compact, familiar, one row, sticks to top on scroll.
- **Cons:** four dropdowns is a lot of hover targets; Compass doesn't get visual
  distinction.

---

## Option 2 — Two tiers: regions always visible, utility above

```
┌───────────────────────────────────────────────────────────────────────┐
│ The Caravel                                    About  Staff  Join  🔍   │   ← thin utility strip
├═══════════════════════════════════════════════════════════════════════┤
│  AFRICA   E. EUROPE & C. ASIA   INDO-PACIFIC   LATIN AMERICA   SWANA   │   ← regions, always shown
│  W. EUROPE & CANADA        │   SECTIONS ▾   COMPASS ▾   LATEST         │
└───────────────────────────────────────────────────────────────────────┘
```

- **Pros:** regions are one click from anywhere (they're the core taxonomy);
  reads like a foreign-desk paper. About/Staff/Join demoted to a quiet strip.
- **Cons:** six region labels + two dropdowns is wide — wraps on tablet; needs a
  clean mobile collapse.

---

## Option 3 — Left drawer + minimal top bar

```
┌───────────────────────────────────────────────────────────────────────┐
│ ☰   The Caravel                              Latest   Compass    🔍     │
└───────────────────────────────────────────────────────────────────────┘
  ☰ opens a full-height drawer:
  ┌───────────────────────┐
  │ REGIONS               │
  │   Africa              │
  │   Eastern Europe …    │
  │ SECTIONS              │
  │   Opinion & Satire …  │
  │ COMPASS               │
  │   World, Elections …  │
  │ ABOUT                 │
  │   Our History, Staff… │
  └───────────────────────┘
```

- **Pros:** top bar stays clean and editorial; the full taxonomy lives in one
  scannable panel; same UX on mobile and desktop; scales if sections grow.
- **Cons:** one extra click to everything; less "newspaper", more "magazine/app".

---

### My recommendation

**Option 2.** The Caravel's identity is its regional desks — putting all six in
the persistent nav makes the structure legible immediately and pushes the
institutional pages (About/Staff/Join) where they belong. Keep Option 1's
sticky behavior and the Compass dropdown styled in the navy accent so the
sub-brand reads as distinct.

Tell me which to build (or adjustments) and I'll implement it.
