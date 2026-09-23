import type { NotificationDataProps } from "osp-ui-kit";

/**
 * Demo content ported from cisv3 so the header bell has something to show.
 * TODO: replace with the real notifications feed.
 */
export const notifications: NotificationDataProps[] = [
  {
    id: 1,
    title: "New Retrieval Request",
    description:
      "RR-2026-0041 has been submitted and is awaiting confirmation.",
    type: "request",
    timestamp: "2026-06-03T08:15:00",
    read: false,
  },
  {
    id: 2,
    title: "Payment Received",
    description:
      "Payment for ACE-2026-0017 has been confirmed. Amount: ₱12,500.00",
    type: "payment",
    timestamp: "2026-06-03T07:45:00",
    read: false,
  },
  {
    id: 3,
    title: "Approval Required",
    description:
      "Trip ticket TT-2026-0009 is pending your approval before dispatch.",
    type: "approval",
    timestamp: "2026-06-03T06:30:00",
    read: false,
  },
  {
    id: 4,
    title: "Room Reservation Confirmed",
    description:
      "Chapel Room B is reserved for June 5, 2026 from 9:00 AM – 12:00 PM.",
    type: "document",
    timestamp: "2026-06-02T17:00:00",
    read: true,
  },
  {
    id: 5,
    title: "System Maintenance",
    description:
      "Scheduled maintenance on June 7, 2026 from 12:00 AM – 2:00 AM.",
    type: "system",
    timestamp: "2026-06-02T09:00:00",
    read: true,
  },
];
