import { MediaLibrary } from "@/components/admin/media-library";

export const dynamic = "force-dynamic";

export default function MediaLibraryPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-white">
        Media Library
      </h1>
      <p className="mt-1 text-sm text-ca-muted">
        Import video and audio like iMovie — each file stays separate. Open a
        clip to trim and mark, or send angles + board mix to Sync / Timeline.
      </p>
      <MediaLibrary />
    </div>
  );
}
