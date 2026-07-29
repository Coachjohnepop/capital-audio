import type { Metadata } from "next";
import { SyncEditorHome } from "@/components/sync-editor/home";

export const metadata: Metadata = {
  title: "Admin · Multi-angle Sync",
};

export default function SyncEditorPage() {
  return <SyncEditorHome />;
}
