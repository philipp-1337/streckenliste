import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Landmark } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';
import useAuth from '@hooks/useAuth';

const toBezirkId = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);

// Onboarding neuer Jagdbezirke. Sichtbar nur für Konten mit dem Custom
// Claim `superadmin` — die eigentliche Berechtigung prüft die Cloud
// Function serverseitig, die Sichtbarkeit hier ist reine UI-Höflichkeit.
export const JagdbezirkOnboarding: React.FC = () => {
  const { firebaseUser } = useAuth();
  // Claim an die UID gebunden, damit nach einem Nutzerwechsel kein
  // veralteter Claim-Stand weiterwirkt.
  const [claimState, setClaimState] = useState<{ uid: string; superadmin: boolean }>({ uid: '', superadmin: false });

  useEffect(() => {
    if (!firebaseUser) return;
    let cancelled = false;
    firebaseUser.getIdTokenResult()
      .then(result => {
        if (!cancelled) {
          setClaimState({ uid: firebaseUser.uid, superadmin: result.claims.superadmin === true });
        }
      })
      .catch(() => { /* ohne Claim bleibt die Sektion unsichtbar */ });
    return () => { cancelled = true; };
  }, [firebaseUser]);

  const isSuperadmin = firebaseUser !== null
    && claimState.uid === firebaseUser.uid
    && claimState.superadmin;

  const [name, setName] = useState('');
  const [bezirkId, setBezirkId] = useState('');
  const [bezirkIdEdited, setBezirkIdEdited] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isSuperadmin) return null;

  const handleNameChange = (value: string) => {
    setName(value);
    if (!bezirkIdEdited) setBezirkId(toBezirkId(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const createJagdbezirk = httpsCallable(functions, 'createJagdbezirk');
      await createJagdbezirk({
        bezirkId: bezirkId.trim(),
        name: name.trim(),
        adminEmail: adminEmail.trim(),
        adminDisplayName: adminName.trim(),
      });
      await sendPasswordResetEmail(auth, adminEmail.trim());

      toast.success(`Jagdbezirk „${name.trim()}" angelegt. Einladung wurde an ${adminEmail.trim()} gesendet.`);
      setName('');
      setBezirkId('');
      setBezirkIdEdited(false);
      setAdminName('');
      setAdminEmail('');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const message = (err as { message?: string }).message;
      if (code === 'functions/already-exists' || code === 'functions/invalid-argument') {
        toast.error(message || 'Anlage fehlgeschlagen.');
      } else {
        toast.error('Fehler beim Anlegen des Jagdbezirks.');
        console.error('Error creating jagdbezirk:', err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold text-green-800 flex items-center gap-2.5 mb-1">
        <Landmark size={20} strokeWidth={2} />
        Neuen Jagdbezirk anlegen
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Legt den Bezirk und dessen ersten Administrator in einem Schritt an.
        Der Admin erhält eine Einladungs-E-Mail zum Setzen seines Passworts.
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Bezirksname</span>
          <input
            type="text"
            required
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="z. B. GJB 11 Musterdorf"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-green-600 focus:ring-green-600"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Bezirks-ID</span>
          <input
            type="text"
            required
            value={bezirkId}
            onChange={e => { setBezirkId(e.target.value); setBezirkIdEdited(true); }}
            pattern="[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]"
            title="3–63 Zeichen: Kleinbuchstaben, Ziffern, Bindestriche"
            placeholder="gjb-11-musterdorf"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base font-mono focus:border-green-600 focus:ring-green-600"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Name des Administrators</span>
          <input
            type="text"
            required
            value={adminName}
            onChange={e => setAdminName(e.target.value)}
            placeholder="Vor- und Nachname"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-green-600 focus:ring-green-600"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">E-Mail des Administrators</span>
          <input
            type="email"
            required
            value={adminEmail}
            onChange={e => setAdminEmail(e.target.value)}
            placeholder="paechter@example.com"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-green-600 focus:ring-green-600"
          />
        </label>
        <div className="sm:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Wird angelegt …' : 'Jagdbezirk anlegen'}
          </button>
        </div>
      </form>
    </div>
  );
};
