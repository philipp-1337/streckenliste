import { wildarten } from '@data/wildarten';

const GeschlechtIcon: React.FC<{ geschlecht: string }> = ({ geschlecht }) => {
  if (geschlecht === 'm') return <span className="align-middle text-xs leading-none text-blue-700/80" title="männlich">{'♂\uFE0E'}</span>;
  if (geschlecht === 'w') return <span className="align-middle text-xs leading-none text-pink-700/80" title="weiblich">{'♀\uFE0E'}</span>;
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
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-green-800">
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
                        <span className="shrink-0 text-xs tabular-nums text-green-900/60">{kat.altersklasse}</span>
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
