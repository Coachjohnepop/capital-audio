import type { Metadata } from "next";
import { SyncWorkbench } from "@/components/sync-editor/workbench";

export const metadata: Metadata = {
  title: "Admin · Sync Workbench",
};

export default async function SyncWorkbenchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SyncWorkbench projectId={id} />;
}
