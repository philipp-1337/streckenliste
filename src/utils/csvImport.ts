import type { Eintrag } from '@types';

interface CSVRow {
  Nr: string;
  Datum: string;
  Wildart: string;
  'AK 0m': string;
  'AK 0w': string;
  'AK 1w': string;
  'AK 2w': string;
  'AK 1m': string;
  'AK 2m': string;
  'AK  3m': string;
  'AK 4m': string;
  '(kg)': string;
  Bemerkung: string;
  'Name Jäger': string;
  Ort: string;
  Einnahmen: string;
  Notizen: string;
}

/**
 * Parst CSV-Text und konvertiert ihn in ein Array von Objekten
 */
export const parseCSV = (csvText: string): CSVRow[] => {
  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Finde die Header-Zeile (die mit "Nr.;Datum;Wildart" beginnt)
  const headerIndex = lines.findIndex(line => 
    line.startsWith('Nr.;Datum;Wildart') || line.startsWith('Nr;Datum;Wildart')
  );
  
  if (headerIndex === -1) {
    throw new Error('CSV-Header nicht gefunden');
  }
  
  const headers = lines[headerIndex].split(';');
  const dataLines = lines.slice(headerIndex + 1);
  
  const result: CSVRow[] = [];
  
  for (const line of dataLines) {
    const values = line.split(';');
    
    // Überspringe leere Zeilen oder Zeilen ohne Nummer
    if (!values[0] || values[0].trim() === '' || isNaN(Number(values[0]))) {
      continue;
    }
    
    const row: any = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : '';
    });
    
    result.push(row as CSVRow);
  }
  
  return result;
};

/**
 * Konvertiert ein CSV-Row-Objekt in ein Eintrag-Objekt
 */
export const csvRowToEintrag = (row: CSVRow): Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'> | null => {
  // Überspringe Zeilen ohne Wildart und ohne Datum
  if (!row.Wildart && !row.Datum) {
    return null;
  }
  
  // Bestimme Altersklasse und Geschlecht basierend auf markierten Spalten
  let altersklasse = '';
  let geschlecht = '';
  let kategorie = '';
  let fachbegriff = '';
  
  // Prüfe welche AK-Spalte markiert ist (x oder X)
  if (row['AK 0m']?.toLowerCase() === 'x') {
    altersklasse = 'AK 0';
    geschlecht = 'm';
    kategorie = 'Jungwild';
  } else if (row['AK 0w']?.toLowerCase() === 'x') {
    altersklasse = 'AK 0';
    geschlecht = 'w';
    kategorie = 'Jungwild';
  } else if (row['AK 1w']?.toLowerCase() === 'x') {
    altersklasse = 'AK 1';
    geschlecht = 'w';
    kategorie = 'weibliches Wild';
  } else if (row['AK 2w']?.toLowerCase() === 'x') {
    altersklasse = 'AK 2';
    geschlecht = 'w';
    kategorie = 'weibliches Wild';
  } else if (row['AK 1m']?.toLowerCase() === 'x') {
    altersklasse = 'AK 1';
    geschlecht = 'm';
    kategorie = 'männliches Wild';
  } else if (row['AK 2m']?.toLowerCase() === 'x') {
    altersklasse = 'AK 2';
    geschlecht = 'm';
    kategorie = 'männliches Wild';
  } else if (row['AK  3m']?.toLowerCase() === 'x') {
    altersklasse = 'AK 3';
    geschlecht = 'm';
    kategorie = 'männliches Wild';
  } else if (row['AK 4m']?.toLowerCase() === 'x') {
    altersklasse = 'AK 4';
    geschlecht = 'm';
    kategorie = 'männliches Wild';
  }
  
  // Bestimme Fachbegriff basierend auf Wildart und Altersklasse
  const wildart = row.Wildart || '';
  if (wildart === 'Schwarzwild') {
    if (altersklasse === 'AK 0') fachbegriff = 'Frischlinge';
    else if (altersklasse === 'AK 1' && geschlecht === 'w') fachbegriff = 'Überläuferbachen';
    else if (altersklasse === 'AK 2' && geschlecht === 'w') fachbegriff = 'Bachen';
    else if (altersklasse === 'AK 1' && geschlecht === 'm') fachbegriff = 'Überläuferkeiler';
    else if (altersklasse === 'AK 2' && geschlecht === 'm') fachbegriff = 'Keiler (ab 2 Jahre)';
  } else if (wildart === 'Rehwild') {
    if (altersklasse === 'AK 0') fachbegriff = 'Kitze';
    else if (altersklasse === 'AK 1' && geschlecht === 'w') fachbegriff = 'Schmalrehe';
    else if (altersklasse === 'AK 2' && geschlecht === 'w') fachbegriff = 'Ricken';
    else if (altersklasse === 'AK 1' && geschlecht === 'm') fachbegriff = 'Jährlinge';
    else if (altersklasse === 'AK 2' && geschlecht === 'm') fachbegriff = 'Rehböcke (ab 2 Jahre)';
  } else if (wildart === 'Rotwild') {
    if (altersklasse === 'AK 0') fachbegriff = 'Kälber';
    else if (altersklasse === 'AK 1' && geschlecht === 'w') fachbegriff = 'Schmaltiere';
    else if (altersklasse === 'AK 2' && geschlecht === 'w') fachbegriff = 'Alttiere';
    else if (altersklasse === 'AK 1' && geschlecht === 'm') fachbegriff = 'Schmalspießer';
    else if (altersklasse === 'AK 2' && geschlecht === 'm') fachbegriff = 'junge Hirsche (2-4 Jahre)';
    else if (altersklasse === 'AK 3' && geschlecht === 'm') fachbegriff = 'mittelalte Hirsche (5-9 Jahre)';
    else if (altersklasse === 'AK 4' && geschlecht === 'm') fachbegriff = 'alte Hirsche (ab 10 Jahre)';
  } else if (wildart === 'Damwild') {
    if (altersklasse === 'AK 0') fachbegriff = 'Kälber';
    else if (altersklasse === 'AK 1' && geschlecht === 'w') fachbegriff = 'Schmaltiere';
    else if (altersklasse === 'AK 2' && geschlecht === 'w') fachbegriff = 'Alttiere';
    else if (altersklasse === 'AK 1' && geschlecht === 'm') fachbegriff = 'Schmalspießer';
    else if (altersklasse === 'AK 2' && geschlecht === 'm') fachbegriff = 'junge Hirsche (2-4 Jahre)';
    else if (altersklasse === 'AK 3' && geschlecht === 'm') fachbegriff = 'mittelalte Hirsche (3-7 Jahre)';
    else if (altersklasse === 'AK 4' && geschlecht === 'm') fachbegriff = 'alte Hirsche (ab 8 Jahre)';
  }
  
  // Wenn kein Schalenwild, prüfe Bemerkung für Raubwild
  if (!wildart && row.Bemerkung) {
    const bemerkung = row.Bemerkung.toLowerCase();
    if (bemerkung.includes('waschbär')) {
      return {
        datum: parseDatum(row.Datum),
        wildart: 'Waschbär',
        kategorie: 'Raubwild',
        altersklasse: '',
        geschlecht: '',
        fachbegriff: '',
        gewicht: '',
        bemerkung: row.Bemerkung,
        jaeger: row['Name Jäger'] || '',
        ort: row.Ort || '',
        einnahmen: parseEinnahmen(row.Einnahmen),
        notizen: row.Notizen || '',
      };
    } else if (bemerkung.includes('dachs')) {
      return {
        datum: parseDatum(row.Datum),
        wildart: 'Dachs',
        kategorie: 'Raubwild',
        altersklasse: '',
        geschlecht: '',
        fachbegriff: '',
        gewicht: '',
        bemerkung: row.Bemerkung,
        jaeger: row['Name Jäger'] || '',
        ort: row.Ort || '',
        einnahmen: parseEinnahmen(row.Einnahmen),
        notizen: row.Notizen || '',
      };
    } else if (bemerkung.includes('fuchs')) {
      return {
        datum: parseDatum(row.Datum),
        wildart: 'Fuchs',
        kategorie: 'Raubwild',
        altersklasse: '',
        geschlecht: '',
        fachbegriff: '',
        gewicht: '',
        bemerkung: row.Bemerkung,
        jaeger: row['Name Jäger'] || '',
        ort: row.Ort || '',
        einnahmen: parseEinnahmen(row.Einnahmen),
        notizen: row.Notizen || '',
      };
    }
  }
  
  // Wenn immer noch keine Wildart, überspringe
  if (!wildart) {
    return null;
  }
  
  return {
    datum: parseDatum(row.Datum),
    wildart,
    kategorie,
    altersklasse,
    geschlecht,
    fachbegriff,
    gewicht: row['(kg)'] || '',
    bemerkung: row.Bemerkung || '',
    jaeger: row['Name Jäger'] || '',
    ort: row.Ort || '',
    einnahmen: parseEinnahmen(row.Einnahmen),
    notizen: row.Notizen || '',
  };
};

/**
 * Parst Datum aus verschiedenen Formaten
 */
const parseDatum = (datum: string): string => {
  if (!datum) return '';
  
  // Format: "27. Mai" -> konvertiere zu "2024-05-27"
  const monate: { [key: string]: string } = {
    'januar': '01', 'februar': '02', 'märz': '03', 'april': '04',
    'mai': '05', 'juni': '06', 'juli': '07', 'august': '08',
    'september': '09', 'oktober': '10', 'november': '11', 'dezember': '12'
  };
  
  const match = datum.match(/(\d+)\.\s*(\w+)/i);
  if (match) {
    const tag = match[1].padStart(2, '0');
    const monatName = match[2].toLowerCase();
    const monat = monate[monatName];
    
    if (monat) {
      // Bestimme das Jahr basierend auf dem Monat (Mai-Dezember = 2024, sonst 2025)
      const jahr = parseInt(monat) >= 5 ? '2024' : '2025';
      return `${jahr}-${monat}-${tag}`;
    }
  }
  
  return datum;
};

/**
 * Parst Einnahmen und entfernt Euro-Zeichen und Formatierung
 */
const parseEinnahmen = (einnahmen: string): string => {
  if (!einnahmen) return '';
  
  // Entferne "€" und Leerzeichen, ersetze Komma durch Punkt
  return einnahmen
    .replace(/€/g, '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .trim();
};

/**
 * Konvertiert CSV-Text in ein Array von Einträgen
 */
export const importCSV = (csvText: string): Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>[] => {
  const rows = parseCSV(csvText);
  const eintraege = rows
    .map(row => csvRowToEintrag(row))
    .filter((eintrag): eintrag is Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'> => eintrag !== null);
  
  return eintraege;
};
