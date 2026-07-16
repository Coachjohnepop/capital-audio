# Capital Audio

Professional **live music video & multi-track audio** capture — booking website and order flow. Production gear coordinated via [ShareGrid](https://www.sharegrid.com).

Repo: [Coachjohnepop/capital-audio](https://github.com/Coachjohnepop/capital-audio)

## Client demo pages

| Route | Purpose |
|-------|---------|
| `/` | Marketing landing — hero, services, packages, process, ShareGrid, testimonials |
| `/packages` | Full package details & pricing |
| `/gear` | Sample ShareGrid kit catalog |
| `/book` | Multi-step booking / order request |
| `/about` | Company story & contact |

Bookings are stored in browser `localStorage` (`ca-bookings`) for demo — swap for an API/email later.

## Local development

```bash
cd ~/projects/capital-audio
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- TypeScript

## Deploy (Vercel)

1. Import `Coachjohnepop/capital-audio` in Vercel  
2. Deploy from `main`  
3. Share the production URL with the client  

## Customize for the client

- Contact & copy: `src/lib/site.ts`
- Packages / gear list: same file
- Brand colors: `src/app/globals.css` (gold on near-black)

Placeholder phone/email are demo values — update before client handoff.

---

Built for JP · Capital Audio live capture
