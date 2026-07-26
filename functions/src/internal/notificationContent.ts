import type {EventKind} from "./notificationRules";

export type EntrySummary = {
  wildart?: string;
  datum?: string;
  jaeger?: string;
  ablehnungsGrund?: string;
};

export type ChangedField = {label: string};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const formatGermanDate = (isoDate: string | undefined): string => {
  if (!isoDate) return "ohne Datum";
  if (!ISO_DATE.test(isoDate)) return isoDate;
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
};

// Only field labels are listed, never their values: a weight or revenue
// correction would otherwise put figures on the lock screen.
const fieldList = (changedFields: ChangedField[]): string =>
  changedFields.map((field) => field.label).join(", ");

export const buildNotification = (
  kinds: EventKind[],
  entry: EntrySummary,
  actorName: string,
  changedFields: ChangedField[],
): {title: string; body: string} => {
  const subject = entry.wildart || "Eintrag";
  const date = formatGermanDate(entry.datum);
  const has = (kind: EventKind) => kinds.includes(kind);

  if (has("rejected")) {
    const reason = entry.ablehnungsGrund ? ` — Grund: ${entry.ablehnungsGrund}` : "";
    return {
      title: "Eintrag abgelehnt",
      body: `${subject} vom ${date}${reason}`,
    };
  }

  if (has("created")) {
    const who = entry.jaeger || actorName;
    const suffix = has("awaiting_approval") ?
      "wartet auf Freigabe" :
      `angelegt von ${actorName}`;
    return {
      title: `Neuer Eintrag: ${subject}`,
      body: `${who}, ${date} — ${suffix}`,
    };
  }

  if (has("deleted")) {
    return {
      title: "Eintrag gelöscht",
      body: `${subject} vom ${date} — gelöscht von ${actorName}`,
    };
  }

  if (has("status_change")) {
    return {
      title: "Eintrag aktualisiert",
      body: `${subject} vom ${date} — geändert von ${actorName}`,
    };
  }

  const fields = fieldList(changedFields);
  return {
    title: "Eintrag geändert",
    body: `${subject} vom ${date} — ${fields || `geändert von ${actorName}`}`,
  };
};
