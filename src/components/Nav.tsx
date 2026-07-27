import { BarChart3, HomeIcon, SettingsIcon, Users } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { UserData } from '@types';

interface NavProps {
  currentUser: UserData | null;
  pendingCount: number;
}

export const Nav: React.FC<NavProps> = ({ currentUser, pendingCount }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = currentUser?.role === 'admin';

  const tabs = [
    {
      path: '/',
      label: 'Übersicht',
      icon: HomeIcon,
      onClick: () => navigate('/'),
      badge: isAdmin && pendingCount > 0 ? pendingCount : 0,
    },
    {
      path: '/stats',
      label: 'Statistiken',
      icon: BarChart3,
      onClick: () => navigate('/stats'),
    },
    ...(isAdmin ? [
      {
        path: '/users',
        label: 'Benutzer',
        icon: Users,
        onClick: () => navigate('/users'),
      },
    ] : []),
    {
      path: '/einstellungen',
      label: 'Einstellungen',
      icon: SettingsIcon,
      onClick: () => navigate('/einstellungen'),
    },
  ];

  const navWidth = `clamp(280px, 90vw, ${tabs.length * 82}px)`;

  return (
    <div className="fixed inset-0 pointer-events-none z-[1001]">
      <nav
        style={{ width: navWidth }}
        className="
        absolute left-1/2 -translate-x-1/2 bottom-safe-floating
        h-16
        glass-bg glass-shadow rounded-pill
        backdrop-blur-xl backdrop-saturate-[180%]
        flex justify-around items-center
        px-2 py-2 sm:px-1.5 sm:py-1.5
        animate-slide-up pointer-events-auto motion-reduce:animate-none
        "
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.path === '/einstellungen'
            ? location.pathname.startsWith('/einstellungen')
            : location.pathname === tab.path;

          return (
            <button
              key={tab.path}
              onClick={tab.onClick}
              className={`
                group flex-1 flex flex-col items-center justify-center
                p-1.5 sm:p-1 h-full
                bg-transparent border-none outline-none cursor-pointer
                font-inherit text-xs
                transition-colors duration-200 motion-reduce:transition-none
                relative rounded-3xl
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2
                ${isActive
                    ? 'text-green-800'
                    : 'text-green-900/60 hover:text-green-900/90 hover:bg-white/10'
                }
                ${isActive
                  ? 'before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-active before:opacity-100'
                  : 'before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-active before:opacity-0 hover:before:opacity-50 before:transition-opacity before:duration-300'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="relative z-10 flex flex-col items-center gap-1">
                <span className="relative">
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    className="transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                  />
                  {'badge' in tab && (tab.badge ?? 0) > 0 && (
                    <span className="absolute -right-2 -top-2 min-w-[20px] rounded-full bg-red-600 px-1 text-center text-xs font-bold leading-5 text-white">
                      {tab.badge}
                    </span>
                  )}
                </span>
                <span>{tab.label}</span>
              </span>
            </button>
          );
        })}

      </nav>
    </div>
  );
}
