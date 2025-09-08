import { Plus, BarChart3, Download, Filter, Printer, MoreVertical } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

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
            onClick={() => { setOpen(false); onNewEntry(); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-neutral-800 hover:bg-neutral-100 transition-colors text-left"
          >
            <Plus size={18} /> Neuer Eintrag
          </button>
          <button
            onClick={() => { setOpen(false); onToggleStats(); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-neutral-800 hover:bg-neutral-100 transition-colors text-left"
          >
            <BarChart3 size={18} /> Statistiken
          </button>
          <button
            onClick={() => { setOpen(false); onExportCSV(); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-neutral-800 hover:bg-neutral-100 transition-colors text-left"
          >
            <Download size={18} /> CSV Export
          </button>
          <button
            onClick={() => { setOpen(false); onToggleFilter(); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-neutral-800 hover:bg-neutral-100 transition-colors text-left"
          >
            <Filter size={18} /> {showFilter ? 'Filter ausblenden' : 'Filter einblenden'}
          </button>
          <button
            onClick={() => { setOpen(false); onPrint(); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-neutral-800 hover:bg-neutral-100 transition-colors text-left"
          >
            <Printer size={18} /> Drucken
          </button>
        </div>
      )}
    </div>
  );
};