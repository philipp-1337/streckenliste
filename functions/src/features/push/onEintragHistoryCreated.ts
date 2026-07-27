import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {getFirestore, type Firestore} from "firebase-admin/firestore";
import {getMessaging, type Messaging} from "firebase-admin/messaging";
import * as logger from "firebase-functions/logger";
import {classifyEvent, shouldNotify, type HistoryAction} from "../../internal/notificationRules";
import {resolveRecipients} from "../../internal/recipients";
import {buildNotification, type ChangedField} from "../../internal/notificationContent";
import {sendPushToUser} from "../../internal/push";
import {claimEvent} from "../../internal/eventDedupe";

const KNOWN_ACTIONS: readonly HistoryAction[] = [
  "created", "updated", "approved", "rejected", "reset_to_pending", "deleted",
];

// Statuswechsel kann nur ein Admin ausgelöst haben. Die Rules verhindern das
// Fälschen bereits, aber der Trigger verlässt sich nicht darauf: er ist die
// Instanz, die Benachrichtigungen verschickt, und prüft die Behauptung des
// History-Dokuments deshalb selbst gegen die Rolle des Akteurs.
const ADMIN_ONLY_ACTIONS: readonly HistoryAction[] = ["approved", "rejected", "reset_to_pending"];

const isActorAdmin = async (db: Firestore, actorUid: string): Promise<boolean> => {
  if (!actorUid) return false;
  const snap = await db.collection("users").doc(actorUid).get();
  return snap.exists && snap.data()?.role === "admin";
};

type HistoryData = {
  action?: unknown;
  changedByUid?: unknown;
  changedByName?: unknown;
  previousData?: Record<string, unknown>;
  changedFields?: unknown;
  reason?: unknown;
};

type TriggerParams = {jagdbezirkId: string; eintragId: string};

// Nur die Zeitstempel-Methode wird gebraucht; so bleibt die Prüfung ohne
// Admin-SDK-Typen testbar.
type CommitTime = {toMillis(): number};

// Gemessen: Eintrag und History aus demselben writeBatch tragen denselben
// Commit-Zeitstempel (Delta 0 ms), ein nachträglich geschriebenes
// History-Dokument liegt sichtbar später. Die Toleranz federt interne
// Zeitunterschiede ab – eine verlorene Benachrichtigung wäre schlimmer als ein
// Angreifer, der sich innerhalb von fünf Sekunden an eine echte Änderung hängt.
const COMMIT_TOLERANCE_MS = 5000;

const isSameCommit = (
  entryUpdatedAt: CommitTime | undefined,
  historyCreatedAt: CommitTime | undefined,
): boolean => {
  // Ohne Zeitstempel nicht entscheidbar. Die Rules sind die primäre
  // Absicherung; diese Prüfung ist die zweite Schicht und darf im Zweifel nicht
  // die ganze Benachrichtigung verhindern.
  if (!entryUpdatedAt || !historyCreatedAt) return true;
  return Math.abs(entryUpdatedAt.toMillis() - historyCreatedAt.toMillis()) <= COMMIT_TOLERANCE_MS;
};

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
  eventId?: string,
  historyCreatedAt?: CommitTime,
): Promise<void> => {
  const action = history.action;
  if (typeof action !== "string" || !(KNOWN_ACTIONS as readonly string[]).includes(action)) {
    logger.warn(`onEintragHistoryCreated: unknown action ${String(action)}`);
    return;
  }
  const historyAction = action as HistoryAction;

  // Claimed up front rather than right before sending: a redelivery then exits
  // without repeating the Firestore reads. Placed after the action check so
  // malformed events do not leave markers behind.
  if (!(await claimEvent(db, eventId))) return;

  const actorUid = asString(history.changedByUid) ?? "";
  const actorName = asString(history.changedByName) ?? "Unbekannt";
  const previousData = history.previousData ?? {};

  if (ADMIN_ONLY_ACTIONS.includes(historyAction) && !(await isActorAdmin(db, actorUid))) {
    logger.warn(
      `onEintragHistoryCreated: ignoring ${historyAction} claimed by non-admin ${actorUid}`,
    );
    return;
  }

  const entrySnap = await db
    .doc(`jagdbezirke/${params.jagdbezirkId}/eintraege/${params.eintragId}`)
    .get();

  // Zweite Schicht zur Rules-Härtung: es wird nur benachrichtigt, wenn der
  // Eintrag zum behaupteten Vorgang passt. Ein eigenständig geschriebenes
  // History-Dokument fällt hier durch, selbst wenn es die Rules passieren würde.
  if (historyAction === "deleted") {
    // Nach einer echten Löschung ist der Eintrag weg. Ist er noch da, wurde die
    // Löschung nur behauptet.
    if (entrySnap.exists) {
      logger.warn(`onEintragHistoryCreated: entry ${params.eintragId} still exists for deleted`);
      return;
    }
  } else if (!entrySnap.exists) {
    logger.warn(`onEintragHistoryCreated: entry ${params.eintragId} missing for ${historyAction}`);
    return;
  } else if (!isSameCommit(entrySnap.updateTime, historyCreatedAt)) {
    logger.warn(
      `onEintragHistoryCreated: history for ${params.eintragId} not written with the entry`,
    );
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
      event.id,
      event.data?.createTime,
    );
  },
);
