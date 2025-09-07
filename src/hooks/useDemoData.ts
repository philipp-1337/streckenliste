import { useState } from 'react';
import type { Eintrag } from '@types';

const beispielDaten: Eintrag[] = [
  {
    id: 'demo-1',
    datum: '2024-10-15',
    wildart: 'Rehwild',
    kategorie: 'Rehbock (ab 2 Jahre)',
    altersklasse: 'AK 2',
    geschlecht: 'm',
    fachbegriff: 'Rehbock',
    gewicht: '22',
    bemerkung: 'Morgenjagd',
    jaeger: 'Hans Müller',
    ort: 'Revier Ost',
    einnahmen: '80',
    notizen: 'Guter 6er Bock'
  },
  {
    id: 'demo-2',
    datum: '2024-11-02',
    wildart: 'Schwarzwild',
    kategorie: 'Bache',
    altersklasse: 'AK 2',
    geschlecht: 'w',
    fachbegriff: 'Bache',
    gewicht: '85',
    bemerkung: 'Drückjagd',
    jaeger: 'Maria Schmidt',
    ort: 'Revier West',
    einnahmen: '120',
    notizen: 'Führende Bache'
  },
  {
    id: 'demo-3',
    datum: '2024-09-20',
    wildart: 'Rehwild',
    kategorie: 'Kitz weiblich',
    altersklasse: 'AK 0',
    geschlecht: 'w',
    fachbegriff: 'Rickenkitz',
    gewicht: '12',
    bemerkung: 'Einzelkitz',
    jaeger: 'Klaus Weber',
    ort: 'Revier Süd',
    einnahmen: '30',
    notizen: 'Spätes Kitz'
  }
];

export const useDemoData = () => {
  const [eintraege, setEintraege] = useState<Eintrag[]>(beispielDaten);

  const addEintrag = (eintrag: Omit<Eintrag, 'id'>) => {
    const neuerEintrag: Eintrag = {
      ...eintrag,
      id: `demo-${Date.now()}`
    };
    setEintraege(prev => [...prev, neuerEintrag]);
  };

  const updateEintrag = (id: string, eintrag: Omit<Eintrag, 'id'>) => {
    setEintraege(prev => prev.map(e => 
      e.id === id ? { ...e, ...eintrag, id } : e
    ));
  };

  const deleteEintrag = (id: string) => {
    setEintraege(prev => prev.filter(e => e.id !== id));
  };

  return {
    eintraege,
    addEintrag,
    updateEintrag,
    deleteEintrag
  };
};