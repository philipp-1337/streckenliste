
import { Plus, BarChart3, Filter, Printer, MoreVertical } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ActionButtonsProps {
  showFilter: boolean;
  onToggleFilterPanel?: () => void;
  onShowNewEntryForm?: () => void;
}


export const ActionButtons: React.FC<ActionButtonsProps> = ({ showFilter, onToggleFilterPanel, onShowNewEntryForm }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative mb-6 print:hidden" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <MoreVertical size={20} />
        Aktionen
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-56 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
          <button
            onClick={() => { setOpen(false); if (onShowNewEntryForm) onShowNewEntryForm(); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-neutral-800 hover:bg-neutral-100 transition-colors text-left"
          >
            <Plus size={18} /> Neuer Eintrag
          </button>
          <button
            onClick={() => { setOpen(false); if (onToggleFilterPanel) onToggleFilterPanel(); }}
            className={`w-full flex items-center gap-2 px-4 py-3 text-neutral-800 hover:bg-neutral-100 transition-colors text-left ${showFilter ? 'font-bold text-green-700' : ''}`}
          >
            <Filter size={18} /> Filter {showFilter ? '(aktiv)' : ''}
          </button>
          <button
            onClick={() => { setOpen(false); navigate('/print'); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-neutral-800 hover:bg-neutral-100 transition-colors text-left"
          >
            <Printer size={18} /> Drucken
          </button>
        </div>
      )}
    </div>
  );
};