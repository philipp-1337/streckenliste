import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes user input to prevent XSS attacks
 * @param dirty - The potentially unsafe string
 * @returns Sanitized string safe for rendering
 */
export const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML tags allowed, only plain text
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

/**
 * Sanitizes user input and converts newlines to <br> tags
 * Useful for textarea content that should preserve line breaks
 * @param dirty - The potentially unsafe string
 * @returns Sanitized HTML string with line breaks
 */
export const sanitizeWithLineBreaks = (dirty: string): string => {
  const cleaned = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['br'],
    ALLOWED_ATTR: [],
  });
  return cleaned.replace(/\n/g, '<br>');
};
