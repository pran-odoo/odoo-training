import { reactive, readonly } from 'vue'
import { safeGetItem, safeSetItem } from '../utils/localStorage'

// Storage key
const STORAGE_KEY = 'odoo_training_personalization'

// Default settings
const DEFAULT_SETTINGS = {
  // Appearance
  accentColor: 'purple',     // purple | blue | green | orange | pink
  codeTheme: 'dark',         // dark | light | high-contrast
  highContrast: false,
  eyeComfort: false,
  inPageHighlights: true,

  // Typography
  fontFamily: 'system',      // system | serif | mono
  fontSize: 'normal',        // small | normal | large | xlarge
  lineHeight: 'normal',      // tight | normal | relaxed | loose

  // Layout
  linkStyle: 'hover',        // always | hover | never
  density: 'default',        // compact | default | relaxed
  sidebarWidth: 'default',   // narrow | default | wide
  contentWidth: 'wide',      // narrow | default | wide | full

  // Motion
  animations: 'normal',      // normal | reduced | none

  // Features
  focusMode: false
}

// Color definitions
const ACCENT_COLORS = {
  purple: { primary: '#714B67', dark: '#5a3d54', light: '#8f6385' },
  blue: { primary: '#3b82f6', dark: '#2563eb', light: '#60a5fa' },
  green: { primary: '#10b981', dark: '#059669', light: '#34d399' },
  orange: { primary: '#f97316', dark: '#ea580c', light: '#fb923c' },
  pink: { primary: '#ec4899', dark: '#db2777', light: '#f472b6' }
}

const FONT_FAMILIES = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace'
}

const FONT_SIZES = {
  small: '14px',
  normal: '16px',
  large: '18px',
  xlarge: '20px'
}

const LINE_HEIGHTS = {
  tight: '1.4',
  normal: '1.6',
  relaxed: '1.8',
  loose: '2.0'
}

const SIDEBAR_WIDTHS = {
  narrow: '240px',
  default: '280px',
  wide: '320px'
}

const CONTENT_WIDTHS = {
  narrow: '800px',
  default: '1000px',
  wide: '1200px',
  full: 'none'
}

export type PersonalizationSettings = typeof DEFAULT_SETTINGS

// Reactive state
const settings = reactive<PersonalizationSettings>({ ...DEFAULT_SETTINGS })

// Load settings from localStorage
function loadSettings(): void {
  const saved = safeGetItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.assign(settings, { ...DEFAULT_SETTINGS, ...parsed })
    } catch (e) {
      console.warn('Failed to parse personalization settings:', e)
    }
  }
}

// Save settings to localStorage
function saveSettings(): void {
  safeSetItem(STORAGE_KEY, JSON.stringify(settings))
}

// Apply settings to DOM
function applySettings(): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const body = document.body

  // Accent color
  const colors = ACCENT_COLORS[settings.accentColor as keyof typeof ACCENT_COLORS] || ACCENT_COLORS.purple
  root.style.setProperty('--vp-c-brand-1', colors.primary)
  root.style.setProperty('--vp-c-brand-2', colors.dark)
  root.style.setProperty('--vp-c-brand-3', colors.light)
  root.style.setProperty('--primary', colors.primary)
  root.style.setProperty('--primary-dark', colors.dark)
  root.style.setProperty('--primary-light', colors.light)

  // Code theme
  body.classList.remove('code-theme-dark', 'code-theme-light', 'code-theme-high-contrast')
  body.classList.add(`code-theme-${settings.codeTheme}`)

  // Accessibility
  body.classList.toggle('high-contrast', settings.highContrast)
  body.classList.toggle('eye-comfort', settings.eyeComfort)
  body.classList.toggle('inpage-highlights-disabled', !settings.inPageHighlights)

  // Typography
  root.style.setProperty('--font-sans', FONT_FAMILIES[settings.fontFamily as keyof typeof FONT_FAMILIES] || FONT_FAMILIES.system)
  root.style.setProperty('--text-base', FONT_SIZES[settings.fontSize as keyof typeof FONT_SIZES] || FONT_SIZES.normal)
  root.style.setProperty('--line-height-content', LINE_HEIGHTS[settings.lineHeight as keyof typeof LINE_HEIGHTS] || LINE_HEIGHTS.normal)

  // Font size classes
  body.classList.remove('font-small', 'font-large', 'font-xlarge')
  if (settings.fontSize !== 'normal') {
    body.classList.add(`font-${settings.fontSize}`)
  }

  // Layout
  body.classList.remove('links-always', 'links-hover', 'links-never')
  body.classList.add(`links-${settings.linkStyle}`)

  body.classList.remove('density-compact', 'density-relaxed')
  if (settings.density !== 'default') {
    body.classList.add(`density-${settings.density}`)
  }

  root.style.setProperty('--sidebar-width', SIDEBAR_WIDTHS[settings.sidebarWidth as keyof typeof SIDEBAR_WIDTHS] || SIDEBAR_WIDTHS.default)
  root.style.setProperty('--content-max-width', CONTENT_WIDTHS[settings.contentWidth as keyof typeof CONTENT_WIDTHS] || CONTENT_WIDTHS.wide)

  // Motion
  body.classList.remove('animations-normal', 'animations-reduced', 'animations-none')
  body.classList.add(`animations-${settings.animations}`)

  // Focus mode
  body.classList.toggle('focus-mode', settings.focusMode)

}

// Update a single setting
function updateSetting<K extends keyof PersonalizationSettings>(key: K, value: PersonalizationSettings[K]): void {
  settings[key] = value
  saveSettings()
  applySettings()
}

// Reset to defaults
function resetSettings(): void {
  Object.assign(settings, DEFAULT_SETTINGS)
  saveSettings()
  applySettings()
}

// Toggle boolean setting
function toggleSetting(key: keyof PersonalizationSettings): void {
  if (typeof settings[key] === 'boolean') {
    (settings[key] as boolean) = !settings[key]
    saveSettings()
    applySettings()
  }
}

export function usePersonalization() {
  // Load on first use
  if (typeof window !== 'undefined') {
    loadSettings()
  }

  return {
    settings: readonly(settings),
    updateSetting,
    resetSettings,
    toggleSetting,
    applySettings,
    ACCENT_COLORS,
    FONT_SIZES,
    LINE_HEIGHTS
  }
}
