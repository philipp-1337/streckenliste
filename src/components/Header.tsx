import { Nav } from "./Nav";
import { JagdjahrSelect } from "./JagdjahrSelect";
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
          <JagdjahrSelect
            jagdjahr={jagdjahr}
            availableJagdjahre={availableJagdjahre}
            onJagdjahrChange={onJagdjahrChange}
            variant="desktop"
          />
        )}
        <Nav onLogout={onLogout} />
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="flex justify-between items-start">
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
      </div>
    </header>
  );
};