import { memo, useEffect, useRef, useState } from 'react';
import { Filter } from 'lucide-react';
import type { FilterState } from '@types';
import { wildarten } from '@data/wildarten';

interface FilterPanelProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  onResetFilters: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = memo(({ filter, onFilterChange, onResetFilters }) => {
  const [kategorieInput, setKategorieInput] = useState(filter.kategorie);
  const [jaegerInput, setJaegerInput] = useState(filter.jaeger);
  const [prevKategorie, setPrevKategorie] = useState(filter.kategorie);
  const [prevJaeger, setPrevJaeger] = useState(filter.jaeger);
  const filterRef = useRef(filter);
  useEffect(() => { filterRef.current = filter; });

  // Sync local text state when parent resets filters (adjusting state on prop changes)
  if (prevKategorie !== filter.kategorie) {
    setPrevKategorie(filter.kategorie);
    setKategorieInput(filter.kategorie);
  }
  if (prevJaeger !== filter.jaeger) {
    setPrevJaeger(filter.jaeger);
    setJaegerInput(filter.jaeger);
  }

  // Debounce kategorie → only refilter 300ms after typing stops
  useEffect(() => {
    const t = setTimeout(() => {
      onFilterChange({ ...filterRef.current, kategorie: kategorieInput });
    }, 300);
    return () => clearTimeout(t);
  }, [kategorieInput, onFilterChange]);

  // Debounce jaeger → only refilter 300ms after typing stops
  useEffect(() => {
    const t = setTimeout(() => {
      onFilterChange({ ...filterRef.current, jaeger: jaegerInput });
    }, 300);
    return () => clearTimeout(t);
  }, [jaegerInput, onFilterChange]);

  return (
    <div className="bg-white p-4 rounded-xl mb-6 shadow">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Filter size={20} />
          <h3 className="text-base font-semibold text-green-800">Filter</h3>
        </div>
        <button
          type="button"
          onClick={onResetFilters}
          className="text-sm font-medium text-green-800 hover:text-green-900 underline underline-offset-2 cursor-pointer"
        >
          Filter zurücksetzen
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          value={filter.wildart}
          onChange={(e) => onFilterChange({...filter, wildart: e.target.value})}
          aria-label="Wildart filtern"
          className="border border-gray-300 rounded-lg px-3 py-2 h-[42px] focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        >
          <option value="">Alle Wildarten</option>
          {Object.keys(wildarten).map(wildart => (
            <option key={wildart} value={wildart}>{wildart}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Fachbegriff suchen..."
          aria-label="Nach Fachbegriff filtern"
          value={kategorieInput}
          onChange={(e) => setKategorieInput(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 h-[42px] focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        />
        <input
          type="text"
          placeholder="Jäger suchen..."
          aria-label="Nach Jäger filtern"
          value={jaegerInput}
          onChange={(e) => setJaegerInput(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 h-[42px] focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        />
        <select
          value={filter.jahr}
          onChange={(e) => onFilterChange({...filter, jahr: e.target.value})}
          aria-label="Jahr filtern"
          className="border border-gray-300 rounded-lg px-3 py-2 h-[42px] focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        >
          <option value="">Alle Jahre</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
        </select>
      </div>
    </div>
  );
});
