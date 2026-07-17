import { MediaEditor } from "@/components/admin/media-editor";

export const dynamic = "force-dynamic";

export default async function MediaEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MediaEditor id={id} />;
}
