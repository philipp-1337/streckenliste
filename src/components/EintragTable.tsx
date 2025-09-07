import { Edit, Trash2 } from 'lucide-react';
import type { Eintrag } from '@types';

interface EintragTableProps {
  eintraege: Eintrag[];
  onEdit: (eintrag: Eintrag) => void;
  onDelete: (id: string) => void;
}

export const EintragTable: React.FC<EintragTableProps> = ({ 
  eintraege, 
  onEdit, 
  onDelete 
}) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-green-800 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Nr.</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Datum</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Wildart</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Kategorie</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Fachbegriff</th>
              <th className="px-4 py-3 text-center text-sm font-medium">AK</th>
              <th className="px-4 py-3 text-center text-sm font-medium">♂/♀</th>
              <th className="px-4 py-3 text-center text-sm font-medium">kg</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Jäger</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Bemerkung</th>
              <th className="px-4 py-3 text-center text-sm font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {eintraege.map((eintrag, index) => (
              <tr key={eintrag.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{index + 1}</td>
                <td className="px-4 py-3 text-sm">{new Date(eintrag.datum).toLocaleDateString('de-DE')}</td>
                <td className="px-4 py-3 text-sm font-medium">{eintrag.wildart}</td>
                <td className="px-4 py-3 text-sm">{eintrag.kategorie}</td>
                <td className="px-4 py-3 text-sm font-medium text-green-700">{eintrag.fachbegriff}</td>
                <td className="px-4 py-3 text-center text-sm">{eintrag.altersklasse}</td>
                <td className="px-4 py-3 text-center text-sm">{eintrag.geschlecht === 'm' ? '♂' : '♀'}</td>
                <td className="px-4 py-3 text-center text-sm">{eintrag.gewicht || '-'}</td>
                <td className="px-4 py-3 text-sm">{eintrag.jaeger}</td>
                <td className="px-4 py-3 text-sm">{eintrag.bemerkung}</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => onEdit(eintrag)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Bearbeiten"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(eintrag.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
};