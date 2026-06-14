import { useMemo } from 'react';
import type { Eintrag, AllStats, MonatStat } from '@types';
import { getJagdjahr } from '@utils/jagdjahrUtils';

const MONTH_NAMES = ['Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez', 'Jan', 'Feb', 'Mär'];

export const useStatistiken = (eintraege: Eintrag[], filterJagdjahr?: string) => {
  return useMemo(() => {
    const wildartStats: AllStats = {};
    const monatsMap = new Map<string, number>();
    const jahrMonatsMap = new Map<string, Map<string, number>>();
    const uniqueJagdjahre = new Set<string>();

    // Initialize map
    MONTH_NAMES.forEach(m => monatsMap.set(m, 0));

    eintraege.forEach(eintrag => {
      // 1. Calculate Wildart Stats
      if (!wildartStats[eintrag.wildart]) {
        wildartStats[eintrag.wildart] = { anzahl: 0, gewicht: 0, einnahmen: 0, altersklassen: {} };
      }
      
      let entryCount = 1;
      if (eintrag.wildart === 'Sonstige' && eintrag.fachbegriff) {
        if (!wildartStats[eintrag.wildart].sonstigeDetails) {
          wildartStats[eintrag.wildart].sonstigeDetails = {};
        }
        if (eintrag.anzahl !== undefined) {
          entryCount = eintrag.anzahl;
        } else {
          const countMatch = (eintrag.bemerkung || '').match(/^(\d+)\s*x/i);
          entryCount = countMatch ? parseInt(countMatch[1], 10) : 1;
        }
        const type = eintrag.fachbegriff;
        wildartStats[eintrag.wildart].sonstigeDetails![type] = (wildartStats[eintrag.wildart].sonstigeDetails![type] ?? 0) + entryCount;
        wildartStats[eintrag.wildart].anzahl += entryCount;
      } else {
        wildartStats[eintrag.wildart].anzahl += 1;
      }

      const gewicht = parseFloat(eintrag.gewicht || '0');
      wildartStats[eintrag.wildart].gewicht += isNaN(gewicht) ? 0 : gewicht;

      const einnahmen = parseFloat(eintrag.einnahmen || '0');
      wildartStats[eintrag.wildart].einnahmen += isNaN(einnahmen) ? 0 : einnahmen;

      const isFallwild = eintrag.fallwild !== undefined
        ? eintrag.fallwild
        : (eintrag.bemerkung || '').toLowerCase().includes('fallwild');

      const ak = eintrag.altersklasse;
      if (!wildartStats[eintrag.wildart].altersklassen[ak]) {
        wildartStats[eintrag.wildart].altersklassen[ak] = {
          gesamt: 0,
          fallwild: 0,
          männlich: { gesamt: 0, fallwild: 0 },
          weiblich: { gesamt: 0, fallwild: 0 },
          unbekannt: { gesamt: 0, fallwild: 0 },
        };
      }
      const akStats = wildartStats[eintrag.wildart].altersklassen[ak];
      akStats.gesamt += 1;
      if (isFallwild) akStats.fallwild += 1;

      const g = (eintrag.geschlecht || '').toLowerCase();
      let gStats = akStats.unbekannt;
      if (g === 'männlich' || g === 'maennlich' || g === 'm') gStats = akStats.männlich;
      else if (g === 'weiblich' || g === 'w') gStats = akStats.weiblich;
      gStats.gesamt += 1;
      if (isFallwild) gStats.fallwild += 1;
      
      // 2. Calculate Monats Stats
      const d = new Date(eintrag.datum);
      if (!isNaN(d.getTime())) {
        const monthIndex = d.getMonth(); // 0 = Jan, 3 = Apr
        // Map standard month index to our hunting year order (Apr=0, Mar=11)
        const huntingMonthIndex = (monthIndex >= 3) ? monthIndex - 3 : monthIndex + 9;
        const monthName = MONTH_NAMES[huntingMonthIndex];
        monatsMap.set(monthName, (monatsMap.get(monthName) || 0) + entryCount);
        
        const jj = getJagdjahr(d);
        if (jj) {
          uniqueJagdjahre.add(jj);
          if (!jahrMonatsMap.has(jj)) {
            const newMap = new Map<string, number>();
            MONTH_NAMES.forEach(m => newMap.set(m, 0));
            jahrMonatsMap.set(jj, newMap);
          }
          const yearMap = jahrMonatsMap.get(jj)!;
          yearMap.set(monthName, (yearMap.get(monthName) || 0) + entryCount);
        }
      }
    });

    const isAverage = !filterJagdjahr && uniqueJagdjahre.size > 1;
    const divisor = isAverage ? uniqueJagdjahre.size : 1;
    const availableJahre = Array.from(uniqueJagdjahre).sort().reverse();

    const monatsStats: MonatStat[] = MONTH_NAMES.map(name => {
      const stat: MonatStat = {
        name,
        anzahl: divisor > 1 ? Math.round((monatsMap.get(name) || 0) / divisor * 10) / 10 : (monatsMap.get(name) || 0)
      };
      
      if (isAverage) {
        availableJahre.forEach(jahr => {
          stat[jahr] = jahrMonatsMap.get(jahr)?.get(name) || 0;
        });
      }
      
      return stat;
    });

    return { wildartStats, monatsStats, isAverage, availableJahre };
  }, [eintraege, filterJagdjahr]);
};
