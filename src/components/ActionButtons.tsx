import { memo } from 'react';
import { 
  Plus, 
  Filter, 
  Printer, 
  FunnelXIcon,
  // Upload,
  // RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import type { UserData } from '@types';

interface ActionButtonsProps {
  showFilter: boolean;
  showNewEntryForm: boolean;
  onToggleFilterPanel?: () => void;
  onToggleNewEntryForm?: () => void;
  onToggleImportDialog?: () => void;
  onToggleFixDialog?: () => void;
  currentUser: UserData | null;
}

export const ActionButtons: React.FC<ActionButtonsProps> = memo(({
  showFilter,
  showNewEntryForm,
  onToggleFilterPanel,
  onToggleNewEntryForm,
  // onToggleFixDialog,
  // onToggleImportDialog,
  // currentUser
}) => {
  const navigate = useNavigate();

  // const isAdmin = currentUser?.role === 'admin';

  const buttons = [
    {
      id: 'new-entry',
      icon: Plus,
      title: showNewEntryForm ? 'Neuen Eintrag schließen' : 'Neuer Eintrag',
      onClick: onToggleNewEntryForm,
      isActive: showNewEntryForm,
      activeColors: 'text-red-700 shadow-red-500/20',
      iconClass: showNewEntryForm ? 'rotate-45' : '',
      disabled: false,
      show: true,
    },
    // {
    //   id: 'import',
    //   icon: Upload,
    //   title: 'CSV importieren',
    //   onClick: onToggleImportDialog,
    //   isActive: false,
    //   activeColors: '',
    //   iconClass: '',
    //   disabled: showNewEntryForm,
    //   show: isAdmin,
    // },
    // {
    //   id: 'fix-kategorien',
    //   icon: RefreshCw,
    //   title: 'Kategorien korrigieren',
    //   onClick: onToggleFixDialog,
    //   isActive: false,
    //   activeColors: 'text-orange-700 shadow-orange-500/20',
    //   iconClass: '',
    //   disabled: showNewEntryForm,
    //   show: isAdmin,
    // },
    {
      id: 'filter',
      icon: showFilter ? FunnelXIcon : Filter,
      title: 'Filter anzeigen/verstecken',
      onClick: onToggleFilterPanel,
      isActive: showFilter,
      activeColors: 'text-green-700 shadow-green-500/20',
      iconClass: '',
      disabled: showNewEntryForm,
      show: true,
    },
    {
      id: 'print',
      icon: Printer,
      title: 'Drucken',
      onClick: () => navigate('/print'),
      isActive: false,
      activeColors: '',
      iconClass: '',
      disabled: false,
      show: true,
    },
  ];

  return (
    <div className="flex gap-3 mb-6 print:hidden">
      {buttons.filter(button => button.show).map((button) => {
        const Icon = button.icon;

        return (
          <button
            key={button.id}
            onClick={button.onClick}
            disabled={button.disabled}
            className={`
              group relative
              w-12 h-12 rounded-2xl
              flex items-center justify-center
              glass-bg backdrop-blur-xl backdrop-saturate-[180%]
              transition-all duration-300 ease-bounce
              hover:scale-105 active:scale-95
              focus:outline-none focus:ring-2 focus:ring-white/20
              disabled:opacity-50 disabled:cursor-not-allowed
              ${button.isActive
                ? `glass-shadow-active ${button.activeColors}`
                : 'text-black/70 hover:text-black/90 glass-shadow'
              }
            `}
            title={button.title}
          >
            {/* Active state background overlay */}
            <div className={`
              absolute inset-0 rounded-2xl
              bg-gradient-active opacity-0
              transition-opacity duration-300
              ${button.isActive ? 'opacity-100' : 'group-hover:opacity-50'}
            `} />

            {/* Icon */}
            <Icon
              size={20}
              className={`
                relative z-10 
                transition-all duration-300 ease-bounce
                group-hover:scale-110
                ${button.iconClass}
              `}
            />

            {/* Ripple effect on click */}
            <div className="
              absolute inset-0 rounded-2xl
              bg-white/20 opacity-0 scale-0
              group-active:opacity-100 group-active:scale-100
              transition-all duration-150
            " />
          </button>
        );
      })}
    </div>
  );
});