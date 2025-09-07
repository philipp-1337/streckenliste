import { TestTube2 } from 'lucide-react';

interface HeaderProps {
  isDemoMode: boolean;
  onToggleMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isDemoMode, onToggleMode }) => {
  return (
    <header className="bg-green-800 text-white p-6 rounded-lg mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">🦌 Jagd-Streckenliste</h1>
          <p className="mt-2">Digitale Erfassung der Jagdstrecke mit korrekten Fachbegriffen</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-sm font-medium ${isDemoMode ? 'text-yellow-300' : 'text-green-300'}`}>
            {isDemoMode ? 'Demo Modus' : 'Live Modus'}
          </span>
          <button 
            onClick={onToggleMode}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-2 rounded-lg text-sm transition-colors"
            title="Modus wechseln"
          >
            <TestTube2 size={16} />
            Modus wechseln
          </button>
        </div>
      </div>
    </header>
  );
};
