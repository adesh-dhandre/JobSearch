# India Job Radar — free search API edition

All-India Java Developer, AI Developer/Engineer and Client/Application/Production Support listings for early-career engineers. Daily searches start at 9 PM IST; the website updates and a digest is posted to your Discord channel after processing completes.

Support listings advertising an annual minimum of **₹8 LPA or more** get highest priority. Lower salaries, ranges that cross ₹8 LPA and undisclosed salaries remain included. Java and AI have no salary minimum. Experience targets are 1–2 or 1–3 years; requirements of 3+ minimum years are filtered when detected. Unspecified experience remains clearly labelled.

## Step 1: Get your free SerpApi key

1. Open https://serpapi.com/users/sign_up and create your own account.
2. Choose the **Free** plan. The published allowance is 250 searches per month (checked 3 October 2026).
3. Open https://serpapi.com/manage-api-key and copy the private API key.
4. Keep it private. Do not paste it into chat or commit it to GitHub.

The project makes six Google Jobs searches per complete daily scan: two each for Java, AI and Support. That is 180 in 30 days or 186 in 31 days. It reserves attempts before requests, caches completed queries for safe retries, and stops at 240 attempts per calendar month as a buffer. The provider's billing/reset period can differ from calendar months; check your account usage. Extra searches by other apps sharing your key count against the same plan.

**No OpenAI key, AI subscription, or paid LLM is needed.** SerpApi free-plan usage costs $0 within its quota; this does not promise free Netlify usage. Check your Netlify account credits and plan. Never enable paid upgrades without reviewing them yourself.

## Step 2: Make a Discord webhook

Use Discord desktop/web, with permission to manage a server/channel:

1. Create or select a channel such as `job-alerts`.
2. Open **Edit Channel → Integrations → Webhooks → New Webhook**.
3. Name it `India Job Radar`, select the channel, and choose **Copy Webhook URL**.
4. Keep the URL private; it grants posting access. Save it only as a Netlify environment variable.
5. Invite your friend to the server and give them access to this channel. Both of you should set channel notification settings to **All Messages**. Mobile pushes depend on Discord/device settings; a posted message does not guarantee a push.

The digest does not send automatic @everyone mentions.

## Step 3: Deploy the full project

Use a **new Netlify project** to avoid overwriting an existing site. Dragging just `public/` to Netlify gives you the dashboard but **does not deploy Functions or the schedule**.

Recommended GitHub route (no local npm installation needed):

1. Extract this ZIP. Open its `pune-job-radar` folder; the historical folder name has no effect on the all-India search.
2. Create a new GitHub repository, for example `india-job-radar`.
3. Upload the project contents to the repository root. Include `package.json`, `package-lock.json`, `netlify.toml`, `public/`, `lib/`, `scripts/` and `netlify/`. Never upload `node_modules`, `.env`, or secret values. Ensure folders retain their structure.
4. In Netlify, choose **Add new project → Import an existing project → GitHub**, then select this repository.
5. Build settings are included in `netlify.toml`: build command `npm run build`; publish directory `public`; Functions directory `netlify/functions`; Node 22.
6. Add the three environment variables below, with Functions scope (or all scopes), then deploy. If you add them after a deploy, redeploy.

| Variable | Value |
|---|---|
| `SERPAPI_API_KEY` | Your private SerpApi key |
| `DISCORD_WEBHOOK_URL` | The Discord webhook URL you copied |
| `CRON_SECRET` | A long random string generated locally |

To generate `CRON_SECRET`, run this one command in Terminal:

```bash
openssl rand -hex 32
```

Copy its output directly into Netlify. No OpenAI variables are used; remove old `OPENAI_API_KEY` and `OPENAI_MODEL` values if you deployed version 1.

## Step 4: Test the live automation

1. In Netlify, open **Functions → daily → Run now**.
2. The scheduled dispatcher starts `scan-background`. Wait a few minutes, then refresh the site.
3. Confirm the feed has a new timestamp, lists India roles, and says the digest was delivered.
4. Confirm messages arrived in your Discord channel with working application links.
5. Daily searches will start at **21:00 IST** on production deploys (`30 15 * * *` UTC). No external cron service or running laptop is required.

The existing ChatGPT daily report is separate. It remains enabled and uses its own web search; it does not update this Netlify website or send these Discord messages.

## What the results mean

- This edition retrieves Google Jobs listings through SerpApi, with six fixed India queries and the first page per query. It covers a subset of the market, not all jobs.
- It reads descriptions, highlights, salary text and supplied application links. Keyword matching identifies relevant skills; **skills mentioned are not necessarily mandatory**.
- Experience and annual lakh/LPA salary parsing is best effort. Unrecognized salaries are labelled not parsed; no salary is guessed from an employer, title or market average. Estimated salary figures never earn top priority.
- ₹8–12 LPA earns top support priority. ₹6–10 LPA or “up to ₹10 LPA” earns a lower priority because ₹8 LPA is not a guaranteed minimum. Lower and unknown salaries stay in the feed.
- Apply links come from the provider's `apply_options`. Employer/ATS links are preferred heuristically where identifiable, otherwise a job board link is used. **Availability is not independently verified**: Google Jobs may contain outdated listings, and sites may redirect. Check the destination before applying.
- India locations and named Indian cities are accepted. A remote listing needs India evidence; confirm eligibility on its application page.
- No generated AI/Java listings are seeded. Before the first live scan, the dashboard shows the original Pune support examples, labelled with their checked date of 3 October 2026.
- Up to eight matched jobs per category are shown, with recently unseen job identities labelled NEW.

## Reliability and privacy

Daily reports, per-query cache, monthly attempts and delivery state are stored in Netlify Blobs and persist across deploys. One atomic lock per day avoids duplicate processing. Normal failures release the lock; manually retry via `daily` after fixing the issue. Successful Discord messages are checkpointed, so retries resume remaining messages. A network failure after a message is accepted but before checkpointing can still cause a duplicate; exactly-once delivery is not guaranteed.

The dashboard is public and read-only. API keys and webhook values never go to the browser. Public users cannot trigger paid searches. Server-side calls send generic job queries to SerpApi and job digests to your configured Discord channel. No resume or personal details are sent.

## Troubleshooting

- Setup pending: check all three variables, their Functions scope, and redeploy.
- Authentication/quota error: confirm the SerpApi key and plan usage. Check `scan-background` logs; secret-containing provider URLs are never logged.
- Empty category: there may be no matching first-page results, or parsing may miss a requirement. Review source listings and refine queries in `lib/scan.mjs` if necessary. This is not a claim there are no jobs in India.
- Discord failed: check webhook channel and permissions, then rerun `daily` to finish saved delivery.
- Hard termination: if a scan was killed rather than catching an error, remove that day's `locks/YYYY-MM-DD` entry in Netlify Blobs before retrying.
- The schedule exists only after full production deployment; Netlify's Run now lets you test without waiting.

## Local checks

Requires Node 22+. Netlify installs it automatically for builds. Run `npm install`, `npm test`, `npm run build`. `npm run preview` serves the static dashboard at http://localhost:4173 without calling APIs. The included six tests cover experience parsing, salary priority, role categories, Discord message limits, delivery retries and query budget/cache handling. Live provider and Discord checks require your own credentials after deployment.

## Provider documentation

- https://serpapi.com/pricing
- https://serpapi.com/google-jobs-api
- https://docs.netlify.com/build/functions/scheduled-functions/
- https://docs.netlify.com/build/functions/background-functions/
- https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- https://docs.discord.com/developers/resources/webhook

## Manual scan button (Shinobi edition)

The blue **Scan now** button opens an owner-access dialog. Enter your existing `CRON_SECRET` from Netlify; no additional variable is needed. The code is sent only to this site's authenticated POST endpoint over HTTPS and cleared from the input immediately. It is never saved in browser storage or embedded in source. Do not share it with visitors.

A manual scan starts the same search and Discord workflow as the daily schedule. If today's scan already completed, it reports that instead of consuming another six searches or duplicating the digest. If a scan is running it waits for the same run. Failed scans can be retried. The feed polls for up to five minutes while a scan runs. Deploy the latest commit to enable the button's backend function.

The visual theme uses midnight-blue surfaces, chakra-like glow, orange accents, soft card entrances and hover effects. Reduced-motion preferences disable animations.
