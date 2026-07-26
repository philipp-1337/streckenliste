import type {Firestore} from "firebase-admin/firestore";
import type {Messaging} from "firebase-admin/messaging";
import * as logger from "firebase-functions/logger";

export const PUSH_DEVICES_COLLECTION = "push_devices";

export type PushMessage = {
  title: string;
  body: string;
  url?: string;
};

const DEAD_TOKEN_CODE = "messaging/registration-token-not-registered";

// Best-effort fan-out across every device a user registered. One failing
// device never blocks the others.
export const sendPushToUser = async (
  db: Firestore,
  messaging: Messaging,
  userId: string,
  message: PushMessage,
): Promise<void> => {
  const devicesSnap = await db
    .collection(PUSH_DEVICES_COLLECTION)
    .where("userId", "==", userId)
    .get();
  if (devicesSnap.empty) return;

  await Promise.all(devicesSnap.docs.map(async (doc) => {
    const token = doc.data().token;
    if (typeof token !== "string" || token.length === 0) {
      logger.warn(`sendPushToUser: device ${doc.id} has no token`);
      return;
    }

    try {
      await messaging.send({
        token,
        // Shape must match the push listener in src/sw.ts, which reads
        // notification.title/body and data.url. It deliberately ignores
        // webpush.fcmOptions.link.
        notification: {title: message.title, body: message.body},
        ...(message.url ? {data: {url: message.url}} : {}),
      });
    } catch (error) {
      // FCM only reports a dead token at send time, never at registration,
      // so this is the single place cleanup can happen.
      if ((error as {code?: string} | undefined)?.code === DEAD_TOKEN_CODE) {
        logger.info(`sendPushToUser: removing dead device ${doc.id} for ${userId}`);
        try {
          await doc.ref.delete();
        } catch (deleteError) {
          logger.error(`sendPushToUser: failed to delete device ${doc.id}`, deleteError);
        }
        return;
      }
      logger.error(`sendPushToUser: send failed for device ${doc.id}`, error);
    }
  }));
};
