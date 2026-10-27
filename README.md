# Ephworks — Community opportunities prototype (recreated source)

> **Free for everyone, always.** Job seekers never pay to browse, apply or get support, and employers never pay to post. Any post asking candidates for money is blocked.

This is a **reconstruction** of the October 2026 Ephworks #HACK prototype based on the published app's visible content and recorded requirements. **It is not an export of the original project's editable source**, which was not available in the conversation.

## What is included

- React 18 + Vite frontend, with all editable source in `src/`
- Responsive dark-navy / mint desktop navigation and mobile bottom navigation with a **More** sheet
- Job seeker, employer and moderator demo previews
- Five fictional sample UAE opportunities with search and filters
- **Post a Job** end to end with sample data: employer posts, church vouch, moderator HR check, then the post appears on the noticeboard for 30 days
- **I'm interested** on every role, saved to your account when signed in. Employers only see a count on their post, never who is interested (passing candidate details on could count as recruitment). Save and "mark as applied" stay in your browser
- **Scam checks**: fee, deposit and payment-transfer terms are blocked outright; WhatsApp-only contact, guaranteed jobs or visas, "no interview", passport requests, pressure language and personal email addresses are flagged for the moderator to check with HR
- **Church membership verification for job posters**: a post cannot be published until the poster's partner church has vouched for them (yes/no only)
- Reports and review controls
- **Apply to help**: anyone signed in can apply to be a volunteer mentor or church admin; admins approve or decline. Moderators are invite-only (assigned on the People page)
- **People dashboard** for admins: every account with name, email, role, church and post count; change roles or suspend an account
- Career support, volunteering, church partners and privacy pages
- A demo-reset option, visible safeguards and accessibility-minded controls

## Quick start

Install [Node.js 20+](https://nodejs.org/), then open a terminal in this folder:

```bash
npm install
npm run dev
```

Visit the local address printed in the terminal (usually `http://localhost:5173`). To prepare a production build for **private testing only**:

```bash
npm run build
npm run preview
```

The `dist/` folder contains the compiled static website after building. To edit text, job data or interactions, modify `src/App.jsx` and `src/data.js`; design tokens and responsive styles are in `src/styles.css`.

## Backend (Supabase, optional)

Without env vars the app runs as the local-only demo. With them, jobs, employer posts, moderation and safety reports use Supabase; saved/tracked roles stay in the browser.

1. Create a Supabase project, then run every file in `supabase/migrations/` in the SQL editor, oldest first (`20261026…` to `20261030…`). `20261028…` adds partner churches (three fictional *sample* churches; replace them before launch) and poster vouching; `20261029…` adds admin roles, role applications and suspension; `20261030…` adds I'm interested.
2. Copy `.env.example` to `.env.local` and fill in the project URL and anon key.
3. Under Authentication → URL Configuration, add your dev and production URLs as redirect URLs (email sign-in links).
4. Optional Google sign-in (sends no email, and shows the account photo): create an OAuth client in Google Cloud with redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`, then enable Google under Authentication → Providers. The "Continue with Google" button appears automatically once the provider is on.
5. Sign in to the app once, then make yourself the **super admin** in the SQL editor. This is the only role set by SQL, and there can only be one:
   `update public.profiles set role = 'super_admin' where id = (select id from auth.users where email = 'you@example.com');`
6. Everyone else gets a role through the app. Volunteers and church admins apply on the **Apply to help** page, and an admin approves them under **Role applications**. Moderators are invite-only: an admin assigns the role on the **People** page. Only the super admin can appoint or remove admins. Nobody can change their own role, and the super admin can only be changed in the SQL editor.

Rules enforced in the database, not the browser: members can only submit `pending` posts, fee/deposit/visa-charge/payment-transfer terms are rejected, only moderators publish (with a required HR verification note), a post is only published once its poster is vouched for by their church, only that church's admin can vouch (never for themselves), published posts expire after 30 days, any employer edit sends a post back to the queue, roles only change through the admin functions (with the limits above), and suspended accounts cannot post, vouch, report, review or apply, and their posts are hidden, and interest can only be marked on live posts, with posters seeing a count but never names. `npm run test:db` checks these against in-memory Postgres.

### Publishing workflow

1. **Employer** (Post opportunity page) asks their partner church for a vouch, then writes the post. Blocked scam terms stop the form; softer warning signs are shown to the poster and the moderator.
2. **Church Partner Admin** (Member vouch queue) vouches for or declines the poster. Only a yes/no is stored.
3. **Moderator** (Verification queue) sees the vouch status and scam checks on each post. "Confirm HR" stays disabled until the poster is vouched and no blocked terms remain; every warning flag has to be ticked as checked with HR, and a verification note is required.
4. The post goes live on the noticeboard for 30 days. Seekers can tap **I'm interested** and apply directly to the employer.

Without Supabase the same flow runs on sample data in your browser: switch between the Employer, Church Partner Admin, Moderator and Admin demo views. In the Admin view the demo persona is the super admin.

## Important differences from the original

- The original uploaded Ephworks logo asset was **not available for export**, so `public/logo.svg` is a clearly labeled *placeholder*. Replace it with your supplied logo, keeping the same filename or updating the file path in `src/App.jsx`.
- This code is a functional standalone recreation of the described experience, **not** a byte-identical download of the live ChatGPT site.
- Without Supabase configured it has **no backend or authentication**; all local actions remain in `window.localStorage` and can be reset.
- The original site remains a separate published preview; editing this ZIP does not change it.

## Safety / compliance

**PROTOTYPE ONLY.** Every name, vacancy, salary, partner and user is fictional. No real job applications, employer screening, placement, payments, live publishing or private-message functions are available. Do not use this version with real people, companies or live vacancies. Qualified UAE legal, labour-law and privacy review is required before any live launch.

The product concept is a free community noticeboard, not a recruitment service. Job posts should never make religion an employment criterion; no job seeker fees, premium placements or worker charges are supported.

## Project files

```text
ephworks-source/
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── logo.svg               # replace with approved uploaded logo
└── src/
    ├── main.jsx
    ├── App.jsx                # all pages and interactions
    ├── data.js                # sample content and navigation
    └── styles.css            # styles + mobile navigation
```

## Live reference

Published original preview: https://ephworks-community-prototype.chidixr.chatgpt.site
