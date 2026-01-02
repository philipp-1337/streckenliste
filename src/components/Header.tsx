import { Nav } from "./Nav";
import useAuth from "@hooks/useAuth";
import { BowArrow } from "lucide-react";

interface HeaderProps {
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const { currentUser } = useAuth();
  // Jagdbezirk und Name auslesen
  const jagdbezirk =
    currentUser?.jagdbezirk?.name || currentUser?.jagdbezirkId || "Unbekannt";
  const userName =
    currentUser?.displayName || currentUser?.email || "Unbekannt";

  return (
    <header className="flex justify-between items-center mb-6 print:hidden">
      <div>
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
      <Nav onLogout={onLogout} />
    </header>
  );
};
