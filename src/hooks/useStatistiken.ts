import { useMemo } from 'react';
import type { Eintrag, AllStats } from '@types';

export const useStatistiken = (eintraege: Eintrag[]) => {
  return useMemo(() => {
    const stats: AllStats = {};

    eintraege.forEach(eintrag => {
      if (!stats[eintrag.wildart]) {
        stats[eintrag.wildart] = { anzahl: 0, gewicht: 0, einnahmen: 0, altersklassen: {} };
      }
      if (eintrag.wildart === 'Sonstige' && eintrag.fachbegriff) {
        if (!stats[eintrag.wildart].sonstigeDetails) {
          stats[eintrag.wildart].sonstigeDetails = {};
        }
        const countMatch = (eintrag.bemerkung || '').match(/^(\d+)\s*x/i);
        const count = countMatch ? parseInt(countMatch[1], 10) : 1;
        const type = eintrag.fachbegriff;
        stats[eintrag.wildart].sonstigeDetails![type] = (stats[eintrag.wildart].sonstigeDetails![type] ?? 0) + count;
        stats[eintrag.wildart].anzahl += count;
      } else {
        stats[eintrag.wildart].anzahl += 1;
      }

      const gewicht = parseFloat(eintrag.gewicht || '0');
      stats[eintrag.wildart].gewicht += isNaN(gewicht) ? 0 : gewicht;

      const einnahmen = parseFloat(eintrag.einnahmen || '0');
      stats[eintrag.wildart].einnahmen += isNaN(einnahmen) ? 0 : einnahmen;

      const isFallwild = (eintrag.bemerkung || '').toLowerCase().includes('fallwild');

      const ak = eintrag.altersklasse;
      if (!stats[eintrag.wildart].altersklassen[ak]) {
        stats[eintrag.wildart].altersklassen[ak] = {
          gesamt: 0,
          fallwild: 0,
          männlich: { gesamt: 0, fallwild: 0 },
          weiblich: { gesamt: 0, fallwild: 0 },
          unbekannt: { gesamt: 0, fallwild: 0 },
        };
      }
      const akStats = stats[eintrag.wildart].altersklassen[ak];
      akStats.gesamt += 1;
      if (isFallwild) akStats.fallwild += 1;

      const g = (eintrag.geschlecht || '').toLowerCase();
      let gStats = akStats.unbekannt;
      if (g === 'männlich' || g === 'maennlich' || g === 'm') gStats = akStats.männlich;
      else if (g === 'weiblich' || g === 'w') gStats = akStats.weiblich;
      gStats.gesamt += 1;
      if (isFallwild) gStats.fallwild += 1;
    });

    return stats;
  }, [eintraege]);
};
