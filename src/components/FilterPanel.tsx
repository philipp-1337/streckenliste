import { memo, useEffect, useRef, useState } from 'react';
import { Filter } from 'lucide-react';
import type { FilterState } from '@types';
import { wildarten } from '@data/wildarten';

interface JaegerFilterOption {
  value: string;
  label: string;
}

interface FilterPanelProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
  onResetFilters: () => void;
  jaegerOptions: JaegerFilterOption[];
}

export const FilterPanel: React.FC<FilterPanelProps> = memo(({ filter, onFilterChange, onResetFilters, jaegerOptions }) => {
  const [kategorieInput, setKategorieInput] = useState(filter.kategorie);
  const [prevKategorie, setPrevKategorie] = useState(filter.kategorie);
  const filterRef = useRef(filter);
  useEffect(() => { filterRef.current = filter; });

  // Sync local text state when parent resets filters (adjusting state on prop changes)
  if (prevKategorie !== filter.kategorie) {
    setPrevKategorie(filter.kategorie);
    setKategorieInput(filter.kategorie);
  }

  // Debounce kategorie → only refilter 300ms after typing stops
  useEffect(() => {
    const t = setTimeout(() => {
      onFilterChange({ ...filterRef.current, kategorie: kategorieInput });
    }, 300);
    return () => clearTimeout(t);
  }, [kategorieInput, onFilterChange]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <select
          value={filter.wildart}
          onChange={(e) => onFilterChange({...filter, wildart: e.target.value})}
          aria-label="Wildart filtern"
          className="border border-gray-300 rounded-lg px-3 py-2 h-[42px] text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
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
          className="border border-gray-300 rounded-lg px-3 py-2 h-[42px] text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        />
        <select
          value={filter.jaegerId}
          onChange={(e) => onFilterChange({ ...filter, jaegerId: e.target.value })}
          aria-label="Nach Jäger filtern"
          className="border border-gray-300 rounded-lg px-3 py-2 h-[42px] text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        >
          <option value="">Alle Jäger</option>
          {jaegerOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          value={filter.jahr}
          onChange={(e) => onFilterChange({...filter, jahr: e.target.value})}
          aria-label="Jahr filtern"
          className="border border-gray-300 rounded-lg px-3 py-2 h-[42px] text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        >
          <option value="">Alle Jahre</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
        </select>
        <select
          value={filter.status}
          onChange={(e) => onFilterChange({...filter, status: e.target.value})}
          aria-label="Status filtern"
          className="border border-gray-300 rounded-lg px-3 py-2 h-[42px] text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        >
          <option value="">Alle Status</option>
          <option value="approved">Freigegeben</option>
          <option value="pending">Ausstehend</option>
          <option value="rejected">Abgelehnt</option>
        </select>
      </div>
    </div>
  );
});
