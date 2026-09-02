# Deploy

## 1. GitHub repo

```bash
cd /Users/keith/Downloads/projects/caravel
git init
git add -A
git commit -m "Scaffold Caravel: Astro site + Sanity Studio"

# create + push (pick org/name — this uses the gh CLI, already authed as kyu30)
gh repo create the-caravel --private --source . --remote origin --push
```

Use a `Georgetown-Caravel` org instead of a personal repo if you want shared
ownership — `gh repo create Georgetown-Caravel/the-caravel ...`.

## 2. Vercel (the site)

1. <https://vercel.com/new> → import the GitHub repo.
2. **Root Directory: `web`** ← important, it's a monorepo.
3. Framework preset: **Astro** (auto-detected). Build/output settings come from
   `web/vercel.json`.
4. Environment variables:
   | Name | Value |
   |---|---|
   | `PUBLIC_SANITY_PROJECT_ID` | your project ID |
   | `PUBLIC_SANITY_DATASET` | `production` |
   | `SANITY_API_READ_TOKEN` | (optional) |
5. Deploy. Production branch = `main`; every push to `main` redeploys, every PR
   gets a preview URL.
6. Add the `*.vercel.app` URLs (and later the custom domain) to Sanity **CORS
   origins** (see SETUP.md step 4).

### Rebuild when editors publish

A static build won't show new articles until it rebuilds. Add a **Deploy Hook**
(Vercel → Settings → Git → Deploy Hooks), then in Sanity → API → **Webhooks**,
POST to that URL on document publish. (Set up after launch; not required for v1.)

## 3. Custom domain

Vercel → Project → **Domains** → add `thecaravelgu.com` and `www.thecaravelgu.com`.
Update DNS at the registrar to the records Vercel shows. Then update `SITE.url` in
`web/src/lib/site.js` if the final host differs.

## 4. Sanity Studio

Hosted separately from the site, free, at `<host>.sanity.studio`:

```bash
# set studioHost in studio/sanity.cli.ts first (e.g. 'caravel'), then:
npm run studio:deploy
```

Add `https://caravel.sanity.studio` to CORS origins **with credentials**.

Editors log in at that URL with Google/GitHub/email — invite them in
<https://www.sanity.io/manage> → Members.

## Checklist

- [ ] Repo pushed, CI green
- [ ] Vercel project, Root Directory = `web`, env vars set
- [ ] Sanity CORS: localhost + vercel URLs + studio URL
- [ ] `studioHost` set, Studio deployed
- [ ] Editors invited to the Sanity project
- [ ] Custom domain + DNS
- [ ] `SITE.url` matches production host
- [ ] (post-launch) deploy hook + Sanity publish webhook
