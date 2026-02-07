<script setup lang="ts">
import ElectricBorder from './ElectricBorder.vue'
import ShinyText from './ShinyText.vue'

interface Feature {
  icon: string
  title: string
  details: string
  color?: string
  shineColor?: string
}

const features: Feature[] = [
  {
    icon: '📚',
    title: '30+ In-Depth Sections',
    details: 'Models, views, security, workflows, APIs, AI, EDI, Studio, and more',
    color: '#7df9ff', // cyan
    shineColor: '#E0FCFF'
  },
  {
    icon: '🔌',
    title: 'Live API Playground',
    details: 'Test Odoo JSON/2 API calls in your browser with real responses',
    color: '#ff6b6b', // coral
    shineColor: '#FFD4D4'
  },
  {
    icon: '🎯',
    title: 'Odoo 19 Focused',
    details: 'Covers JSON/2 API, AI agents, webhooks, and the latest features',
    color: '#9b59b6', // purple
    shineColor: '#E9D5F5'
  },
  {
    icon: '📱',
    title: 'Works Offline',
    details: 'Install as a PWA — read on the go, even without internet',
    color: '#2ecc71', // green
    shineColor: '#D5F5E3'
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
        <h3 class="feature-title">
          <ShinyText
            :text="feature.title"
            :color="feature.color"
            :shine-color="feature.shineColor"
            :speed="3"
            :spread="120"
            :delay="0.5"
            pause-on-hover
          />
        </h3>
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
  background: #111115;
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
    gap: 16px;
  }

  .feature-card {
    padding: 20px 16px;
  }

  .feature-icon {
    font-size: 2rem;
  }

  .feature-title {
    font-size: 1.1rem;
  }

  .feature-details {
    font-size: 0.875rem;
  }
}

@media (max-width: 400px) {
  .feature-cards {
    padding: 0 12px;
    gap: 12px;
  }
}
</style>
