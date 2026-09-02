# Seed data

`taxonomy.ndjson` contains the 6 regions, 3 editorial sections, and 6 Compass
verticals from the current site. Import it once, right after creating the Sanity
project, so editors don't have to type them in:

```bash
cd studio
npx sanity dataset import seed/taxonomy.ndjson production
```

Re-running is safe — documents have stable `_id`s, so import with
`--replace` to update them:

```bash
npx sanity dataset import seed/taxonomy.ndjson production --replace
```

Articles, authors, and submissions are created in the Studio, not seeded.
