<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuizProgress } from '../composables/useQuizProgress'

interface QuizOption {
  text: string
  correct?: boolean
}

const props = defineProps<{
  id: string
  question: string
  options: QuizOption[]
  explanation?: string
}>()

const { answerQuestion, getAnswer, isAnswered } = useQuizProgress()

const selectedIndex = ref<number | null>(null)
const showExplanation = ref(false)

const correctIndex = computed(() =>
  props.options.findIndex(opt => opt.correct)
)

const answered = computed(() => isAnswered(props.id))
const previousAnswer = computed(() => getAnswer(props.id))

onMounted(() => {
  if (previousAnswer.value) {
    selectedIndex.value = previousAnswer.value.selectedAnswer
    showExplanation.value = true
  }
})

function selectOption(index: number) {
  if (answered.value) return

  selectedIndex.value = index
  showExplanation.value = true
  answerQuestion(props.id, index, correctIndex.value)
}

function getOptionClass(index: number) {
  if (selectedIndex.value === null) return ''

  if (index === correctIndex.value) return 'correct'
  if (index === selectedIndex.value && index !== correctIndex.value) return 'incorrect'
  return 'dimmed'
}
</script>

<template>
  <div class="quiz-card" :class="{ answered }">
    <div class="quiz-question">{{ question }}</div>

    <div class="quiz-options">
      <button
        v-for="(option, index) in options"
        :key="index"
        class="quiz-option"
        :class="getOptionClass(index)"
        :disabled="answered"
        @click="selectOption(index)"
      >
        <span class="option-letter">{{ String.fromCharCode(65 + index) }}</span>
        <span class="option-text">{{ option.text }}</span>
        <span v-if="answered && index === correctIndex" class="option-icon">✓</span>
        <span v-if="answered && index === selectedIndex && index !== correctIndex" class="option-icon">✗</span>
      </button>
    </div>

    <div v-if="showExplanation && explanation" class="quiz-explanation">
      <strong>Explanation:</strong> {{ explanation }}
    </div>
  </div>
</template>

<style scoped>
.quiz-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
  margin: 20px 0;
}

.quiz-question {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 16px;
  color: var(--vp-c-text-1);
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quiz-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.quiz-option:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.quiz-option:disabled {
  cursor: default;
}

.quiz-option.correct {
  border-color: var(--color-success);
  background: var(--color-success-soft);
}

.quiz-option.incorrect {
  border-color: var(--color-danger);
  background: var(--color-danger-soft);
}

.quiz-option.dimmed {
  opacity: 0.5;
}

.option-letter {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  font-weight: 600;
  font-size: 13px;
}

.option-text {
  flex: 1;
}

.option-icon {
  font-size: 18px;
}

.quiz-explanation {
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--vp-c-brand-soft);
  border-radius: 8px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}
</style>
