import { memo } from 'react';
import {
  Plus,
  Filter,
  FileDown,
  FunnelXIcon,
  Book,
  BookOpen,
  Loader2,
  // Upload,
  // RefreshCw
} from 'lucide-react';

import type { UserData } from '@types';

interface ActionButtonsProps {
  showFilter: boolean;
  showNewEntryForm: boolean;
  onToggleFilterPanel?: () => void;
  onToggleNewEntryForm?: () => void;
  onToggleImportDialog?: () => void;
  onToggleFixDialog?: () => void;
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
  onToggleLegende?: () => void;
  showLegende?: boolean;
  currentUser: UserData | null;
  activeFilterCount: number;
}

export const ActionButtons: React.FC<ActionButtonsProps> = memo(({
  showFilter,
  showNewEntryForm,
  onToggleFilterPanel,
  onToggleNewEntryForm,
  // onToggleFixDialog,
  // onToggleImportDialog,
  // currentUser
  onExportPdf,
  isExportingPdf,
  onToggleLegende,
  showLegende,
  activeFilterCount,
}) => {
  // const isAdmin = currentUser?.role === 'admin';

  const toggleButtons = [
    {
      id: 'new-entry',
      icon: Plus,
      title: showNewEntryForm ? 'Neuen Eintrag schließen' : 'Neuer Eintrag',
      onClick: onToggleNewEntryForm,
      isActive: showNewEntryForm,
      activeColors: 'text-red-700',
      iconClass: showNewEntryForm ? 'rotate-45' : '',
      disabled: false,
      show: true,
    },
    {
      id: 'filter',
      icon: showFilter ? FunnelXIcon : Filter,
      title: 'Filter anzeigen/verstecken',
      onClick: onToggleFilterPanel,
      isActive: showFilter,
      activeColors: 'text-green-700',
      iconClass: '',
      disabled: showNewEntryForm,
      show: true,
    },
    {
      id: 'legende',
      icon: showLegende ? BookOpen : Book,
      title: 'Fachbegriffe & Legende',
      onClick: onToggleLegende,
      isActive: !!showLegende,
      activeColors: 'text-green-700',
      iconClass: '',
      disabled: false,
      show: true,
    },
  ];

  const exportButtons = [
    {
      id: 'pdf-export',
      icon: isExportingPdf ? Loader2 : FileDown,
      title: 'PDF exportieren',
      onClick: onExportPdf,
      isActive: false,
      activeColors: '',
      iconClass: isExportingPdf ? 'animate-spin' : '',
      disabled: !!isExportingPdf,
      show: true,
    },
  ];

  const renderButton = (button: typeof toggleButtons[0] | typeof exportButtons[0]) => {
    const Icon = button.icon;
    const isFilterButton = button.id === 'filter';

    return (
      <button
        key={button.id}
        onClick={button.onClick}
        disabled={button.disabled}
        className={`
          group relative
          w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl
          flex items-center justify-center
          glass-bg backdrop-blur-xl backdrop-saturate-[180%]
          transition-all duration-300 ease-bounce
          hover:scale-105 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-green-500/30
          disabled:opacity-50 disabled:cursor-not-allowed
          ${button.isActive
            ? `glass-shadow-active ${button.activeColors}`
            : 'text-green-900/70 hover:text-green-900/90 glass-shadow'
          }
        `}
        title={button.title}
      >
        <div className={`
          absolute inset-0 rounded-xl sm:rounded-2xl
          bg-gradient-active opacity-0
          transition-opacity duration-300
          ${button.isActive ? 'opacity-100' : 'group-hover:opacity-50'}
        `} />

        <Icon
          size={18}
          className={`
            relative z-10
            transition-all duration-300 ease-bounce
            group-hover:scale-110
            ${button.iconClass}
          `}
        />

        {isFilterButton && activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 z-20 min-w-[18px] h-[18px] px-1 rounded-full bg-green-700 text-white text-[10px] leading-[18px] font-semibold">
            {activeFilterCount}
          </span>
        )}

        <div className="
          absolute inset-0 rounded-xl sm:rounded-2xl
          bg-white/20 opacity-0 scale-0
          group-active:opacity-100 group-active:scale-100
          transition-all duration-150
        " />
      </button>
    );
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {toggleButtons.filter(b => b.show).map(renderButton)}

      <div className="w-px h-6 sm:h-7 bg-green-900/10 mx-0.5" />

      {exportButtons.filter(b => b.show).map(renderButton)}
    </div>
  );
});
