interface HeaderProps {
  isDemoMode: boolean;
  onToggleMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isDemoMode, onToggleMode }) => {
  return (
    <header className="flex justify-between items-center mb-6 print:hidden">
      <h1 className="text-4xl font-bold text-green-800">Jagd-Streckenliste</h1>
      <div className="flex items-center gap-4">
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isDemoMode ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`}>
          {isDemoMode ? 'Demo-Modus' : 'Live-Modus'}
        </span>
        <button 
          onClick={onToggleMode}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
        >
          {isDemoMode ? 'Live-Modus aktivieren' : 'Demo-Modus nutzen'}
        </button>
      </div>
    </header>
  );
};
