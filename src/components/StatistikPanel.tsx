import { memo } from 'react';
import type { AllStats } from '@types';
import { BarChart3 } from 'lucide-react';
import useAuth from '@hooks/useAuth';

interface StatistikPanelProps {
  stats: AllStats;
}

export const StatistikPanel: React.FC<StatistikPanelProps> = memo(({ stats }) => {
  const { currentUser } = useAuth();
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-green-800 flex items-center gap-2.5 mb-4">
        <BarChart3 size={20} strokeWidth={2} />
        Statistiken
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(stats).map(([wildart, stat]) => (
          <div key={wildart} className="bg-white rounded-xl shadow-sm border border-green-100 p-4">
            <h4 className="font-semibold text-green-800 mb-2">{wildart}</h4>
            <p className="text-sm mb-2">Gesamt: <strong>{stat.anzahl}</strong> Stück</p>
            {stat.sonstigeDetails && Object.keys(stat.sonstigeDetails).length > 0 && (
              <div className="text-xs mb-3 space-y-0.5 border-b border-green-100 pb-2">
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
                {currentUser?.role === 'admin' && (
                  <p className="text-sm mb-3">Einnahmen: <strong>{stat.einnahmen.toFixed(2)}</strong> €</p>
                )}
                <div className="text-xs space-y-2 border-t border-green-100 pt-2">
                  <p className="font-medium">Nach Altersklassen:</p>
                  {Object.entries(stat.altersklassen).map(([ak, akStats]) => (
                    <div key={ak} className="ml-2">
                      <p className="font-medium text-green-700">
                        {ak}: {akStats.gesamt} Stück
                        {akStats.fallwild > 0 && <span className="text-amber-700 ml-1">(davon {akStats.fallwild} Fallwild)</span>}
                      </p>
                      <div className="ml-2 space-y-0.5 text-green-900/60">
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
