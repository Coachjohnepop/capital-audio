/**
 * Client portal types & demo data for capture jobs.
 * Bookings and quotes live in localStorage for the demo; swap for an API later.
 */

export type ProjectStatus =
  | "booked"
  | "capture-scheduled"
  | "in-edit"
  | "review-ready"
  | "delivered"
  | "on-hold";

export type BookingStatus =
  | "pending-review"
  | "quoted"
  | "accepted"
  | "declined";

export interface ProjectMilestone {
  id: string;
  label: string;
  completedAt?: string;
  dueAt?: string;
}

export interface CaptureProject {
  id: string;
  title: string;
  status: ProjectStatus;
  /** Package or mode label */
  packageName: string;
  mode: "audio" | "audio-video";
  venue: string;
  eventDate?: string;
  estimateTotal?: number;
  bookingId?: string;
  reviewMediaId?: string;
  updatedAt: string;
  milestones: ProjectMilestone[];
  notes?: string;
}

export interface BookingRecord {
  id: string;
  createdAt: string;
  status: BookingStatus;
  packageId: string;
  packageName?: string;
  priceFrom?: number;
  mode?: "audio" | "audio-video";
  eventDate: string;
  venue: string;
  city: string;
  setLength: string;
  artistOrEvent: string;
  notes: string;
  name: string;
  email: string;
  phone: string;
  company: string;
}

export interface PortalCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
}

export const demoCustomer: PortalCustomer = {
  id: "cust-001",
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  phone: "(916) 555-0199",
  companyName: "Midtown Live",
};

export const demoProjects: CaptureProject[] = [
  {
    id: "P-8821",
    title: "Midtown Open Mic — multi-track",
    status: "delivered",
    packageName: "Multi-Track Audio",
    mode: "audio",
    venue: "Harlow's, Sacramento",
    eventDate: "2026-06-25",
    estimateTotal: 790,
    bookingId: "CA-1042",
    updatedAt: "2026-07-02T17:40:00Z",
    milestones: [
      { id: "m1", label: "Booking confirmed", completedAt: "2026-06-10" },
      { id: "m2", label: "Capture night", completedAt: "2026-06-25" },
      { id: "m3", label: "Mix / bounce", completedAt: "2026-06-30" },
      { id: "m4", label: "Masters delivered", completedAt: "2026-07-02" },
    ],
    notes: "Full multi-track session + stereo program. 90-day archive.",
  },
  {
    id: "P-8844",
    title: "Maya Chen release show — Stage Ready",
    status: "review-ready",
    packageName: "Stage Ready",
    mode: "audio-video",
    venue: "Ace of Spades, Sacramento",
    eventDate: "2026-07-18",
    estimateTotal: 1890,
    bookingId: "CA-1088",
    updatedAt: "2026-07-28T11:15:00Z",
    milestones: [
      { id: "m1", label: "Booking confirmed", completedAt: "2026-07-01" },
      { id: "m2", label: "Kit locked (ShareGrid)", completedAt: "2026-07-12" },
      { id: "m3", label: "Capture night", completedAt: "2026-07-18" },
      { id: "m4", label: "Client review", dueAt: "2026-08-05" },
      { id: "m5", label: "Final masters", dueAt: "2026-08-12" },
    ],
    notes: "Multi-cam + multi-track. Highlight reel in review — add timestamp notes.",
  },
  {
    id: "P-8901",
    title: "Venue archive — board mix nights",
    status: "capture-scheduled",
    packageName: "Board Mix",
    mode: "audio",
    venue: "The Starlet Room, Sacramento",
    eventDate: "2026-08-08",
    estimateTotal: 390,
    bookingId: "CA-1102",
    updatedAt: "2026-07-30T09:00:00Z",
    milestones: [
      { id: "m1", label: "Booking confirmed", completedAt: "2026-07-28" },
      { id: "m2", label: "Capture night", dueAt: "2026-08-08" },
      { id: "m3", label: "Masters delivered", dueAt: "2026-08-14" },
    ],
  },
];

export const projectStatusLabel: Record<ProjectStatus, string> = {
  booked: "Booked",
  "capture-scheduled": "Capture scheduled",
  "in-edit": "In edit",
  "review-ready": "Ready for review",
  delivered: "Delivered",
  "on-hold": "On hold",
};

export const bookingStatusLabel: Record<BookingStatus, string> = {
  "pending-review": "Pending review",
  quoted: "Quote sent",
  accepted: "Accepted",
  declined: "Declined",
};

export const projectStatusTone: Record<
  ProjectStatus,
  "neutral" | "info" | "success" | "warning" | "accent"
> = {
  booked: "neutral",
  "capture-scheduled": "accent",
  "in-edit": "warning",
  "review-ready": "info",
  delivered: "success",
  "on-hold": "neutral",
};

export const bookingStatusTone: Record<
  BookingStatus,
  "neutral" | "info" | "success" | "warning" | "accent"
> = {
  "pending-review": "info",
  quoted: "accent",
  accepted: "success",
  declined: "neutral",
};

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export const BOOKINGS_STORAGE_KEY = "ca-bookings";
