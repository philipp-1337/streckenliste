import {Timestamp, type Firestore} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

export const PUSH_EVENTS_COLLECTION = "push_events";

// Firestore-TTL löscht ein Dokument, sobald der Wert im TTL-Feld in der
// Vergangenheit liegt — das Feld ist also der Ablaufzeitpunkt, nicht der
// Verarbeitungszeitpunkt. Sieben Tage sind reichlich: Doppelzustellungen
// treffen innerhalb von Sekunden bis Minuten ein.
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

// Firestore/Eventarc guarantees at-least-once delivery: the same event can be
// handed to the function more than once, independently of whether retries are
// enabled. Without a claim, every redelivery would send the whole fan-out again.
const ALREADY_EXISTS_CODES: readonly unknown[] = [6, "already-exists", "ALREADY_EXISTS"];

// Marks this event as being handled and reports whether the caller won the
// claim. create() fails atomically when the document already exists, so no
// transaction is needed — the write itself is the lock.
//
// Must be called BEFORE sending: claiming afterwards would let two concurrent
// deliveries both pass the check and both send.
export const claimEvent = async (db: Firestore, eventId: string | undefined): Promise<boolean> => {
  // No event id means we cannot deduplicate. Sending is the lesser evil.
  if (!eventId) return true;

  try {
    await db.collection(PUSH_EVENTS_COLLECTION).doc(eventId).create({
      // Zielfeld der TTL-Policy. Ohne Policy wächst die Collection unbegrenzt,
      // ohne Zukunftswert würde sie sofort wieder geleert.
      expiresAt: Timestamp.fromMillis(Date.now() + RETENTION_MS),
    });
    return true;
  } catch (error) {
    const code = (error as {code?: unknown} | undefined)?.code;
    if (ALREADY_EXISTS_CODES.includes(code)) {
      logger.info(`claimEvent: event ${eventId} already handled, skipping`);
      return false;
    }
    // Deliberate trade-off: a duplicate notification is an annoyance, a missing
    // one is a broken feature. On an unclear failure we let the send proceed.
    logger.error(`claimEvent: could not claim event ${eventId}, sending anyway`, error);
    return true;
  }
};
