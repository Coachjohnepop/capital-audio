import type { CapabilityMode } from "./capability";

export const site = {
  name: "Capital Audio",
  /** Used when video mode is on in client chrome. */
  nameWithVideo: "Capital Audio & Video",
  tagline: "Live music, captured properly",
  description:
    "Professional multi-track audio and multi-cam video for live performances — book a shoot, track delivery in your portal, and review masters with the studio.",
  email: "jp@saccapitalaudio.com",
  phone: "(916) 555-0148",
  phoneTel: "+19165550148",
  location: "Sacramento, CA · Capital of California · available nationwide",
  sharegridUrl: "https://www.sharegrid.com",
} as const;

export type PackageId =
  | "board-mix"
  | "multi-track"
  | "single-cam"
  | "stage-ready"
  | "festival";

export interface CapturePackage {
  id: PackageId;
  name: string;
  tagline: string;
  priceFrom: number;
  popular?: boolean;
  /** What capability this package requires. Audio packages work in either mode. */
  mode: CapabilityMode;
  includes: string[];
  idealFor: string;
  turnaround: string;
}

export const packages: CapturePackage[] = [
  {
    id: "board-mix",
    name: "Board Mix",
    tagline: "Clean stereo program + ambient",
    priceFrom: 390,
    mode: "audio",
    includes: [
      "Stereo board feed + audience ambient",
      "Up to 90 minutes of performance",
      "Safety bounce + stems package",
      "Client review link for notes",
      "Full show master files",
    ],
    idealFor: "Podcasts-on-stage, songwriter nights, quick social audio",
    turnaround: "3–5 business days",
  },
  {
    id: "multi-track",
    name: "Multi-Track Audio",
    tagline: "Board stems you can actually mix",
    priceFrom: 790,
    popular: true,
    mode: "audio",
    includes: [
      "Multi-track board feed + room mics",
      "32-bit float safety recorder",
      "Up to 2 hours performance time",
      "Labeled session for your engineer",
      "Review portal + timestamp notes",
    ],
    idealFor: "Live EPs, church services, album-worthy club sets",
    turnaround: "5–7 business days",
  },
  {
    id: "single-cam",
    name: "Stage Single",
    tagline: "One operator, cinematic coverage",
    priceFrom: 890,
    mode: "audio-video",
    includes: [
      "1 cinema camera + prime lens kit",
      "Stereo program mix + audience ambient",
      "Up to 90 minutes of performance",
      "Color graded highlight reel (3–5 min)",
      "Full show master files",
    ],
    idealFor: "Club sets, songwriter nights, church services",
    turnaround: "7–10 business days",
  },
  {
    id: "stage-ready",
    name: "Stage Ready",
    tagline: "Multi-cam + multi-track audio",
    priceFrom: 1890,
    popular: true,
    mode: "audio-video",
    includes: [
      "3-camera multi-cam switch + ISO recordings",
      "Multi-track board feed + room mics",
      "Up to 2 hours performance time",
      "Edited full performance + social cuts",
      "ShareGrid-sourced pro kit included",
    ],
    idealFor: "Headline nights, album releases, live EPs",
    turnaround: "10–14 business days",
  },
  {
    id: "festival",
    name: "Festival / Tour Stop",
    tagline: "Crew, redundancy, broadcast-ready",
    priceFrom: 4200,
    mode: "audio-video",
    includes: [
      "4+ camera package with director",
      "Dedicated audio engineer on multi-track",
      "Redundant media + backup recorder",
      "Same-day social clips available",
      "Custom deliverables & rights package",
    ],
    idealFor: "Festivals, large venues, label deliverables",
    turnaround: "Custom schedule",
  },
];

/** Packages visible for a studio mode. Audio packages always show; video packages only when video is on. */
export function packagesForMode(mode: CapabilityMode): CapturePackage[] {
  if (mode === "audio-video") return packages;
  return packages.filter((p) => p.mode === "audio");
}

export interface GearItem {
  id: string;
  name: string;
  category: "Camera" | "Lens" | "Audio" | "Lighting" | "Support";
  dayRate: number;
  note: string;
  sharegrid: boolean;
  /** Camera / lens / lighting need video mode; audio always available. */
  requiresVideo?: boolean;
}

/** Representative kit list — sourced via ShareGrid for client shoots */
export const gearCatalog: GearItem[] = [
  {
    id: "fx6",
    name: "Sony FX6 Cinema Camera",
    category: "Camera",
    dayRate: 175,
    note: "Full-frame 4K, dual ISO — A-cam workhorse",
    sharegrid: true,
    requiresVideo: true,
  },
  {
    id: "c70",
    name: "Canon C70",
    category: "Camera",
    dayRate: 145,
    note: "Compact RF-mount cinema body",
    sharegrid: true,
    requiresVideo: true,
  },
  {
    id: "24-70",
    name: "Sony 24–70mm f/2.8 GM II",
    category: "Lens",
    dayRate: 55,
    note: "Stage-wide to tight performance coverage",
    sharegrid: true,
    requiresVideo: true,
  },
  {
    id: "70-200",
    name: "70–200mm f/2.8",
    category: "Lens",
    dayRate: 50,
    note: "Tight face / instrument detail from FOH",
    sharegrid: true,
    requiresVideo: true,
  },
  {
    id: "zoom-f6",
    name: "Zoom F6 Field Recorder",
    category: "Audio",
    dayRate: 45,
    note: "32-bit float multi-track safety",
    sharegrid: true,
  },
  {
    id: "schoeps",
    name: "Schoeps / Neumann stereo pair",
    category: "Audio",
    dayRate: 85,
    note: "Room / ambient capture that actually sings",
    sharegrid: true,
  },
  {
    id: "lav-kit",
    name: "Wireless lav / IEM capture kit",
    category: "Audio",
    dayRate: 65,
    note: "Artist talkbacks and stage banter",
    sharegrid: true,
  },
  {
    id: "aputure",
    name: "Aputure 300d + softbox",
    category: "Lighting",
    dayRate: 55,
    note: "Accent / interview key when venue lights fail",
    sharegrid: true,
    requiresVideo: true,
  },
  {
    id: "tripod",
    name: "Sachtler / Manfrotto fluid head",
    category: "Support",
    dayRate: 30,
    note: "Smooth pans for long sets",
    sharegrid: true,
    requiresVideo: true,
  },
  {
    id: "gimbal",
    name: "DJI RS 3 Pro",
    category: "Support",
    dayRate: 40,
    note: "Walking shots through the crowd",
    sharegrid: true,
    requiresVideo: true,
  },
];

export function gearForMode(mode: CapabilityMode): GearItem[] {
  if (mode === "audio-video") return gearCatalog;
  return gearCatalog.filter((g) => !g.requiresVideo);
}

export const services = [
  {
    title: "Multi-track audio",
    body: "Board feeds, room mics, and safety tracks so the mix can be finished properly — not a single stereo board dump.",
    icon: "audio" as const,
    mode: "audio" as CapabilityMode,
  },
  {
    title: "Multi-cam live video",
    body: "Stage, FOH, and detail angles cut into a show that feels like being there — always paired with usable audio.",
    icon: "video" as const,
    mode: "audio-video" as CapabilityMode,
  },
  {
    title: "ShareGrid pro gear",
    body: "We pull recorders, cinema cameras, and glass from ShareGrid so every shoot has the right kit without bloating your budget.",
    icon: "gear" as const,
    mode: "audio" as CapabilityMode,
  },
  {
    title: "Portal delivery",
    body: "Bookings, milestones, review links, and masters in one client portal — notes at timestamps, not endless email threads.",
    icon: "deliver" as const,
    mode: "audio" as CapabilityMode,
  },
];

export function servicesForMode(mode: CapabilityMode) {
  if (mode === "audio-video") return services;
  return services.filter((s) => s.mode === "audio");
}

export const processSteps = [
  {
    n: "01",
    title: "Book the date",
    body: "Pick audio-only or audio + video, tell us the venue and set length. We confirm within one business day.",
  },
  {
    n: "02",
    title: "We lock the kit",
    body: "Recorders (and cameras when you need them) are reserved on ShareGrid — insured and ready.",
  },
  {
    n: "03",
    title: "Capture night",
    body: "Our team arrives early, lines with FOH, and runs a clean multi-track capture — multi-cam when booked.",
  },
  {
    n: "04",
    title: "Edit & deliver",
    body: "Masters land in your portal with review links for notes — plus social-ready cuts when video is on.",
  },
];

export const testimonials = [
  {
    quote:
      "They treated our release show like a label session. Multi-cam looked expensive, audio was actually usable, and the turnaround was faster than we expected.",
    name: "Maya Chen",
    role: "Artist · indie rock",
  },
  {
    quote:
      "As a venue, we finally have content we can post without cringing. Capital Audio is our go-to for marquee nights.",
    name: "Derek Alston",
    role: "Talent buyer · 400-cap room",
  },
  {
    quote:
      "ShareGrid gear on every shoot means we never argue about camera quality. They just show up ready.",
    name: "Priya Nair",
    role: "Manager · artist roster",
  },
];

export function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function displayName(mode: CapabilityMode) {
  return mode === "audio-video" ? site.nameWithVideo : site.name;
}
