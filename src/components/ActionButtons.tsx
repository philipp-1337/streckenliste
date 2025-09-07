import { Plus, BarChart3, Download, Filter, Printer } from 'lucide-react';

interface ActionButtonsProps {
  onNewEntry: () => void;
  onToggleStats: () => void;
  onExportCSV: () => void;
  onPrint: () => void;
  onToggleFilter: () => void;
  showFilter: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onNewEntry,
  onToggleStats,
  onExportCSV,
  onPrint,
  onToggleFilter,
  showFilter,
}) => {
  return (
    <div className="flex flex-wrap gap-4 mb-6 print:hidden">
      <button
        onClick={onNewEntry}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
      >
        <Plus size={20} />
        Neuer Eintrag
      </button>
      <button
        onClick={onToggleStats}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
      >
        <BarChart3 size={20} />
        Statistiken
      </button>
      <button
        onClick={onExportCSV}
        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
      >
        <Download size={20} />
        CSV Export
      </button>
      <button
        onClick={onToggleFilter}
        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
      >
        <Filter size={20} />
        {showFilter ? 'Filter ausblenden' : 'Filter einblenden'}
      </button>
      <button
        onClick={onPrint}
        className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
      >
        <Printer size={20} />
        Drucken
      </button>
    </div>
  );
};