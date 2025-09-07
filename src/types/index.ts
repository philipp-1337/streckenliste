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
  jaeger: string;
  ort: string;
  einnahmen: string;
  notizen: string;
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
}