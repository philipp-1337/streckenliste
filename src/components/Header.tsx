import { Nav } from './Nav';
import useAuth from '@hooks/useAuth';



interface HeaderProps {
  onLogout: () => void;
}

  export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
    const { currentUser } = useAuth();
    // Jagdbezirk und Name auslesen
    const jagdbezirk = currentUser?.jagdbezirk?.name || currentUser?.jagdbezirkId || 'Unbekannt';
    const userName = currentUser?.displayName || currentUser?.email || 'Unbekannt';

    return (
      <header className="flex justify-between items-center mb-6 print:hidden">
        <div>
          <h1 className="text-4xl font-bold text-green-800">Streckenliste</h1>
          <div className="text-sm text-green-900 mt-1">
            <span className="font-semibold">Jagdbezirk:</span> {jagdbezirk} &nbsp;|&nbsp;
            <span className="font-semibold">Benutzer:</span> {userName}
          </div>
        </div>
        <Nav onLogout={onLogout} />
      </header>
    );
  };
