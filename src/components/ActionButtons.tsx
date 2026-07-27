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
  currentUser,
}) => {
  const isUserWithoutAssignment = currentUser?.role === 'user' && (!currentUser.jaegerId || !currentUser.jaegerProfile);

  const toggleButtons = [
    {
      id: 'new-entry',
      icon: Plus,
      title: isUserWithoutAssignment
        ? 'Neuer Eintrag erst nach Jäger-Zuordnung möglich'
        : showNewEntryForm ? 'Neuen Eintrag schließen' : 'Neuer Eintrag',
      onClick: onToggleNewEntryForm,
      isActive: showNewEntryForm,
      activeColors: 'text-red-700',
      iconClass: showNewEntryForm ? 'rotate-45' : '',
      disabled: isUserWithoutAssignment,
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
    const isPrimaryButton = button.id === 'new-entry';

    return (
      <button
        key={button.id}
        onClick={button.onClick}
        disabled={button.disabled}
        className={`cursor-pointer 
          group relative
          h-11 rounded-xl sm:h-12 sm:rounded-2xl
          flex items-center justify-center
          ${isPrimaryButton ? 'gap-2 bg-green-700 px-3 text-white shadow-sm hover:bg-green-800 sm:px-4' : 'size-11 glass-bg backdrop-blur-xl backdrop-saturate-[180%] sm:size-12'}
          transition-[transform,color,box-shadow] duration-200 ease-out
          hover:scale-105 active:scale-95
          motion-reduce:transform-none motion-reduce:transition-none
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isPrimaryButton
            ? ''
            : button.isActive
            ? `glass-shadow-sm-active ${button.activeColors}`
            : 'text-green-900/70 hover:text-green-900/90 glass-shadow-sm'
          }
        `}
        title={button.title}
        aria-label={button.title}
      >
        {!isPrimaryButton && <div className={`
          absolute inset-0 rounded-xl sm:rounded-2xl
          bg-gradient-active opacity-0
          transition-opacity duration-300
          ${button.isActive ? 'opacity-100' : 'group-hover:opacity-50'}
        `} />}

        <Icon
          size={18}
          className={`
            relative z-10
            transition-transform duration-200 ease-out
            group-hover:scale-110
            motion-reduce:transform-none motion-reduce:transition-none
            ${button.iconClass}
          `}
        />
        {isPrimaryButton && (
          <span className="relative z-10 whitespace-nowrap text-sm font-semibold">
            {showNewEntryForm ? 'Formular schließen' : 'Eintrag erfassen'}
          </span>
        )}

        {isFilterButton && activeFilterCount > 0 && (
          <span className="absolute -right-1 -top-1 z-20 min-w-[20px] rounded-full bg-green-700 px-1 text-center text-xs font-semibold leading-5 text-white">
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
    <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:gap-3 sm:overflow-visible sm:pb-0">
      {toggleButtons.filter(b => b.show).map(renderButton)}

      <div className="w-px h-6 sm:h-7 bg-green-900/10 mx-0.5" />

      {exportButtons.filter(b => b.show).map(renderButton)}
    </div>
  );
});
