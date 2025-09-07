import { Plus, BarChart3, Download } from 'lucide-react';

interface ActionButtonsProps {
  onNewEntry: () => void;
  onToggleStats: () => void;
  onExportCSV: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onNewEntry,
  onToggleStats,
  onExportCSV
}) => {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
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
    </div>
  );
};