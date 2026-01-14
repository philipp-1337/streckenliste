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

  // Icon variant für mobile Header
  if (variant === 'icon') {
    return (
      <div className="sm:hidden relative" ref={dropdownRef}>
        <button
          onClick={toggle}
          className="
            relative
            w-10 h-10 rounded-lg
            flex items-center justify-center
            bg-white/80 border-2 border-green-600
            transition-all duration-200
            hover:bg-white hover:border-green-700
            active:scale-95
            focus:outline-none focus:ring-2 focus:ring-green-500/20
            text-green-700
          "
          title="Jagdjahr auswählen"
        >
          <Calendar size={18} className="transition-transform" />

          {/* Badge wenn ein Jahr ausgewählt ist */}
          {jagdjahr && (
            <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-green-600 rounded-full border border-white" />
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg border border-green-600 shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-green-600 shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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
