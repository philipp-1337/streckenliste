import { useState } from 'react';
import { toast } from 'sonner';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { FirebaseError } from 'firebase/app';


import Spinner from '@components/Spinner';


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
      <div className="flex flex-col items-center justify-center h-screen bg-green-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mb-4"></div>
        <p className="text-xl text-gray-700">Daten werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-green-800 mb-6">Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-green-500 focus:border-green-500"
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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
            <input
              type="password"
              id="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-green-500 focus:border-green-500"
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
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