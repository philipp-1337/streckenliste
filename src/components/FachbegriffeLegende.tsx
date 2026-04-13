import { wildarten } from '@data/wildarten';

const GeschlechtIcon: React.FC<{ geschlecht: string }> = ({ geschlecht }) => {
  if (geschlecht === 'm') return <span className="text-blue-500/70 text-[10px] leading-none" title="männlich">♂</span>;
  if (geschlecht === 'w') return <span className="text-pink-500/70 text-[10px] leading-none" title="weiblich">♀</span>;
  return null;
};

export const FachbegriffeLegende: React.FC = () => {
  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-green-200/50 mb-4 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-green-100">
        <h3 className="text-base font-semibold text-green-800">Fachbegriffe & Legende</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-green-100">
        {Object.entries(wildarten).map(([wildart, kategorien]) => {
          // Fachbegriffe die mehrfach vorkommen sind mehrdeutig → Geschlecht-Icon nötig
          const fachbegriffCount = kategorien.reduce<Record<string, number>>((acc, kat) => {
            acc[kat.fachbegriff] = (acc[kat.fachbegriff] ?? 0) + 1;
            return acc;
          }, {});

          return (
            <div key={wildart} className="px-3 py-2.5">
              <p className="text-[10px] font-bold text-green-800 uppercase tracking-wider mb-2">
                {wildart}
              </p>
              <div className="space-y-0.5">
                {kategorien.map((kat, idx) => {
                  const isAmbiguous = fachbegriffCount[kat.fachbegriff] > 1;
                  return (
                    <div key={idx} className="flex items-baseline justify-between gap-1 text-xs">
                      <span className="text-green-900/80 font-medium leading-relaxed flex items-baseline gap-0.5">
                        {kat.fachbegriff}
                        {isAmbiguous && <GeschlechtIcon geschlecht={kat.geschlecht} />}
                      </span>
                      {kat.altersklasse && (
                        <span className="text-green-900/35 shrink-0 tabular-nums text-[10px]">{kat.altersklasse}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
