import type { Metadata } from "next";
import { EditWorkbench } from "@/components/edit/workbench";

export const metadata: Metadata = {
  title: "Admin · Edit Workbench",
};

export default async function EditWorkbenchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditWorkbench projectId={id} />;
}
