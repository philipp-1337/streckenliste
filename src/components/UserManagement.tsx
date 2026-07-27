import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { UserPlus, Trash2, Users, X, Pencil, GitMerge, RotateCcw, MapPin } from 'lucide-react';
import { useUserManagement } from '@hooks/useUserManagement';
import { JagdbezirkOnboarding } from '@components/JagdbezirkOnboarding';
import useAuth from '@hooks/useAuth';
import Spinner from '@components/Spinner';
import { ConfirmDialog } from '@components/ConfirmDialog';
import { UserManagementUserList } from '@components/UserManagementUserList';
import type { UserData, Role, JaegerProfile } from '@types';

interface ConfirmationState {
  title: string
  description: React.ReactNode
  confirmLabel: string
  tone?: 'danger' | 'primary'
  onConfirm: () => Promise<void>
}

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
    loadError,
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
  const [activeSection, setActiveSection] = useState<'users' | 'profiles' | 'districts'>('users');
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null)
  const tabRefs = useRef<Record<'users' | 'profiles' | 'districts', HTMLButtonElement | null>>({
    users: null,
    profiles: null,
    districts: null,
  })

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const activeJaegerProfiles = useMemo(
    () => jaegerProfiles.filter(profile => profile.active !== false),
    [jaegerProfiles]
  )
  const archivedJaegerProfiles = useMemo(
    () => jaegerProfiles.filter(profile => profile.active === false),
    [jaegerProfiles]
  )

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

  const handleDeactivate = useCallback((uid: string, displayName: string | null) => {
    setConfirmation({
      title: `„${displayName || 'Benutzer'}“ deaktivieren?`,
      description: <p>Der Benutzer kann sich danach nicht mehr einloggen. Einträge bleiben erhalten.</p>,
      confirmLabel: 'Deaktivieren',
      onConfirm: async () => {
        await deactivateUser(uid)
        setConfirmation(null)
      },
    })
  }, [deactivateUser])

  const handleCancelEdit = () => {
    setEditingUser(null);
    setShowForm(false);
  }

  const handleEditUser = useCallback((user: UserData) => {
    setEditingUser(user)
    setEditedName(user.displayName || '')
    setShowForm(false)
  }, [])

  const handleDeactivateUser = useCallback((user: UserData) => {
    handleDeactivate(user.uid, user.displayName)
  }, [handleDeactivate])

  const handleJaegerChange = useCallback((uid: string, jaegerId: string | null) => {
    void updateUserJaeger(uid, jaegerId)
  }, [updateUserJaeger])

  const closeConfirmation = useCallback(() => setConfirmation(null), [])

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
    setConfirmation({
      title: `Jägerprofil „${profile.displayName}“ archivieren?`,
      description: (
        <>
          <p>
          Das Profil verschwindet aus der normalen UI und aus Auswahlfeldern, bleibt aber für bestehende Verknüpfungen erhalten.
          </p>
          <p>Verknüpfte Einträge: {profile.entryCount || 0}</p>
        </>
      ),
      confirmLabel: 'Archivieren',
      onConfirm: async () => {
        await setJaegerProfileActive(profile.id, false)
        setConfirmation(null)
      },
    })
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

    setConfirmation({
      title: `„${sourceProfile.displayName}“ in „${targetProfile.displayName}“ zusammenführen?`,
      description: (
        <>
          <p>Das Quellprofil wird deaktiviert. Bestehende Jäger-Zuordnungen werden auf das Zielprofil umgehängt.</p>
          {mergePreview && (
            <p className="font-medium text-green-800">
              Vorschau: {mergePreview.entryCount} Einträge und {mergePreview.assignmentCount} User-Zuordnungen betroffen.
            </p>
          )}
        </>
      ),
      confirmLabel: 'Zusammenführen',
      tone: 'primary',
      onConfirm: async () => {
        setIsMergingJaegerProfiles(true)
        try {
          await mergeJaegerProfiles(mergeSourceJaegerId, mergeTargetJaegerId, mergeSyncEntryNames)
          setMergeSourceJaegerId(null)
          setMergeTargetJaegerId('')
          setMergePreview(null)
          setConfirmation(null)
        } finally {
          setIsMergingJaegerProfiles(false)
        }
      },
    })
  }

  const sectionIds = ['users', 'profiles', 'districts'] as const

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentSection: typeof sectionIds[number]
  ) => {
    const currentIndex = sectionIds.indexOf(currentSection)
    let nextIndex: number

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % sectionIds.length
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + sectionIds.length) % sectionIds.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = sectionIds.length - 1
    else return

    event.preventDefault()
    const nextSection = sectionIds[nextIndex]
    setActiveSection(nextSection)
    tabRefs.current[nextSection]?.focus()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-green-800 flex items-center gap-2.5">
          <Users size={20} strokeWidth={2} />
          Benutzer
        </h2>
        {activeSection === 'users' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // Bei offenem Formular ODER laufender Bearbeitung schließt der
              // Klick beides; sonst öffnet er das Neuanlage-Formular. Ein
              // blindes setShowForm(v => !v) würde beim Abbrechen einer
              // Bearbeitung (showForm ist dabei false) stattdessen das
              // Neuanlage-Formular öffnen.
              if (showForm || editingUser) {
                handleCancelEdit();
              } else {
                setShowForm(true);
                setEditingUser(null);
              }
            }}
            title={showForm || editingUser ? 'Abbrechen' : 'Neuer Benutzer'}
            aria-label={showForm || editingUser ? 'Abbrechen' : 'Neuer Benutzer'}
            className={`
              group relative
              w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl
              flex items-center justify-center
              glass-bg backdrop-blur-xl backdrop-saturate-[180%]
              transition-[transform,color,box-shadow] duration-200 ease-out
              hover:scale-105 active:scale-95
              motion-reduce:transform-none motion-reduce:transition-none
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2
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
              ? <X size={20} className="relative z-10 transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none" />
              : <UserPlus size={20} className="relative z-10 transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transform-none motion-reduce:transition-none" />
            }
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-white/20 opacity-0 scale-0 group-active:opacity-100 group-active:scale-100 transition-all duration-150" />
          </button>
        </div>
        )}
      </div>

      <div
        className="mb-6 flex w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-green-800/5 p-0.5 sm:w-fit"
        role="tablist"
        aria-label="Bereiche der Benutzerverwaltung"
      >
        {[
          { id: 'users' as const, label: 'Benutzer', icon: Users },
          { id: 'profiles' as const, label: 'Jägerprofile', icon: GitMerge },
          { id: 'districts' as const, label: 'Jagdbezirke', icon: MapPin },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            ref={element => {
              tabRefs.current[id] = element
            }}
            id={`${id}-tab`}
            type="button"
            role="tab"
            aria-selected={activeSection === id}
            aria-controls={`${id}-panel`}
            tabIndex={activeSection === id ? 0 : -1}
            onClick={() => setActiveSection(id)}
            onKeyDown={event => handleTabKeyDown(event, id)}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 sm:flex-none ${
              activeSection === id
                ? 'bg-white text-green-800 shadow-sm'
                : 'text-green-900/80 hover:text-green-900'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'users' && activeJaegerProfiles.length === 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Es sind noch keine aktiven Jägerprofile vorhanden. Lege zuerst ein Jägerprofil an, damit Benutzer zugeordnet werden können.
        </div>
      )}
      {loadError && (
        <div role="alert" className="mb-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadUsers()}
            className="min-h-11 rounded-xl bg-red-700 px-4 py-2 font-medium text-white transition-colors hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 cursor-pointer"
          >
            Erneut versuchen
          </button>
        </div>
      )}
      {activeSection === 'profiles' && mergeSourceJaegerId && (
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

      {activeSection === 'users' && showForm && !editingUser && (
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

      {activeSection === 'users' && editingUser && (
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

      {activeSection === 'users' && (
        <div id="users-panel" role="tabpanel" aria-labelledby="users-tab">
          <div className="mb-2 flex justify-end">
            <span className="text-xs tabular-nums text-green-900/80">{users.length} Benutzer</span>
          </div>
          <div className="overflow-hidden rounded-xl bg-white shadow">
            <UserManagementUserList
              users={users}
              jaegerProfiles={jaegerProfiles}
              loading={loading}
              currentUserId={currentUser.uid}
              onEdit={handleEditUser}
              onDeactivate={handleDeactivateUser}
              onRoleChange={updateUserRole}
              onJaegerChange={handleJaegerChange}
            />
          </div>
        </div>
      )}

      {activeSection === 'profiles' && (
      <div id="profiles-panel" role="tabpanel" aria-labelledby="profiles-tab">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-base font-semibold text-green-800">Jägerprofile</h3>
          <span className="text-xs text-green-900/80 tabular-nums">
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
            <>
            <div className="divide-y divide-gray-200 md:hidden">
              {activeJaegerProfiles.map(profile => {
                const isEditing = editingJaegerId === profile.id
                return (
                  <article key={profile.id} className="space-y-3 p-4">
                    {isEditing ? (
                      <label className="grid gap-1 text-sm font-medium text-gray-700">
                        Name
                        <input
                          type="text"
                          value={editedJaegerName}
                          onChange={event => setEditedJaegerName(event.target.value)}
                          disabled={isUpdatingJaeger}
                          className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                        />
                      </label>
                    ) : (
                      <div>
                        <h3 className="break-words font-semibold text-gray-900">{profile.displayName}</h3>
                        <p className="mt-1 break-all text-xs text-gray-500">{profile.id}</p>
                      </div>
                    )}
                    <p className="text-sm text-gray-700">{profile.entryCount || 0} Einträge</p>
                    <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-3">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={handleSaveJaegerEdit}
                            disabled={isUpdatingJaeger}
                            className="min-h-11 rounded-xl bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                          >
                            {isUpdatingJaeger ? 'Speichere…' : 'Speichern'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingJaegerId(null)
                              setEditedJaegerName('')
                            }}
                            disabled={isUpdatingJaeger}
                            className="min-h-11 rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                          >
                            Abbrechen
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => handleStartJaegerEdit(profile.id, profile.displayName)} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-50 cursor-pointer">
                            <Pencil size={16} /> Bearbeiten
                          </button>
                          <button type="button" onClick={() => handleStartJaegerMerge(profile.id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-50 cursor-pointer">
                            <GitMerge size={16} /> Zusammenführen
                          </button>
                          <button type="button" onClick={() => handleArchiveJaegerProfile(profile)} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50 cursor-pointer">
                            <Trash2 size={16} /> Archivieren
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
            <div className="hidden overflow-x-auto md:block">
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
                                className="inline-flex size-11 items-center justify-center rounded-xl text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 cursor-pointer"
                                title="Name bearbeiten"
                                aria-label={`Name von ${profile.displayName} bearbeiten`}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartJaegerMerge(profile.id)}
                                className="inline-flex size-11 items-center justify-center rounded-xl text-green-700 transition-colors hover:bg-green-50 hover:text-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 cursor-pointer"
                                title="Mit anderem Profil zusammenführen"
                                aria-label={`${profile.displayName} mit anderem Profil zusammenführen`}
                              >
                                <GitMerge size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleArchiveJaegerProfile(profile)}
                                className="inline-flex size-11 items-center justify-center rounded-xl text-red-700 transition-colors hover:bg-red-50 hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2 cursor-pointer"
                                title="Archivieren"
                                aria-label={`${profile.displayName} archivieren`}
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
            </>
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
              <div className="divide-y divide-gray-200 md:hidden">
                {archivedJaegerProfiles.map(profile => (
                  <article key={profile.id} className="space-y-3 p-4">
                    <div>
                      <h3 className="break-words font-semibold text-gray-800">{profile.displayName}</h3>
                      <p className="mt-1 break-all text-xs text-gray-500">{profile.id}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-700">{profile.entryCount || 0} Einträge</span>
                      <button
                        type="button"
                        onClick={() => void setJaegerProfileActive(profile.id, true)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2 cursor-pointer"
                      >
                        <RotateCcw size={14} />
                        Wiederherstellen
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
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
      )}

      {activeSection === 'districts' && (
        <div id="districts-panel" role="tabpanel" aria-labelledby="districts-tab">
          <JagdbezirkOnboarding />
        </div>
      )}
      <ConfirmDialog
        open={confirmation !== null}
        title={confirmation?.title || ''}
        description={confirmation?.description}
        confirmLabel={confirmation?.confirmLabel || ''}
        tone={confirmation?.tone}
        onCancel={closeConfirmation}
        onConfirm={confirmation?.onConfirm || (async () => {})}
      />
    </div>
  );
};
