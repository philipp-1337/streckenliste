import { LogOut, ToggleLeft, ToggleRight } from 'lucide-react';

interface HeaderProps {
  isDemoMode: boolean;
  onToggleMode: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isDemoMode, onToggleMode, onLogout }) => {
  return (
    <header className="flex justify-between items-center mb-6 print:hidden">
      <h1 className="text-4xl font-bold text-green-800">Jagd-Streckenliste</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onToggleMode} title="Modus wechseln">
          <span className={`text-sm font-semibold ${!isDemoMode ? 'text-green-700' : 'text-gray-500'}`}>
            Live
          </span>
          {isDemoMode ? (
            <ToggleLeft size={36} className="text-gray-400" />
          ) : (
            <ToggleRight size={36} className="text-green-600" />
          )}
          <span className={`text-sm font-semibold ${isDemoMode ? 'text-yellow-800' : 'text-gray-500'}`}>
            Demo
          </span>
        </div>
        <button
          onClick={onLogout}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          title="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};
