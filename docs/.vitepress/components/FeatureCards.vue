<script setup lang="ts">
import ElectricBorder from './ElectricBorder.vue'

interface Feature {
  icon: string
  title: string
  details: string
  color?: string
}

const features: Feature[] = [
  {
    icon: '📚',
    title: '28 In-Depth Sections',
    details: 'From models and fields to AI features and EDI integration',
    color: '#7df9ff' // cyan
  },
  {
    icon: '🎯',
    title: 'Real-World Examples',
    details: 'Practical scenarios from actual Odoo implementations',
    color: '#ff6b6b' // coral
  },
  {
    icon: '🧪',
    title: 'Interactive Quizzes',
    details: 'Test your knowledge with built-in assessments',
    color: '#9b59b6' // purple
  },
  {
    icon: '📱',
    title: 'Works Offline',
    details: 'Install as a PWA for offline access anywhere',
    color: '#2ecc71' // green
  }
]
</script>

<template>
  <div class="feature-cards">
    <ElectricBorder
      v-for="(feature, index) in features"
      :key="index"
      :color="feature.color"
      :speed="0.8"
      :chaos="0.15"
      :border-radius="16"
      class="feature-card-wrapper"
    >
      <div class="feature-card">
        <div class="feature-icon">{{ feature.icon }}</div>
        <h3 class="feature-title">{{ feature.title }}</h3>
        <p class="feature-details">{{ feature.details }}</p>
      </div>
    </ElectricBorder>
  </div>
</template>

<style scoped>
.feature-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin: 40px 0;
  padding: 0 24px;
}

.feature-card-wrapper {
  min-height: 180px;
}

.feature-card {
  background: rgba(15, 15, 20, 0.8);
  backdrop-filter: blur(12px);
  padding: 28px 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: inherit;
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 16px;
  line-height: 1;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--vp-c-text-1);
}

.feature-details {
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  margin: 0;
  line-height: 1.6;
  flex: 1;
}

/* Light mode adjustments */
:root:not(.dark) .feature-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

@media (max-width: 640px) {
  .feature-cards {
    grid-template-columns: 1fr;
    padding: 0 16px;
    gap: 20px;
  }

  .feature-card {
    padding: 24px 20px;
  }

  .feature-icon {
    font-size: 2rem;
  }

  .feature-title {
    font-size: 1.1rem;
  }
}
</style>
