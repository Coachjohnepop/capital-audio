# Capital Audio

Professional **multi-track audio** and **multi-cam video** for live performances — marketing site, booking, client portal, and studio tools.

Repo: [Coachjohnepop/capital-audio](https://github.com/Coachjohnepop/capital-audio)

## Two use cases, one product

| Mode | What it unlocks |
|------|-----------------|
| **Audio only** | Multi-track capture packages, audio upload, review links, audio timelines. Video tools hidden. |
| **Audio + Video** | Everything in audio, plus multi-cam packages, 360° review, multi-angle sync, picture edits. |

There is **no video-only mode** — video work always includes audio.

Toggle mode in **Studio Admin → Settings** (or the compact control in the admin nav). Preference is stored in the browser (`ca-capability-mode`).

## Routes

### Public site
| Route | Purpose |
|-------|---------|
| `/` | Marketing landing |
| `/packages` | Audio-only and A+V packages |
| `/gear` | Sample production kit catalog |
| `/book` | Multi-step booking request |
| `/about` | Company story & contact |

### Client portal
| Route | Purpose |
|-------|---------|
| `/portal/login` | Demo sign-in |
| `/portal` | Project overview |
| `/portal/projects` | Capture projects & milestones |
| `/portal/bookings` | Booking requests (`localStorage`) |
| `/portal/account` | Demo profile |

### Studio admin
| Route | Purpose |
|-------|---------|
| `/admin` | Dashboard + mode toggle |
| `/admin/media` | Upload / trim / markers / review links |
| `/admin/sync-editor` | Multi-angle sync (**A+V mode only**) |
| `/admin/edits` | Timeline edits (audio-only projects get A1/A2) |
| `/admin/settings` | Studio mode explanation |
| `/review/[id]` | Client review player |

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
- Drizzle + SQLite (local)
- **Production:** Vercel Blob for media + studio JSON (timelines/sync)
- Optional later: Turso `DATABASE_URL` for SQL metadata

## Deploy (Vercel)

1. Import `Coachjohnepop/capital-audio` in Vercel  
2. Set `ADMIN_PASSWORD` for production admin gate  
3. Deploy from `main`

## Customize

- Contact & copy: `src/lib/site.ts`
- Packages / gear: same file (`mode: "audio" | "audio-video"`)
- Portal demo data: `src/lib/portal.ts`
- Brand colors: `src/app/globals.css` (gold on near-black)

Bookings: `localStorage` key `ca-bookings`. Portal login is a demo gate.

---

Built for JP · Capital Audio live capture
