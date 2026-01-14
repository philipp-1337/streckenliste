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
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-green-800 whitespace-nowrap overflow-hidden text-ellipsis flex items-center">
            Streckenliste
            <svg className="inline w-7 h-7 sm:w-9 sm:h-9 ml-1" viewBox="0 0 24 24">
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
            <div className="sm:flex sm:gap-2">
              <div>
                <span className="font-semibold">Jagdbezirk:</span> {jagdbezirk}
              </div>
              <span className="hidden sm:inline">|</span>
              <div>
                <span className="font-semibold">Benutzer:</span> {userName}
              </div>
            </div>
          </div>
        </div>
        
        {/* Jagdjahr - Icon für Mobile, Desktop-Variante für Desktop */}
        {availableJagdjahre && onJagdjahrChange && (
          <>
            <div className="sm:hidden">
              <JagdjahrSelect
                jagdjahr={jagdjahr}
                availableJagdjahre={availableJagdjahre}
                onJagdjahrChange={onJagdjahrChange}
                variant="icon"
              />
            </div>
            <div className="hidden sm:block">
              <JagdjahrSelect
                jagdjahr={jagdjahr}
                availableJagdjahre={availableJagdjahre}
                onJagdjahrChange={onJagdjahrChange}
                variant="desktop"
              />
            </div>
          </>
        )}
        
        <Nav onLogout={onLogout} />
      </div>
    </header>
  );
};