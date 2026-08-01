import type { Metadata } from "next";
import { SyncEditorHome } from "@/components/sync-editor/home";

export const metadata: Metadata = {
  title: "Admin · Multicam Sync (Resolve-style)",
};

export default function SyncEditorPage() {
  return <SyncEditorHome />;
}
