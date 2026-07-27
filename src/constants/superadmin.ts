export const SUPERADMIN_UIDS = new Set([
  'SbtAXGzX69T5PxTVB2sirVkhjh62',
])

export const isSuperadminUid = (uid?: string | null) =>
  Boolean(uid && SUPERADMIN_UIDS.has(uid))
