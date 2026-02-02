<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()

// State
const isOpen = ref(false)
const isSubmitting = ref(false)
const isSuccess = ref(false)
const hasError = ref(false)

// Form data
const feedbackType = ref<'question' | 'suggestion' | 'issue' | 'praise'>('question')
const message = ref('')
const discordUsername = ref('')
const email = ref('')

// Discord webhook URL (you'll need to replace this with your actual webhook)
// For production, move this to a Vercel serverless function
const DISCORD_WEBHOOK = import.meta.env.VITE_DISCORD_WEBHOOK || ''

const feedbackTypes = [
  { value: 'question', label: 'Question', icon: '?' , color: '#6366F1' },
  { value: 'suggestion', label: 'Suggestion', icon: '💡', color: '#10B981' },
  { value: 'issue', label: 'Issue', icon: '🐛', color: '#EF4444' },
  { value: 'praise', label: 'Praise', icon: '⭐', color: '#F59E0B' },
]

const currentType = computed(() =>
  feedbackTypes.find(t => t.value === feedbackType.value)
)

const canSubmit = computed(() => {
  const hasMessage = message.value.trim().length >= 10
  const hasDiscord = discordUsername.value.trim().length >= 2
  return (hasMessage || hasDiscord) && !isSubmitting.value
})

function open() {
  isOpen.value = true
  isSuccess.value = false
  hasError.value = false
  document.body.style.overflow = 'hidden'
}

function close() {
  if (isSubmitting.value) return
  isOpen.value = false
  document.body.style.overflow = ''
}

function reset() {
  message.value = ''
  discordUsername.value = ''
  email.value = ''
  feedbackType.value = 'question'
  isSuccess.value = false
  hasError.value = false
}

async function submit() {
  if (!canSubmit.value) return

  isSubmitting.value = true
  hasError.value = false

  const payload = {
    embeds: [{
      title: `${currentType.value?.icon} New ${currentType.value?.label}`,
      description: message.value,
      color: parseInt(currentType.value?.color?.replace('#', '') || '6366F1', 16),
      fields: [
        {
          name: '📄 Page',
          value: `[${route.path}](https://pran-odoo.github.io/odoo-training${route.path})`,
          inline: true
        },
        ...(discordUsername.value ? [{
          name: '🎮 Discord',
          value: discordUsername.value,
          inline: true
        }] : []),
        ...(email.value ? [{
          name: '📧 Email',
          value: email.value,
          inline: true
        }] : [])
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Odoo Training Feedback'
      }
    }]
  }

  try {
    if (DISCORD_WEBHOOK) {
      const response = await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Failed to send')
    } else {
      // Demo mode - just simulate success
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Feedback (demo mode):', payload)
    }

    isSuccess.value = true

    // Auto close after success
    setTimeout(() => {
      close()
      setTimeout(reset, 300)
    }, 2000)

  } catch (err) {
    console.error('Feedback error:', err)
    hasError.value = true
  } finally {
    isSubmitting.value = false
  }
}

// Keyboard handling
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <!-- Floating trigger button -->
  <button
    class="feedback-trigger"
    @click="open"
    aria-label="Send feedback or ask a question"
  >
    <span class="feedback-trigger-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <path d="M12 7v2"/>
        <path d="M12 13h.01"/>
      </svg>
    </span>
    <span class="feedback-trigger-text">Questions?</span>
  </button>

  <!-- Modal overlay -->
  <Teleport to="body">
    <Transition name="feedback-overlay">
      <div v-if="isOpen" class="feedback-overlay" @click.self="close">
        <Transition name="feedback-modal">
          <div v-if="isOpen" class="feedback-modal">
            <!-- Header -->
            <div class="feedback-header">
              <div class="feedback-header-content">
                <h3 class="feedback-title">
                  <span class="feedback-title-icon">💬</span>
                  Have a question or feedback?
                </h3>
                <p class="feedback-subtitle">
                  We'd love to hear from you. Your input helps us improve!
                </p>
              </div>
              <button class="feedback-close" @click="close" aria-label="Close">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Success state -->
            <div v-if="isSuccess" class="feedback-success">
              <div class="feedback-success-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h4>Thank you!</h4>
              <p>Your feedback has been sent successfully.</p>
            </div>

            <!-- Form -->
            <form v-else class="feedback-form" @submit.prevent="submit">
              <!-- Type selector -->
              <div class="feedback-types">
                <button
                  v-for="type in feedbackTypes"
                  :key="type.value"
                  type="button"
                  class="feedback-type-btn"
                  :class="{ active: feedbackType === type.value }"
                  :style="feedbackType === type.value ? `--type-color: ${type.color}` : ''"
                  @click="feedbackType = type.value as any"
                >
                  <span class="feedback-type-icon">{{ type.icon }}</span>
                  <span class="feedback-type-label">{{ type.label }}</span>
                </button>
              </div>

              <!-- Message -->
              <div class="feedback-field">
                <label for="feedback-message">
                  {{ feedbackType === 'question' ? 'Your question' :
                     feedbackType === 'suggestion' ? 'Your suggestion' :
                     feedbackType === 'issue' ? 'Describe the issue' : 'What did you like?' }}
                  <span v-if="!discordUsername.trim()" class="required">*</span>
                  <span v-else class="optional">(optional)</span>
                </label>
                <textarea
                  id="feedback-message"
                  v-model="message"
                  :placeholder="feedbackType === 'question' ? 'What would you like to know about Odoo?' :
                               feedbackType === 'suggestion' ? 'How can we improve this documentation?' :
                               feedbackType === 'issue' ? 'What problem did you encounter?' :
                               'Tell us what you enjoyed!'"
                  rows="4"
                  :required="!discordUsername.trim()"
                  minlength="10"
                />
                <span class="feedback-char-count" :class="{ valid: message.length >= 10 }">
                  {{ message.length }}/10 min
                </span>
              </div>

              <!-- Discord Username -->
              <div class="feedback-field">
                <label for="feedback-discord">
                  Discord Username
                  <span v-if="message.trim().length < 10" class="required">*</span>
                  <span v-else class="optional">(optional)</span>
                </label>
                <div class="discord-input-wrapper">
                  <span class="discord-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </span>
                  <input
                    id="feedback-discord"
                    v-model="discordUsername"
                    type="text"
                    placeholder="username or username#1234"
                    :required="message.trim().length < 10"
                  />
                </div>
                <span class="feedback-hint">We can reach out to you on Discord for follow-up</span>
              </div>

              <!-- Email (optional) -->
              <div class="feedback-field">
                <label for="feedback-email">
                  Email <span class="optional">(optional)</span>
                </label>
                <input
                  id="feedback-email"
                  v-model="email"
                  type="email"
                  placeholder="your@email.com"
                />
              </div>

              <!-- Error message -->
              <div v-if="hasError" class="feedback-error">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>Something went wrong. Please try again.</span>
              </div>

              <!-- Submit -->
              <button
                type="submit"
                class="feedback-submit"
                :disabled="!canSubmit"
              >
                <span v-if="isSubmitting" class="feedback-spinner"></span>
                <span v-else>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Send {{ currentType?.label }}
                </span>
              </button>

              <!-- Page context -->
              <p class="feedback-context">
                Sending from: <code>{{ route.path }}</code>
              </p>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Floating trigger button */
.feedback-trigger {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4),
              0 0 0 0 rgba(99, 102, 241, 0.4);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  animation: pulse 3s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4),
                0 0 0 0 rgba(99, 102, 241, 0.4);
  }
  50% {
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4),
                0 0 0 8px rgba(99, 102, 241, 0);
  }
}

.feedback-trigger:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5);
  animation: none;
}

.feedback-trigger-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.feedback-trigger-icon svg {
  width: 20px;
  height: 20px;
}

.feedback-trigger-text {
  white-space: nowrap;
}

/* Hide text on mobile */
@media (max-width: 640px) {
  .feedback-trigger {
    padding: 14px;
    border-radius: 50%;
  }
  .feedback-trigger-text {
    display: none;
  }
}

/* Overlay */
.feedback-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Modal */
.feedback-modal {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.dark .feedback-modal {
  background: #1a1a1a;
  border-color: #333;
}

/* Header */
.feedback-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 24px 0;
}

.feedback-header-content {
  flex: 1;
}

.feedback-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.feedback-title-icon {
  font-size: 1.5rem;
}

.feedback-subtitle {
  margin: 8px 0 0;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}

.feedback-close {
  padding: 8px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  transition: all 0.2s;
}

.feedback-close:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}

.feedback-close svg {
  width: 18px;
  height: 18px;
  display: block;
}

/* Form */
.feedback-form {
  padding: 24px;
}

/* Type selector */
.feedback-types {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.feedback-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: var(--vp-c-bg-soft);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.feedback-type-btn:hover {
  background: var(--vp-c-bg-mute);
}

.feedback-type-btn.active {
  background: color-mix(in srgb, var(--type-color) 15%, transparent);
  border-color: var(--type-color);
}

.feedback-type-icon {
  font-size: 1.5rem;
}

.feedback-type-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.feedback-type-btn.active .feedback-type-label {
  color: var(--vp-c-text-1);
}

/* Fields */
.feedback-field {
  position: relative;
  margin-bottom: 16px;
}

.feedback-field label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.feedback-field .optional {
  font-weight: 400;
  color: var(--vp-c-text-3);
}

.feedback-field .required {
  color: var(--color-danger-text, #ef4444);
  font-weight: 600;
}

.feedback-field textarea,
.feedback-field input {
  width: 100%;
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: 12px;
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
  transition: all 0.2s;
  resize: vertical;
}

.feedback-field textarea:focus,
.feedback-field input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.feedback-field textarea::placeholder,
.feedback-field input::placeholder {
  color: var(--vp-c-text-3);
}

.feedback-char-count {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.feedback-char-count.valid {
  color: var(--color-success);
}

/* Discord input */
.discord-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.discord-icon {
  position: absolute;
  left: 14px;
  display: flex;
  align-items: center;
  color: #5865F2;
  pointer-events: none;
}

.discord-icon svg {
  width: 18px;
  height: 18px;
}

.discord-input-wrapper input {
  padding-left: 42px;
}

.feedback-hint {
  display: block;
  margin-top: 6px;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

/* Error */
.feedback-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: var(--color-danger-soft);
  border: 1px solid var(--color-danger-border);
  border-radius: 10px;
  color: var(--color-danger-text);
  font-size: 0.875rem;
}

.feedback-error svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

/* Submit button */
.feedback-submit {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 24px;
  background: linear-gradient(135deg, var(--vp-c-brand-1), var(--vp-c-brand-2));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.feedback-submit:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
}

.feedback-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.feedback-submit svg {
  width: 18px;
  height: 18px;
}

.feedback-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Context */
.feedback-context {
  margin: 16px 0 0;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  text-align: center;
}

.feedback-context code {
  padding: 2px 6px;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  font-size: 0.7rem;
}

/* Success state */
.feedback-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
}

.feedback-success-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-success-soft);
  border-radius: 50%;
  margin-bottom: 16px;
  color: var(--color-success);
  animation: successPop 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes successPop {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.feedback-success-icon svg {
  width: 32px;
  height: 32px;
}

.feedback-success h4 {
  margin: 0 0 8px;
  font-size: 1.25rem;
  color: var(--vp-c-text-1);
}

.feedback-success p {
  margin: 0;
  color: var(--vp-c-text-2);
}

/* Transitions */
.feedback-overlay-enter-active,
.feedback-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.feedback-overlay-enter-from,
.feedback-overlay-leave-to {
  opacity: 0;
}

.feedback-modal-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.feedback-modal-leave-active {
  transition: all 0.3s ease;
}

.feedback-modal-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

.feedback-modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
