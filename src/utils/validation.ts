import type { UserData } from '@types';

/**
 * Validation utilities for user permissions and authentication
 */

/**
 * Check if the user is authenticated with required data
 */
export const isUserAuthenticated = (
  currentUser: UserData | null
): currentUser is UserData => {
  return Boolean(currentUser?.uid && currentUser?.jagdbezirkId);
};

/**
 * Check if the user is an admin
 */
export const isAdmin = (currentUser: UserData | null): boolean => {
  return currentUser?.role === 'admin';
};

/**
 * Check if the user can perform write operations
 */
export const canPerformWriteOperation = (
  currentUser: UserData | null
): boolean => {
  return isUserAuthenticated(currentUser);
};

/**
 * Check if the user can edit a specific entry
 */
export const canEditEntry = (
  currentUser: UserData | null,
  entryUserId: string
): boolean => {
  if (!isUserAuthenticated(currentUser)) return false;
  return isAdmin(currentUser) || currentUser.uid === entryUserId;
};

/**
 * Get authentication error message
 */
export const getAuthErrorMessage = (
  currentUser: UserData | null
): string | null => {
  if (!isUserAuthenticated(currentUser)) {
    return "Benutzer nicht authentifiziert oder Jagdbezirk nicht verfügbar.";
  }
  return null;
};
