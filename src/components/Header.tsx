import { Nav } from "./Nav";
import useAuth from "@hooks/useAuth";
import { BowArrow } from "lucide-react";

interface HeaderProps {
  onLogout: () => void;
  jagdjahr?: string;
  availableJagdjahre?: string[];
  onJagdjahrChange?: (jagdjahr: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout, jagdjahr, availableJagdjahre, onJagdjahrChange }) => {
  const { currentUser } = useAuth();
  // Jagdbezirk und Name auslesen
  const jagdbezirk =
    currentUser?.jagdbezirk?.name || currentUser?.jagdbezirkId || "Unbekannt";
  const userName =
    currentUser?.displayName || currentUser?.email || "Unbekannt";

  return (
    <header className="mb-6 print:hidden">
      {/* Desktop Layout */}
      <div className="hidden md:flex justify-between items-center">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-green-800">
            Streckenliste
            <svg className="inline w-7 h-7 ml-1" viewBox="0 0 24 24">
              <defs>
                <linearGradient
                  id="bowarrowGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="hsl(148 97% 20%)" /> {/* green-800 */}
                  <stop offset="100%" stopColor="hsl(151 100% 30%)" />{" "}
                  {/* green-500 */}
                </linearGradient>
              </defs>
              <BowArrow stroke="url(#bowarrowGradient)" strokeWidth={2} />
            </svg>
          </h1>
          <div className="text-sm text-green-900 mt-1">
            <span className="font-semibold">Jagdbezirk:</span> {jagdbezirk}{" "}
            &nbsp;|&nbsp;
            <span className="font-semibold">Benutzer:</span> {userName}
          </div>
        </div>
        {availableJagdjahre && onJagdjahrChange && (
          <div className="mx-4">
            <label className="block text-sm font-semibold text-green-900 mb-1">
              Jagdjahr
            </label>
            <select
              value={jagdjahr || ''}
              onChange={(e) => onJagdjahrChange(e.target.value)}
              className="border-2 border-green-600 rounded-lg px-3 py-2 bg-white text-green-900 font-medium min-w-[140px] focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm hover:border-green-700 transition-colors cursor-pointer"
            >
              <option value="">Alle Jagdjahre</option>
              {availableJagdjahre.map(jahr => (
                <option key={jahr} value={jahr}>{jahr}</option>
              ))}
            </select>
          </div>
        )}
        <Nav onLogout={onLogout} />
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-green-800">
              Streckenliste
              <svg className="inline w-5 h-5 ml-1" viewBox="0 0 24 24">
                <BowArrow stroke="url(#bowarrowGradient)" strokeWidth={2} />
              </svg>
            </h1>
            <div className="text-xs text-green-900 mt-1">
              <div><span className="font-semibold">Jagdbezirk:</span> {jagdbezirk}</div>
              <div><span className="font-semibold">Benutzer:</span> {userName}</div>
            </div>
          </div>
          <Nav onLogout={onLogout} />
        </div>
        {availableJagdjahre && onJagdjahrChange && (
          <div className="bg-green-50 rounded-xl p-3 border border-green-200 shadow-sm">
            <label htmlFor="jagdjahr-mobile" className="block text-xs font-semibold text-green-900 mb-1.5">
              📅 Jagdjahr
            </label>
            <select
              id="jagdjahr-mobile"
              value={jagdjahr || ''}
              onChange={(e) => onJagdjahrChange(e.target.value)}
              aria-label="Jagdjahr auswählen"
              className="w-full border-2 border-green-600 rounded-lg px-3 py-2.5 bg-white text-green-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm hover:border-green-700 transition-colors cursor-pointer"
            >
              <option value="">Alle Jagdjahre</option>
              {availableJagdjahre.map(jahr => (
                <option key={jahr} value={jahr}>{jahr}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </header>
  );
};
