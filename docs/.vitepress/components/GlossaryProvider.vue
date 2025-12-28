<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// Glossary definitions
const GLOSSARY: Record<string, string> = {
  'ORM': "Object-Relational Mapping - Odoo's layer that translates Python objects to database records, letting you work with data as objects instead of SQL.",
  'API': 'Application Programming Interface - A set of rules that allows different software applications to communicate with each other.',
  'Many2one': 'A field that creates a link to a single record in another model (like a foreign key). Example: Each sale order links to one customer.',
  'One2many': "A virtual field that shows all records in another model that point back to this record. Example: A customer's list of sale orders.",
  'Many2many': 'A field that creates links between multiple records in two models. Example: Products can belong to multiple categories, and categories can have multiple products.',
  'Computed field': 'A field whose value is calculated automatically by a Python method using the @api.depends decorator.',
  'Related field': 'A field that automatically fetches a value from a linked record through a relationship chain.',
  'Domain': "A filter condition written as a list of tuples that specifies which records to include/exclude. Example: [('state', '=', 'sale')]",
  'Context': 'A Python dictionary passed through method calls containing metadata like user language, company, and default values.',
  'XML-RPC': 'A protocol for calling Odoo methods from external applications over HTTP using XML.',
  'Recordset': 'A collection of records from a model, similar to a list but with special ORM methods.',
  'Decorator': 'Python syntax (@something) that modifies function behavior. Common in Odoo: @api.depends, @api.onchange, @api.model.',
  'Wizard': 'A TransientModel that provides a popup form for user input, often for batch operations.',
  'View': 'An XML definition that describes how records should be displayed (form, list, kanban, etc.).',
  'Action': 'A configuration that defines what happens when users click menu items or buttons.',
  'QWeb': "Odoo's templating engine for generating HTML, PDF reports, and website pages.",
  'Module': 'A self-contained package of Odoo functionality including models, views, data, and business logic.',
  'Manifest': "The __manifest__.py file that defines a module's metadata, dependencies, and data files.",
  'Cron': 'Scheduled actions that run automatically at specified intervals (ir.cron).',
  'Chatter': 'The messaging/activity tracking system found on many Odoo records.',
  'CRUD': 'Create, Read, Update, Delete - the four basic operations for database records.',
  'ACL': 'Access Control List - defines which user groups can perform CRUD operations on models.',
  'Record Rules': 'Fine-grained security rules that filter which specific records users can access.',
  'Superuser': 'A mode that bypasses all security checks, used carefully for system operations.',
  'Environment': 'The self.env object providing access to models, user, context, and database cursor.',
  'Odoo.sh': "Odoo's official cloud hosting platform with Git integration and staging environments.",
  'Studio': "Odoo's visual customization tool for modifying apps without code (Enterprise feature).",
  'ir.model': 'The meta-model that stores information about all models in the Odoo database.',
  'ir.ui.view': 'The model that stores all view definitions (form, list, kanban, etc.).',
  'res.partner': 'The model for contacts - customers, vendors, and addresses in Odoo.'
}

const popoverRef = ref<HTMLDivElement | null>(null)
const isVisible = ref(false)
const currentTerm = ref('')
const currentDefinition = ref('')
const popoverStyle = ref({ top: '0px', left: '0px' })

let hideTimeout: number | null = null

function showPopover(term: string, target: HTMLElement) {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }

  const definition = GLOSSARY[term]
  if (!definition) return

  currentTerm.value = term
  currentDefinition.value = definition
  isVisible.value = true

  nextTick(() => {
    if (!popoverRef.value) return

    const rect = target.getBoundingClientRect()
    const popoverRect = popoverRef.value.getBoundingClientRect()

    let top = rect.top - popoverRect.height - 8
    let left = rect.left + (rect.width / 2) - (popoverRect.width / 2)

    // Keep within viewport
    if (top < 10) {
      top = rect.bottom + 8
    }
    if (left < 10) left = 10
    if (left + popoverRect.width > window.innerWidth - 10) {
      left = window.innerWidth - popoverRect.width - 10
    }

    popoverStyle.value = {
      top: `${top + window.scrollY}px`,
      left: `${left}px`
    }
  })
}

function hidePopover() {
  hideTimeout = window.setTimeout(() => {
    isVisible.value = false
  }, 150)
}

function keepPopoverOpen() {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
    hideTimeout = null
  }
}

function handleMouseEnter(e: Event) {
  const target = e.target as HTMLElement
  if (!target || !target.classList) return
  if (target.classList.contains('glossary-term')) {
    const term = target.dataset.term
    if (term) showPopover(term, target)
  }
}

function handleMouseLeave(e: Event) {
  const target = e.target as HTMLElement
  if (!target || !target.classList) return
  if (target.classList.contains('glossary-term')) {
    hidePopover()
  }
}

function processGlossaryTerms() {
  if (typeof document === 'undefined') return

  const content = document.querySelector('.vp-doc')
  if (!content) return

  // Create regex from glossary terms
  const terms = Object.keys(GLOSSARY)
  const escapedTerms = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const termRegex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'g')

  // Process text nodes
  const walker = document.createTreeWalker(
    content,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Skip code blocks, links, and already processed
        if (node.parentElement?.closest('pre, code, a, .glossary-term')) {
          return NodeFilter.FILTER_REJECT
        }
        // Only process if contains a term
        termRegex.lastIndex = 0
        if (termRegex.test(node.nodeValue || '')) {
          return NodeFilter.FILTER_ACCEPT
        }
        return NodeFilter.FILTER_REJECT
      }
    }
  )

  const textNodes: Text[] = []
  let currentNode: Node | null
  while ((currentNode = walker.nextNode())) {
    textNodes.push(currentNode as Text)
  }

  textNodes.forEach(textNode => {
    const text = textNode.nodeValue || ''
    termRegex.lastIndex = 0

    const fragment = document.createDocumentFragment()
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = termRegex.exec(text)) !== null) {
      // Text before match
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)))
      }

      // Create glossary term span
      const span = document.createElement('span')
      span.className = 'glossary-term'
      span.textContent = match[0]
      span.dataset.term = match[0]
      span.tabIndex = 0
      fragment.appendChild(span)

      lastIndex = match.index + match[0].length
    }

    // Remaining text
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
    }

    if (textNode.parentNode) {
      textNode.parentNode.replaceChild(fragment, textNode)
    }
  })
}

onMounted(() => {
  // Process after content renders
  setTimeout(processGlossaryTerms, 500)

  // Event delegation for glossary terms
  document.addEventListener('mouseenter', handleMouseEnter, true)
  document.addEventListener('mouseleave', handleMouseLeave, true)
})

onUnmounted(() => {
  document.removeEventListener('mouseenter', handleMouseEnter, true)
  document.removeEventListener('mouseleave', handleMouseLeave, true)
  if (hideTimeout) clearTimeout(hideTimeout)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-show="isVisible"
      ref="popoverRef"
      class="glossary-popover"
      :style="popoverStyle"
      @mouseenter="keepPopoverOpen"
      @mouseleave="hidePopover"
    >
      <div class="glossary-term-title">{{ currentTerm }}</div>
      <div class="glossary-definition">{{ currentDefinition }}</div>
    </div>
  </Teleport>
</template>

<style scoped>
.glossary-popover {
  position: absolute;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 12px 16px;
  max-width: 320px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  pointer-events: auto;
}

.glossary-term-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--vp-c-brand-1);
  margin-bottom: 6px;
}

.glossary-definition {
  font-size: 13px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}
</style>

<style>
/* Global styles for glossary terms */
.glossary-term {
  color: var(--vp-c-brand-1);
  border-bottom: 1px dashed var(--vp-c-brand-1);
  cursor: help;
  transition: color 0.2s, border-color 0.2s;
}

.glossary-term:hover {
  color: var(--vp-c-brand-2);
  border-color: var(--vp-c-brand-2);
}
</style>
