import { MediaLibrary } from "@/components/admin/media-library";

export const dynamic = "force-dynamic";

export default function MediaLibraryPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-white">
        Media Library
      </h1>
      <p className="mt-1 text-sm text-ca-muted">
        Drag files anywhere on this page or use Import. Masters live in cloud
        storage; open a clip to trim/mark, then Timeline or Sync to edit.
      </p>
      <MediaLibrary />
    </div>
  );
}
