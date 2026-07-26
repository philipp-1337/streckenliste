export type PushLevel = "wichtig" | "status" | "alle";

export type HistoryAction =
  | "created"
  | "updated"
  | "approved"
  | "rejected"
  | "reset_to_pending"
  | "deleted";

export type RecipientRole = "admin" | "member";

export type EventKind =
  | "awaiting_approval"
  | "created"
  | "rejected"
  | "status_change"
  | "content_change"
  | "deleted";

export const DEFAULT_PUSH_LEVEL: PushLevel = "status";

// Legacy entries imported from Excel have no `status` field at all, so this
// must never fall back to a default: treating a missing status as "pending"
// would report every admin correction on historic data as "awaiting approval".
const isPending = (status: string | undefined): boolean => status === "pending";

// A single history entry can carry several meanings at once. "Member edited an
// approved entry" is both an admin's approval task and a content change for a
// second member sharing the same jaegerId — collapsing that into one exclusive
// category would silently drop one of the two recipients.
export const classifyEvent = (
  action: HistoryAction,
  statusBefore: string | undefined,
  statusAfter: string | undefined,
): EventKind[] => {
  switch (action) {
    case "created":
      return isPending(statusAfter) ? ["created", "awaiting_approval"] : ["created"];
    case "updated":
      return isPending(statusAfter) && !isPending(statusBefore) ?
        ["content_change", "awaiting_approval"] :
        ["content_change"];
    case "approved":
      return ["status_change"];
    case "rejected":
      return ["rejected"];
    case "reset_to_pending":
      return ["status_change", "awaiting_approval"];
    case "deleted":
      return ["deleted"];
  }
};

const LEVEL_MATRIX: Record<RecipientRole, Record<PushLevel, readonly EventKind[]>> = {
  admin: {
    wichtig: ["awaiting_approval"],
    status: ["awaiting_approval", "created", "rejected", "status_change"],
    alle: ["awaiting_approval", "created", "rejected", "status_change", "content_change", "deleted"],
  },
  member: {
    wichtig: ["rejected"],
    status: ["created", "rejected", "status_change"],
    alle: ["created", "rejected", "status_change", "content_change", "deleted"],
  },
};

// Roles is a list because one user can be both an admin and the owner of the
// entry (Spec R1: the importing admin also has a jaegerId). Either role
// granting the notification is enough; the caller sends exactly one push.
export const shouldNotify = (
  kinds: EventKind[],
  roles: RecipientRole[],
  level: PushLevel,
): boolean =>
  roles.some((role) => kinds.some((kind) => LEVEL_MATRIX[role][level].includes(kind)));
