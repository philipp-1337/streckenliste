import { Calendar, ChevronDown } from 'lucide-react';
import { useDropdown } from '@hooks/useDropdown';

interface JagdjahrSelectProps {
  jagdjahr?: string;
  availableJagdjahre: string[];
  onJagdjahrChange: (jagdjahr: string) => void;
  variant?: 'desktop' | 'icon';
}

export const JagdjahrSelect: React.FC<JagdjahrSelectProps> = ({
  jagdjahr,
  availableJagdjahre,
  onJagdjahrChange,
  variant = 'desktop'
}) => {
  const { isOpen, dropdownRef, toggle, close } = useDropdown();

  const handleSelect = (jahr: string) => {
    onJagdjahrChange(jahr);
    close();
  };

  const displayText = jagdjahr || 'Alle Jagdjahre';

  // Icon variant für mobile ActionButtons
  if (variant === 'icon') {
    return (
      <div className="md:hidden relative" ref={dropdownRef}>
        <button
          onClick={toggle}
          className="
            group relative
            w-12 h-12 rounded-2xl
            flex items-center justify-center
            glass-bg backdrop-blur-xl backdrop-saturate-[180%]
            transition-all duration-300 ease-bounce
            hover:scale-105 active:scale-95
            focus:outline-none focus:ring-2 focus:ring-white/20
            text-black/70 hover:text-black/90 glass-shadow
          "
          title="Jagdjahr auswählen"
        >
          {/* Active state background overlay */}
          <div className="
            absolute inset-0 rounded-2xl
            bg-gradient-active opacity-0
            transition-opacity duration-300
            group-hover:opacity-50
          " />

          {/* Icon */}
          <Calendar
            size={20}
            className="relative z-10 transition-all duration-300 ease-bounce group-hover:scale-110"
          />

          {/* Badge wenn ein Jahr ausgewählt ist */}
          {jagdjahr && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-600 rounded-full border-2 border-white z-20 flex items-center justify-center">
              <ChevronDown size={10} className="text-white" />
            </div>
          )}

          {/* Ripple effect on click */}
          <div className="
            absolute inset-0 rounded-2xl
            bg-white/20 opacity-0 scale-0
            group-active:opacity-100 group-active:scale-100
            transition-all duration-150
          " />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg border border-green-200 shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              onClick={() => handleSelect('')}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                !jagdjahr 
                  ? 'bg-green-50 text-green-900 font-semibold' 
                  : 'text-green-800 hover:bg-green-50'
              }`}
            >
              Alle Jagdjahre
            </button>
            {availableJagdjahre.map(jahr => (
              <button
                key={jahr}
                onClick={() => handleSelect(jahr)}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                  jagdjahr === jahr 
                    ? 'bg-green-50 text-green-900 font-semibold' 
                    : 'text-green-800 hover:bg-green-50'
                }`}
              >
                {jahr}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop variant für Header
  return (
    <div className="mx-4 relative" ref={dropdownRef}>
      <label className="block text-sm font-semibold text-green-900 mb-1">
        Jagdjahr
      </label>
      <button
        onClick={toggle}
        className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border-2 border-green-600 shadow-sm hover:border-green-700 hover:shadow-md transition-all active:scale-[0.98] min-w-[140px]"
        aria-label="Jagdjahr auswählen"
      >
        <span className="flex-1 text-left text-green-900 font-medium text-sm">
          {displayText}
        </span>
        <ChevronDown className={`w-4 h-4 text-green-700 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-green-200 shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => handleSelect('')}
            className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
              !jagdjahr 
                ? 'bg-green-50 text-green-900 font-semibold' 
                : 'text-green-800 hover:bg-green-50'
            }`}
          >
            Alle Jagdjahre
          </button>
          {availableJagdjahre.map(jahr => (
            <button
              key={jahr}
              onClick={() => handleSelect(jahr)}
              className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                jagdjahr === jahr 
                  ? 'bg-green-50 text-green-900 font-semibold' 
                  : 'text-green-800 hover:bg-green-50'
              }`}
            >
              {jahr}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
