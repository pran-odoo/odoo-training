<script setup lang="ts">
import { ref } from 'vue'
import { usePersonalization } from '../composables/usePersonalization'

const isOpen = ref(false)
const { settings, updateSetting, resetSettings, ACCENT_COLORS } = usePersonalization()

const accentColors = Object.keys(ACCENT_COLORS) as Array<keyof typeof ACCENT_COLORS>
const fontSizes = ['small', 'normal', 'large', 'xlarge']
const fontFamilies = ['system', 'serif', 'mono']
const lineHeights = ['tight', 'normal', 'relaxed', 'loose']
const linkStyles = ['always', 'hover', 'never']
const densities = ['compact', 'default', 'relaxed']
const animationLevels = ['normal', 'reduced', 'none']

// Active tab
const activeTab = ref<'appearance' | 'typography' | 'layout' | 'accessibility'>('appearance')
</script>

<template>
  <button
    class="settings-toggle"
    @click="isOpen = !isOpen"
    :aria-expanded="isOpen"
    aria-label="Open settings"
    title="Settings"
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  </button>

  <Teleport to="body">
    <Transition name="slide">
      <div v-if="isOpen" class="settings-overlay" @click="isOpen = false">
        <div class="settings-panel" @click.stop>
          <div class="settings-header">
            <h2>Settings</h2>
            <button class="settings-close" @click="isOpen = false" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="settings-tabs">
            <button
              class="settings-tab"
              :class="{ active: activeTab === 'appearance' }"
              @click="activeTab = 'appearance'"
            >
              🎨 Appearance
            </button>
            <button
              class="settings-tab"
              :class="{ active: activeTab === 'typography' }"
              @click="activeTab = 'typography'"
            >
              📝 Typography
            </button>
            <button
              class="settings-tab"
              :class="{ active: activeTab === 'layout' }"
              @click="activeTab = 'layout'"
            >
              📐 Layout
            </button>
            <button
              class="settings-tab"
              :class="{ active: activeTab === 'accessibility' }"
              @click="activeTab = 'accessibility'"
            >
              ♿ Accessibility
            </button>
          </div>

          <div class="settings-content">
            <!-- APPEARANCE TAB -->
            <div v-show="activeTab === 'appearance'" class="settings-tab-content">
              <div class="settings-group">
                <label class="settings-label">Accent Color</label>
                <div class="settings-options color-options">
                  <button
                    v-for="color in accentColors"
                    :key="color"
                    class="color-option"
                    :class="{ active: settings.accentColor === color }"
                    :style="{ '--color': ACCENT_COLORS[color].primary }"
                    @click="updateSetting('accentColor', color)"
                    :aria-pressed="settings.accentColor === color"
                  >
                    <span class="color-dot"></span>
                    {{ color }}
                  </button>
                </div>
              </div>

              <div class="settings-group">
                <label class="settings-label">Code Theme</label>
                <div class="settings-options">
                  <button
                    v-for="theme in ['dark', 'light', 'high-contrast']"
                    :key="theme"
                    class="option-btn"
                    :class="{ active: settings.codeTheme === theme }"
                    @click="updateSetting('codeTheme', theme)"
                  >
                    {{ theme }}
                  </button>
                </div>
              </div>
            </div>

            <!-- TYPOGRAPHY TAB -->
            <div v-show="activeTab === 'typography'" class="settings-tab-content">
              <div class="settings-group">
                <label class="settings-label">Font Family</label>
                <div class="settings-options">
                  <button
                    v-for="font in fontFamilies"
                    :key="font"
                    class="option-btn"
                    :class="{ active: settings.fontFamily === font }"
                    @click="updateSetting('fontFamily', font)"
                  >
                    {{ font }}
                  </button>
                </div>
              </div>

              <div class="settings-group">
                <label class="settings-label">Font Size</label>
                <div class="settings-options">
                  <button
                    v-for="size in fontSizes"
                    :key="size"
                    class="option-btn"
                    :class="{ active: settings.fontSize === size }"
                    @click="updateSetting('fontSize', size)"
                  >
                    {{ size }}
                  </button>
                </div>
              </div>

              <div class="settings-group">
                <label class="settings-label">Line Height</label>
                <div class="settings-options">
                  <button
                    v-for="height in lineHeights"
                    :key="height"
                    class="option-btn"
                    :class="{ active: settings.lineHeight === height }"
                    @click="updateSetting('lineHeight', height)"
                  >
                    {{ height }}
                  </button>
                </div>
              </div>

              <div class="settings-group">
                <label class="settings-label">Link Underlines</label>
                <div class="settings-options">
                  <button
                    v-for="style in linkStyles"
                    :key="style"
                    class="option-btn"
                    :class="{ active: settings.linkStyle === style }"
                    @click="updateSetting('linkStyle', style)"
                  >
                    {{ style }}
                  </button>
                </div>
              </div>
            </div>

            <!-- LAYOUT TAB -->
            <div v-show="activeTab === 'layout'" class="settings-tab-content">
              <div class="settings-group">
                <label class="settings-label">Content Density</label>
                <div class="settings-options">
                  <button
                    v-for="density in densities"
                    :key="density"
                    class="option-btn"
                    :class="{ active: settings.density === density }"
                    @click="updateSetting('density', density)"
                  >
                    {{ density }}
                  </button>
                </div>
              </div>
            </div>

            <!-- ACCESSIBILITY TAB -->
            <div v-show="activeTab === 'accessibility'" class="settings-tab-content">
              <div class="settings-group">
                <label class="settings-toggle-row">
                  <span>High Contrast</span>
                  <input
                    type="checkbox"
                    :checked="settings.highContrast"
                    @change="updateSetting('highContrast', !settings.highContrast)"
                  />
                </label>
                <p class="settings-hint">Increases text contrast for better readability</p>
              </div>

              <div class="settings-group">
                <label class="settings-toggle-row">
                  <span>Eye Comfort (Warm)</span>
                  <input
                    type="checkbox"
                    :checked="settings.eyeComfort"
                    @change="updateSetting('eyeComfort', !settings.eyeComfort)"
                  />
                </label>
                <p class="settings-hint">Reduces blue light with a warm tint</p>
              </div>

              <div class="settings-group">
                <label class="settings-toggle-row">
                  <span>In-Page Search Highlights</span>
                  <input
                    type="checkbox"
                    :checked="settings.inPageHighlights"
                    @change="updateSetting('inPageHighlights', !settings.inPageHighlights)"
                  />
                </label>
                <p class="settings-hint">Highlight search terms in page content</p>
              </div>

              <div class="settings-group">
                <label class="settings-label">Animations</label>
                <div class="settings-options">
                  <button
                    v-for="level in animationLevels"
                    :key="level"
                    class="option-btn"
                    :class="{ active: settings.animations === level }"
                    @click="updateSetting('animations', level)"
                  >
                    {{ level }}
                  </button>
                </div>
                <p class="settings-hint">Respects your system's motion preferences</p>
              </div>
            </div>
          </div>

          <div class="settings-footer">
            <button class="reset-btn" @click="resetSettings">
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.settings-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  color: var(--vp-c-text-2);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-toggle:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.settings-panel {
  background: var(--vp-c-bg);
  border-left: 1px solid var(--vp-c-divider);
  width: 100%;
  max-width: 420px;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.1);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.settings-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.settings-close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--vp-c-text-2);
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-close:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.settings-tabs {
  display: flex;
  padding: 8px;
  gap: 4px;
  border-bottom: 1px solid var(--vp-c-divider);
  overflow-x: auto;
}

.settings-tab {
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  transition: all 0.2s;
  white-space: nowrap;
}

.settings-tab:hover {
  background: var(--vp-c-bg-soft);
}

.settings-tab.active {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 500;
}

.settings-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.settings-tab-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.settings-hint {
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin: 0;
}

.settings-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
}

.color-option,
.option-btn {
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  font-size: 12px;
  text-transform: capitalize;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-option .color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color);
}

.color-option.active,
.option-btn.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.settings-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  cursor: pointer;
  font-size: 14px;
}

.settings-toggle-row input[type="checkbox"] {
  width: 40px;
  height: 22px;
  appearance: none;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 11px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}

.settings-toggle-row input[type="checkbox"]::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: var(--vp-c-text-3);
  border-radius: 50%;
  transition: all 0.2s;
}

.settings-toggle-row input[type="checkbox"]:checked {
  background: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.settings-toggle-row input[type="checkbox"]:checked::after {
  left: 20px;
  background: white;
}

.settings-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--vp-c-divider);
}

.reset-btn {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  color: var(--vp-c-text-2);
  font-size: 14px;
  transition: all 0.2s;
}

.reset-btn:hover {
  border-color: var(--vp-c-danger-1);
  color: var(--vp-c-danger-1);
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from .settings-panel,
.slide-leave-to .settings-panel {
  transform: translateX(100%);
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

@media (max-width: 480px) {
  .settings-panel {
    max-width: none;
  }

  .settings-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
