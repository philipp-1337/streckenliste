import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../firebase';
import { FirebaseError } from 'firebase/app';
import { toast } from 'sonner';
import Spinner from '@components/Spinner';
import { BowArrow, CheckCircle } from 'lucide-react';

const Logo = () => (
  <h1 className="text-3xl font-bold text-green-800 flex items-center gap-1">
    Streckenliste
    <svg className="inline w-7 h-7 sm:w-9 sm:h-9 ml-1" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="bowarrowGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(148 97% 20%)" />
          <stop offset="100%" stopColor="hsl(151 100% 30%)" />
        </linearGradient>
      </defs>
      <BowArrow stroke="url(#bowarrowGradient2)" strokeWidth={2} />
    </svg>
  </h1>
);

const ActionHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  const [email, setEmail] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [invalidCode, setInvalidCode] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (mode !== 'resetPassword' || !oobCode) {
      setInvalidCode(true);
      setVerifying(false);
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then(email => {
        setEmail(email);
        setVerifying(false);
      })
      .catch(() => {
        setInvalidCode(true);
        setVerifying(false);
      });
  }, [mode, oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirm) {
      toast.error('Die Passwörter stimmen nicht überein.');
      return;
    }
    if (password.length < 6) {
      toast.error('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode!, password);
      setDone(true);
    } catch (err: unknown) {
      const error = err as FirebaseError;
      if (error.code === 'auth/weak-password') {
        toast.error('Das Passwort ist zu schwach. Bitte wähle ein stärkeres Passwort.');
      } else if (error.code === 'auth/expired-action-code') {
        toast.error('Dieser Link ist abgelaufen. Bitte fordere einen neuen an.');
      } else {
        toast.error('Fehler beim Setzen des Passworts. Bitte versuche es erneut.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo />
          <p className="text-sm text-green-900/60 mt-1">Digitale Jagdstrecke</p>
        </div>

        {verifying && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Spinner size={32} />
            <p className="text-gray-600 text-sm">Link wird überprüft...</p>
          </div>
        )}

        {!verifying && invalidCode && (
          <div className="text-center space-y-4">
            <p className="text-red-600 font-medium">Dieser Link ist ungültig oder abgelaufen.</p>
            <p className="text-sm text-gray-500">Bitte fordere auf der Login-Seite einen neuen Passwort-Reset-Link an.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 w-full bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
            >
              Zur Anmeldung
            </button>
          </div>
        )}

        {!verifying && !invalidCode && done && (
          <div className="text-center space-y-4">
            <CheckCircle className="mx-auto text-green-600" size={48} />
            <p className="text-green-800 font-semibold text-lg">Passwort erfolgreich gesetzt!</p>
            <p className="text-sm text-gray-500">Du kannst dich jetzt mit deinem neuen Passwort anmelden.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 w-full bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
            >
              Zur Anmeldung
            </button>
          </div>
        )}

        {!verifying && !invalidCode && !done && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Neues Passwort für <span className="font-medium text-gray-800">{email}</span> festlegen.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-green-900 mb-1">Neues Passwort</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-green-900 mb-1">Passwort bestätigen</label>
              <input
                type="password"
                required
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                placeholder="Passwort wiederholen"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                disabled={submitting}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer min-h-[48px] disabled:opacity-50"
            >
              {submitting ? <Spinner size={24} /> : null}
              {submitting ? 'Wird gespeichert...' : 'Passwort festlegen'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ActionHandler;
