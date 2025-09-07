import type { Eintrag } from '@types';

export const exportToCSV = (eintraege: Eintrag[]) => {
  const headers = [
    'Nr.', 'Datum', 'Wildart', 'Kategorie', 'Fachbegriff', 
    'Altersklasse', 'Geschlecht', 'Gewicht (kg)', 'Bemerkung', 
    'Name Jäger', 'Ort', 'Einnahmen', 'Notizen'
  ];
  
  const csvContent = [
    headers.join(','),
    ...eintraege.map((eintrag, index) => [
      index + 1,
      eintrag.datum,
      `"${eintrag.wildart}"`, 
      `"${eintrag.kategorie}"`, 
      `"${eintrag.fachbegriff}"`, 
      eintrag.altersklasse,
      eintrag.geschlecht,
      eintrag.gewicht,
      `"${eintrag.bemerkung}"`, 
      `"${eintrag.jaeger}"`, 
      `"${eintrag.ort}"`, 
      eintrag.einnahmen,
      `"${eintrag.notizen}"`
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `streckenliste_${new Date().getFullYear()}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
};