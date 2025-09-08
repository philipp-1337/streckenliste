import { Nav } from './Nav';

interface HeaderProps {
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  return (
    <header className="flex justify-between items-center mb-6 print:hidden">
      <h1 className="text-4xl font-bold text-green-800">Jagd-Streckenliste</h1>
      <Nav onLogout={onLogout} />
    </header>
  );
};
