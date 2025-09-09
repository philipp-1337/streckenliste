import { wildarten } from '@data/wildarten';
import { BookIcon } from 'lucide-react';

export const FachbegriffeLegende: React.FC = () => {
  return (
    <div className="mt-6 bg-white p-4 rounded-lg shadow">
    <h3 className="font-semibold mb-3 flex items-center gap-2"><BookIcon className="inline-block align-middle" size={20} /> <span className="align-middle">Fachbegriffe und Altersklassen</span></h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        {Object.entries(wildarten).map(([wildart, kategorien]) => (
          <div key={wildart} className="bg-gray-50 p-3 rounded">
            <h4 className="font-medium text-green-800 mb-2">{wildart}</h4>
            <div className="space-y-1">
              {kategorien.map((kat, idx) => (
                <div key={idx} className="text-xs">
                  <span className="font-medium">{kat.fachbegriff}</span>
                  <span className="text-gray-600 ml-1">({kat.altersklasse})</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};