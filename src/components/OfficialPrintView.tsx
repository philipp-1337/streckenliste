
import { useNavigate } from 'react-router-dom';
import type { Eintrag } from '@types';
import useAuth from '@hooks/useAuth';

interface OfficialPrintViewProps {
  eintraege: Eintrag[];
}


const OfficialPrintView: React.FC<OfficialPrintViewProps> = ({ eintraege }) => {
  const { currentUser } = useAuth();
  const jagdbezirk = currentUser?.jagdbezirkId ? currentUser.jagdbezirkId : 'Unbekannt';
  const navigate = useNavigate();
  return (
    <>
    <div className="print-area bg-white p-4 overflow-auto">
      <div className="max-w-full text-xs">
        <div className="text-xs">
            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="text-lg font-bold">Anlage zur Streckenliste für das Jagdjahr: 2024/2025</h1>
              <p className="mt-1">Jagdbezirk: {jagdbezirk}</p>
            </div>
            {/* Haupttabelle */}
            <table className="w-full border-collapse border-2 border-black text-xs">
              <thead>
                {/* Header Row 1 */}
                <tr>
                  <th rowSpan={4} className="border border-black p-1 text-center w-12">lfd. Nr.</th>
                  <th rowSpan={4} className="border border-black p-1 text-center w-20">Datum</th>
                  <th rowSpan={4} className="border border-black p-1 text-center w-20">Wildart</th>
                  <th colSpan={8} className="border border-black p-1 text-center bg-gray-100">
                    <strong>Schalenwild</strong>
                  </th>
                  <th rowSpan={4} className="border border-black p-1 text-center w-16">Gewicht</th>
                  <th rowSpan={4} className="border border-black p-1 text-center w-32">Bemerkung</th>
                </tr>
                
                {/* Header Row 2 */}
                <tr>
                  <th colSpan={2} className="border border-black p-1 text-center bg-gray-200">Jungwild</th>
                  <th colSpan={2} className="border border-black p-1 text-center bg-gray-200">weibliches Wild</th>
                  <th colSpan={4} className="border border-black p-1 text-center bg-gray-200">männliches Wild</th>
                </tr>

                {/* Header Row 3 - Altersklassen */}
                <tr>
                  <th className="border border-black p-1 text-center text-xs">AK 0 (m)</th>
                  <th className="border border-black p-1 text-center text-xs">AK 0 (w)</th>
                  <th className="border border-black p-1 text-center text-xs">AK 1</th>
                  <th className="border border-black p-1 text-center text-xs">AK 2+</th>
                  <th className="border border-black p-1 text-center text-xs">AK 1</th>
                  <th className="border border-black p-1 text-center text-xs">AK 2</th>
                  <th className="border border-black p-1 text-center text-xs">AK 3</th>
                  <th className="border border-black p-1 text-center text-xs">AK 4</th>
                </tr>

                {/* Header Row 4 - Altersangaben */}
                <tr>
                  <th colSpan={2} className="border border-black p-1 text-center text-xs">(unter 1 Jahr)</th>
                  <th className="border border-black p-1 text-center text-xs">(1 Jahr)</th>
                  <th className="border border-black p-1 text-center text-xs">(ab 2 Jahre)</th>
                  <th className="border border-black p-1 text-center text-xs">(1 Jahr)</th>
                  <th className="border border-black p-1 text-center text-xs">(ab 2 Jahre)</th>
                  <th className="border border-black p-1 text-center text-xs">mittelalte</th>
                  <th className="border border-black p-1 text-center text-xs">alte</th>
                </tr>
              </thead>
              <tbody>
                {/* Datenzeilen */}
                {eintraege.map((eintrag, index) => (
                  <tr key={eintrag.id}>
                    <td className="border border-black p-1 text-center">{index + 1}</td>
                    <td className="border border-black p-1 text-center">{new Date(eintrag.datum).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit'})}</td>
                    <td className="border border-black p-1">{eintrag.wildart}</td>
                    <td className="border border-black p-1 text-center">
                      {eintrag.altersklasse === 'AK 0' && eintrag.geschlecht === 'm' ? 'x' : ''}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {eintrag.altersklasse === 'AK 0' && eintrag.geschlecht === 'w' ? 'x' : ''}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {eintrag.altersklasse === 'AK 1' && eintrag.geschlecht === 'w' ? 'x' : ''}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {eintrag.altersklasse === 'AK 2' && eintrag.geschlecht === 'w' ? 'x' : ''}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {eintrag.altersklasse === 'AK 1' && eintrag.geschlecht === 'm' ? 'x' : ''}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {eintrag.altersklasse === 'AK 2' && eintrag.geschlecht === 'm' ? 'x' : ''}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {eintrag.altersklasse === 'AK 3' && eintrag.geschlecht === 'm' ? 'x' : ''}
                    </td>
                    <td className="border border-black p-1 text-center">
                      {eintrag.altersklasse === 'AK 4' && eintrag.geschlecht === 'm' ? 'x' : ''}
                    </td>
                    <td className="border border-black p-1 text-center">{eintrag.gewicht}</td>
                    <td className="border border-black p-1 text-xs">{eintrag.bemerkung}</td>
                  </tr>
                ))}

                {/* Leere Zeilen für weitere Einträge */}
                {Array.from({length: Math.min(9, eintraege.length)}, (_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="border border-black p-1 text-center h-6"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                    <td className="border border-black p-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="mt-4 text-xs">
              <p><strong>Nummer Wildursprungsschein Schwarzwild</strong></p>
              <p className="mt-2"><strong>Stückzahl anderes Wild als Schalenwild</strong></p>
              <div className="mt-4 grid grid-cols-2 gap-8">
                <div>
                  <p>Datum: _________________</p>
                  <p className="mt-4">Unterschrift Jagdausübungsberechtigter: _________________</p>
                </div>
                <div>
                  <p>Erstellt mit digitaler Streckenliste</p>
                </div>
              </div>
            </div>

            {/* Action Buttons (nicht druckbar) */}
            <div className="fixed top-4 right-4 print:hidden flex gap-2">
               <button
                onClick={() => {
                  void document.body.offsetHeight; // Force reflow
                  setTimeout(() => window.print(), 400);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Drucken
              </button>
              <button
                onClick={() => navigate(-1)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export { OfficialPrintView };
