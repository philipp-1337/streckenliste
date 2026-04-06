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
            {stat.sonstigeDetails && Object.keys(stat.sonstigeDetails).length > 0 && (
              <div className="text-xs mb-3 space-y-0.5 border-b pb-2">
                {Object.entries(stat.sonstigeDetails)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <p key={type} className="ml-2">{type}: <strong>{count}</strong></p>
                  ))}
              </div>
            )}
            {wildart !== 'Sonstige' && (
              <>
                <p className="text-sm mb-2">Gewicht: <strong>{stat.gewicht.toFixed(1)}</strong> kg</p>
                <p className="text-sm mb-3">Einnahmen: <strong>{stat.einnahmen.toFixed(2)}</strong> €</p>
                <div className="text-xs space-y-2 border-t pt-2">
                  <p className="font-medium">Nach Altersklassen:</p>
                  {Object.entries(stat.altersklassen).map(([ak, akStats]) => (
                    <div key={ak} className="ml-2">
                      <p className="font-medium text-green-700">
                        {ak}: {akStats.gesamt} Stück
                        {akStats.fallwild > 0 && <span className="text-amber-700 ml-1">(davon {akStats.fallwild} Fallwild)</span>}
                      </p>
                      <div className="ml-2 space-y-0.5 text-gray-600">
                        {akStats.männlich.gesamt > 0 && (
                          <p>♂ männlich: {akStats.männlich.gesamt}{akStats.männlich.fallwild > 0 && <span className="text-amber-700"> ({akStats.männlich.fallwild} Fallwild)</span>}</p>
                        )}
                        {akStats.weiblich.gesamt > 0 && (
                          <p>♀ weiblich: {akStats.weiblich.gesamt}{akStats.weiblich.fallwild > 0 && <span className="text-amber-700"> ({akStats.weiblich.fallwild} Fallwild)</span>}</p>
                        )}
                        {akStats.unbekannt.gesamt > 0 && (
                          <p>— unbekannt: {akStats.unbekannt.gesamt}{akStats.unbekannt.fallwild > 0 && <span className="text-amber-700"> ({akStats.unbekannt.fallwild} Fallwild)</span>}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

export default StatistikPanel;
