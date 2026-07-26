import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {getFirestore, type Firestore} from "firebase-admin/firestore";
import {getMessaging, type Messaging} from "firebase-admin/messaging";
import * as logger from "firebase-functions/logger";
import {classifyEvent, shouldNotify, type HistoryAction} from "../../internal/notificationRules";
import {resolveRecipients} from "../../internal/recipients";
import {buildNotification, type ChangedField} from "../../internal/notificationContent";
import {sendPushToUser} from "../../internal/push";

const KNOWN_ACTIONS: readonly HistoryAction[] = [
  "created", "updated", "approved", "rejected", "reset_to_pending", "deleted",
];

type HistoryData = {
  action?: unknown;
  changedByUid?: unknown;
  changedByName?: unknown;
  previousData?: Record<string, unknown>;
  changedFields?: unknown;
  reason?: unknown;
};

type TriggerParams = {jagdbezirkId: string; eintragId: string};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const asChangedFields = (value: unknown): ChangedField[] =>
  Array.isArray(value) ?
    value.flatMap((item) => {
      const label = asString((item as {label?: unknown})?.label);
      return label ? [{label}] : [];
    }) :
    [];

export const handleHistoryCreated = async (
  db: Firestore,
  messaging: Messaging,
  params: TriggerParams,
  history: HistoryData,
): Promise<void> => {
  const action = history.action;
  if (typeof action !== "string" || !(KNOWN_ACTIONS as readonly string[]).includes(action)) {
    logger.warn(`onEintragHistoryCreated: unknown action ${String(action)}`);
    return;
  }
  const historyAction = action as HistoryAction;

  const actorUid = asString(history.changedByUid) ?? "";
  const actorName = asString(history.changedByName) ?? "Unbekannt";
  const previousData = history.previousData ?? {};

  const entrySnap = await db
    .doc(`jagdbezirke/${params.jagdbezirkId}/eintraege/${params.eintragId}`)
    .get();

  if (!entrySnap.exists && historyAction !== "deleted") {
    logger.warn(`onEintragHistoryCreated: entry ${params.eintragId} missing for ${historyAction}`);
    return;
  }

  // On deletion the entry is already gone, so previousData written in the same
  // batch is the only remaining source of context.
  const entryData: Record<string, unknown> = entrySnap.exists ?
    (entrySnap.data() ?? {}) :
    previousData;

  const statusAfter = asString(entryData.status);
  const statusBefore = asString(previousData.status);
  const kinds = classifyEvent(historyAction, statusBefore, statusAfter);

  const recipients = await resolveRecipients(
    db,
    params.jagdbezirkId,
    asString(entryData.jaegerId),
    actorUid,
  );

  const summary = {
    wildart: asString(entryData.wildart),
    datum: asString(entryData.datum),
    jaeger: asString(entryData.jaeger),
    ablehnungsGrund: asString(history.reason) ?? asString(entryData.ablehnungsGrund),
  };
  const message = {
    ...buildNotification(kinds, summary, actorName, asChangedFields(history.changedFields)),
    url: `/?eintrag=${params.eintragId}`,
  };

  await Promise.all(
    recipients
      .filter((recipient) => shouldNotify(kinds, recipient.roles, recipient.level))
      .map((recipient) => sendPushToUser(db, messaging, recipient.uid, message)),
  );
};

export const onEintragHistoryCreated = onDocumentCreated(
  {
    document: "jagdbezirke/{jagdbezirkId}/eintraege/{eintragId}/history/{historyId}",
    region: "europe-west3",
  },
  async (event) => {
    const history = event.data?.data();
    if (!history) return;
    await handleHistoryCreated(
      getFirestore(),
      getMessaging(),
      {
        jagdbezirkId: event.params.jagdbezirkId,
        eintragId: event.params.eintragId,
      },
      history,
    );
  },
);
