# Capital Audio — Admin Guide (JP)

## Start the app
1. Open Terminal, then: `cd ~/Projects/capital-audio && npm run dev`
2. Go to `http://localhost:3000/admin` in your browser.

## Studio mode (Audio only vs Audio + Video)
Top-right of the admin bar (or **Settings**):
- **Audio only** — multi-track audio upload, review links, audio timelines. Multi-angle sync and 360° tools stay hidden.
- **Audio + Video** — everything above, plus multi-cam packages, picture edits, multi-angle sync, and 360° review.

You never run video without audio. The toggle is saved in this browser until we add a server account setting.

## The admin pages
- **Dashboard** (`/admin`) — file counts, storage used, recent uploads, mode toggle.
- **Media Library** (`/admin/media`) — upload and manage files (audio-only accept when mode is Audio only).
- **Multi-Angle Sync** (`/admin/sync-editor`) — line up several cameras against one master audio track (**Audio + Video mode only**).
- **Timeline** (`/admin/edits`) — cut a show together: arrange, trim, split, detach audio, markers. New audio-only projects start with A1/A2 tracks. From the public site, open **Studio → Timeline**.
- **Settings** (`/admin/settings`) — explain studio modes.
- **Client portal** (`/portal`) — what customers see for projects, bookings, and milestones.

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

## Multi-angle sync
Line up several camera angles against one master audio track (the board mix).
1. Upload the master recording and every camera's footage in **Media Library** first.
2. Open **Multi-Angle Sync**, type a session name, click **Create project**.
3. Pick the master audio from the dropdown — it becomes the clock everything follows.
4. Pick each camera's file and click **+ Add angle**.
5. Press **Play all in sync**. If a camera is early or late, click its nudge buttons (±10ms up to ±1s) until it lines up with the audio.
6. **Audition** on an angle lets you hear that camera's own sound (master goes quiet) — match a drum hit or a clap by ear, then switch back.
7. Click **Save offsets**. Offsets live with the project; the files themselves are never changed.

## Timeline (Studio)
Cut a show together, iMovie-style. Nothing here ever changes the files — a timeline is a list of pointers into the Media Library, so cut freely.

1. Open **Studio → Timeline** (or **Timeline** in the studio nav), type a title, click **Create**.
2. Pick a file from the dropdown and click **+ Add to timeline**. Video lands at the end of the top track (the storyline); audio lands at the playhead on an audio track.
3. **Play / pause** — button or spacebar. Click or drag the ruler to scrub.
4. **Arrange** — drag a clip left or right. The storyline is magnetic: clips always butt together, everything after slides to fit.
5. **Trim** — drag a clip's left or right edge.
6. **Split** — park the playhead where the cut goes, press `B` (or **✂ Split**). Works on the selected clip first, otherwise whatever's under the playhead.
7. **Delete** — select a clip, press `⌫` (or **Delete clip** in the panel below).
8. **Detach audio** — select a video clip, click **Detach audio**. The picture mutes and its sound becomes a clip on the audio track — trim, slide, or delete each on its own. This is how you swap camera sound for the board mix: detach, delete the detached sound, add the board recording.
9. **Markers** — press `M`. The marker sticks to the clip under the playhead (it travels when you rearrange) and is listed below the timeline — click a timestamp to jump, type to rename.
10. **Clip panel** — with a clip selected: mute, gain, fade in/out, speed.
11. **Undo / redo** — `⌘Z` / `⇧⌘Z`.
12. Click **Save edit** whenever "unsaved changes" shows — like the media editor, nothing is stored until you save.

Deleting a file in the Media Library removes it from any edit that uses it.

## Send footage to a client
1. Open the file in the editor.
2. Click **Copy review link** and text/email the link to the client.
3. The client can watch, add notes at timestamps, and mark whole sections — that's all they can do. They can't edit, trim, or delete anything.
4. Client notes show up **blue** in your editor (and on their page), with their name. Your markers are **gold**.

## What clients see
Their page (`/review/...`) has the player, a **+ Note** button, **Start section here** → **End section** for marking a range, and a sidebar listing every note. Clicking a note jumps the video to it.

## Delete a file
Media Library → hover a card → **Delete** (top-right of the card). This removes the file and all its notes. There is no undo.

## Logging in (production only)
On the live site, `/admin` asks for the studio password. Enter it once — it remembers you for 30 days on that browser. On your own computer (`npm run dev`) there is no login.

## Current limits (will change before launch)
- Files live on this computer (`.data/` folder). Cloud storage (R2) comes next.
- Review links work only while the app is running on this machine.
