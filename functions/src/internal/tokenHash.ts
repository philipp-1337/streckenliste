import {createHash} from "node:crypto";

export const MIN_TOKEN_LENGTH = 32;

// Used only as an idempotent document id for push_devices, not to hide the
// token — so a plain digest is enough and no shared secret is needed.
export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");
