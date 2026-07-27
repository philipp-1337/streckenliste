import { memo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import Spinner from '@components/Spinner'
import type { JaegerProfile, Role, UserData } from '@types'

interface UserManagementUserListProps {
  users: UserData[]
  jaegerProfiles: JaegerProfile[]
  loading: boolean
  currentUserId: string
  onEdit: (user: UserData) => void
  onDeactivate: (user: UserData) => void
  onRoleChange: (uid: string, role: Role) => void
  onJaegerChange: (uid: string, jaegerId: string | null) => void
}

export const UserManagementUserList = memo(({
  users,
  jaegerProfiles,
  loading,
  currentUserId,
  onEdit,
  onDeactivate,
  onRoleChange,
  onJaegerChange,
}: UserManagementUserListProps) => {
  const activeProfiles = jaegerProfiles.filter(profile => profile.active !== false)
  const assignmentCounts = users.reduce<Record<string, number>>((counts, user) => {
    if (user.jaegerId) counts[user.jaegerId] = (counts[user.jaegerId] || 0) + 1
    return counts
  }, {})

  const assignableProfiles = (user: UserData) => {
    const profiles = activeProfiles.slice()
    if (user.jaegerId) {
      const assigned = jaegerProfiles.find(profile => profile.id === user.jaegerId)
      if (assigned && !profiles.some(profile => profile.id === assigned.id)) profiles.push(assigned)
    }
    return profiles.sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'))
  }

  const assignmentWarning = (user: UserData) => {
    if (user.jaegerId && (assignmentCounts[user.jaegerId] || 0) > 1) {
      return `Dieses Jägerprofil ist ${assignmentCounts[user.jaegerId]} Benutzern zugeordnet.`
    }
    if (user.role === 'user' && !user.jaegerId) {
      return 'Dieser Benutzer kann erst nach manueller Zuordnung eigene Abschüsse erfassen.'
    }
    return null
  }

  if (loading) {
    return (
      <div role="status" className="flex justify-center py-12" aria-label="Benutzer werden geladen">
        <Spinner size={32} />
      </div>
    )
  }

  if (users.length === 0) {
    return <div className="py-12 text-center text-gray-500">Keine Benutzer gefunden.</div>
  }

  return (
    <>
      <div className="divide-y divide-gray-200 md:hidden">
        {users.map(user => {
          const warning = assignmentWarning(user)
          return (
            <article key={user.uid} className="space-y-4 p-4">
              <div className="min-w-0">
                <h3 className="break-words text-base font-semibold text-gray-900">
                  {user.displayName || 'Ohne Anzeigenamen'}
                  {user.uid === currentUserId && (
                    <span className="ml-2 text-xs font-normal text-green-700">(ich)</span>
                  )}
                </h3>
                <p className="mt-1 break-all text-sm text-gray-600">{user.email}</p>
              </div>
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm font-medium text-gray-700">
                  Rolle
                  <select
                    value={user.role}
                    onChange={event => onRoleChange(user.uid, event.target.value as Role)}
                    disabled={user.uid === currentUserId}
                    className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="user">Benutzer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm font-medium text-gray-700">
                  Jäger-Zuordnung
                  <select
                    value={user.jaegerId || ''}
                    onChange={event => onJaegerChange(user.uid, event.target.value || null)}
                    className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  >
                    <option value="">Nicht zugeordnet</option>
                    {assignableProfiles(user).map(profile => (
                      <option key={profile.id} value={profile.id}>
                        {profile.displayName}{profile.active === false ? ' (archiviert)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {warning && <p className="text-sm text-amber-800">{warning}</p>}
              {user.uid !== currentUserId && (
                <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                  <button type="button" onClick={() => onEdit(user)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-blue-800 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2">
                    <Pencil size={16} /> Bearbeiten
                  </button>
                  <button type="button" onClick={() => onDeactivate(user)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2">
                    <Trash2 size={16} /> Deaktivieren
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </div>
      <div className="hidden overflow-x-auto md:block">
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
            {users.map(user => {
              const warning = assignmentWarning(user)
              const controlName = user.displayName || user.email
              return (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">
                    {user.displayName || '—'}
                    {user.uid === currentUserId && <span className="ml-2 text-xs font-normal text-green-700">(ich)</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <select aria-label={`Rolle für ${controlName}`} value={user.role} onChange={event => onRoleChange(user.uid, event.target.value as Role)} disabled={user.uid === currentUserId} className="rounded-lg border border-gray-300 px-2 py-1 text-base focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="user">Benutzer</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <select aria-label={`Jäger-Zuordnung für ${controlName}`} value={user.jaegerId || ''} onChange={event => onJaegerChange(user.uid, event.target.value || null)} className="w-full min-w-[220px] rounded-lg border border-gray-300 px-2 py-1 text-base focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30">
                      <option value="">Nicht zugeordnet</option>
                      {assignableProfiles(user).map(profile => (
                        <option key={profile.id} value={profile.id}>
                          {profile.displayName}{profile.active === false ? ' (archiviert)' : ''}
                        </option>
                      ))}
                    </select>
                    {warning && <p className="mt-1 text-xs text-amber-800">{warning}</p>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {user.uid !== currentUserId && (
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => onEdit(user)} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-blue-700 transition-colors hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2" aria-label={`${controlName} bearbeiten`}>
                          <Pencil size={16} />
                        </button>
                        <button type="button" onClick={() => onDeactivate(user)} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-red-700 transition-colors hover:bg-red-50 hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2" aria-label={`${controlName} deaktivieren`}>
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
  )
})

UserManagementUserList.displayName = 'UserManagementUserList'
