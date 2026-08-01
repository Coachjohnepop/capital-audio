import type { Metadata } from "next";
import { CapabilityToggle } from "@/components/admin/capability-toggle";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Settings",
};

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Studio"
        title="Settings"
        description="Studio preferences for this browser. Mode is stored locally until a server-side account setting lands."
      />

      <CapabilityToggle />

      <div className="ca-card p-6 text-sm leading-relaxed text-ca-muted">
        <p className="font-medium text-white">How modes work</p>
        <ul className="mt-4 space-y-3">
          <li className="flex gap-3">
            <span className="ca-pill shrink-0">Audio</span>
            <span>
              Multi-track upload, markers, review links, and timeline edits
              focused on sound. Multi-angle sync and 360° tools are hidden.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="ca-pill ca-pill-gold shrink-0">A + V</span>
            <span>
              Full capture studio: multi-cam sync, picture timeline, 360°
              review. Audio tools stay available; you never run video without
              audio.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
