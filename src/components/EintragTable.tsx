import { memo, useState } from 'react';
import Spinner from '@components/Spinner';
import { Edit, Trash2, Mars, Venus, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { Eintrag, UserData } from '@types';
import { sanitizeHtml } from '@utils/sanitization';

interface EintragTableProps {
  eintraege: Eintrag[];
  onEdit: (eintrag: Eintrag) => void;
  onDelete: (id: string) => void;
  currentUser: UserData | null;
}

export const EintragTable: React.FC<EintragTableProps> = memo(({
  eintraege,
  onEdit,
  onDelete,
  currentUser,
}) => {

    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<string>('');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const handleEdit = async (eintrag: Eintrag) => {
      setLoadingId(eintrag.id);
      await Promise.resolve(onEdit(eintrag));
      setLoadingId(null);
    };

    const handleDelete = async (id: string) => {
      setLoadingId(id);
      await Promise.resolve(onDelete(id));
      setLoadingId(null);
    };

    const handleSort = (column: string) => {
      if (sortColumn === column) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    };

    const sortedEintraege = [...eintraege].sort((a, b) => {
      if (!sortColumn) return 0;
      let aValue = a[sortColumn as keyof Eintrag];
      let bValue = b[sortColumn as keyof Eintrag];

      // Spezialbehandlung für bestimmte Felder
      if (sortColumn === 'datum') {
        aValue = new Date(a.datum).getTime();
        bValue = new Date(b.datum).getTime();
      }
      if (sortColumn === 'gewicht') {
        aValue = a.gewicht || 0;
        bValue = b.gewicht || 0;
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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-green-800 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Nr.</th>
              <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('datum')}>
                <span className="inline-flex items-center gap-1">
                  Datum
                  {sortColumn === 'datum' ? (
                    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  ) : (
                    <ChevronsUpDown size={16} className="opacity-70 group-hover:opacity-100" />
                  )}
                </span>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('wildart')}>
                <span className="inline-flex items-center gap-1">
                  Wildart
                  {sortColumn === 'wildart' ? (
                    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  ) : (
                    <ChevronsUpDown size={16} className="opacity-70 group-hover:opacity-100" />
                  )}
                </span>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('fachbegriff')}>
                <span className="inline-flex items-center gap-1">
                  Fachbegriff
                  {sortColumn === 'fachbegriff' ? (
                    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  ) : (
                    <ChevronsUpDown size={16} className="opacity-70 group-hover:opacity-100" />
                  )}
                </span>
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('altersklasse')}>
                <span className="inline-flex items-center gap-1">
                  AK
                  {sortColumn === 'altersklasse' ? (
                    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  ) : (
                    <ChevronsUpDown size={16} className="opacity-70 group-hover:opacity-100" />
                  )}
                </span>
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium">
                <div className="flex items-center justify-center gap-0.5">
                  <Mars size={14} /><span>/</span><Venus size={14} />
                </div>
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('gewicht')}>
                <span className="inline-flex items-center gap-1">
                  kg
                  {sortColumn === 'gewicht' ? (
                    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  ) : (
                    <ChevronsUpDown size={16} className="opacity-70 group-hover:opacity-100" />
                  )}
                </span>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('jaeger')}>
                <span className="inline-flex items-center gap-1">
                  Jäger
                  {sortColumn === 'jaeger' ? (
                    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  ) : (
                    <ChevronsUpDown size={16} className="opacity-70 group-hover:opacity-100" />
                  )}
                </span>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('bemerkung')}>
                <span className="inline-flex items-center gap-1">
                  Bemerkung
                  {sortColumn === 'bemerkung' ? (
                    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  ) : (
                    <ChevronsUpDown size={16} className="opacity-70 group-hover:opacity-100" />
                  )}
                </span>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium cursor-pointer select-none transition-colors hover:bg-green-700 group" onClick={() => handleSort('wildursprungsschein')}>
                <span className="inline-flex items-center gap-1">
                  WUS
                  {sortColumn === 'wildursprungsschein' ? (
                    sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  ) : (
                    <ChevronsUpDown size={16} className="opacity-70 group-hover:opacity-100" />
                  )}
                </span>
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedEintraege.map((eintrag, index) => (
              <tr key={eintrag.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{index + 1}</td>
                <td className="px-4 py-3 text-sm">{new Date(eintrag.datum).toLocaleDateString('de-DE')}</td>
                <td className="px-4 py-3 text-sm font-medium">{eintrag.wildart}</td>
                <td className="px-4 py-3 text-sm font-medium text-green-700 whitespace-nowrap">{eintrag.fachbegriff}</td>
                <td className="px-4 py-3 text-center text-sm whitespace-nowrap">{eintrag.altersklasse}</td>
                <td className="px-4 py-3 text-center text-sm">
                  <div className="flex items-center justify-center">
                    {eintrag.geschlecht === 'm' ? <Mars size={16} /> : <Venus size={16} />}
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-sm">{eintrag.gewicht || '-'}</td>
                <td className="px-4 py-3 text-sm">{eintrag.jaeger}</td>
                <td className="px-4 py-3 text-sm">{sanitizeHtml(eintrag.bemerkung || '')}</td>
                <td className="px-4 py-3 text-sm">{eintrag.wildursprungsschein || '-'}</td>
                <td className="px-4 py-3 text-center">
                  {(currentUser?.role === 'admin' || currentUser?.uid === eintrag.userId) && (
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(eintrag)}
                        className="text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center gap-1"
                        title="Bearbeiten"
                        disabled={loadingId === eintrag.id}
                      >
                        {loadingId === eintrag.id ? <Spinner size={16} /> : <Edit size={16} />}
                      </button>
                      <button
                        onClick={() => handleDelete(eintrag.id)}
                        className="text-red-600 hover:text-red-800 transition-colors flex items-center justify-center gap-1"
                        title="Löschen"
                        disabled={loadingId === eintrag.id}
                      >
                        {loadingId === eintrag.id ? <Spinner size={16} /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {eintraege.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Keine Einträge gefunden. Erstellen Sie den ersten Eintrag!
        </div>
      )}
    </div>
  );
});
