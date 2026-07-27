/**
 * Application-wide constants
 */

/**
 * Service Worker update check interval (in milliseconds)
 */
export const SW_UPDATE_CHECK_INTERVAL = 60000; // 60 seconds

/**
 * PWA install prompt delay (in milliseconds)
 */
export const PWA_INSTALL_PROMPT_DELAY = 5000; // 5 seconds

/**
 * Delay before hinting that push notifications are inactive (in milliseconds).
 * Later than the install prompt so both never compete for attention.
 */
export const PUSH_HINT_DELAY = 12000; // 12 seconds

/**
 * localStorage key remembering that the push hint was dismissed.
 */
export const PUSH_HINT_DISMISSED_KEY = 'streckenliste:push-hint-dismissed';
