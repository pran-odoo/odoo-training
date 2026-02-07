import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { defineAsyncComponent } from 'vue'
import Layout from './Layout.vue'
import './custom.css'

// Components used in markdown files (need global registration)
import Quiz from '../components/Quiz.vue'
import FeatureCards from '../components/FeatureCards.vue'
import ShinyText from '../components/ShinyText.vue'

// Lazy load heavy WebGL component
const InfiniteMenu = defineAsyncComponent(() => import('../components/InfiniteMenu.vue'))

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    // Only register components used in markdown files
    // Layout.vue components are imported directly there
    app.component('Quiz', Quiz)
    app.component('FeatureCards', FeatureCards)
    app.component('InfiniteMenu', InfiniteMenu)
    app.component('ShinyText', ShinyText)
  }
} satisfies Theme
