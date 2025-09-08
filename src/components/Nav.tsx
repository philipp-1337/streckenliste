interface NavProps {
  onLogout: () => void;
}

import { BarChart3, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export const Nav: React.FC<NavProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Menü-Buttons als eigene Komponente für Wiederverwendung
  const MenuButtons = () => (
    <>
      <button
        onClick={() => { navigate('/'); setOpen(false); }}
        className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow"
      >
        🏠 Übersicht
      </button>
      <button
        onClick={() => { navigate('/stats'); setOpen(false); }}
        className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow"
      >
        <BarChart3 size={18} /> Statistiken
      </button>
      <button
        onClick={() => { navigate('/legende'); setOpen(false); }}
        className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow"
      >
        📖 Legende
      </button>
      <button
        onClick={() => { onLogout(); setOpen(false); }}
        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        title="Logout"
      >
        Logout
      </button>
    </>
  );

  return (
    <nav className="flex items-center gap-4">
      {/* Desktop-Menü */}
      <div className="hidden md:flex items-center gap-4">
        <MenuButtons />
      </div>
      {/* Hamburger für mobile */}
      <button
        className="md:hidden p-2 rounded-lg bg-neutral-800 text-white flex items-center"
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
      >
        <Menu size={28} />
      </button>
      {/* Overlay-Menü */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-64 bg-white shadow-lg z-50 flex flex-col gap-4 p-6 animate-slide-in">
            <button
              className="self-end mb-2 p-2 text-neutral-800"
              onClick={() => setOpen(false)}
              aria-label="Menü schließen"
            >
              ✕
            </button>
            <MenuButtons />
          </div>
        </>
      )}
      {/* Styles für Animation */}
      <style>{`
        @media (max-width: 1023px) {
          .md\\:flex { display: none !important; }
          .md\\:hidden { display: inline-flex !important; }
        }
        @media (min-width: 1024px) {
          .md\\:flex { display: flex !important; }
          .md\\:hidden { display: none !important; }
        }
        .animate-slide-in {
          animation: slideInNav 0.2s ease;
        }
        @keyframes slideInNav {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </nav>
  );
}
