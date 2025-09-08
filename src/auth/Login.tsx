import { useState } from 'react';
import { Toaster, toast } from 'sonner';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Fehlermeldung wird nur als Toast angezeigt

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
  // setError entfernt, da Toast genutzt wird
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) { // Added any for error type
  // setError entfernt, da Toast genutzt wird
      if (err.code === 'auth/invalid-credential') {
        toast.error('Ungültige Zugangsdaten. Bitte überprüfe Email und Passwort.');
      } else {
        toast.error(err.message || 'Fehler beim Login');
      }
      console.error(err);
    }
  };

  return (
    <>
      <Toaster richColors position="bottom-center" />
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
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Login
            </button>
            {/* Fehlermeldung wird jetzt als Toast angezeigt */}
            <p className='text-sm text-center mt-4'>Demo: demo@example.com / demo-login</p>
          </form>
        </div>
      </div>
    </>
  );
};

export default Login;