import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Spinner from '@components/Spinner';
import { Edit, Trash2, Mars, Venus, ChevronUp, ChevronDown, ChevronsUpDown, Check, SlidersHorizontal } from 'lucide-react';
import type { Eintrag, UserData } from '@types';
import { sanitizeHtml } from '@utils/sanitization';

const COLUMNS = [
  { id: 'nr',                  label: 'Nr.',         mandatory: true,  sortable: false },
  { id: 'datum',               label: 'Datum',       mandatory: true,  sortable: true  },
  { id: 'wildart',             label: 'Wildart',     mandatory: true,  sortable: true  },
  { id: 'fachbegriff',         label: 'Fachbegriff', mandatory: false, sortable: true  },
  { id: 'altersklasse',        label: 'AK',          mandatory: false, sortable: true  },
  { id: 'geschlecht',          label: '♂/♀',         mandatory: false, sortable: false },
  { id: 'gewicht',             label: 'kg',          mandatory: false, sortable: true  },
  { id: 'jaeger',              label: 'Jäger',       mandatory: false, sortable: true  },
  { id: 'ort',                 label: 'Ort/Revier',  mandatory: false, sortable: true  },
  { id: 'bemerkung',           label: 'Bemerkung',   mandatory: false, sortable: true  },
  { id: 'wildursprungsschein', label: 'WUS',         mandatory: false, sortable: true  },
  { id: 'aktionen',            label: 'Aktionen',    mandatory: true,  sortable: false },
] as const;

type ColumnId = typeof COLUMNS[number]['id'];

const STORAGE_KEY = 'eintragTableVisibleColumns';

function loadVisibleColumns(): ColumnId[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ColumnId[];
      const mandatory = COLUMNS.filter(c => c.mandatory).map(c => c.id as ColumnId);
      const valid = parsed.filter((id): id is ColumnId => COLUMNS.some(c => c.id === id));
      return [...new Set([...mandatory, ...valid])];
    }
  } catch {}
  return COLUMNS.map(c => c.id as ColumnId);
}

interface EintragTableProps {
  eintraege: Eintrag[];
  onEdit?: (eintrag: Eintrag) => void;
  onDelete: (id: string) => void;
  onApprove?: (id: string) => Promise<void>;
  currentUser: UserData | null;
}

export const EintragTable: React.FC<EintragTableProps> = memo(({
  eintraege,
  onEdit,
  onDelete,
  onApprove,
  currentUser,
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(loadVisibleColumns);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isVisible = (id: ColumnId) => visibleColumns.includes(id);

  const toggleColumn = (id: ColumnId) => {
    const col = COLUMNS.find(c => c.id === id);
    if (col?.mandatory) return;
    setVisibleColumns(prev => {
      const next = prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleToggleColumnPicker = () => {
    if (!showColumnPicker && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setShowColumnPicker(v => !v);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !buttonRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setShowColumnPicker(false);
      }
    };
    if (showColumnPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnPicker]);

  const handleEdit = async (eintrag: Eintrag) => {
    if (!onEdit) return;
    setLoadingId(eintrag.id);
    await Promise.resolve(onEdit(eintrag));
    setLoadingId(null);
  };

  const handleDelete = async (id: string) => {
    setLoadingId(id);
    await Promise.resolve(onDelete(id));
    setLoadingId(null);
  };

  const handleApprove = async (id: string) => {
    if (!onApprove) return;
    setLoadingId(id);
    await onApprove(id);
    setLoadingId(null);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn('');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedEintraege = useMemo(() => {
    if (!sortColumn) return eintraege;
    return [...eintraege].sort((a, b) => {
      let aValue: string | number | undefined = a[sortColumn as keyof Eintrag] as string | number | undefined;
      let bValue: string | number | undefined = b[sortColumn as keyof Eintrag] as string | number | undefined;
      if (sortColumn === 'datum') {
        aValue = new Date(a.datum).getTime();
        bValue = new Date(b.datum).getTime();
      }
      if (sortColumn === 'gewicht') {
        aValue = a.gewicht ? Number(a.gewicht) : 0;
        bValue = b.gewicht ? Number(b.gewicht) : 0;
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const cmp = aValue.localeCompare(bValue, 'de', { numeric: true });
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });
  }, [eintraege, sortColumn, sortDirection]);

  const SortIcon = ({ col }: { col: string }) =>
    sortColumn === col
      ? (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)
      : <ChevronsUpDown size={16} className="opacity-70 group-hover:opacity-100" />;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-green-800 text-white">
            <tr>
              {isVisible('nr') && <th className="px-4 py-3 text-left text-sm font-medium">Nr.</th>}
              {isVisible('datum') && (
                <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('datum')}>
                  <span className="inline-flex items-center gap-1">Datum <SortIcon col="datum" /></span>
                </th>
              )}
              {isVisible('wildart') && (
                <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('wildart')}>
                  <span className="inline-flex items-center gap-1">Wildart <SortIcon col="wildart" /></span>
                </th>
              )}
              {isVisible('fachbegriff') && (
                <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('fachbegriff')}>
                  <span className="inline-flex items-center gap-1">Fachbegriff <SortIcon col="fachbegriff" /></span>
                </th>
              )}
              {isVisible('altersklasse') && (
                <th className="px-4 py-3 text-center text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('altersklasse')}>
                  <span className="inline-flex items-center gap-1">AK <SortIcon col="altersklasse" /></span>
                </th>
              )}
              {isVisible('geschlecht') && (
                <th className="px-4 py-3 text-center text-sm font-medium">
                  <div className="flex items-center justify-center gap-0.5">
                    <Mars size={14} /><span>/</span><Venus size={14} />
                  </div>
                </th>
              )}
              {isVisible('gewicht') && (
                <th className="px-4 py-3 text-center text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('gewicht')}>
                  <span className="inline-flex items-center gap-1">kg <SortIcon col="gewicht" /></span>
                </th>
              )}
              {isVisible('jaeger') && (
                <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('jaeger')}>
                  <span className="inline-flex items-center gap-1">Jäger <SortIcon col="jaeger" /></span>
                </th>
              )}
              {isVisible('ort') && (
                <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('ort')}>
                  <span className="inline-flex items-center gap-1">Ort/Revier <SortIcon col="ort" /></span>
                </th>
              )}
              {isVisible('bemerkung') && (
                <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('bemerkung')}>
                  <span className="inline-flex items-center gap-1">Bemerkung <SortIcon col="bemerkung" /></span>
                </th>
              )}
              {isVisible('wildursprungsschein') && (
                <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('wildursprungsschein')}>
                  <span className="inline-flex items-center gap-1">WUS <SortIcon col="wildursprungsschein" /></span>
                </th>
              )}
              {isVisible('aktionen') && <th className="px-4 py-3 text-center text-sm font-medium">Aktionen</th>}
              <th className="px-2 py-3">
                <div className="flex justify-end">
                  <button
                    ref={buttonRef}
                    onClick={handleToggleColumnPicker}
                    className="text-white/70 hover:text-white hover:bg-green-700 p-1 rounded transition-colors cursor-pointer"
                    title="Spalten konfigurieren"
                  >
                    <SlidersHorizontal size={15} />
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedEintraege.map((eintrag, index) => {
              const isPending = eintrag.status === 'pending';
              return (
                <tr key={eintrag.id} className={`hover:bg-gray-50 ${isPending ? 'bg-amber-50' : ''}`}>
                  {isVisible('nr') && <td className="px-4 py-3 text-sm">{index + 1}</td>}
                  {isVisible('datum') && (
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {new Date(eintrag.datum).toLocaleDateString('de-DE')}
                        {isPending && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-300 whitespace-nowrap">
                            Ausstehend
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  {isVisible('wildart') && <td className="px-4 py-3 text-sm font-medium">{eintrag.wildart}</td>}
                  {isVisible('fachbegriff') && <td className="px-4 py-3 text-sm font-medium text-green-700 whitespace-nowrap">{eintrag.fachbegriff}</td>}
                  {isVisible('altersklasse') && <td className="px-4 py-3 text-center text-sm whitespace-nowrap">{eintrag.altersklasse}</td>}
                  {isVisible('geschlecht') && (
                    <td className="px-4 py-3 text-center text-sm">
                      <div className="flex items-center justify-center">
                        {!['Raubwild', 'Invasive Arten'].includes(eintrag.kategorie) && (
                          eintrag.geschlecht === 'm' ? <Mars size={16} /> : eintrag.geschlecht === 'w' ? <Venus size={16} /> : null
                        )}
                      </div>
                    </td>
                  )}
                  {isVisible('gewicht') && <td className="px-4 py-3 text-center text-sm">{eintrag.gewicht || '-'}</td>}
                  {isVisible('jaeger') && <td className="px-4 py-3 text-sm">{eintrag.jaeger}</td>}
                  {isVisible('ort') && <td className="px-4 py-3 text-sm">{eintrag.ort || '-'}</td>}
                  {isVisible('bemerkung') && <td className="px-4 py-3 text-sm">{sanitizeHtml(eintrag.bemerkung || '')}</td>}
                  {isVisible('wildursprungsschein') && <td className="px-4 py-3 text-sm">{eintrag.wildursprungsschein || '-'}</td>}
                  {isVisible('aktionen') && (
                    <td className="px-4 py-3 text-center">
                      {(currentUser?.role === 'admin' || currentUser?.uid === eintrag.userId) && (
                        <div className="flex justify-center gap-2">
                          {currentUser?.role === 'admin' && isPending && onApprove && (
                            <button
                              onClick={() => handleApprove(eintrag.id)}
                              className="text-green-600 hover:text-green-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              title="Freigeben"
                              disabled={loadingId === eintrag.id}
                            >
                              {loadingId === eintrag.id ? <Spinner size={16} /> : <Check size={16} />}
                            </button>
                          )}
                          {onEdit && (
                            <button
                              onClick={() => handleEdit(eintrag)}
                              className="text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              title="Bearbeiten"
                              disabled={loadingId === eintrag.id}
                            >
                              {loadingId === eintrag.id ? <Spinner size={16} /> : <Edit size={16} />}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(eintrag.id)}
                            className="text-red-600 hover:text-red-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            title="Löschen"
                            disabled={loadingId === eintrag.id}
                          >
                            {loadingId === eintrag.id ? <Spinner size={16} /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                  <td></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {eintraege.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Keine Einträge gefunden. Erstellen Sie den ersten Eintrag!
        </div>
      )}

      {showColumnPicker && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] py-1"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          {COLUMNS.filter(c => !c.mandatory).map(col => (
            <label
              key={col.id}
              className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
            >
              <input
                type="checkbox"
                checked={isVisible(col.id)}
                onChange={() => toggleColumn(col.id)}
                className="accent-green-700"
              />
              {col.label}
            </label>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
});
