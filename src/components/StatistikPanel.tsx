import { memo, useMemo, useState } from 'react';
import type { AllStats, MonatStat } from '@types';
import { BarChart3, CalendarDays } from 'lucide-react';
import useAuth from '@hooks/useAuth';
import { 
  ComposedChart,
  Bar, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';

const LINE_COLORS = [
  '#713f12', // dunkelbraun
  '#2563eb', // blau
  '#a16207', // braun
  '#6b7280', // grau
  '#22c55e', // hellgrün
  '#0ea5e9', // hellblau
  '#d97706', // hellbraun
];

interface StatistikData {
  wildartStats: AllStats;
  monatsStats: MonatStat[];
  isAverage: boolean;
  availableJahre: string[];
}

interface StatistikPanelProps {
  data: StatistikData;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-green-200 p-3 rounded-xl shadow-xl min-w-[150px]">
        <p className="font-semibold text-green-900 mb-2 border-b border-green-100 pb-1">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => {
            const isBar = entry.dataKey === 'anzahl';
            const color = isBar ? '#16a34a' : entry.color;
            return (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium" style={{ color }}>
                  <div className={`w-2.5 h-2.5 ${isBar ? 'rounded-sm' : 'rounded-full'}`} style={{ backgroundColor: color }} />
                  {entry.name}:
                </span>
                <span className="font-semibold text-gray-800 ml-4">
                  {entry.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export const StatistikPanel: React.FC<StatistikPanelProps> = memo(({ data }) => {
  const { currentUser } = useAuth();
  const { wildartStats, monatsStats, isAverage, availableJahre } = data;
  const [showYearLines, setShowYearLines] = useState(true);

  const maxVal = useMemo(() => {
    let max = Math.max(...monatsStats.map(m => (m.anzahl as number) || 0), 10);
    if (isAverage && showYearLines && availableJahre) {
      availableJahre.forEach(jahr => {
        const yearMax = Math.max(...monatsStats.map(m => (m[jahr] as number) || 0));
        if (yearMax > max) max = yearMax;
      });
    }
    return max;
  }, [monatsStats, isAverage, availableJahre, showYearLines]);

  return (
    <div className="mb-6 space-y-8">
      {/* Monthly Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-green-800 flex items-center gap-2.5">
              <CalendarDays size={20} strokeWidth={2} />
              Abschüsse pro Monat
            </h2>
            {isAverage && (
              <span className="bg-green-100 text-green-800 text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full whitespace-nowrap">
                Ø Durchschnitt
              </span>
            )}
          </div>
          {isAverage && availableJahre?.length > 0 && (
            <label className="hidden sm:flex items-center gap-2 text-sm text-green-800 cursor-pointer hover:opacity-80 transition-opacity select-none bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 self-start sm:self-auto">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-green-600 text-green-700 focus:ring-green-600 cursor-pointer"
                checked={showYearLines}
                onChange={(e) => setShowYearLines(e.target.checked)}
              />
              <span className="font-medium">Jahre anzeigen</span>
            </label>
          )}
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={monatsStats}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                domain={[0, Math.ceil(maxVal * 1.1)]}
                width={30}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: '#f3f4f6' }}
              />
              {isAverage && showYearLines && <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />}
              <Bar 
                dataKey="anzahl" 
                name={isAverage ? "Ø Durchschnitt" : "Abschüsse"}
                radius={[4, 4, 0, 0]}
                barSize={isAverage ? 32 : undefined}
                animationDuration={1500}
                animationEasing="ease-out"
              >
                {monatsStats.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={(entry.anzahl as number) > 0 ? '#16a34a' : '#d1d5db'}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Bar>
              {isAverage && showYearLines && availableJahre?.map((jahr, idx) => (
                <Line 
                  key={jahr}
                  type="monotone"
                  dataKey={jahr}
                  name={jahr}
                  stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 1 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  animationDuration={2000}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Wildart Stats */}
      <div>
        <h2 className="text-xl font-bold text-green-800 flex items-center gap-2.5 mb-4">
          <BarChart3 size={20} strokeWidth={2} />
          Details nach Wildart
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(wildartStats).map(([wildart, stat]) => (
            <div key={wildart} className="bg-white rounded-xl shadow-sm border border-green-100 p-4 hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-green-800 mb-2">{wildart}</h4>
              <p className="text-sm mb-2">Gesamt: <strong>{stat.anzahl}</strong> Stück</p>
              {stat.sonstigeDetails && Object.keys(stat.sonstigeDetails).length > 0 && (
                <div className="text-xs mb-3 space-y-0.5 border-b border-green-50 pb-2">
                  {Object.entries(stat.sonstigeDetails)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => (
                      <p key={type} className="ml-2 flex justify-between">
                        <span>{type}:</span> <strong>{count}</strong>
                      </p>
                    ))}
                </div>
              )}
              {wildart !== 'Sonstige' && (
                <>
                  <p className="text-sm mb-2">Gewicht: <strong>{stat.gewicht.toFixed(1)}</strong> kg</p>
                  {currentUser?.role === 'admin' && (
                    <p className="text-sm mb-3">Einnahmen: <strong>{stat.einnahmen.toFixed(2)}</strong> €</p>
                  )}
                  <div className="text-xs space-y-2 border-t border-green-50 pt-2 mt-2">
                    <p className="font-medium text-gray-500 uppercase tracking-wider text-[10px]">Altersklassen</p>
                    {Object.entries(stat.altersklassen).map(([ak, akStats]) => (
                      <div key={ak} className="ml-1">
                        <p className="font-medium text-green-700">
                          {ak}: {akStats.gesamt} Stück
                          {akStats.fallwild > 0 && <span className="text-amber-600 ml-1">(davon {akStats.fallwild} Fallwild)</span>}
                        </p>
                        <div className="ml-2 mt-0.5 space-y-0.5 text-gray-500">
                          {akStats.männlich.gesamt > 0 && (
                            <p>{'♂\uFE0E'} männlich: {akStats.männlich.gesamt}{akStats.männlich.fallwild > 0 && <span className="text-amber-600/80"> ({akStats.männlich.fallwild} Fallwild)</span>}</p>
                          )}
                          {akStats.weiblich.gesamt > 0 && (
                            <p>{'♀\uFE0E'} weiblich: {akStats.weiblich.gesamt}{akStats.weiblich.fallwild > 0 && <span className="text-amber-600/80"> ({akStats.weiblich.fallwild} Fallwild)</span>}</p>
                          )}
                          {akStats.unbekannt.gesamt > 0 && (
                            <p>— unbekannt: {akStats.unbekannt.gesamt}{akStats.unbekannt.fallwild > 0 && <span className="text-amber-600/80"> ({akStats.unbekannt.fallwild} Fallwild)</span>}</p>
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
    </div>
  );
});

export default StatistikPanel;
