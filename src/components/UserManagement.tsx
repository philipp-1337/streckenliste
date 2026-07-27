import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, Trash2, Users, X, Pencil, GitMerge, RotateCcw } from 'lucide-react';
import { useUserManagement } from '@hooks/useUserManagement';
import { JagdbezirkOnboarding } from '@components/JagdbezirkOnboarding';
import useAuth from '@hooks/useAuth';
import Spinner from '@components/Spinner';
import type { UserData, Role, JaegerProfile } from '@types';

export const UserManagement: React.FC = () => {
  const { currentUser } = useAuth();

  if (currentUser?.role !== 'admin') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Die Benutzerverwaltung ist nur für Administratoren verfügbar.
      </div>
    );
  }

  return <AdminUserManagement currentUser={currentUser} />;
};

const AdminUserManagement: React.FC<{ currentUser: UserData }> = ({ currentUser }) => {
  const {
    users,
    jaegerProfiles,
    loading,
    loadUsers,
    createUser,
    updateUserRole,
    deactivateUser,
    updateUserName,
    updateUserJaeger,
    createJaegerProfile,
    updateJaegerProfileName,
    setJaegerProfileActive,
    previewJaegerProfileMerge,
    mergeJaegerProfiles,
  } = useUserManagement();
  const [showForm, setShowForm] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<Role>('user');
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editedName, setEditedName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [newJaegerName, setNewJaegerName] = useState('');
  const [isCreatingJaeger, setIsCreatingJaeger] = useState(false);
  const [editingJaegerId, setEditingJaegerId] = useState<string | null>(null);
  const [editedJaegerName, setEditedJaegerName] = useState('');
  const [isUpdatingJaeger, setIsUpdatingJaeger] = useState(false);
  const [mergeSourceJaegerId, setMergeSourceJaegerId] = useState<string | null>(null);
  const [mergeTargetJaegerId, setMergeTargetJaegerId] = useState('');
  const [mergeSyncEntryNames, setMergeSyncEntryNames] = useState(true);
  const [mergePreview, setMergePreview] = useState<{ assignmentCount: number, entryCount: number } | null>(null);
  const [isPreviewingMerge, setIsPreviewingMerge] = useState(false);
  const [isMergingJaegerProfiles, setIsMergingJaegerProfiles] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const assignedUserIdsByJaegerId = users.reduce<Record<string, string[]>>((acc, user) => {
    if (!user.jaegerId) return acc
    acc[user.jaegerId] = [...(acc[user.jaegerId] || []), user.uid]
    return acc
  }, {})

  const activeJaegerProfiles = jaegerProfiles.filter(profile => profile.active !== false)
  const archivedJaegerProfiles = jaegerProfiles.filter(profile => profile.active === false)

  const getAssignableProfilesForUser = (user: UserData): JaegerProfile[] => {
    const visibleProfiles = activeJaegerProfiles.slice()
    if (user.jaegerId) {
      const assignedProfile = jaegerProfiles.find(profile => profile.id === user.jaegerId)
      if (assignedProfile && !visibleProfiles.some(profile => profile.id === assignedProfile.id)) {
        visibleProfiles.push(assignedProfile)
      }
    }

    return visibleProfiles.sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'))
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
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

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdating(true);
    try {
      await updateUserName(editingUser.uid, editedName);
      setEditingUser(null);
      setEditedName('');
    } catch {
      // error toast is in hook
    } finally {
      setIsUpdating(false);
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

  const handleCancelEdit = () => {
    setEditingUser(null);
    setShowForm(false);
  }

  const handleCreateJaegerProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingJaeger(true)
    try {
      const createdProfileId = await createJaegerProfile(newJaegerName)
      if (createdProfileId) {
        setNewJaegerName('')
      }
    } finally {
      setIsCreatingJaeger(false)
    }
  }

  const handleStartJaegerEdit = (jaegerId: string, displayName: string) => {
    setEditingJaegerId(jaegerId);
    setEditedJaegerName(displayName);
  }

  const handleSaveJaegerEdit = async () => {
    if (!editingJaegerId) return;

    setIsUpdatingJaeger(true);
    try {
      await updateJaegerProfileName(editingJaegerId, editedJaegerName);
      setEditingJaegerId(null);
      setEditedJaegerName('');
    } catch {
      // error toast handled in hook
    } finally {
      setIsUpdatingJaeger(false);
    }
  }

  const handleStartJaegerMerge = (sourceJaegerId: string) => {
    setMergeSourceJaegerId(sourceJaegerId)
    setMergeTargetJaegerId('')
    setMergeSyncEntryNames(true)
    setMergePreview(null)
    setEditingJaegerId(null)
    setEditedJaegerName('')
  }

  const handleArchiveJaegerProfile = (profile: JaegerProfile) => {
    toast.custom((t: string | number) => (
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-lg p-4">
        <div className="text-sm font-medium text-gray-900">
          Jägerprofil „{profile.displayName}“ archivieren?
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Das Profil verschwindet aus der normalen UI und aus Auswahlfeldern, bleibt aber für bestehende Verknüpfungen erhalten.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          Verknüpfte Einträge: {profile.entryCount || 0}
        </p>
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t)}
            className="rounded-xl px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={async () => {
              await setJaegerProfileActive(profile.id, false)
              toast.dismiss(t)
            }}
            className="rounded-xl px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition cursor-pointer"
          >
            Archivieren
          </button>
        </div>
      </div>
    ), { duration: 10000 })
  }

  const handlePreviewJaegerMerge = async () => {
    if (!mergeSourceJaegerId || !mergeTargetJaegerId) return

    setIsPreviewingMerge(true)
    try {
      const preview = await previewJaegerProfileMerge(mergeSourceJaegerId, mergeTargetJaegerId)
      setMergePreview(preview)
      toast.message(`Vorschau: ${preview.entryCount} Einträge und ${preview.assignmentCount} User-Zuordnungen würden umgehängt.`)
    } finally {
      setIsPreviewingMerge(false)
    }
  }

  const handleConfirmJaegerMerge = () => {
    if (!mergeSourceJaegerId || !mergeTargetJaegerId) return

    const sourceProfile = jaegerProfiles.find(profile => profile.id === mergeSourceJaegerId)
    const targetProfile = jaegerProfiles.find(profile => profile.id === mergeTargetJaegerId)
    if (!sourceProfile || !targetProfile) return

    toast.custom((t: string | number) => (
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-lg p-4">
        <div className="text-sm font-medium text-gray-900">
          Jägerprofil „{sourceProfile.displayName}“ wirklich in „{targetProfile.displayName}“ zusammenführen?
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Das Quellprofil wird deaktiviert. Bestehende `jaegerId`-Zuordnungen werden auf das Zielprofil umgehängt.
        </p>
        {mergePreview && (
          <p className="text-xs text-green-700 mt-2">
            Vorschau: {mergePreview.entryCount} Einträge und {mergePreview.assignmentCount} User-Zuordnungen betroffen.
          </p>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => toast.dismiss(t)}
            className="rounded-xl px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={async () => {
              setIsMergingJaegerProfiles(true)
              try {
                await mergeJaegerProfiles(mergeSourceJaegerId, mergeTargetJaegerId, mergeSyncEntryNames)
                setMergeSourceJaegerId(null)
                setMergeTargetJaegerId('')
                setMergePreview(null)
                toast.dismiss(t)
              } finally {
                setIsMergingJaegerProfiles(false)
              }
            }}
            className="rounded-xl px-3 py-1.5 text-sm font-medium text-white bg-green-700 hover:bg-green-800 transition cursor-pointer"
          >
            Zusammenführen
          </button>
        </div>
      </div>
    ), { duration: 15000 })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-green-800 flex items-center gap-2.5">
          <Users size={20} strokeWidth={2} />
          Benutzer
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowForm(v => !v)
              setEditingUser(null)
            }}
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
            {showForm || editingUser
              ? <X size={20} className="relative z-10 transition-all duration-300 ease-bounce group-hover:scale-110" onClick={handleCancelEdit} />
              : <UserPlus size={20} className="relative z-10 transition-all duration-300 ease-bounce group-hover:scale-110" />
            }
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white/20 opacity-0 scale-0 group-active:opacity-100 group-active:scale-100 transition-all duration-150" />
          </button>
        </div>
      </div>

      {activeJaegerProfiles.length === 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Es sind noch keine aktiven Jägerprofile vorhanden. Lege zuerst ein Jägerprofil an, damit Benutzer zugeordnet werden können.
        </div>
      )}
      {mergeSourceJaegerId && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-900">
          <div className="font-medium mb-3">
            Jägerprofile zusammenführen
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quellprofil</label>
              <input
                type="text"
                value={jaegerProfiles.find(profile => profile.id === mergeSourceJaegerId)?.displayName || ''}
                readOnly
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zielprofil</label>
              <select
                value={mergeTargetJaegerId}
                onChange={e => {
                  setMergeTargetJaegerId(e.target.value)
                  setMergePreview(null)
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
              >
                <option value="">Bitte wählen...</option>
                {jaegerProfiles
                  .filter(profile => profile.id !== mergeSourceJaegerId && profile.active !== false)
                  .map(profile => (
                    <option key={profile.id} value={profile.id}>{profile.displayName}</option>
                  ))}
              </select>
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mergeSyncEntryNames}
              onChange={e => setMergeSyncEntryNames(e.target.checked)}
              className="w-4 h-4 accent-green-700 cursor-pointer"
            />
            Historische `jaeger`-Namen ebenfalls auf den Zielnamen angleichen
          </label>
          {mergePreview && (
            <p className="mt-3 text-sm text-green-800">
              Vorschau: {mergePreview.entryCount} Einträge und {mergePreview.assignmentCount} User-Zuordnungen würden auf das Zielprofil wechseln.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePreviewJaegerMerge}
              disabled={!mergeTargetJaegerId || isPreviewingMerge}
              className="rounded-xl border border-green-200 bg-white px-3 py-2 text-sm font-medium text-green-800 transition hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isPreviewingMerge ? 'Prüfe Merge...' : 'Merge prüfen'}
            </button>
            <button
              type="button"
              onClick={handleConfirmJaegerMerge}
              disabled={!mergeTargetJaegerId || isMergingJaegerProfiles}
              className="rounded-xl bg-green-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isMergingJaegerProfiles ? 'Führe zusammen...' : 'Zusammenführen'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMergeSourceJaegerId(null)
                setMergeTargetJaegerId('')
                setMergePreview(null)
              }}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 cursor-pointer"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {showForm && !editingUser && (
        <form onSubmit={handleCreateSubmit} className="bg-white rounded-xl shadow p-5 space-y-4 mb-6">
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

      {editingUser && (
        <form onSubmit={handleUpdateSubmit} className="bg-white rounded-xl shadow p-5 space-y-4 mb-6">
          <h3 className="text-base font-semibold text-green-800">Benutzer "{editingUser.displayName}" bearbeiten</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Anzeigename</label>
            <input
              type="text"
              required
              value={editedName}
              onChange={e => setEditedName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
              placeholder="Max Mustermann"
              disabled={isUpdating}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-medium transition cursor-pointer disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-medium transition cursor-pointer disabled:opacity-50"
            >
              {isUpdating && <Spinner size={16} />}
              Speichern
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
                <th className="px-4 py-3 text-left text-sm font-medium">Jäger-Zuordnung</th>
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
                  <td className="px-4 py-3 text-sm">
                    <select
                      value={user.jaegerId || ''}
                      onChange={e => {
                        void updateUserJaeger(user.uid, e.target.value || null)
                      }}
                      className="w-full min-w-[220px] border border-gray-300 rounded-lg px-2 py-1 text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                    >
                      <option value="">Nicht zugeordnet</option>
                      {getAssignableProfilesForUser(user).map(profile => (
                        <option key={profile.id} value={profile.id}>
                          {profile.displayName}{profile.active === false ? ' (archiviert)' : ''}
                        </option>
                      ))}
                    </select>
                    {user.jaegerId && (assignedUserIdsByJaegerId[user.jaegerId]?.length || 0) > 1 && (
                      <p className="mt-1 text-xs text-amber-700">
                        Hinweis: Dieses Jägerprofil ist aktuell {assignedUserIdsByJaegerId[user.jaegerId].length} Benutzern zugeordnet.
                      </p>
                    )}
                    {user.role === 'user' && !user.jaegerId && (
                      <p className="mt-1 text-xs text-amber-700">
                        Dieser Benutzer kann erst nach manueller Zuordnung eigene Abschüsse erfassen.
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.uid !== currentUser?.uid && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(user)
                            setEditedName(user.displayName || '')
                            setShowForm(false)
                          }}
                          className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                          title="Bearbeiten"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeactivate(user.uid, user.displayName)}
                          className="text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                          title="Deaktivieren"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-base font-semibold text-green-800">Jägerprofile</h3>
          <span className="text-xs text-green-900/40 tabular-nums">
            {activeJaegerProfiles.length} aktiv
          </span>
        </div>
        <form onSubmit={handleCreateJaegerProfile} className="mb-4 rounded-xl bg-white p-4 shadow">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Neues Jägerprofil</label>
              <input
                type="text"
                value={newJaegerName}
                onChange={e => setNewJaegerName(e.target.value)}
                placeholder="Name des Jägers"
                disabled={isCreatingJaeger}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
              />
            </div>
            <button
              type="submit"
              disabled={isCreatingJaeger || !newJaegerName.trim()}
              className="rounded-xl bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isCreatingJaeger ? 'Lege an...' : 'Jägerprofil anlegen'}
            </button>
          </div>
        </form>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {activeJaegerProfiles.length === 0 ? (
            <div className="text-center py-10 text-gray-500">Keine aktiven Jägerprofile vorhanden.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-green-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Einträge</th>
                    <th className="px-4 py-3 text-center text-sm font-medium">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activeJaegerProfiles.map(profile => {
                    const isEditing = editingJaegerId === profile.id;

                    return (
                      <tr key={profile.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedJaegerName}
                              onChange={e => setEditedJaegerName(e.target.value)}
                              className="w-full min-w-[220px] border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                              disabled={isUpdatingJaeger}
                            />
                          ) : (
                            <span className="font-medium">{profile.displayName}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{profile.id}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700 tabular-nums">{profile.entryCount || 0}</td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={handleSaveJaegerEdit}
                                disabled={isUpdatingJaeger}
                                className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                {isUpdatingJaeger ? 'Speichere...' : 'Speichern'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingJaegerId(null)
                                  setEditedJaegerName('')
                                }}
                                disabled={isUpdatingJaeger}
                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Abbrechen
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStartJaegerEdit(profile.id, profile.displayName)}
                                className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                                title="Name bearbeiten"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartJaegerMerge(profile.id)}
                                className="text-green-700 hover:text-green-900 transition-colors cursor-pointer"
                                title="Mit anderem Profil zusammenführen"
                              >
                                <GitMerge size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleArchiveJaegerProfile(profile)}
                                className="text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                                title="Archivieren"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {archivedJaegerProfiles.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">Archivierte Jägerprofile</h4>
              <span className="text-xs text-gray-500 tabular-nums">
                {archivedJaegerProfiles.length} archiviert
              </span>
            </div>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Einträge</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {archivedJaegerProfiles.map(profile => (
                      <tr key={profile.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">{profile.displayName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{profile.id}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-700 tabular-nums">{profile.entryCount || 0}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => void setJaegerProfileActive(profile.id, true)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 cursor-pointer"
                          >
                            <RotateCcw size={14} />
                            Wiederherstellen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <JagdbezirkOnboarding />
    </div>
  );
};
