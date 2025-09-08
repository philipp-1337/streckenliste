import { LogOut } from 'lucide-react';

interface HeaderProps {
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  return (
    <header className="flex justify-between items-center mb-6 print:hidden">
      <h1 className="text-4xl font-bold text-green-800">Jagd-Streckenliste</h1>
      <div className="flex items-center gap-4">
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
