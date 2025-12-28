<script setup lang="ts">
import { useQuizProgress } from '../composables/useQuizProgress'

const {
  answeredCount,
  correctCount,
  totalQuestions,
  percentage,
  score,
  resetProgress
} = useQuizProgress()

function handleReset() {
  if (confirm('Are you sure you want to reset all quiz progress?')) {
    resetProgress()
  }
}
</script>

<template>
  <div class="quiz-progress" v-if="totalQuestions > 0">
    <div class="progress-header">
      <span class="progress-title">Quiz Progress</span>
      <button class="reset-btn" @click="handleReset" title="Reset progress">
        Reset
      </button>
    </div>

    <div class="progress-bar-container">
      <div class="progress-bar" :style="{ width: `${percentage}%` }"></div>
    </div>

    <div class="progress-stats">
      <span class="stat">
        <strong>{{ answeredCount }}</strong> / {{ totalQuestions }} completed
      </span>
      <span class="stat" v-if="answeredCount > 0">
        <strong>{{ correctCount }}</strong> correct ({{ score }}%)
      </span>
    </div>

    <div v-if="percentage === 100" class="completion-badge">
      {{ score >= 80 ? '🏆 Excellent!' : score >= 60 ? '✨ Well Done!' : '📚 Keep Learning!' }}
    </div>
  </div>
</template>

<style scoped>
.quiz-progress {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  margin: 20px 0;
}

.progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.progress-title {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.reset-btn {
  background: transparent;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  border-color: var(--vp-c-danger-1);
  color: var(--vp-c-danger-1);
}

.progress-bar-container {
  height: 8px;
  background: var(--vp-c-divider);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--vp-c-brand-1), var(--vp-c-brand-3));
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-stats {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.completion-badge {
  margin-top: 12px;
  padding: 8px 12px;
  background: var(--vp-c-brand-soft);
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
}
</style>
