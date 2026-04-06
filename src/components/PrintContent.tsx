import type { Eintrag } from '@types';
import { sanitizeHtml } from '@utils/sanitization';

interface PrintContentProps {
  eintraege: Eintrag[];
  jagdjahr?: string;
  jagdbezirk: string;
}

const PrintContent: React.FC<PrintContentProps> = ({ eintraege, jagdjahr, jagdbezirk }) => {
  const displayJagdjahr = jagdjahr || 'Alle Jagdjahre';
  const sortedEintraege = [...eintraege].sort((a, b) =>
    new Date(a.datum).getTime() - new Date(b.datum).getTime()
  );

  return (
    <div className="bg-white text-xs">
      <style>{`
        .gewicht-header { position: relative; overflow: visible; }
        .gewicht-text {
          writing-mode: vertical-rl;
          transform: rotate(180deg);
          white-space: nowrap;
          display: inline-block;
        }
      `}</style>

      <div className="text-left mb-2">
        <span className="text-xs"><strong>Anlage zur Streckenliste für das Jagdjahr:</strong> {displayJagdjahr}</span>
        <span className="ml-1 text-xs"><strong>Jagdbezirk:</strong> {jagdbezirk}</span>
      </div>

      <table className="w-full border-collapse border-2 border-black text-xs">
        <thead>
          <tr>
            <th rowSpan={8} className="border border-black p-1 text-left w-12 whitespace-nowrap">lfd. Nr.</th>
            <th rowSpan={8} className="border border-black p-1 text-left w-20">Datum</th>
            <th rowSpan={4} className="border border-black p-1 text-left w-20">Wildart</th>
            <th colSpan={8} className="border border-black p-1 bg-gray-100"><strong>Schalenwild</strong></th>
            <th rowSpan={8} className="border border-black p-1 text-center w-8 gewicht-header">
              <div className="gewicht-text">Gewicht (kg)</div>
            </th>
            <th rowSpan={5} colSpan={2} className="border border-black p-1 text-center w-64">Bemerkung</th>
          </tr>
          <tr>
            <th colSpan={2} className="border border-black p-1 text-center bg-gray-200">Jungwild</th>
            <th colSpan={2} className="border border-black p-1 text-center bg-gray-200">weibliches Wild</th>
            <th colSpan={4} className="border border-black p-1 text-center bg-gray-200">männliches Wild</th>
          </tr>
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
          {sortedEintraege.map((eintrag, index) => (
            <tr key={eintrag.id}>
              <td className="border border-black p-1 text-center">{index + 1}</td>
              <td className="border border-black p-1 text-left">{new Date(eintrag.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
              <td className="border border-black p-1">{eintrag.wildart}</td>
              <td className="border border-black p-1 text-center">{eintrag.altersklasse === 'AK 0' && eintrag.geschlecht === 'm' ? 'x' : ''}</td>
              <td className="border border-black p-1 text-center">{eintrag.altersklasse === 'AK 0' && eintrag.geschlecht === 'w' ? 'x' : ''}</td>
              <td className="border border-black p-1 text-center">{eintrag.altersklasse === 'AK 1' && eintrag.geschlecht === 'w' ? 'x' : ''}</td>
              <td className="border border-black p-1 text-center">{eintrag.altersklasse === 'AK 2' && eintrag.geschlecht === 'w' ? 'x' : ''}</td>
              <td className="border border-black p-1 text-center">{eintrag.altersklasse === 'AK 1' && eintrag.geschlecht === 'm' ? 'x' : ''}</td>
              <td className="border border-black p-1 text-center">{eintrag.altersklasse === 'AK 2' && eintrag.geschlecht === 'm' ? 'x' : ''}</td>
              <td className="border border-black p-1 text-center">{eintrag.altersklasse === 'AK 3' && eintrag.geschlecht === 'm' ? 'x' : ''}</td>
              <td className="border border-black p-1 text-center">{eintrag.altersklasse === 'AK 4' && eintrag.geschlecht === 'm' ? 'x' : ''}</td>
              <td className="border border-black p-1 text-center">{eintrag.gewicht}</td>
              <td className="border-l border-b border-black p-1 text-xs">{sanitizeHtml(eintrag.bemerkung || '')}</td>
              <td className="border-r border-b border-black p-1 text-xs">{eintrag.wildursprungsschein}</td>
            </tr>
          ))}
          {Array.from({ length: Math.min(2, sortedEintraege.length) }, (_, i) => (
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
    </div>
  );
};

export default PrintContent;
