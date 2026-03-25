import { useState } from 'react';
import { toast } from 'sonner';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { FirebaseError } from 'firebase/app';
import Spinner from '@components/Spinner';
import { BowArrow } from 'lucide-react';


interface LoginProps {
  isLoggingIn: boolean;
  setIsLoggingIn: (v: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ isLoggingIn, setIsLoggingIn }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const sanitizedEmail = email.trim();
    try {
      await signInWithEmailAndPassword(auth, sanitizedEmail, password);
      setIsLoggingIn(true);
    } catch (err: unknown) {
      const error = err as FirebaseError;
      if (error.code === 'auth/invalid-credential') {
        toast.error('Ungültige Zugangsdaten. Bitte überprüfe Email und Passwort.');
      } else {
        toast.error(error.message || 'Fehler beim Login');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Zeige Loader, wenn Login erfolgreich war und App noch lädt
  if (isLoggingIn) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-green-50 gap-4">
        <Spinner size={40} />
        <p className="text-base text-green-900">Daten werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-bold text-green-800 flex items-center gap-1">
            Streckenliste
            <svg className="inline w-7 h-7 sm:w-9 sm:h-9 ml-1" viewBox="0 0 24 24">
              <defs>
                <linearGradient
                  id="bowarrowGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="hsl(148 97% 20%)" /> {/* green-800 */}
                  <stop offset="100%" stopColor="hsl(151 100% 30%)" />{" "}
                  {/* green-500 */}
                </linearGradient>
              </defs>
              <BowArrow stroke="url(#bowarrowGradient)" strokeWidth={2} />
            </svg>
          </h1>
          <p className="text-sm text-green-900/60 mt-1">Digitale Jagdstrecke</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-green-900 mb-1">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
              required
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Trigger form submit manually
                  (e.target as HTMLInputElement).form?.requestSubmit();
                }
              }}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-green-900 mb-1">Passwort</label>
            <input
              type="password"
              id="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
            disabled={loading}
          >
            {loading ? <Spinner size={24} /> : null}
            {loading ? 'Wird geprüft...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;