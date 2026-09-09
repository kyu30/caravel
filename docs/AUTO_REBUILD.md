# Auto-rebuild on publish

The site is static — a published article doesn't appear until Vercel rebuilds.
This wires **Sanity publish → Vercel rebuild** so editors don't wait on a manual
deploy.

Flow: editor hits Publish in the Studio → Sanity fires a webhook → Vercel's
Deploy Hook triggers a production build → new edition live in ~1–2 min.

---

## 1. Create the Vercel Deploy Hook

Vercel → project **caravel** → **Settings → Git → Deploy Hooks**.

- **Hook Name:** `sanity-publish`
- **Git Branch Name:** `main`
- **Create Hook** → copy the URL. It looks like:
  `https://api.vercel.com/v1/integrations/deploy/prj_XXXX/YYYY`

That URL is a trigger token — anyone with it can start a build (not read code, not
change env). Treat it as low-sensitivity but don't post it publicly.

## 2. Create the Sanity webhook

<https://www.sanity.io/manage> → project **The Caravel** → **API → Webhooks →
Create webhook**.

| Field | Value |
|---|---|
| **Name** | `vercel-rebuild` |
| **URL** | *(the Deploy Hook URL from step 1)* |
| **Dataset** | `production` |
| **Trigger on** | ✅ Create ✅ Update ✅ Delete |
| **Filter** | `_type in ["article","author","region","section"] && !(_id in path("drafts.**"))` |
| **Projection** | `{_id, _type}` |
| **HTTP method** | `POST` |
| **HTTP headers** | *(none)* |
| **API version** | `v2024-10-01` |
| **Include drafts** | ❌ off |
| **Secret** | *(leave blank — Vercel Deploy Hooks don't verify signatures)* |

**Why this filter:** rebuild only when a *published* (non-draft) document of a
type the site actually renders changes. Editing a draft, or touching a
`submission`, does nothing. Deleting a published doc still rebuilds so the page
comes down.

Save.

## 3. Test

1. In the Studio, open a published article, make a trivial edit (e.g. the
   excerpt), **Publish**.
2. Sanity → API → Webhooks → `vercel-rebuild` → **Delivery attempts**: expect
   `200`.
3. Vercel → project → **Deployments**: a new one should be building, source
   "Deploy Hook".
4. ~90s later the change is on `thecaravelgu.vercel.app`.

## Notes / tuning

- **Debounce:** rapid successive publishes each queue a build. Vercel cancels
  superseded queued builds automatically, so this is usually fine. If it gets
  noisy, add a delay in the Sanity webhook (**Advanced → "Draft delay"** /
  throttle) or move to a scheduled rebuild.
- **Preview builds:** this only triggers `main` → production. PR previews still
  build from Git pushes as normal.
- **Free tier:** Vercel Hobby allows plenty of deploys/day for a newspaper's
  publish cadence. Watch the monthly build-minutes limit if publishing spikes.
- **Turning it off:** disable the webhook in Sanity, or delete the Vercel hook.
