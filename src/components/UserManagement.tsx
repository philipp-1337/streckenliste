import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, Trash2, Users, X } from 'lucide-react';
import { useUserManagement } from '@hooks/useUserManagement';
import useAuth from '@hooks/useAuth';
import Spinner from '@components/Spinner';
import type { Role } from '@types';

export const UserManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const { users, loading, loadUsers, createUser, updateUserRole, deactivateUser } = useUserManagement();
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<Role>('user');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createUser(formEmail, formName, formRole);
      setFormEmail('');
      setFormName('');
      setFormRole('user');
      setShowForm(false);
    } catch {
      // error already shown via toast in hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = (uid: string, displayName: string | null) => {
    toast.custom((t: string | number) => (
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-lg p-4">
        <div className="text-sm font-medium text-gray-900">
          Soll „{displayName || 'Benutzer'}" wirklich deaktiviert werden?
        </div>
        <p className="text-xs text-gray-500 mt-1">Der Benutzer kann sich danach nicht mehr einloggen. Einträge bleiben erhalten.</p>
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t)}
            className="rounded-xl px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={async () => {
              await deactivateUser(uid);
              toast.dismiss(t);
            }}
            className="rounded-xl px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition cursor-pointer"
          >
            Deaktivieren
          </button>
        </div>
      </div>
    ), { duration: 10000 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-green-800 flex items-center gap-2.5">
          <Users size={20} strokeWidth={2} />
          Benutzer
        </h2>
        <button
          onClick={() => setShowForm(v => !v)}
          title={showForm ? 'Abbrechen' : 'Neuer Benutzer'}
          className={`
            group relative
            w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl
            flex items-center justify-center
            glass-bg backdrop-blur-xl backdrop-saturate-[180%]
            transition-all duration-300 ease-bounce
            hover:scale-105 active:scale-95
            focus:outline-none focus:ring-2 focus:ring-green-500/30
            cursor-pointer
            ${showForm
              ? 'glass-shadow-active text-green-700'
              : 'text-green-900/70 hover:text-green-900/90 glass-shadow'
            }
          `}
        >
          <div className={`
            absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-active opacity-0
            transition-opacity duration-300
            ${showForm ? 'opacity-100' : 'group-hover:opacity-50'}
          `} />
          {showForm
            ? <X size={20} className="relative z-10 transition-all duration-300 ease-bounce group-hover:scale-110" />
            : <UserPlus size={20} className="relative z-10 transition-all duration-300 ease-bounce group-hover:scale-110" />
          }
          <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white/20 opacity-0 scale-0 group-active:opacity-100 group-active:scale-100 transition-all duration-150" />
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 space-y-4">
          <h3 className="text-base font-semibold text-green-800">Neuen Benutzer anlegen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input
                type="email"
                required
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                placeholder="benutzer@beispiel.de"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anzeigename</label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                placeholder="Max Mustermann"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rolle</label>
              <select
                value={formRole}
                onChange={e => setFormRole(e.target.value as Role)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                disabled={submitting}
              >
                <option value="user">Benutzer</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-medium transition cursor-pointer disabled:opacity-50"
            >
              {submitting && <Spinner size={16} />}
              Anlegen & Einladen
            </button>
          </div>
        </form>
      )}

      <div className="flex justify-end mb-2">
        <span className="text-xs text-green-900/40 tabular-nums">
          {users.length} Benutzer
        </span>
      </div>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size={32} />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Keine Benutzer gefunden.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-green-800 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">E-Mail</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Rolle</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">
                    {user.displayName || '—'}
                    {user.uid === currentUser?.uid && (
                      <span className="ml-2 text-xs text-green-700 font-normal">(ich)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <select
                      value={user.role}
                      onChange={e => updateUserRole(user.uid, e.target.value as Role)}
                      disabled={user.uid === currentUser?.uid}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="user">Benutzer</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.uid !== currentUser?.uid && (
                      <button
                        onClick={() => handleDeactivate(user.uid, user.displayName)}
                        className="text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                        title="Deaktivieren"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
};
