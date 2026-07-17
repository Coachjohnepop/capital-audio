# Capital Audio — Admin Guide (JP)

## Start the app
1. Open Terminal, then: `cd ~/Projects/capital-audio && npm run dev`
2. Go to `http://localhost:3000/admin` in your browser.

## The two admin pages
- **Dashboard** (`/admin`) — file counts, storage used, recent uploads.
- **Media Library** (`/admin/media`) — upload and manage files.

## Upload footage
1. Open **Media Library**.
2. Drag video/audio files onto the dashed box (or click **Choose files**).
3. Click a file card to open it in the editor.

## The editor
- **Play / Pause** — button or spacebar.
- **Scrub** — click anywhere on the timeline bar.
- **Trim** — play to where the cut should start, press `I` (or **Set In**). Same at the end with `O` (or **Set Out**). **Clear trim** resets. The original file is never changed.
- **Markers** — pause on a moment, press `M` (or **+ Marker**). Rename it in the list below. Click a timestamp to jump there.
- **Preview trimmed** — check this box to watch only the trimmed cut.
- **Save** — click it whenever "unsaved changes" appears. Trim and markers are not stored until you save.
- **Rename a file** — click its title at the top and type.

## 360° video
1. Open a 360 file in the editor.
2. Click **360°** (top-right of the player). This sticks — clients see it too.
3. Drag inside the video to look around, scroll to zoom.
4. Regular footage: leave it on **Flat**.

## Send footage to a client
1. Open the file in the editor.
2. Click **Copy review link** and text/email the link to the client.
3. The client can watch, add notes at timestamps, and mark whole sections — that's all they can do. They can't edit, trim, or delete anything.
4. Client notes show up **blue** in your editor (and on their page), with their name. Your markers are **gold**.

## What clients see
Their page (`/review/...`) has the player, a **+ Note** button, **Start section here** → **End section** for marking a range, and a sidebar listing every note. Clicking a note jumps the video to it.

## Delete a file
Media Library → hover a card → **Delete** (top-right of the card). This removes the file and all its notes. There is no undo.

## Current limits (will change before launch)
- No login yet — anyone on this computer can open `/admin`. Don't deploy publicly until the password gate is added.
- Files live on this computer (`.data/` folder). Cloud storage (R2) comes next.
- Review links work only while the app is running on this machine.
