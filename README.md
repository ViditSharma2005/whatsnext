# Whats Next ?

A mobile-first Next.js contest calendar. No accounts. Shows the next contest, live/today status, this week, and one motivational quote with anonymous community votes.

## Run locally

Requirements: Node.js 20 or later and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without credentials, the site still shows available contest data and built-in quotes. Voting is disabled and GFG is marked unavailable until their integrations are configured. Don't commit `.env.local` or share secret keys.

## Staying on free plans

This project is designed to start at ₹0, but free plans have usage limits and can change. Choose the free Supabase plan, Vercel Hobby for eligible personal non-commercial use, GitHub Free, and a Google AI Studio project on the Gemini Free tier **without paid billing linked**. Don't add paid add-ons or enable a paid plan unless you choose to. Verify the provider dashboard and terms before enabling anything: the code cannot enforce or inspect billing status. Vercel may stop serving features after quota limits; Supabase can pause inactive free projects. Standard GitHub Actions runners are free in public repos; private repositories have a monthly free allowance. CLIST describes a free API for personal/educational/community projects and requires caching and attribution; limits and access terms may change. A purchased custom domain would cost extra; a Vercel subdomain avoids that cost.

A busy or abused site can exceed free quotas. There is no guarantee of indefinite free access, unlimited traffic, or availability. Check usage dashboards and never link paid billing if ₹0 is mandatory. Sources: https://vercel.com/docs/plans/hobby, https://supabase.com/pricing, https://ai.google.dev/gemini-api/docs/pricing, https://ai.google.dev/gemini-api/docs/rate-limits, https://clist.by/terms/.

## 1. Set up the database (Supabase)

1. Create a Supabase account and a project at https://supabase.com/.
2. In the project dashboard, open **SQL Editor**, create a new query, paste the entire contents of `supabase/schema.sql` and run it. This creates the tables, starter quotes, and the atomic voting function. RLS is enabled and public roles cannot access the tables or the voting function directly.
3. From the project's Connect dialog and Settings → API Keys, copy the **project URL** and a **secret key** (`sb_secret_...`). The environment variable is named `SUPABASE_SERVICE_ROLE_KEY`, but it accepts a new secret key or a legacy service-role JWT. Either bypasses RLS and must never be put in browser code or shared publicly.
4. Add these to `.env.local`:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret
```

5. Restart `npm run dev`. If the database is reachable, the starter quotes have live vote counts and arrows are enabled. Try voting, opening the site in another browser, and checking the count. Votes are stored against an anonymous random browser cookie, not an account.

For Vercel, add the same variables in **Project → Settings → Environment Variables**, choosing the intended environments, then redeploy. Never prefix the service key with `NEXT_PUBLIC_`.

**Security/limitations:** The vote endpoint checks the request origin, uses an HTTP-only SameSite cookie, hashes the random token before storing it, validates input, and applies a database-backed per-token rate limit. A transaction locks rows and updates counts atomically. Anyone can clear cookies or make requests with new identifiers, so this is a deterrent, not strong anti-abuse protection. For significant traffic or abuse, add a managed IP-based rate limiter/WAF and monitor usage. No account or personal profile is created. There is no automated deletion policy for old anonymous vote records yet. Service-role secrets must only run in trusted server/workflow environments.

## 2. Optional: enable GFG through CLIST

1. Register or log in at https://clist.by/ and obtain your API key from its settings.
2. Add `CLIST_USERNAME` and `CLIST_API_KEY` to `.env.local` or Vercel environment variables. Keep the key server-side.
3. Restart locally or redeploy. The app requests GFG events server-side, including recently ended and upcoming events, and caches the results. The footer attributes GFG data to CLIST as required by its terms. CLIST's coverage, authentication, quotas, and response format must be checked with your account; this integration could not be live-tested without credentials. An empty successful response means no events were returned, not proof that GFG has no contests. GFG's weekly contest has previously been paused, so the app doesn't manufacture a weekly schedule.

## 3. Generate fresh quotes every day

This job runs in GitHub Actions, not on your laptop. It makes one Gemini API request per run and writes the batch directly to Supabase. Your website never exposes the AI or database secret. The app continues to use existing or built-in quotes when the job fails or the free quota is exhausted.

1. Put this project in a **GitHub repository**. Push the `.github/workflows/generate-quotes.yml` file along with the rest of the code.
2. Open https://aistudio.google.com/ and create a Gemini API key in a dedicated Google project. Confirm that this project uses the **Free** tier and that no paid billing account is linked. The script uses `gemini-3.1-flash-lite`, listed with free text input/output at https://ai.google.dev/gemini-api/docs/pricing. Availability and quotas can vary or change, so confirm in AI Studio. Google may use free-tier prompts and responses to improve its products; never send personal information. Do not paste your key into chat or source files.
3. In GitHub, go to the repository's **Settings → Secrets and variables → Actions → New repository secret**. Add these three secrets individually:
   - `GEMINI_API_KEY`: your Gemini API key
   - `SUPABASE_URL`: your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: the Supabase service-role secret
4. Go to the repository's **Actions** tab, open **Generate daily quotes**, select **Run workflow**, and run it. Open the run logs to confirm it completed. Do not paste keys into logs, issues, chats, or source files.
5. Wait up to roughly a minute for the app's quote cache to refresh, then reload the site. Each visitor is randomly shown one of the most recent 100 quotes; this does not guarantee a unique quote per visit.
6. The scheduled workflow runs daily at 00:30 UTC (6:00 AM IST). GitHub schedules can be delayed and can be disabled after repository inactivity; check GitHub's current documentation and quotas. You can also trigger it manually. A failed generation leaves the existing quotes intact.

The generation script validates shape and length, but prompts are not a guarantee of safe output. Review generated quotes or add a moderation step before using this in a public production service.

## 4. Deploy to Vercel

1. Import the GitHub repository into Vercel as a Next.js project.
2. Add the Supabase and optional CLIST environment variables in the Vercel project's settings. Do not put the Gemini key in the web app; the workflow uses its GitHub secret.
3. Deploy. Test the site on a phone and desktop, try the platform filters and a vote, and check the Actions run.

## Data and freshness

- The aggregate API is used for LeetCode and CodeChef, with Codeforces' official API preferred and the aggregate feed as a fallback. LeetCode's known 90-hour bug for standard weekly/biweekly contests is corrected to 90 minutes; other questionable values aren't blindly modified. The aggregate feed does not reliably report individual platform completeness, and upcoming-only feeds can miss contests that were already running before the first fetch.
- GFG comes from CLIST only when configured. No mock GFG contests are shown.
- Contest data is cached for 30 minutes on the server, and open pages check for refreshed data every 5 minutes. The last successful snapshot is stored in Supabase if configured; otherwise it is only an in-memory, per-instance best effort. Recently started contests already seen are retained for the current week. With partial provider failures, saved contests for failed providers can be displayed with an unavailable notice. No database can reconstruct contest history that was never fetched.
- The clock runs on the browser in the visitor's local timezone, updates once per second and groups days Monday–Sunday. No contest is shown as next up once it starts.
- Quotes are cached for about 60 seconds, and open pages check vote counts periodically. After a vote, your browser immediately shows the returned count; other visitors may see a short delay.
- `Try again` retries when all contest sources have failed. No absolute uptime, quota, unique quote, perfect abuse protection, or throughput guarantee is implied.

## Main files

- `components/Board.tsx` – responsive interface, clock, filter and voting controls
- `lib/contests.ts` – server-side contest fetch, normalization and caching
- `lib/quotes.ts` – quotes and fallback
- `app/api/vote/route.ts` – anonymous server-side voting endpoint
- `supabase/schema.sql` – tables, permissions and atomic vote function
- `scripts/generate-quotes.mjs` – AI generation job
- `.github/workflows/generate-quotes.yml` – daily schedule
