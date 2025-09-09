
import { Plus, Filter, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


interface ActionButtonsProps {
  showFilter: boolean;
  showNewEntryForm: boolean;
  onToggleFilterPanel?: () => void;
  onToggleNewEntryForm?: () => void;
}



export const ActionButtons: React.FC<ActionButtonsProps> = ({ showFilter, showNewEntryForm, onToggleFilterPanel, onToggleNewEntryForm }) => {
  const navigate = useNavigate();
  return (
    <div className="flex gap-2 mb-6 print:hidden">
      <button
        onClick={onToggleNewEntryForm}
        className={`p-2 rounded-lg flex items-center justify-center transition-colors shadow border ${showNewEntryForm ? 'bg-red-100 border-red-400 text-red-700' : 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-800'}`}
        title={showNewEntryForm ? 'Neuen Eintrag schließen' : 'Neuer Eintrag'}
      >
        <Plus
          size={20}
          className={showNewEntryForm ? 'transition-transform duration-200 rotate-228' : 'transition-transform duration-200'}
        />
      </button>
      <button
        onClick={onToggleFilterPanel}
        className={`p-2 rounded-lg flex items-center justify-center transition-colors shadow border ${showFilter ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-neutral-200 text-neutral-800'}`}
        title="Filter anzeigen/verstecken"
      >
        <Filter size={20} />
      </button>
      <button
        onClick={() => navigate('/print')}
        className="bg-white border border-neutral-200 text-neutral-800 p-2 rounded-lg flex items-center justify-center transition-colors shadow"
        title="Drucken"
      >
        <Printer size={20} />
      </button>
    </div>
  );
};