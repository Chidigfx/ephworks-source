# Ephworks — Community opportunities prototype (recreated source)

> **Free for everyone, always.** Job seekers never pay to browse, apply or get support, and employers never pay to post. Any post asking candidates for money is blocked.

This is a **reconstruction** of the October 2026 Ephworks #HACK prototype based on the published app's visible content and recorded requirements. **It is not an export of the original project's editable source**, which was not available in the conversation.

## What is included

- React 18 + Vite frontend, with all editable source in `src/`
- Responsive top bar on desktop, bottom navigation with a menu sheet on phones
- **About, Safety & Trust, Help and Legal pages** (`src/content.js`): our story, mission, how it works, community, partners; how we review jobs, recognising scams, reporting, privacy, community standards; FAQs and contact; pilot privacy policy and terms (to be legally reviewed before launch). Linked from a four-column footer and from where they help (job badge, job details, post preview, profile)
- **Every page has its own address** (e.g. `/jobs`, `/about/mission`, `/safety/job-scams`); back and forward work. `vercel.json` sends all paths to the app so direct links work once deployed
- The site name and contact email live in one place (`SITE_NAME`, `CONTACT_EMAIL` in `src/data.js`); the email is a placeholder to replace before launch
- **Employer dashboard** once your church has vouched for you: live posts, posts waiting for the HR check, people interested and posts ending this week
- **Volunteer mentors**: members request a CV review, practice interview or LinkedIn help (agreeing a mentor may email them); mentors take a request from their **Volunteer** area, and only the mentor who took it sees the member's email
- **Admins manage partner churches** (Admin → Churches): add, rename, and remove a church only while no one depends on it
- **Simple navigation**: a slim top bar with Jobs, Saved and Post a job; everything else (My posts, Get help, Get involved, Profile) sits in the avatar menu, and reference pages are in the footer. Staff get a role-named button (**Admin**, **Moderation** or **Church admin**) with a count, opening a dashboard at `/work` that shows every queue waiting for them, with tabs across their queues. Staff open on the queue that needs them
- **Home and Jobs**: Home is the welcome page with the full job feed under the headline and search, then why Ephworks and free support; Jobs is the same feed on its own (search, filters, results). On phones, Home shrinks to the promise, headline and search, and longer intros are hidden
- Demo views (Member, Moderator, Church admin, Admin) only when no backend is connected
- Five fictional sample UAE opportunities with search and filters
- **Post a Job** as a short step-by-step wizard (church → the job → pay → description → how to apply → preview), with structured AED pay, live scam checks, a draft saved on the device, and a preview before submitting
- **Post status tracker** on My posts: church vouch → HR check → live for 30 days
- **I'm interested** on every role, saved to your account when signed in. Employers only see a count on their post, never who is interested (passing candidate details on could count as recruitment). Save and "mark as applied" stay in your browser
- **Scam checks**: fee, deposit and payment-transfer terms are blocked outright; WhatsApp-only contact, guaranteed jobs or visas, "no interview", passport requests, pressure language and personal email addresses are flagged for the moderator to check with HR
- **Church membership verification for job posters**: a post cannot be published until the poster's partner church has vouched for them (yes/no only)
- **Type to find your church**: posters and church-admin applicants search the partner list; a church that isn't listed can be suggested with its emirate, and an admin checks it, fixes the spelling or matches it to an existing church, then adds it (**Your work → Churches**)
- All seven emirates, and On-site / Hybrid / Remote alongside Full-time / Part-time
- Reports and review controls
- **Apply to help**: anyone signed in can apply to be a volunteer mentor or church admin; admins approve or decline. Moderators are invite-only (assigned on the People page)
- **People dashboard** for admins: every account with name, email, role, church and post count; change roles or suspend an account. The super admin is hidden from other admins
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

1. Create a Supabase project, then run every file in `supabase/migrations/` in the SQL editor, oldest first (`20261026…` to `20261101…`). `20261028…` adds partner churches (three fictional *sample* churches; replace them before launch) and poster vouching; `20261029…` adds admin roles, role applications and suspension; `20261030…` adds I'm interested; `20261031…` adds church suggestions; `20261101…` adds career support requests for volunteer mentors and church management for admins.
2. Copy `.env.example` to `.env.local` and fill in the project URL and anon key.
3. Under Authentication → URL Configuration, set the Site URL to your live address and add your dev and production URLs as redirect URLs.
4. Sign-in is Google only (no sign-in emails, so no email quota to run out). Create an OAuth client in Google Cloud with redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`, then enable Google under Authentication → Providers. Also switch **off** the Email provider there, so nobody can request sign-in emails directly.
5. Sign in to the app once, then make yourself the **super admin** in the SQL editor. This is the only role set by SQL, and there can only be one:
   `update public.profiles set role = 'super_admin' where id = (select id from auth.users where email = 'you@example.com');`
6. Everyone else gets a role through the app. Volunteers and church admins apply on the **Apply to help** page, and an admin approves them under **Role applications**. Moderators are invite-only: an admin assigns the role on the **People** page. Only the super admin can appoint or remove admins. Nobody can change their own role, and the super admin can only be changed in the SQL editor.

Rules enforced in the database, not the browser: members can only submit `pending` posts, fee/deposit/visa-charge/payment-transfer terms are rejected, only moderators publish (with a required HR verification note), a post is only published once its poster is vouched for by their church, only that church's admin can vouch (never for themselves), published posts expire after 30 days, any employer edit sends a post back to the queue, roles only change through the admin functions (with the limits above), and suspended accounts cannot post, vouch, report, review or apply, and their posts are hidden, and interest can only be marked on live posts, with posters seeing a count but never names. `npm run test:db` checks these against in-memory Postgres.

### Publishing workflow

1. **Poster** (Post a job page) asks their partner church for a vouch, then writes the post. Blocked scam terms stop the form; softer warning signs are shown to the poster and the moderator.
2. **Church admin** (Church vouches) vouches for or declines the poster. Only a yes/no is stored.
3. **Moderator** (Review posts) sees the vouch status and scam checks on each post. "Confirm HR" stays disabled until the poster is vouched and no blocked terms remain; every warning flag has to be ticked as checked with HR, and a verification note is required.
4. The post goes live on the noticeboard for 30 days. Seekers can tap **I'm interested** and apply directly to the employer.

Without Supabase the same flow runs on sample data in your browser: switch between the Member, Church admin, Moderator and Admin demo views. In the Admin view the demo persona is the super admin. With Supabase connected there is no view switcher: the menu follows the signed-in account's role.

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
