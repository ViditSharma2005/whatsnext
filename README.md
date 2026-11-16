# Whats Next...

**Know what's next. Show up ready.**

A minimal coding contest calendar for LeetCode, CodeChef, Codeforces, and GeeksforGeeks. Built for a quick glance, on any screen.

## Features

- Live status, next contest countdown, and a Monday–Sunday calendar
- Platform filters with shareable URLs and local time zone support
- AI-generated quotes with anonymous community voting
- Responsive dark interface and server-side caching
- No accounts required

## Stack

**Next.js · TypeScript · Tailwind CSS · Supabase · Gemini · GitHub Actions**

## Getting started

**Requirements:** Node.js 20+ and npm.

```bash
npm install
```

Create a `.env.local` file in the project root using `.env.example` as a template:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CLIST_USERNAME=
CLIST_API_KEY=
```

Run the app:

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). Without configuration, the app uses built-in quotes, disables voting, and marks GFG data unavailable.

## Configuration

### Supabase

1. Create a Supabase project and run [`supabase/schema.sql`](supabase/schema.sql) in its SQL Editor.
2. Add the project URL and secret key (`sb_secret_...`) to `.env.local` using the variable names above.
3. Restart the development server. The schema adds starter quotes and enables anonymous voting.

### CLIST

Add your CLIST username and API key to `.env.local` for GFG contests. GFG data is sourced from [CLIST](https://clist.by/); its coverage and availability may vary.

### Daily quotes

Add these **GitHub Actions repository secrets**:

| Secret | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Generates a daily batch of quotes |
| `SUPABASE_URL` | Connects the job to the database |
| `SUPABASE_SERVICE_ROLE_KEY` | Saves quotes securely |

In GitHub, open **Actions → Generate daily quotes → Run workflow** to test it. The workflow runs daily at **00:30 UTC / 6:00 AM IST**. If generation fails, existing quotes remain available.

### Deploy

Import the repository into Vercel. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CLIST_USERNAME`, and `CLIST_API_KEY` as Vercel environment variables, then deploy. The Gemini key belongs in GitHub Actions, not the website.

## Data & privacy

Contest data comes from the official Codeforces API, CompeteAPI, and CLIST. It is cached server-side for 30 minutes; availability and completeness depend on the upstream sources. Supabase stores the last successful snapshot when configured.

Votes use an anonymous browser identifier—no user accounts. Rate limiting discourages repeat voting but cannot prevent all manipulation. Keep secret keys server-side; never commit `.env.local` or expose secrets in client code.

## Cost

The project can start on free tiers. Keep the Gemini project on its free tier without paid billing, and check each provider's current limits and terms. Free tiers are not a guarantee of unlimited traffic or availability; Vercel Hobby is for eligible personal, non-commercial use.

---

<p align="center">by backspaces</p>
