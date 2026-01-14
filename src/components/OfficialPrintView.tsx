
import { useNavigate } from 'react-router-dom';
import { X, Printer } from 'lucide-react';
import type { Eintrag } from '@types';
import useAuth from '@hooks/useAuth';
import { sanitizeHtml } from '@utils/sanitization';

interface OfficialPrintViewProps {
  eintraege: Eintrag[];
  jagdjahr?: string;
}


const OfficialPrintView: React.FC<OfficialPrintViewProps> = ({ eintraege, jagdjahr }) => {
  const { currentUser } = useAuth();
  const jagdbezirk = currentUser?.jagdbezirk?.name || currentUser?.jagdbezirkId || 'Unbekannt';
  const navigate = useNavigate();
  
  // Display text for hunting year - show "Alle" if no specific year selected
  const displayJagdjahr = jagdjahr || 'Alle Jagdjahre';
  
  // Sortiere Einträge nach Datum aufsteigend (älteste zuerst)
  const sortedEintraege = [...eintraege].sort((a, b) => 
    new Date(a.datum).getTime() - new Date(b.datum).getTime()
  );
  
  return (
    <>
    <style>{`
      @media print {
        @page {
          size: A4 landscape;
          margin: 0;
        }
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
          margin: 0;
        }
        .print-area {
          width: 100%;
          max-width: 100%;
          page-break-inside: avoid;
          padding: 15mm 10mm;
        }
        .print-container {
          page-break-inside: avoid;
        }
        table {
          width: 100%;
          font-size: 7pt !important;
          page-break-before: avoid;
        }
        th, td {
          padding: 1px !important;
          font-size: 7pt !important;
        }
        h1, p {
          page-break-after: avoid;
        }
        .print\\:hidden {
          display: none !important;
        }
      }
    `}</style>
    <div className="print-area bg-white overflow-auto p-8">
      <div className="max-w-full text-xs print-container">
        <div className="text-xs">
            {/* Header */}
            <div className="text-left mb-2">
              <span className="text-xs"><strong>Anlage zur Streckenliste für das Jagdjahr:</strong> {displayJagdjahr}</span>
              <span className="ml-1 text-xs"><strong>Jagdbezirk:</strong> {jagdbezirk}</span>
            </div>
            {/* Haupttabelle */}
            <table className="w-full border-collapse border-2 border-black text-xs">
              <thead>
                {/* Header Row 1 */}
                <tr>
                  <th rowSpan={8} className="border border-black p-1 text-left w-12 whitespace-nowrap">lfd. Nr.</th>
                  <th rowSpan={8} className="border border-black p-1 text-left w-20">Datum</th>
                  <th rowSpan={4} className="border border-black p-1 text-left w-20">Wildart</th>
                  <th colSpan={8} className="border border-black p-1 bg-gray-100">
                    <strong>Schalenwild</strong>
                  </th>
                  <th rowSpan={8} className="border border-black p-1 text-center w-8" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Gewicht (kg)</th>
                  <th rowSpan={5} colSpan={2} className="border border-black p-1 text-center w-64">Bemerkung</th>
                </tr>
                
                {/* Header Row 2 */}
                <tr>
                  <th colSpan={2} className="border border-black p-1 text-center bg-gray-200">Jungwild</th>
                  <th colSpan={2} className="border border-black p-1 text-center bg-gray-200">weibliches Wild</th>
                  <th colSpan={4} className="border border-black p-1 text-center bg-gray-200">männliches Wild</th>
                </tr>

                {/* Header Row 3 - Altersklassen */}
                <tr>
                  <th className="border-l border-r border-t border-black p-1 pb-0 text-center text-xs">AK 0 (m)</th>
                  <th className="border-r border-t border-black p-1 pb-0 text-center text-xs">AK 0 (w)</th>
                  <th className="border-l border-r border-t border-black p-1 pb-0 text-center text-xs">AK 1</th>
                  <th className="border-r border-t border-black p-1 pb-0 text-center text-xs">AK 2+</th>
                  <th className="border-l border-r border-t border-black p-1 pb-0 text-center text-xs">AK 1</th>
                  <th className="border-r border-t border-black p-1 pb-0 text-center text-xs">AK 2</th>
                  <th className="border-r border-t border-black p-1 pb-0 text-center text-xs">AK 3</th>
                  <th className="border-r border-t border-black p-1 pb-0 text-center text-xs">AK 4</th>
                </tr>

                {/* Header Row 4 - Altersangaben */}
                <tr>
                  <th className="border-l border-r border-black p-1 pt-0 text-center text-[0.6rem] text-gray-800 font-light whitespace-nowrap">(unter 1 Jahr)</th>
                  <th className="border-l border-r border-black p-1 pt-0 text-center text-[0.6rem] text-gray-800 font-light whitespace-nowrap">(unter 1 Jahr)</th>
                  <th className="border-l border-r border-black p-1 pt-0 text-center text-[0.6rem] text-gray-800 font-light whitespace-nowrap">(1 Jahr)</th>
                  <th className="border-l border-r border-black p-1 pt-0 text-center text-[0.6rem] text-gray-800 font-light whitespace-nowrap">(ab 2 Jahre)</th>
                  <th className="border-l border-r border-black p-1 pt-0 text-center text-[0.6rem] text-gray-800 font-light whitespace-nowrap">(1 Jahr)</th>
                  <th className="border-l border-r border-black p-1 pt-0 text-center text-[0.6rem] text-gray-800 font-light whitespace-nowrap">(ab 2 Jahre)</th>
                  <th className="border-l border-r border-black p-1 pt-0 text-center text-[0.6rem] text-gray-800 font-light"></th>
                  <th className="border-l border-r border-b border-black p-1 pt-0 text-center text-[0.6rem] text-gray-800 font-light"></th>
                </tr>

                {/* Header Row 5 - Rotwild Fachbegriffe */}
                <tr>
                  <th className="border border-black p-1 text-left text-xs font-semibold">Rotwild</th>
                  <th colSpan={2} className="border border-black p-1 text-center text-xs">Kälber</th>
                  <th className="border border-black p-1 text-center text-xs">Schmaltiere</th>
                  <th className="border border-black p-1 text-center text-xs">Alttiere</th>
                  <th className="border border-black p-1 text-center text-xs">Schmalspießer</th>
                  <th className="border border-black p-1 text-center text-xs">Junge&nbsp;Hirsche<br />(2-4 J.)</th>
                  <th className="border border-black p-1 text-center text-xs">Mittelalte&nbsp;Hirsche<br />(5-9 J.)</th>
                  <th className="border border-black p-1 text-center text-xs">Alte&nbsp;Hirsche<br />(ab 10 J.)</th>
                </tr>

                {/* Header Row 6 - Damwild Fachbegriffe */}
                <tr>
                  <th className="border border-black p-1 text-left text-xs font-semibold">Damwild</th>
                  <th colSpan={2} className="border border-black p-1 text-center text-xs">Kälber</th>
                  <th className="border border-black p-1 text-center text-xs">Schmaltiere</th>
                  <th className="border border-black p-1 text-center text-xs">Alttiere</th>
                  <th className="border border-black p-1 text-center text-xs">Schmalspießer</th>
                  <th className="border border-black p-1 text-center text-xs">Junge&nbsp;Hirsche<br />(2-4 J.)</th>
                  <th className="border border-black p-1 text-center text-xs">Mittelalte&nbsp;Hirsche<br />(3-7 J.)</th>
                  <th className="border border-black p-1 text-center text-xs">Alte&nbsp;Hirsche<br />(ab 8 J.)</th>
                  <th colSpan={2} className="border border-black p-1 text-[0.6rem]">z.B. Erleger, Unfallwild, sonstiges Fallwild, Vertrieb, Abgabe an</th>
                </tr>

                {/* Header Row 7 - Rehwild Fachbegriffe */}
                <tr>
                  <th className="border border-black p-1 text-left text-xs font-semibold">Rehwild</th>
                  <th colSpan={2} className="border border-black p-1 text-center text-xs">Kitze</th>
                  <th className="border border-black p-1 text-center text-xs">Schmalrehe</th>
                  <th className="border border-black p-1 text-center text-xs">Ricken</th>
                  <th className="border border-black p-1 text-center text-xs">Jährling</th>
                  <th className="border border-black p-1 text-center text-xs">Rehböcke<br />(ab 2 J.)</th>
                  <th className="border border-black p-1 text-center text-xs">-</th>
                  <th className="border border-black p-1 text-center text-xs">-</th>
                  <th colSpan={2} className="border border-black p-1 text-[0.6rem]">Nummer Wildursprungschein Schwarzwild</th>
                </tr>

                {/* Header Row 8 - Schwarzwild Fachbegriffe */}
                <tr>
                  <th className="border border-black p-1 text-left text-xs font-semibold">Schwarzwild</th>
                  <th colSpan={2} className="border border-black p-1 text-center text-xs">Frischlinge</th>
                  <th className="border border-black p-1 text-center text-xs">Überläuferbache</th>
                  <th className="border border-black p-1 text-center text-xs">Bachen</th>
                  <th className="border border-black p-1 text-center text-xs">Überläuferkeiler</th>
                  <th className="border border-black p-1 text-center text-xs">Keiler<br />(ab 2 J.)</th>
                  <th className="border border-black p-1 text-center text-xs">-</th>
                  <th className="border border-black p-1 text-center text-xs">-</th>
                  <th colSpan={2} className="border border-black p-1 text-[0.6rem]">Stückzahl anderes Wild als Schalenwild</th>
                </tr>
              </thead>
              <tbody>
                {/* Datenzeilen */}
                {sortedEintraege.map((eintrag, index) => (
                  <tr key={eintrag.id}>
                    <td className="border border-black p-1 text-center">{index + 1}</td>
                    <td className="border border-black p-1 text-left">{new Date(eintrag.datum).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit', year: 'numeric'})}</td>
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
                    <td className="border-l border-b border-black p-1 text-xs">{sanitizeHtml(eintrag.bemerkung || '')}</td>
                    <td className="border-r border-b border-black p-1 text-xs">{eintrag.wildursprungsschein}</td>
                  </tr>
                ))}

                {/* Leere Zeilen für weitere Einträge */}
                {Array.from({length: Math.min(2, sortedEintraege.length)}, (_, i) => (
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
                    <td className="border-l border-b border-black p-1"></td>
                    <td className="border-r border-b border-black p-1"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            {/* <div className="mt-4 text-xs">
              <div className="mt-4 grid grid-cols-2 gap-8">
                <div>
                  <p>Datum: _________________</p>
                  <p className="mt-4">Unterschrift Jagdausübungsberechtigter: _________________</p>
                </div>
                <div>
                  <p>Erstellt mit digitaler Streckenliste</p>
                </div>
              </div>
            </div> */}

            {/* Action Buttons (nicht druckbar) */}
            <div className="fixed right-6 top-1/2 -translate-y-1/2 print:hidden flex flex-col gap-3 z-[1002]">
              <button
                onClick={() => navigate(-1)}
                className="bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-xl shadow-lg border border-gray-200 font-medium transition-all hover:shadow-xl hover:scale-105 flex items-center gap-2"
              >
                <X size={20} />
                Schließen
              </button>
              <button
                onClick={() => {
                  void document.body.offsetHeight; // Force reflow
                  setTimeout(() => window.print(), 400);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl shadow-lg font-medium transition-all hover:shadow-xl hover:scale-105 flex items-center gap-2"
              >
                <Printer size={20} />
                Drucken
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OfficialPrintView;
