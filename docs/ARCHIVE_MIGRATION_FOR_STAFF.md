# Bringing the old site's archive into the new one — staff summary

*Plain-language version. For the full technical plan, see
`docs/ARCHIVE_MIGRATION.md`. Nothing described here has happened yet — this
is a proposal to review before we run it.*

## What we're doing

We have a full export of the old Squarespace site — every article, every
byline, every section tag, going back years. We want to bring that archive
into the new site so it isn't lost, in two steps:

1. **Bring in the writers.** Anyone who wrote for The Caravel and isn't
   already in our new author list gets added as a former staff member
   (marked inactive/alumni — this doesn't affect anyone currently on staff).
2. **Bring in the articles**, attributed to those writers, filed under the
   right section, with the old article tags carried over.

## What stays safe

**Every imported article comes in as a draft. None of it goes live
automatically.** They'll sit in the editing system exactly like an article
someone is still writing — invisible on the public site — until an editor
opens one, checks it over, and hits Publish. We're bringing in roughly
**2,900 articles** this way; nobody is expected to review 2,900 pieces by
hand overnight. The point of doing it as drafts is that it can happen at
whatever pace makes sense — a few at a time, by section, whatever's easiest —
with zero risk of something half-broken appearing on the live site in the
meantime.

## What's *not* included in this first pass

- **About 2,600 old posts have no real byline** — they're attributed to a
  generic "archives" account rather than an actual person, a side effect of
  how the old site handled some historical content. We can't recover who
  actually wrote these, so rather than guess or invent a fake byline, we're
  leaving them out for now. They can be a separate project later if we want
  to try to track down real authorship for any of them.
- **Images aren't coming over in this pass.** The old site's photos are
  hosted on Squarespace's servers, and pulling all of them into our own
  system is a bigger job we'd rather do carefully as a second pass, once
  we've confirmed the article text and formatting all came over cleanly.
  Articles will import without a photo; editors add one before publishing,
  same as with any new article today.

## How articles get filed into sections

The old site organized articles under section names (Africa, Western Europe
& Canada, Opinion, Compass topics, etc.). Most of these map cleanly onto our
current sections of the same or similar name. A few don't have a clean
modern equivalent:

- **We're bringing back three Compass topics that had been retired** — World,
  Gender, and Money (renamed Coin) — because there's a meaningful number of
  old articles that genuinely belong there and nowhere else.
- **A couple of old categories are being merged into the closest current
  one** (for example, "Middle East & Central Asia" — an old combined
  category — is going into today's Southwest Asia & North Africa section,
  since that's the closer fit). Every article affected by one of these
  approximate calls gets a small "Legacy: …" label attached to it, so it's
  easy to pull up the full list later and manually move any that landed in
  the wrong place.
- **A small number of old articles (about 45) don't have a usable section at
  all** in the old data. Those are being set aside on a manual-review list
  rather than imported — someone will need to look at each one and decide
  where it belongs, if anywhere.

## What we'd like from staff before we run this

- A quick look at the section-mapping choices above — does bringing back
  World/Gender/Coin as Compass topics, and folding a couple of old categories
  into today's closest section, sound right?
- Confirmation that "no byline → not imported this round" is the right call,
  versus someone wanting to try to track down authorship for some of those
  ~2,600 pieces first.
- Any objection to former writers who aren't currently in our system being
  added as inactive/alumni author profiles (name only — no bio or photo,
  which any editor can fill in later if wanted).

Once that's settled, we'll do a small test batch first (15–20 articles
covering all the tricky cases above), check it over together in the editing
system, and only then run the rest.
