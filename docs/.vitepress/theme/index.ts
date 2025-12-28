import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import './custom.css'

// Components
import CommandPalette from '../components/CommandPalette.vue'
import SettingsPanel from '../components/SettingsPanel.vue'
import ProgressBar from '../components/ProgressBar.vue'
import BookmarksPanel from '../components/BookmarksPanel.vue'
import BookmarkButton from '../components/BookmarkButton.vue'
import SearchHighlights from '../components/SearchHighlights.vue'
import Quiz from '../components/Quiz.vue'
import QuizProgress from '../components/QuizProgress.vue'
import FocusModeToggle from '../components/FocusModeToggle.vue'
import BackToTop from '../components/BackToTop.vue'
import KeyboardHelp from '../components/KeyboardHelp.vue'
import ResumeReading from '../components/ResumeReading.vue'
import GlossaryProvider from '../components/GlossaryProvider.vue'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    // Register global components
    app.component('CommandPalette', CommandPalette)
    app.component('SettingsPanel', SettingsPanel)
    app.component('ProgressBar', ProgressBar)
    app.component('BookmarksPanel', BookmarksPanel)
    app.component('BookmarkButton', BookmarkButton)
    app.component('SearchHighlights', SearchHighlights)
    app.component('Quiz', Quiz)
    app.component('QuizProgress', QuizProgress)
    app.component('FocusModeToggle', FocusModeToggle)
    app.component('BackToTop', BackToTop)
    app.component('KeyboardHelp', KeyboardHelp)
    app.component('ResumeReading', ResumeReading)
    app.component('GlossaryProvider', GlossaryProvider)
  }
} satisfies Theme
