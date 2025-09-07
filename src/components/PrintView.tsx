import type { Eintrag } from '@types';

interface PrintViewProps {
  eintraege: Eintrag[];
}

// Hilfsfunktion zur Bestimmung der Spalte basierend auf dem Eintrag
const getColumnKey = (eintrag: Eintrag): string => {
  const { wildart, geschlecht, altersklasse } = eintrag;

  if (wildart === 'Schwarzwild') {
    if (altersklasse === 'AK 0') return 'frischling';
    if (geschlecht === 'w' && altersklasse === 'AK 1') return 'ueberlaeufer-bach';
    if (geschlecht === 'w' && altersklasse === 'AK 2') return 'bache';
    if (geschlecht === 'm' && altersklasse === 'AK 1') return 'ueberlaeufer-keiler';
    if (geschlecht === 'm' && altersklasse === 'AK 2') return 'keiler';
  } else if (wildart === 'Rehwild') {
    if (altersklasse === 'AK 0') return 'kitz';
    if (geschlecht === 'w' && altersklasse === 'AK 1') return 'schmalreh';
    if (geschlecht === 'w' && altersklasse === 'AK 2') return 'ricke';
    if (geschlecht === 'm' && altersklasse === 'AK 1') return 'jaehrling';
    if (geschlecht === 'm' && altersklasse === 'AK 2') return 'rehbock-2-4'; // Annahme für das Alter
  } else if (wildart === 'Damwild') {
    if (altersklasse === 'AK 0') return 'kalb-dam';
    if (geschlecht === 'w' && altersklasse === 'AK 1') return 'schmaltier-dam';
    if (geschlecht === 'w' && altersklasse === 'AK 2') return 'alttier-dam';
    if (geschlecht === 'm' && altersklasse === 'AK 1') return 'schmalspiesser-dam';
    if (geschlecht === 'm' && altersklasse === 'AK 2') return 'hirsch-2-4-dam';
  } else if (wildart === 'Rotwild') {
    if (altersklasse === 'AK 0') return 'kalb-rot';
    if (geschlecht === 'w' && altersklasse === 'AK 1') return 'schmaltier-rot';
    if (geschlecht === 'w' && altersklasse === 'AK 2') return 'alttier-rot';
    if (geschlecht === 'm' && altersklasse === 'AK 1') return 'schmalspiesser-rot';
    if (geschlecht === 'm' && altersklasse === 'AK 2') return 'hirsch-2-4-rot';
    if (geschlecht === 'm' && altersklasse === 'AK 3') return 'hirsch-5-9-rot';
    if (geschlecht === 'm' && altersklasse === 'AK 4') return 'hirsch-ab10-rot';
  }
  return '';
};


export const PrintView: React.FC<PrintViewProps> = ({ eintraege }) => {
  return (
    <div id="print-view">
      <h1 className="text-xl font-bold mb-2">Anlage zur Streckenliste für das Jagdjahr: 2024/2025</h1>
      <h2 className="text-lg mb-4">Jagdbezirk: Randau</h2>

      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr>
            <th rowSpan={2} className="border border-black p-1">lfd. Nr.</th>
            <th rowSpan={2} className="border border-black p-1">Datum</th>
            <th rowSpan={2} className="border border-black p-1">Wildart</th>
            <th colSpan={7} className="border border-black p-1">Schalenwild</th>
            <th rowSpan={2} className="border border-black p-1">Gewicht (kg)</th>
            <th rowSpan={2} className="border border-black p-1">Bemerkung</th>
          </tr>
          <tr>
            <th className="border border-black p-1">AK 0<br/>(männl./weibl.)</th>
            <th className="border border-black p-1">AK 1<br/>(weibl.)</th>
            <th className="border border-black p-1">AK 2+<br/>(weibl.)</th>
            <th className="border border-black p-1">AK 1<br/>(männl.)</th>
            <th className="border border-black p-1">AK 2<br/>(männl.)</th>
            <th className="border border-black p-1">AK 3<br/>(männl.)</th>
            <th className="border border-black p-1">AK 4<br/>(männl.)</th>
          </tr>
        </thead>
        <tbody>
          {eintraege.map((eintrag, index) => {
            const columnKey = getColumnKey(eintrag);
            return (
              <tr key={eintrag.id}>
                <td className="border border-black p-1 text-center">{index + 1}</td>
                <td className="border border-black p-1">{new Date(eintrag.datum).toLocaleDateString('de-DE')}</td>
                <td className="border border-black p-1">{eintrag.wildart}</td>
                <td className="border border-black p-1 text-center">{['kitz', 'kalb-dam', 'kalb-rot', 'frischling'].includes(columnKey) ? 'x' : ''}</td>
                <td className="border border-black p-1 text-center">{['schmalreh', 'schmaltier-dam', 'schmaltier-rot', 'ueberlaeufer-bach'].includes(columnKey) ? 'x' : ''}</td>
                <td className="border border-black p-1 text-center">{['ricke', 'alttier-dam', 'alttier-rot', 'bache'].includes(columnKey) ? 'x' : ''}</td>
                <td className="border border-black p-1 text-center">{['jaehrling', 'schmalspiesser-dam', 'schmalspiesser-rot', 'ueberlaeufer-keiler'].includes(columnKey) ? 'x' : ''}</td>
                <td className="border border-black p-1 text-center">{['rehbock-2-4', 'hirsch-2-4-dam', 'hirsch-2-4-rot', 'keiler'].includes(columnKey) ? 'x' : ''}</td>
                <td className="border border-black p-1 text-center">{['hirsch-5-9-rot'].includes(columnKey) ? 'x' : ''}</td>
                <td className="border border-black p-1 text-center">{['hirsch-ab10-rot'].includes(columnKey) ? 'x' : ''}</td>
                <td className="border border-black p-1 text-center">{eintrag.gewicht || ''}</td>
                <td className="border border-black p-1">{eintrag.bemerkung}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};