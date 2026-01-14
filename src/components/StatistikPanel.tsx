import { memo } from 'react';
import type { AllStats } from '@types';
import { BarChart2Icon } from 'lucide-react';

interface StatistikPanelProps {
  stats: AllStats;
}

export const StatistikPanel: React.FC<StatistikPanelProps> = memo(({ stats }) => {
  return (
    <div className="bg-white p-6 rounded-lg mb-6 shadow">
    <h3 className="font-semibold mb-3 flex items-center gap-2"><BarChart2Icon className="inline-block align-middle" size={20} /> <span className="align-middle">Statistiken</span></h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(stats).map(([wildart, stat]) => (
          <div key={wildart} className="bg-green-100 p-4 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-2">{wildart}</h4>
            <p className="text-sm mb-2">Gesamt: <strong>{stat.anzahl}</strong> Stück</p>
            <p className="text-sm mb-2">Gewicht: <strong>{stat.gewicht.toFixed(1)}</strong> kg</p>
            <p className="text-sm mb-3">Einnahmen: <strong>{stat.einnahmen.toFixed(2)}</strong> €</p>
            
            <div className="text-xs space-y-1 border-t pt-2">
              <p className="font-medium">Nach Altersklassen:</p>
              {Object.entries(stat.altersklassen).map(([ak, anzahl]) => (
                <p key={ak} className="ml-2">{ak}: {anzahl as number} Stück</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default StatistikPanel;
