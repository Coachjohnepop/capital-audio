import { MediaLibrary } from "@/components/admin/media-library";

export const dynamic = "force-dynamic";

export default function MediaLibraryPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-white">Media Library</h1>
      <p className="mt-1 text-sm text-ca-muted">
        Upload video or audio, then open a file to trim and mark it.
      </p>
      <MediaLibrary />
    </div>
  );
}
