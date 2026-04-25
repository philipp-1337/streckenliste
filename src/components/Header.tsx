import { useState } from 'react';
import { JagdjahrSelect } from "./JagdjahrSelect";
import useAuth from "@hooks/useAuth";
import { BowArrow, ChevronUp, ChevronDown } from "lucide-react";

const COLLAPSE_KEY = 'headerCollapsed';

interface HeaderProps {
  jagdjahr?: string;
  availableJagdjahre?: string[];
  onJagdjahrChange?: (jagdjahr: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ jagdjahr, availableJagdjahre, onJagdjahrChange }) => {
  const { currentUser } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === 'true'; } catch { return false; }
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Jagdbezirk und Name auslesen
  const jagdbezirk =
    currentUser?.jagdbezirk?.name || currentUser?.jagdbezirkId || "Unbekannt";
  const userName =
    currentUser?.displayName || currentUser?.email || "Unbekannt";

  return (
    <header className="mb-4 print:hidden">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center">
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
                    <stop offset="0%" stopColor="hsl(148 97% 20%)" />
                    <stop offset="100%" stopColor="hsl(151 100% 30%)" />
                  </linearGradient>
                </defs>
                <BowArrow stroke="url(#bowarrowGradient)" strokeWidth={2} />
              </svg>
            </h1>
            {/* Collapse toggle — mobile only */}
            <button
              onClick={toggleCollapsed}
              className="sm:hidden ml-2 flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-green-800/40 hover:text-green-800/70 hover:bg-green-100 transition-colors cursor-pointer"
              aria-label={isCollapsed ? 'Details einblenden' : 'Details ausblenden'}
            >
              {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>

          {/* Collapsible subtitle — collapses on mobile, always visible on sm+ */}
          <div
            className={`grid transition-[grid-template-rows] duration-200 ease-out ${isCollapsed ? 'grid-rows-[0fr] sm:grid-rows-[1fr]' : 'grid-rows-[1fr]'}`}
          >
            <div className="overflow-hidden">
              <div className="text-sm text-green-900 mt-1">
                <div className="sm:flex sm:gap-2">
                  <div>
                    <span className="font-semibold">Jagdbezirk:</span> {jagdbezirk}
                  </div>
                  <span className="hidden sm:inline">|</span>
                  <div>
                    <span className="font-semibold">Benutzer:</span> {userName}
                  </div>
                  {/* Jagdjahr unter Benutzer auf kleinen Screens */}
                  {jagdjahr && (
                    <div className="sm:hidden">
                      <span className="font-semibold">Jagdjahr:</span> {jagdjahr}
                    </div>
                  )}
                </div>
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
      </div>
    </header>
  );
};
