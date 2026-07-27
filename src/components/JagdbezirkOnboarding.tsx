import { useState } from 'react';
import { toast } from 'sonner';
import { Landmark } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../firebase';
import useAuth from '@hooks/useAuth';
import { isSuperadminUid } from '@constants/superadmin';
import { PageHeader } from '@components/PageHeader';

const toBezirkId = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);

// Die eigentliche Berechtigung prüft die Cloud Function serverseitig.
// Diese Prüfung liefert zusätzlich eine klare UI statt einer leeren Seite.
export const JagdbezirkOnboarding: React.FC = () => {
  const { firebaseUser } = useAuth();

  const [name, setName] = useState('');
  const [bezirkId, setBezirkId] = useState('');
  const [bezirkIdEdited, setBezirkIdEdited] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isSuperadminUid(firebaseUser?.uid)) {
    return (
      <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Die Anlage neuer Jagdbezirke ist nur für Superadministratoren verfügbar.
      </div>
    );
  }

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
    <div>
      <PageHeader
        title="Neuen Jagdbezirk anlegen"
        icon={Landmark}
        description="Legt den Bezirk und dessen ersten Administrator an. Der Admin erhält eine Einladung zum Setzen seines Passworts."
      />

      <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl bg-white p-5 shadow sm:grid-cols-2">
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
        <div className="flex justify-end sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Wird angelegt …' : 'Jagdbezirk anlegen'}
          </button>
        </div>
      </form>
    </div>
  );
};
