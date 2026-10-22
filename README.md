# Ephworks — Community opportunities prototype (recreated source)

This is a **reconstruction** of the October 2026 Ephworks #HACK prototype based on the published app's visible content and recorded requirements. **It is not an export of the original project's editable source**, which was not available in the conversation.

## What is included

- React 18 + Vite frontend, with all editable source in `src/`
- Responsive dark-navy / mint desktop navigation and mobile bottom navigation with a **More** sheet
- Job seeker, employer and moderator demo previews
- Five fictional sample UAE opportunities with search and filters
- Save roles, show interest (local-only), sample employer drafts, reports and review controls
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

## Important differences from the original

- The original uploaded Ephworks logo asset was **not available for export**, so `public/logo.svg` is a clearly labeled *placeholder*. Replace it with your supplied logo, keeping the same filename or updating the file path in `src/App.jsx`.
- This code is a functional standalone recreation of the described experience, **not** a byte-identical download of the live ChatGPT site.
- It has **no backend or authentication**, and no integration with the public preview URL. All local actions remain in `window.localStorage` and can be reset.
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
