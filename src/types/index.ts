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
  ort: string;
  einnahmen: string;
  notizen: string;
  jagdbezirkId: string;
  userId: string;
}

export interface WildartStats {
  anzahl: number;
  gewicht: number;
  einnahmen: number;
  altersklassen: { [key: string]: number };
}

export interface AllStats {
  [key: string]: WildartStats;
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
  jaeger: string;
  jahr: string;
  kategorie: string;
  jagdjahr: string; // Hunting year filter like "2025/2026" or "" for all
}

export interface SortConfig {
  key: keyof Eintrag;
  direction: 'ascending' | 'descending';
}

export type Role = 'admin' | 'user';

export interface Jagdbezirk {
  id: string;
  name: string;
}

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  jagdbezirkId: string;
  jagdbezirk?: Jagdbezirk;
  role: Role;
}
