# Writer submission workflow (Google Form → editorial queue)

**Status: schema is built, automation is NOT.** For v1, editors triage a Google
Sheet by hand. This doc is the plan for wiring it up later.

## The workflow

1. Writer drafts in a **Google Doc**, shares it as *"Anyone with the link can
   comment."*
2. Writer submits a **Google Form**.
3. Response lands in a **Google Sheet** (and, later, auto-creates a `submission`
   document in Sanity).
4. An **editor** (has a Sanity seat) reads the Doc, comments edits, then builds an
   `article` in the Studio and publishes. They set the `submission` status to
   `published` and link it to the new article.

## Build the Google Form now

Create a form titled **"Pitch a story — The Caravel"** with these questions
(order matters if you later use the Apps Script below):

| # | Question | Type | Required |
|---|---|---|---|
| 1 | Your name | Short answer | ✅ |
| 2 | Your email | Short answer (response validation: email) | ✅ |
| 3 | Google Doc link | Short answer (validation: URL) | ✅ |
| 4 | Working title | Short answer | ✅ |
| 5 | Suggested region | Dropdown (the 6 regions + "Not sure") | – |
| 6 | Suggested section / Compass topic | Dropdown (Opinion & Satire, Crow's Nest, Travel, World, Elections, Gender, Coin, Futures, Planet, "Not sure") | – |
| 7 | Pitch / summary | Paragraph | ✅ |
| 8 | Anything else for the editors | Paragraph | – |

- Turn on **"Collect email addresses"** off (question 2 is the source of truth) —
  or on, your call.
- Responses → **Link to Sheets**.
- Put the form's share URL into `web/src/lib/site.js` → `SITE.submissionFormUrl`
  (the **Join Our Team** and **Contact** pages link to it).

## Later: sync Sheet → Sanity `submission`

Two options, easiest first.

### Option A — Google Apps Script `onFormSubmit` trigger (recommended)

Extensions → Apps Script on the responses Sheet. Roughly:

```js
const SANITY_PROJECT_ID = '...'
const SANITY_DATASET = 'production'
const SANITY_TOKEN = 'sk...'   // Editor token, stored in Script Properties, NOT inline

function onFormSubmit(e) {
  const [name, email, doc, title, region, section, pitch] = e.values.slice(1)
  const mutation = {
    mutations: [{
      create: {
        _type: 'submission',
        writerName: name,
        writerEmail: email,
        googleDocLink: doc,
        suggestedTitle: title,
        suggestedRegion: region,
        suggestedSection: section,
        pitch: pitch,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      },
    }],
  }
  UrlFetchApp.fetch(
    `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-10-01/data/mutate/${SANITY_DATASET}`,
    {
      method: 'post',
      contentType: 'application/json',
      headers: {Authorization: 'Bearer ' + SANITY_TOKEN},
      payload: JSON.stringify(mutation),
    },
  )
}
```

Add the trigger: Triggers → Add → `onFormSubmit`, event = "On form submit".

- Create the token in <https://www.sanity.io/manage> → API → Tokens, **Editor**
  role. Store it in **Project Settings → Script Properties**, not in the code.
- Column order in `e.values` starts with the timestamp, hence `.slice(1)`.

### Option B — scheduled pull

A small script / GitHub Action reads the Sheet via the Sheets API on a cron and
upserts `submission` docs keyed by row. More moving parts; only worth it if Apps
Script is blocked by Workspace admin policy.

## What editors do in the Studio

Sidebar → **Editorial queue → Pending**. For each:

1. Open the Doc, comment edits, move status to `in-review`.
2. When ready: **New Article**, paste/format the content, set Primary section +
   authors + Status = Published.
3. Back on the submission: status → `published`, set **Published as** →
   the new article.
