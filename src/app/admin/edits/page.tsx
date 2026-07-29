import type { Metadata } from "next";
import { EditsHome } from "@/components/edit/home";

export const metadata: Metadata = {
  title: "Admin · Edits",
};

export default function EditsPage() {
  return <EditsHome />;
}
