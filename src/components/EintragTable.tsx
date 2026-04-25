import { memo, useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Spinner from '@components/Spinner';
import { Edit, Trash2, Mars, Venus, ChevronUp, ChevronDown, ChevronsUpDown, Check, SlidersHorizontal, X, RotateCcw, Clock, MoreVertical } from 'lucide-react';
import type { Eintrag, UserData } from '@types';
import { sanitizeHtml } from '@utils/sanitization';

const COLUMNS = [
  { id: 'nr',                  label: 'Nr.',          mandatory: true,  sortable: false },
  { id: 'datum',               label: 'Datum',        mandatory: true,  sortable: true  },
  { id: 'wildart',             label: 'Wildart',      mandatory: true,  sortable: true  },
  { id: 'fachbegriff',         label: 'Fachbegriff',  mandatory: false, sortable: true  },
  { id: 'altersklasse',        label: 'Altersklasse', mandatory: false, sortable: true  },
  { id: 'geschlecht',          label: 'Geschlecht',   mandatory: false, sortable: false },
  { id: 'gewicht',             label: 'Gewicht',      mandatory: false, sortable: true  },
  { id: 'jaeger',              label: 'Jäger',        mandatory: false, sortable: true  },
  { id: 'ort',                 label: 'Ort/Revier',   mandatory: false, sortable: true  },
  { id: 'bemerkung',           label: 'Bemerkung',    mandatory: false, sortable: true  },
  { id: 'wildursprungsschein', label: 'WUS',          mandatory: false, sortable: true  },
  { id: 'aktionen',            label: 'Aktionen',     mandatory: true,  sortable: false },
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
  } catch {
    // Fall back to the default column set when persisted data is invalid.
  }
  return COLUMNS.map(c => c.id as ColumnId);
}

interface EintragTableProps {
  eintraege: Eintrag[];
  onEdit?: (eintrag: Eintrag) => void;
  onDelete: (id: string) => void;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => void;
  onResetToPending?: (id: string) => Promise<void>;
  onShowHistory?: (eintrag: Eintrag) => void;
  currentUser: UserData | null;
  mobileViewMode?: 'cards' | 'table';
}

export const EintragTable: React.FC<EintragTableProps> = memo(({
  eintraege,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onResetToPending,
  onShowHistory,
  currentUser,
  mobileViewMode = 'table',
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(loadVisibleColumns);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const [actionMenuPos, setActionMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [swipedOpenId, setSwipedOpenId] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isSwipingRef = useRef(false);

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

  const handleToggleActionMenu = (id: string, button: HTMLButtonElement) => {
    if (openActionMenuId === id) {
      setOpenActionMenuId(null);
      return;
    }

    const rect = button.getBoundingClientRect();
    const menuWidth = 220;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));

    actionMenuButtonRef.current = button;
    setActionMenuPos({ top: rect.bottom + 4, left });
    setOpenActionMenuId(id);
  };

  const closeActionMenu = () => {
    setOpenActionMenuId(null);
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !actionMenuButtonRef.current?.contains(e.target as Node) &&
        !actionMenuRef.current?.contains(e.target as Node)
      ) {
        closeActionMenu();
      }
    };

    const handleViewportChange = () => {
      closeActionMenu();
    };

    if (openActionMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleViewportChange);
      window.addEventListener('scroll', handleViewportChange, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [openActionMenuId]);

  const handleEdit = async (eintrag: Eintrag) => {
    if (!onEdit) return;
    setLoadingId(eintrag.id);
    await Promise.resolve(onEdit(eintrag));
    setLoadingId(null);
  };

  const handleDelete = async (id: string) => {
    closeActionMenu();
    setLoadingId(id);
    await Promise.resolve(onDelete(id));
    setLoadingId(null);
  };

  const handleApprove = async (id: string) => {
    if (!onApprove) return;
    closeActionMenu();
    setLoadingId(id);
    await onApprove(id);
    setLoadingId(null);
  };

  const handleReject = (id: string) => {
    closeActionMenu();
    onReject?.(id);
  };

  const handleResetToPending = async (id: string) => {
    if (!onResetToPending) return;
    closeActionMenu();
    setLoadingId(id);
    await onResetToPending(id);
    setLoadingId(null);
  };

  const handleShowHistory = (eintrag: Eintrag) => {
    closeActionMenu();
    onShowHistory?.(eintrag);
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

  const selectedMenuEintrag = useMemo(
    () => eintraege.find(eintrag => eintrag.id === openActionMenuId),
    [eintraege, openActionMenuId]
  );

  const renderSortIcon = (col: string) =>
    sortColumn === col
      ? (sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />)
      : <ChevronsUpDown size={16} className="opacity-70 group-hover:opacity-100" />;

  const handleCardTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isSwipingRef.current = false;
  };

  const handleCardTouchEnd = (e: React.TouchEvent, id: string, canAct: boolean) => {
    if (!canAct) return;
    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    const dy = e.changedTouches[0].clientY - touchStartYRef.current;
    if (Math.abs(dx) < 44 || Math.abs(dy) > Math.abs(dx)) return;
    isSwipingRef.current = true;
    if (dx < 0) {
      setSwipedOpenId(id);
      setExpandedCardId(null);
    } else {
      setSwipedOpenId(prev => (prev === id ? null : prev));
    }
  };

  const handleCardClick = (id: string) => {
    if (isSwipingRef.current) { isSwipingRef.current = false; return; }
    if (swipedOpenId === id) { setSwipedOpenId(null); return; }
    setExpandedCardId(prev => (prev === id ? null : id));
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-clip">
      <div className={`${mobileViewMode === 'table' ? 'block' : 'hidden sm:block'} overflow-auto max-h-[calc(100dvh-14rem)]`}>
        <table className="min-w-full">
          <thead className="bg-green-800 text-white sticky top-0 z-10">
            <tr>
              {isVisible('nr') && <th className="w-14 px-4 py-3 text-left text-sm font-medium sticky left-0 z-[11] bg-green-800">Nr.</th>}
              {isVisible('datum') && (
                <th
                  className={`px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group${isVisible('nr') ? ' left-14 z-[11] bg-green-800' : ''}`}
                  onClick={() => handleSort('datum')}
                >
                  <span className="inline-flex items-center gap-1">Datum {renderSortIcon('datum')}</span>
                </th>
              )}
              {isVisible('wildart') && (
                <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('wildart')}>
                  <span className="inline-flex items-center gap-1">Wildart {renderSortIcon('wildart')}</span>
                </th>
              )}
              {isVisible('fachbegriff') && (
                <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('fachbegriff')}>
                  <span className="inline-flex items-center gap-1">Fachbegriff {renderSortIcon('fachbegriff')}</span>
                </th>
              )}
              {isVisible('altersklasse') && (
                <th className="px-4 py-3 text-center text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('altersklasse')}>
                  <span className="inline-flex items-center gap-1">AK {renderSortIcon('altersklasse')}</span>
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
                  <span className="inline-flex items-center gap-1">kg {renderSortIcon('gewicht')}</span>
                </th>
              )}
              {isVisible('jaeger') && (
                <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('jaeger')}>
                  <span className="inline-flex items-center gap-1">Jäger {renderSortIcon('jaeger')}</span>
                </th>
              )}
              {isVisible('ort') && (
                <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('ort')}>
                  <span className="inline-flex items-center gap-1">Ort/Revier {renderSortIcon('ort')}</span>
                </th>
              )}
              {isVisible('bemerkung') && (
                <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('bemerkung')}>
                  <span className="inline-flex items-center gap-1">Bemerkung {renderSortIcon('bemerkung')}</span>
                </th>
              )}
              {isVisible('wildursprungsschein') && (
                <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('wildursprungsschein')}>
                  <span className="inline-flex items-center gap-1">WUS {renderSortIcon('wildursprungsschein')}</span>
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
              const isRejected = eintrag.status === 'rejected';
              return (
                <tr key={eintrag.id} className={`hover:bg-gray-50 ${isPending ? 'bg-amber-50' : ''} ${isRejected ? 'bg-rose-50' : ''}`}>
                  {isVisible('nr') && <td className={`px-4 py-3 text-sm sticky left-0 z-[1] ${isPending ? 'bg-amber-50' : isRejected ? 'bg-rose-50' : 'bg-white'}`}>{index + 1}</td>}
                  {isVisible('datum') && (
                    <td className={`px-4 py-3 text-sm${isVisible('nr') ? ` left-14 z-[1] ${isPending ? 'bg-amber-50' : isRejected ? 'bg-rose-50' : 'bg-white'}` : ''}`}>
                      <div className="flex items-center gap-2">
                        {new Date(eintrag.datum).toLocaleDateString('de-DE')}
                        {isPending && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-300 whitespace-nowrap">
                            Ausstehend
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 border border-rose-300 whitespace-nowrap">
                            Abgelehnt
                          </span>
                        )}
                        {isRejected && eintrag.ablehnungsGrund && (
                          <p className="text-[10px] text-rose-600 mt-0.5 max-w-[160px] truncate" title={eintrag.ablehnungsGrund}>
                            {eintrag.ablehnungsGrund}
                          </p>
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
                        <div className="flex items-center justify-center gap-1">
                          {/* Bearbeiten */}
                          {onEdit && (
                            <button
                              onClick={() => handleEdit(eintrag)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-800 cursor-pointer"
                              title="Bearbeiten"
                              disabled={loadingId === eintrag.id}
                            >
                              {loadingId === eintrag.id ? <Spinner size={16} /> : <Edit size={16} />}
                            </button>
                          )}
                          <button
                            onClick={(event) => handleToggleActionMenu(eintrag.id, event.currentTarget)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                            title="Weitere Aktionen"
                            aria-haspopup="menu"
                            aria-expanded={openActionMenuId === eintrag.id}
                            aria-label="Weitere Aktionen"
                            disabled={loadingId === eintrag.id}
                          >
                            <MoreVertical size={16} />
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

      {/* ── Mobile cards ─────────────────────────────────── */}
      <div className={`${mobileViewMode === 'cards' ? 'block sm:hidden' : 'hidden'} divide-y divide-gray-100`}>
        {sortedEintraege.map((eintrag, index) => {
          const isPending = eintrag.status === 'pending';
          const isRejected = eintrag.status === 'rejected';
          const isExpanded = expandedCardId === eintrag.id;
          const isSwiped = swipedOpenId === eintrag.id;
          const canAct = currentUser?.role === 'admin' || currentUser?.uid === eintrag.userId;

          return (
            <div key={eintrag.id} className="relative overflow-hidden">
              {/* Swipe action strip */}
              {canAct && (
                <div className={`absolute inset-y-0 right-0 w-24 flex items-center justify-center gap-2 transition-opacity duration-150 ${isSwiped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  {onEdit && (
                    <button
                      onClick={() => { setSwipedOpenId(null); handleEdit(eintrag); }}
                      className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-100 text-green-700 active:bg-green-200 cursor-pointer"
                      aria-label="Bearbeiten"
                    >
                      {loadingId === eintrag.id ? <Spinner size={16} /> : <Edit size={18} />}
                    </button>
                  )}
                  <button
                    onClick={() => { setSwipedOpenId(null); handleDelete(eintrag.id); }}
                    className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-100 text-red-600 active:bg-red-200 cursor-pointer"
                    aria-label="Löschen"
                    disabled={loadingId === eintrag.id}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}

              {/* Card content */}
              <div
                className={`px-4 py-3 cursor-pointer select-none transition-transform duration-200 ease-out ${isSwiped ? '-translate-x-24' : 'translate-x-0'} ${isPending ? 'bg-amber-50' : isRejected ? 'bg-rose-50' : 'bg-white'}`}
                onTouchStart={handleCardTouchStart}
                onTouchEnd={(e) => handleCardTouchEnd(e, eintrag.id, canAct)}
                onClick={() => handleCardClick(eintrag.id)}
              >
                {/* Row 1: Nr + Date + status badges */}
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-green-900/40 tabular-nums">#{index + 1}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(eintrag.datum).toLocaleDateString('de-DE')}
                    </span>
                    {isPending && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-300">
                        Ausstehend
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 border border-rose-300">
                        Abgelehnt
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-green-900/30 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>

                {/* Row 2: Wildart + Fachbegriff */}
                <div className="flex items-baseline gap-1.5">
                  <span className="font-semibold text-gray-900">{eintrag.wildart}</span>
                  {eintrag.fachbegriff && (
                    <span className="text-sm text-green-700">{eintrag.fachbegriff}</span>
                  )}
                </div>

                {/* Row 3: Secondary details */}
                {(eintrag.altersklasse || eintrag.geschlecht || eintrag.gewicht) && (
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                    {eintrag.altersklasse && <span>{eintrag.altersklasse}</span>}
                    {eintrag.geschlecht && !['Raubwild', 'Invasive Arten'].includes(eintrag.kategorie) && (
                      <span>{eintrag.geschlecht === 'm' ? '♂\uFE0E' : '♀\uFE0E'}</span>
                    )}
                    {eintrag.gewicht && <span>{eintrag.gewicht} kg</span>}
                  </div>
                )}

                {/* Expandable details */}
                <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="pt-3 mt-2 border-t border-gray-100 space-y-1.5">
                      {isRejected && eintrag.ablehnungsGrund && (
                        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded p-2">
                          {eintrag.ablehnungsGrund}
                        </p>
                      )}
                      {eintrag.jaeger && (
                        <div className="flex gap-2 text-sm">
                          <span className="text-gray-400 shrink-0 w-24">Jäger</span>
                          <span className="text-gray-700">{eintrag.jaeger}</span>
                        </div>
                      )}
                      {eintrag.ort && (
                        <div className="flex gap-2 text-sm">
                          <span className="text-gray-400 shrink-0 w-24">Ort/Revier</span>
                          <span className="text-gray-700">{eintrag.ort}</span>
                        </div>
                      )}
                      {eintrag.bemerkung && (
                        <div className="flex gap-2 text-sm">
                          <span className="text-gray-400 shrink-0 w-24">Bemerkung</span>
                          <span className="text-gray-700">{sanitizeHtml(eintrag.bemerkung)}</span>
                        </div>
                      )}
                      {eintrag.wildursprungsschein && (
                        <div className="flex gap-2 text-sm">
                          <span className="text-gray-400 shrink-0 w-24">WUS</span>
                          <span className="text-gray-700">{eintrag.wildursprungsschein}</span>
                        </div>
                      )}

                      {/* Actions */}
                      {canAct && (
                        <div className="flex flex-wrap gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                          {onEdit && (
                            <button
                              onClick={() => handleEdit(eintrag)}
                              disabled={loadingId === eintrag.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {loadingId === eintrag.id ? <Spinner size={14} /> : <Edit size={14} />}
                              Bearbeiten
                            </button>
                          )}
                          {currentUser?.role === 'admin' && eintrag.status === 'pending' && onApprove && (
                            <button
                              onClick={() => handleApprove(eintrag.id)}
                              disabled={loadingId === eintrag.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-green-700 bg-green-50 hover:bg-green-100 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {loadingId === eintrag.id ? <Spinner size={14} /> : <Check size={14} />}
                              Freigeben
                            </button>
                          )}
                          {currentUser?.role === 'admin' && eintrag.status === 'pending' && onReject && (
                            <button
                              onClick={() => handleReject(eintrag.id)}
                              disabled={loadingId === eintrag.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <X size={14} />
                              Ablehnen
                            </button>
                          )}
                          {currentUser?.role === 'admin' && eintrag.status === 'approved' && onResetToPending && (
                            <button
                              onClick={() => handleResetToPending(eintrag.id)}
                              disabled={loadingId === eintrag.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {loadingId === eintrag.id ? <Spinner size={14} /> : <RotateCcw size={14} />}
                              Zurücksetzen
                            </button>
                          )}
                          {currentUser?.role === 'admin' && onShowHistory && (
                            <button
                              onClick={() => handleShowHistory(eintrag)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              <Clock size={14} />
                              Verlauf
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(eintrag.id)}
                            disabled={loadingId === eintrag.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {loadingId === eintrag.id ? <Spinner size={14} /> : <Trash2 size={14} />}
                            Löschen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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

      {openActionMenuId && createPortal(
        <div
          ref={actionMenuRef}
          className="fixed z-50 min-w-[220px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          style={{ top: actionMenuPos.top, left: actionMenuPos.left }}
          role="menu"
        >
          {currentUser?.role === 'admin' && openActionMenuId && onApprove && selectedMenuEintrag?.status === 'pending' && (
            <button
              onClick={() => handleApprove(openActionMenuId)}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-green-700 transition-colors hover:bg-green-50 disabled:opacity-60"
              disabled={loadingId === openActionMenuId}
              role="menuitem"
            >
              {loadingId === openActionMenuId ? <Spinner size={16} /> : <Check size={16} />}
              Freigeben
            </button>
          )}
          {currentUser?.role === 'admin' && openActionMenuId && onReject && selectedMenuEintrag?.status === 'pending' && (
            <button
              onClick={() => handleReject(openActionMenuId)}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-60"
              disabled={loadingId === openActionMenuId}
              role="menuitem"
            >
              <X size={16} />
              Ablehnen
            </button>
          )}
          {currentUser?.role === 'admin' && openActionMenuId && onResetToPending && selectedMenuEintrag?.status === 'approved' && (
            <button
              onClick={() => handleResetToPending(openActionMenuId)}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-60"
              disabled={loadingId === openActionMenuId}
              role="menuitem"
            >
              {loadingId === openActionMenuId ? <Spinner size={16} /> : <RotateCcw size={16} />}
              Zurück auf Ausstehend
            </button>
          )}
          {currentUser?.role === 'admin' && openActionMenuId && onShowHistory && (
            <button
              onClick={() => {
                if (selectedMenuEintrag) handleShowHistory(selectedMenuEintrag);
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              role="menuitem"
            >
              <Clock size={16} />
              Verlauf anzeigen
            </button>
          )}
          {openActionMenuId && (
            <button
              onClick={() => handleDelete(openActionMenuId)}
              className="flex w-full cursor-pointer items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-sm text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
              disabled={loadingId === openActionMenuId}
              role="menuitem"
            >
              {loadingId === openActionMenuId ? <Spinner size={16} /> : <Trash2 size={16} />}
              Löschen
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
});
