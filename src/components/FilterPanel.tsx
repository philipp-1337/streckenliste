import { memo } from 'react';
import { Filter } from 'lucide-react';
import type { FilterState } from '@types';
import { wildarten } from '@data/wildarten';

interface FilterPanelProps {
  filter: FilterState;
  onFilterChange: (filter: FilterState) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = memo(({ filter, onFilterChange }) => {
  return (
    <div className="bg-white p-4 rounded-lg mb-6 shadow">
      <div className="flex items-center gap-2 mb-3">
        <Filter size={20} />
        <h3 className="font-semibold">Filter</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          value={filter.wildart}
          onChange={(e) => onFilterChange({...filter, wildart: e.target.value})}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">Alle Wildarten</option>
          {Object.keys(wildarten).map(wildart => (
            <option key={wildart} value={wildart}>{wildart}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Kategorie suchen..."
          value={filter.kategorie}
          onChange={(e) => onFilterChange({...filter, kategorie: e.target.value})}
          className="border rounded-lg px-3 py-2"
        />
        <input
          type="text"
          placeholder="Jäger suchen..."
          value={filter.jaeger}
          onChange={(e) => onFilterChange({...filter, jaeger: e.target.value})}
          className="border rounded-lg px-3 py-2"
        />
        <select
          value={filter.jahr}
          onChange={(e) => onFilterChange({...filter, jahr: e.target.value})}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">Alle Jahre</option>
          <option value="2024">2024</option>
          <option value="2025">2025</option>
        </select>
      </div>
    </div>
  );
});
