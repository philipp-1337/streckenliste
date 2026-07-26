export interface Eintrag {
  id: string;
  datum: string;
  wildart: string;
  kategorie: string;
  altersklasse: string;
  geschlecht: string;
  fachbegriff: string;
  gewicht: string;
  bemerkung: string;
  wildursprungsschein: string;
  jaeger: string;
  jaegerId?: string;
  ort: string;
  einnahmen: string;
  notizen: string;
  jagdbezirkId: string;
  userId: string;
  status?: 'pending' | 'approved' | 'rejected';
  ablehnungsGrund?: string;
  fallwild?: boolean;
  anzahl?: number;
}

export interface GeschlechtStats {
  gesamt: number;
  fallwild: number;
}

export interface AltersklasseStats {
  gesamt: number;
  fallwild: number;
  männlich: GeschlechtStats;
  weiblich: GeschlechtStats;
  unbekannt: GeschlechtStats;
}

export interface WildartStats {
  anzahl: number;
  gewicht: number;
  einnahmen: number;
  altersklassen: { [key: string]: AltersklasseStats };
  sonstigeDetails?: { [type: string]: number };
}

export interface AllStats {
  [key: string]: WildartStats;
}

export interface MonatStat {
  name: string;
  anzahl: number;
  [key: string]: string | number;
}

export interface WildartInfo {
  kategorie: string;
  altersklasse: string;
  geschlecht: string;
  fachbegriff: string;
}

export interface Wildarten {
  [key: string]: WildartInfo[];
}

export interface FilterState {
  wildart: string;
  jaegerId: string;
  jahr: string;
  kategorie: string;
  jagdjahr: string; // Hunting year filter like "2025/2026" or "" for all
  status: string;
}

export interface SortConfig {
  key: keyof Eintrag;
  direction: 'ascending' | 'descending';
}

export type Role = 'admin' | 'user';

export type PushLevel = 'wichtig' | 'status' | 'alle';

export interface Jagdbezirk {
  id: string;
  name: string;
}

export interface JaegerProfile {
  id: string;
  displayName: string;
  jagdbezirkId: string;
  active?: boolean;
  entryCount?: number;
}

export interface EintragHistory {
  id: string;
  timestamp: import('firebase/firestore').Timestamp;
  changedByUid: string;
  changedByName: string;
  action: 'created' | 'updated' | 'approved' | 'rejected' | 'reset_to_pending' | 'deleted';
  previousData?: Partial<Omit<Eintrag, 'id'>>;
  changedFields?: Array<{
    field: string;
    label: string;
    before: string;
    after: string;
  }>;
  reason?: string;
}

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  jagdbezirkId: string;
  jagdbezirk?: Jagdbezirk;
  jaegerId?: string;
  jaegerProfile?: JaegerProfile | null;
  role: Role;
  pushLevel?: PushLevel;
}
