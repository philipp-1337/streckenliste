import { BarChart3, BookIcon, HomeIcon, LogOutIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavProps {
  onLogout: () => void;
}

export const Nav: React.FC<NavProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

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

  return (
    <nav>
      <div className="
        fixed left-1/2 -translate-x-1/2 bottom-safe-floating
        w-tab-menu h-16 sm:w-tab-menu-sm
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
                font-inherit text-[13px] sm:text-xs
                transition-colors duration-300
                relative rounded-3xl
                ${tab.isLogout
                  ? 'text-gray-400 hover:text-red-400'
                  : isActive
                    ? 'text-black font-semibold'
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
                <Icon
                  size={20}
                  strokeWidth={isActive && !tab.isLogout ? 2.5 : 2}
                  className="transition-transform duration-300 group-hover:scale-105 will-change-transform"
                />
                <span>{tab.label}</span>
              </span>
            </button>
          );
        })}

      </div>
    </nav>
  );
}