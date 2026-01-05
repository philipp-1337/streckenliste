import { useMemo } from 'react';
import type { Eintrag, AllStats } from '@types';

export const useStatistiken = (eintraege: Eintrag[]) => {
  return useMemo(() => {
    const stats: AllStats = {};
    
    eintraege.forEach(eintrag => {
      if (!stats[eintrag.wildart]) {
        stats[eintrag.wildart] = { anzahl: 0, gewicht: 0, einnahmen: 0, altersklassen: {} };
      }
      stats[eintrag.wildart].anzahl += 1;
      
      const gewicht = parseFloat(eintrag.gewicht || '0');
      stats[eintrag.wildart].gewicht += isNaN(gewicht) ? 0 : gewicht;
      
      const einnahmen = parseFloat(eintrag.einnahmen || '0');
      stats[eintrag.wildart].einnahmen += isNaN(einnahmen) ? 0 : einnahmen;
      
      const ak = eintrag.altersklasse;
      if (!stats[eintrag.wildart].altersklassen[ak]) {
        stats[eintrag.wildart].altersklassen[ak] = 0;
      }
      stats[eintrag.wildart].altersklassen[ak] += 1;
    });
    
    return stats;
  }, [eintraege]);
};
