import { BarChart3, BookIcon, HomeIcon, LogOutIcon, ClipboardCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { UserData } from '@types';

interface NavProps {
  onLogout: () => void;
  currentUser: UserData | null;
  pendingCount: number;
}

export const Nav: React.FC<NavProps> = ({ onLogout, currentUser, pendingCount }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = currentUser?.role === 'admin';

  const tabs = [
    {
      path: '/',
      label: 'Übersicht',
      icon: HomeIcon,
      onClick: () => navigate('/'),
    },
    {
      path: '/stats',
      label: 'Statistiken',
      icon: BarChart3,
      onClick: () => navigate('/stats'),
    },
    ...(isAdmin ? [{
      path: '/freigaben',
      label: 'Freigaben',
      icon: ClipboardCheck,
      onClick: () => navigate('/freigaben'),
      badge: pendingCount > 0 ? pendingCount : 0,
    }] : []),
    {
      path: '/legende',
      label: 'Legende',
      icon: BookIcon,
      onClick: () => navigate('/legende'),
    },
    {
      path: '/logout',
      label: 'Logout',
      icon: LogOutIcon,
      onClick: onLogout,
      isLogout: true,
    },
  ];

  const navWidth = `clamp(${tabs.length * 68}px, 90vw, ${tabs.length * 82}px)`;

  return (
    <nav>
      <div
        style={{ width: navWidth }}
        className="
        fixed left-1/2 -translate-x-1/2 bottom-safe-floating
        h-16
        glass-bg glass-shadow rounded-pill
        backdrop-blur-xl backdrop-saturate-[180%]
        flex justify-around items-center
        z-[1001] px-2 py-2 sm:px-1.5 sm:py-1.5
        animate-slide-up
      ">

        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;

          return (
            <button
              key={tab.path}
              onClick={tab.onClick}
              className={`
                group flex-1 flex flex-col items-center justify-center
                p-1.5 sm:p-1 h-full
                bg-transparent border-none outline-none cursor-pointer
                font-inherit text-[11px] sm:text-xs
                transition-colors duration-300
                relative rounded-3xl
                ${tab.isLogout
                  ? 'text-gray-400 hover:text-red-400'
                  : isActive
                    ? 'text-green-800'
                    : 'text-black/70 hover:text-black/90'
                }
                ${isActive
                  ? 'before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-active before:opacity-100'
                  : 'before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-active before:opacity-0 before:transition-opacity before:duration-300'
                }
              `}
              title={tab.isLogout ? 'Logout' : undefined}
            >
              <span className="relative z-10 flex flex-col items-center gap-1">
                <span className="relative">
                  <Icon
                    size={20}
                    strokeWidth={isActive && !tab.isLogout ? 2.5 : 2}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                  {'badge' in tab && (tab.badge ?? 0) > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] leading-4 font-bold text-center">
                      {tab.badge}
                    </span>
                  )}
                </span>
                <span>{tab.label}</span>
              </span>
            </button>
          );
        })}

      </div>
    </nav>
  );
}