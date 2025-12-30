import { ref, computed } from 'vue'
import { usePersonalization } from './usePersonalization'

const highlights = ref<HTMLElement[]>([])
const currentIndex = ref(-1)
const query = ref('')

const { settings } = usePersonalization()

// Elements to skip when highlighting
const SKIP_SELECTOR = [
  'code', 'pre', 'kbd', 'svg', 'canvas',
  'input', 'textarea', 'select', 'button',
  '.VPSidebar', '.VPNav', '.VPLocalNav',
  '.search-highlight-controls', '.command-palette',
  '.settings-panel', '.bookmarks-panel'
].join(', ')

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isHighlightable(node: Node, regex: RegExp): boolean {
  if (!node || !node.parentElement) return false
  if (node.parentElement.closest(SKIP_SELECTOR)) return false
  if (!node.nodeValue || !regex.test(node.nodeValue)) return false
  return true
}

function clearHighlights(): void {
  const parentsToNormalize = new Set<Node>()

  highlights.value.forEach(span => {
    const parent = span.parentNode
    if (!parent) return
    parent.replaceChild(document.createTextNode(span.textContent || ''), span)
    parentsToNormalize.add(parent)
  })

  parentsToNormalize.forEach(parent => {
    if (parent instanceof Element) {
      parent.normalize()
    }
  })

  highlights.value = []
  currentIndex.value = -1
}

function applyHighlights(searchQuery: string): void {
  if (!settings.inPageHighlights) {
    clearHighlights()
    return
  }

  const trimmed = searchQuery.trim()
  if (trimmed.length < 2) {
    clearHighlights()
    query.value = ''
    return
  }

  clearHighlights()
  query.value = trimmed

  const terms = trimmed.split(/\s+/).filter(term => term.length >= 2)
  if (!terms.length) return

  const pattern = terms.map(escapeRegex).join('|')
  const testRegex = new RegExp(pattern, 'i')
  const highlightRegex = new RegExp(pattern, 'gi')

  const container = document.querySelector('.VPDoc .vp-doc') || document.querySelector('.VPContent')
  if (!container) return

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return isHighlightable(node, testRegex) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    }
  })

  const textNodes: Text[] = []
  let currentNode: Node | null
  while ((currentNode = walker.nextNode())) {
    textNodes.push(currentNode as Text)
  }

  textNodes.forEach(node => {
    const text = node.nodeValue
    if (!text) return

    // Skip .test() which advances lastIndex - just go straight to replace
    const fragment = document.createDocumentFragment()
    let lastIndex = 0
    let hasMatches = false

    highlightRegex.lastIndex = 0
    text.replace(highlightRegex, (match, offset) => {
      hasMatches = true
      if (offset > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)))
      }
      const span = document.createElement('span')
      span.className = 'search-highlight'
      span.textContent = match
      fragment.appendChild(span)
      highlights.value.push(span)
      lastIndex = offset + match.length
      return match
    })

    // Only process if we found matches
    if (!hasMatches) return

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
    }

    if (node.parentNode) {
      node.parentNode.replaceChild(fragment, node)
    }
  })

  if (highlights.value.length > 0) {
    setActiveHighlight(0)
  }
}

function setActiveHighlight(index: number): void {
  if (!highlights.value.length) return

  // Remove active class from all
  highlights.value.forEach(el => el.classList.remove('active'))

  // Normalize index
  currentIndex.value = ((index % highlights.value.length) + highlights.value.length) % highlights.value.length

  // Add active class and scroll into view
  const active = highlights.value[currentIndex.value]
  active.classList.add('active')
  active.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function nextHighlight(): void {
  if (!highlights.value.length) return
  const next = currentIndex.value < 0 ? 0 : currentIndex.value + 1
  setActiveHighlight(next)
}

function prevHighlight(): void {
  if (!highlights.value.length) return
  const prev = currentIndex.value < 0 ? highlights.value.length - 1 : currentIndex.value - 1
  setActiveHighlight(prev)
}

export function useSearchHighlights() {
  return {
    highlights: computed(() => highlights.value),
    currentIndex: computed(() => currentIndex.value),
    query: computed(() => query.value),
    totalCount: computed(() => highlights.value.length),
    applyHighlights,
    clearHighlights,
    nextHighlight,
    prevHighlight
  }
}
