
import { BarChart3, BookIcon, HomeIcon, LogOutIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NavProps {
  onLogout: () => void;
}

export const Nav: React.FC<NavProps> = ({ onLogout }) => {
  const navigate = useNavigate();

  return (
    <nav>
      <div className="fixed bottom-0 left-0 w-full bg-neutral-900 border-t border-neutral-800 z-50 flex justify-around items-center py-2 px-1 shadow-lg">
        <button
          onClick={() => navigate('/')}
          className="flex flex-col items-center gap-1 text-white hover:text-neutral-300 px-2 py-1 focus:outline-none"
        >
          <HomeIcon size={20} />
          <span className="text-xs">Übersicht</span>
        </button>
        <button
          onClick={() => navigate('/stats')}
          className="flex flex-col items-center gap-1 text-white hover:text-neutral-300 px-2 py-1 focus:outline-none"
        >
          <BarChart3 size={20} />
          <span className="text-xs">Statistiken</span>
        </button>
        <button
          onClick={() => navigate('/legende')}
          className="flex flex-col items-center gap-1 text-white hover:text-neutral-300 px-2 py-1 focus:outline-none"
        >
          <BookIcon size={20} />
          <span className="text-xs">Legende</span>
        </button>
        <button
          onClick={onLogout}
          className="flex flex-col items-center gap-1 text-gray-300 hover:text-red-400 px-2 py-1 focus:outline-none"
          title="Logout"
        >
          <LogOutIcon size={20} />
          <span className="text-xs">Logout</span>
        </button>
      </div>
      {/* Platzhalter für BottomTabMenu, damit Content nicht verdeckt wird */}
      <div style={{ height: '56px' }} />
    </nav>
  );
}
