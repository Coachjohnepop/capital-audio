export const site = {
  name: "Capital Audio",
  tagline: "Live music, captured properly",
  description:
    "Professional multi-cam video and multi-track audio for live performances — booked in minutes, powered by pro gear from ShareGrid.",
  email: "book@capitalaudio.co",
  phone: "(202) 555-0148",
  phoneTel: "+12025550148",
  location: "Washington, DC metro · available nationwide",
  sharegridUrl: "https://www.sharegrid.com",
} as const;

export type PackageId = "single-cam" | "stage-ready" | "festival";

export interface CapturePackage {
  id: PackageId;
  name: string;
  tagline: string;
  priceFrom: number;
  popular?: boolean;
  includes: string[];
  idealFor: string;
  turnaround: string;
}

export const packages: CapturePackage[] = [
  {
    id: "single-cam",
    name: "Stage Single",
    tagline: "One operator, cinematic coverage",
    priceFrom: 890,
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

export interface GearItem {
  id: string;
  name: string;
  category: "Camera" | "Lens" | "Audio" | "Lighting" | "Support";
  dayRate: number;
  note: string;
  sharegrid: boolean;
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
  },
  {
    id: "c70",
    name: "Canon C70",
    category: "Camera",
    dayRate: 145,
    note: "Compact RF-mount cinema body",
    sharegrid: true,
  },
  {
    id: "24-70",
    name: "Sony 24–70mm f/2.8 GM II",
    category: "Lens",
    dayRate: 55,
    note: "Stage-wide to tight performance coverage",
    sharegrid: true,
  },
  {
    id: "70-200",
    name: "70–200mm f/2.8",
    category: "Lens",
    dayRate: 50,
    note: "Tight face / instrument detail from FOH",
    sharegrid: true,
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
  },
  {
    id: "tripod",
    name: "Sachtler / Manfrotto fluid head",
    category: "Support",
    dayRate: 30,
    note: "Smooth pans for long sets",
    sharegrid: true,
  },
  {
    id: "gimbal",
    name: "DJI RS 3 Pro",
    category: "Support",
    dayRate: 40,
    note: "Walking shots through the crowd",
    sharegrid: true,
  },
];

export const services = [
  {
    title: "Multi-cam live video",
    body: "Stage, FOH, and detail angles cut into a show that feels like being there — and looking better than phone videos ever will.",
    icon: "video" as const,
  },
  {
    title: "Multi-track audio",
    body: "Board feeds, room mics, and safety tracks so the mix can be finished properly — not a single stereo board dump.",
    icon: "audio" as const,
  },
  {
    title: "ShareGrid pro gear",
    body: "We pull cinema cameras, glass, and audio from ShareGrid so every shoot has the right kit without bloating your budget.",
    icon: "gear" as const,
  },
  {
    title: "Deliverables that ship",
    body: "Full masters, highlight reels, vertical social cuts, and rights clear enough for labels, venues, and artist pages.",
    icon: "deliver" as const,
  },
];

export const processSteps = [
  {
    n: "01",
    title: "Book the date",
    body: "Pick a package, tell us the venue and set length. We confirm crew availability within one business day.",
  },
  {
    n: "02",
    title: "We lock the kit",
    body: "Cameras, glass, and recorders are reserved on ShareGrid for your show — insured and ready.",
  },
  {
    n: "03",
    title: "Capture night",
    body: "Our team arrives early, lines with FOH, and runs a clean multi-cam + multi-track capture.",
  },
  {
    n: "04",
    title: "Edit & deliver",
    body: "Color, mix, and masters land in your portal — plus social-ready clips for the morning after if you need them.",
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
