import { useState, useMemo } from 'react';
import type { Eintrag, FilterState } from '@types';
import { isDateInJagdjahr, getCurrentJagdjahr } from '@utils/jagdjahrUtils';

export const useFilter = (eintraege: Eintrag[]) => {
  const [filter, setFilter] = useState<FilterState>({
    wildart: '',
    jaeger: '',
    jahr: '',
    kategorie: '',
    jagdjahr: getCurrentJagdjahr(),
    status: ''
  });

  const filteredEintraege = useMemo(() => {
    return eintraege.filter(eintrag => {
      const matchWildart = !filter.wildart || eintrag.wildart === filter.wildart;
      const matchJaeger = !filter.jaeger || eintrag.jaeger.toLowerCase().includes(filter.jaeger.toLowerCase());
      const matchJahr = !filter.jahr || eintrag.datum.startsWith(filter.jahr);
      const matchKategorie = !filter.kategorie || eintrag.fachbegriff.toLowerCase().includes(filter.kategorie.toLowerCase());
      const matchJagdjahr = !filter.jagdjahr || isDateInJagdjahr(eintrag.datum, filter.jagdjahr);
      const matchStatus = !filter.status || 
        (filter.status === 'approved' && (eintrag.status === 'approved' || !eintrag.status)) ||
        eintrag.status === filter.status;
      return matchWildart && matchJaeger && matchJahr && matchKategorie && matchJagdjahr && matchStatus;
    });
  }, [eintraege, filter]);

  return {
    filter,
    setFilter,
    filteredEintraege
  };
};
