/**
 * Safe localStorage wrappers
 * Handles Safari private mode, quota exceeded, and SSR
 */

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch (e) {
    console.warn(`Failed to get localStorage key "${key}":`, e)
    return null
  }
}

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    console.warn(`Failed to set localStorage key "${key}":`, e)
    return false
  }
}

export function safeRemoveItem(key: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    localStorage.removeItem(key)
    return true
  } catch (e) {
    console.warn(`Failed to remove localStorage key "${key}":`, e)
    return false
  }
}

// Storage keys used throughout the app
export const STORAGE_KEYS = {
  lastSection: 'odoo_training_last_section',
  bookmarks: 'odoo_training_bookmarks',
  quizProgress: 'odoo_training_quiz_progress'
} as const
