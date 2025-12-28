import { ref, computed } from 'vue'
import { safeGetItem, safeSetItem, STORAGE_KEYS } from '../utils/localStorage'

interface QuizAnswer {
  questionId: string
  selectedAnswer: number
  isCorrect: boolean
}

interface QuizProgress {
  answers: Record<string, QuizAnswer>
  totalQuestions: number
}

const progress = ref<QuizProgress>({
  answers: {},
  totalQuestions: 0
})

function loadProgress(): void {
  const saved = safeGetItem(STORAGE_KEYS.quizProgress)
  if (saved) {
    try {
      progress.value = JSON.parse(saved)
    } catch (e) {
      progress.value = { answers: {}, totalQuestions: 0 }
    }
  }
}

function saveProgress(): void {
  safeSetItem(STORAGE_KEYS.quizProgress, JSON.stringify(progress.value))
}

function answerQuestion(questionId: string, selectedAnswer: number, correctAnswer: number): void {
  progress.value.answers[questionId] = {
    questionId,
    selectedAnswer,
    isCorrect: selectedAnswer === correctAnswer
  }
  saveProgress()
}

function getAnswer(questionId: string): QuizAnswer | null {
  return progress.value.answers[questionId] || null
}

function isAnswered(questionId: string): boolean {
  return questionId in progress.value.answers
}

function resetProgress(): void {
  progress.value = { answers: {}, totalQuestions: 0 }
  saveProgress()
}

function setTotalQuestions(count: number): void {
  progress.value.totalQuestions = count
  saveProgress()
}

// Initialize
let initialized = false

export function useQuizProgress() {
  if (!initialized && typeof window !== 'undefined') {
    loadProgress()
    initialized = true
  }

  const answeredCount = computed(() => Object.keys(progress.value.answers).length)
  const correctCount = computed(() =>
    Object.values(progress.value.answers).filter(a => a.isCorrect).length
  )
  const totalQuestions = computed(() => progress.value.totalQuestions)
  const percentage = computed(() =>
    totalQuestions.value > 0
      ? Math.round((answeredCount.value / totalQuestions.value) * 100)
      : 0
  )
  const score = computed(() =>
    answeredCount.value > 0
      ? Math.round((correctCount.value / answeredCount.value) * 100)
      : 0
  )

  return {
    progress: computed(() => progress.value),
    answeredCount,
    correctCount,
    totalQuestions,
    percentage,
    score,
    answerQuestion,
    getAnswer,
    isAnswered,
    resetProgress,
    setTotalQuestions
  }
}
