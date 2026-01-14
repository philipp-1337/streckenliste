import { z } from 'zod';
import type { UserData } from '@types';

/**
 * Validation utilities for user permissions, authentication, and form validation
 */

// ============================================
// Form Validation Schemas (Zod)
// ============================================

/**
 * Zod schema for Eintrag form data validation
 * Ensures type-safe validation with clear error messages
 */
export const eintragFormSchema = z.object({
  datum: z
    .string()
    .min(1, 'Datum ist erforderlich')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss im Format YYYY-MM-DD sein'),
  
  wildart: z
    .string()
    .min(1, 'Wildart ist erforderlich')
    .max(100, 'Wildart darf maximal 100 Zeichen lang sein'),
  
  kategorie: z
    .string()
    .max(100, 'Kategorie darf maximal 100 Zeichen lang sein'),
  
  altersklasse: z.string(),
  
  geschlecht: z.string(),
  
  fachbegriff: z.string(),
  
  gewicht: z
    .string()
    .refine(
      (val) => !val || !isNaN(parseFloat(val)),
      'Gewicht muss eine gültige Zahl sein'
    )
    .refine(
      (val) => !val || parseFloat(val) >= 0,
      'Gewicht muss eine positive Zahl sein'
    ),
  
  bemerkung: z
    .string()
    .max(500, 'Bemerkung darf maximal 500 Zeichen lang sein'),
  
  wildursprungsschein: z
    .string()
    .max(100, 'Wildursprungsschein darf maximal 100 Zeichen lang sein'),
  
  jaeger: z
    .string()
    .max(100, 'Jäger-Name darf maximal 100 Zeichen lang sein'),
  
  ort: z
    .string()
    .max(200, 'Ort darf maximal 200 Zeichen lang sein'),
  
  einnahmen: z
    .string()
    .refine(
      (val) => !val || !isNaN(parseFloat(val)),
      'Einnahmen müssen eine gültige Zahl sein'
    )
    .refine(
      (val) => !val || parseFloat(val) >= 0,
      'Einnahmen müssen eine positive Zahl sein'
    ),
  
  notizen: z
    .string()
    .max(1000, 'Notizen dürfen maximal 1000 Zeichen lang sein'),
  
  // Diese Felder werden automatisch vom Backend gesetzt und sind im Formular optional
  jagdbezirkId: z.string().optional().default(''),
  
  userId: z.string().optional().default(''),
})
// Custom validation for kategorie based on wildart
.refine(
  (data) => {
    // Kategorie is required unless wildart is "Sonstige"
    if (data.wildart !== 'Sonstige' && !data.kategorie) {
      return false;
    }
    return true;
  },
  {
    message: 'Kategorie ist erforderlich',
    path: ['kategorie'],
  }
);

/**
 * Type for the form data inferred from the Zod schema
 */
export type EintragFormData = z.infer<typeof eintragFormSchema>;

// ============================================
// User Permission Validation
// ============================================

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
