document.addEventListener('DOMContentLoaded', function() {
// ==================== ELEMENTS ====================
const progressBar = document.getElementById('progressBar');
const backToTop = document.getElementById('backToTop');
const sidebar = document.getElementById('sidebar');
const sidebarLinks = sidebar.querySelectorAll('nav a');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const currentSectionIndicator = document.getElementById('currentSection');
const sections = document.querySelectorAll('h2[id]');
const sectionsArray = Array.from(sections);

// New feature elements
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const darkModeBtn = document.getElementById('darkModeBtn');
const fontSmallBtn = document.getElementById('fontSmallBtn');
const fontLargeBtn = document.getElementById('fontLargeBtn');
const helpBtn = document.getElementById('helpBtn');
const keyboardHint = document.getElementById('keyboardHint');
const resumeBanner = document.getElementById('resumeBanner');
const resumeSection = document.getElementById('resumeSection');
const resumeClose = document.getElementById('resumeClose');

// Command palette elements
const commandPalette = document.getElementById('commandPalette');
const commandPaletteOverlay = document.getElementById('commandPaletteOverlay');
const commandPaletteInput = document.getElementById('commandPaletteInput');
const commandPaletteResults = document.getElementById('commandPaletteResults');

// Focus mode element
const focusModeBtn = document.getElementById('focusModeBtn');

// ==================== LOCAL STORAGE KEYS ====================
const STORAGE_KEYS = {
    darkMode: 'odoo_training_dark_mode',
    fontSize: 'odoo_training_font_size',
    lastSection: 'odoo_training_last_section',
    lastScrollPos: 'odoo_training_scroll_pos',
    spideyCursor: 'odoo_training_spidey_cursor',
    focusMode: 'odoo_training_focus_mode'
};

// Safe localStorage wrappers (handles Safari private mode, quota exceeded, etc.)
function safeGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return null;
    }
}

function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        // Storage unavailable or full - silently ignore
    }
}

// ==================== PROGRESS BAR ====================
function updateProgressBar() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight > 0) {
        const progress = (scrollTop / docHeight) * 100;
        progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
    }
}

// ==================== SCROLL BEHAVIOR (respects reduced-motion) ====================
function getScrollBehavior() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

// ==================== BACK TO TOP ====================
function toggleBackToTop() {
    if (window.scrollY > 500) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }
}

backToTop.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: getScrollBehavior() });
});

// ==================== ACTIVE SECTION TRACKING ====================
let currentActiveSection = null;

function updateActiveSection() {
    let foundSection = null;
    const scrollPos = window.scrollY + 150;

    for (let i = sectionsArray.length - 1; i >= 0; i--) {
        if (sectionsArray[i].offsetTop <= scrollPos) {
            foundSection = sectionsArray[i];
            break;
        }
    }

    if (foundSection && foundSection !== currentActiveSection) {
        currentActiveSection = foundSection;

        // Update sidebar active state
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + foundSection.id) {
                link.classList.add('active');
                // Scroll sidebar to show active link
                const sidebarNav = sidebar.querySelector('nav');
                if (sidebarNav) {
                    const linkRect = link.getBoundingClientRect();
                    const sidebarRect = sidebar.getBoundingClientRect();
                    if (linkRect.top < sidebarRect.top + 150 || linkRect.bottom > sidebarRect.bottom - 50) {
                        link.scrollIntoView({ block: 'center', behavior: getScrollBehavior() });
                    }
                }
            }
        });

        // Update current section indicator
        const activeLink = sidebar.querySelector('nav a.active');
        if (activeLink) {
            currentSectionIndicator.textContent = activeLink.textContent;
            currentSectionIndicator.classList.add('visible');
        }

        // Save to localStorage
        saveReadingProgress(foundSection.id);
    }

    // Hide indicator at top
    if (window.scrollY < 300) {
        currentSectionIndicator.classList.remove('visible');
    }
}

// ==================== MOBILE MENU ====================
function toggleMobileMenu() {
    const isOpen = sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active', isOpen);
    mobileMenuToggle.classList.toggle('active', isOpen);
    mobileMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

    // Focus management for accessibility
    if (isOpen) {
        // Focus first focusable element in sidebar
        const firstFocusable = sidebar.querySelector('a, button, input');
        if (firstFocusable) firstFocusable.focus();
    }
}

function closeMobileMenu() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    mobileMenuToggle.classList.remove('active');
    mobileMenuToggle.setAttribute('aria-expanded', 'false');
}

mobileMenuToggle.addEventListener('click', toggleMobileMenu);
sidebarOverlay.addEventListener('click', closeMobileMenu);

// Close menu when clicking a link (mobile)
sidebarLinks.forEach(link => {
    link.addEventListener('click', function() {
        if (window.innerWidth <= 1024) {
            closeMobileMenu();
        }
    });
});

// ==================== SEARCH FUNCTIONALITY ====================
let searchIndex = [];

// Fuzzy match scoring - returns score (higher = better match), 0 = no match
function fuzzyMatch(text, query) {
    text = text.toLowerCase();
    query = query.toLowerCase();

    // Exact match - highest score
    if (text === query) return 1000;

    // Contains exact query - high score
    if (text.includes(query)) {
        // Bonus for match at start
        if (text.startsWith(query)) return 800;
        // Bonus for word boundary match
        if (text.includes(' ' + query) || text.includes('.' + query)) return 700;
        return 600;
    }

    // Word-based matching
    const queryWords = query.split(/\s+/).filter(w => w.length > 0);
    const textWords = text.split(/\s+/).filter(w => w.length > 0);

    let matchedWords = 0;
    let partialScore = 0;

    for (const qWord of queryWords) {
        for (const tWord of textWords) {
            if (tWord === qWord) {
                matchedWords++;
                partialScore += 100;
            } else if (tWord.startsWith(qWord)) {
                matchedWords++;
                partialScore += 80;
            } else if (tWord.includes(qWord)) {
                matchedWords++;
                partialScore += 50;
            }
        }
    }

    // All query words must match something
    if (matchedWords >= queryWords.length) {
        return partialScore;
    }

    // Subsequence matching (for typos/partial)
    let qi = 0;
    let consecutive = 0;
    let maxConsecutive = 0;

    for (let ti = 0; ti < text.length && qi < query.length; ti++) {
        if (text[ti] === query[qi]) {
            qi++;
            consecutive++;
            maxConsecutive = Math.max(maxConsecutive, consecutive);
        } else {
            consecutive = 0;
        }
    }

    // If we matched all query characters in sequence
    if (qi === query.length) {
        // Score based on how consecutive the matches were
        return 20 + (maxConsecutive / query.length) * 30;
    }

    return 0;
}

function buildSearchIndex() {
    searchIndex = [];
    const container = document.querySelector('.container');
    if (!container) return;

    const allH2s = Array.from(container.querySelectorAll('h2[id]'));

    allH2s.forEach((h2, h2Index) => {
        const sectionTitle = h2.textContent.trim();
        const nextH2 = allH2s[h2Index + 1];

        // Get preview text from first paragraph after section heading
        let sectionPreview = '';
        let previewElement = h2.nextElementSibling;
        while (previewElement && previewElement !== nextH2 && !sectionPreview) {
            if (previewElement.tagName === 'P') {
                sectionPreview = previewElement.textContent.trim().substring(0, 120);
                if (previewElement.textContent.trim().length > 120) sectionPreview += '...';
            }
            previewElement = previewElement.nextElementSibling;
        }

        searchIndex.push({
            title: sectionTitle,
            section: sectionTitle,
            element: h2,
            type: 'section',
            preview: sectionPreview
        });

        let current = h2.nextElementSibling;

        while (current && current !== nextH2) {
            if (current.tagName === 'H3' || current.tagName === 'H4') {
                // Get preview from next sibling paragraph
                let headingPreview = '';
                let next = current.nextElementSibling;
                while (next && next.tagName !== 'H2' && next.tagName !== 'H3' && next.tagName !== 'H4' && !headingPreview) {
                    if (next.tagName === 'P') {
                        headingPreview = next.textContent.trim().substring(0, 100);
                        if (next.textContent.trim().length > 100) headingPreview += '...';
                    }
                    next = next.nextElementSibling;
                }

                searchIndex.push({
                    title: current.textContent.trim(),
                    section: sectionTitle.substring(0, 35),
                    element: current,
                    type: 'heading',
                    preview: headingPreview
                });
            }

            // Also index content boxes for searchable content
            if (current.classList && (
                current.classList.contains('critical-box') ||
                current.classList.contains('technical-box') ||
                current.classList.contains('info-box') ||
                current.classList.contains('warning-box') ||
                current.classList.contains('example-box')
            )) {
                const boxTitle = current.querySelector('h3, h4, strong');
                if (boxTitle) {
                    const boxContent = current.textContent.trim().substring(0, 100);
                    searchIndex.push({
                        title: boxTitle.textContent.trim(),
                        section: sectionTitle.substring(0, 35),
                        element: current,
                        type: 'box',
                        preview: boxContent.length > 100 ? boxContent + '...' : boxContent
                    });
                }
            }

            const innerHeadings = current.querySelectorAll ? current.querySelectorAll('h3, h4') : [];
            innerHeadings.forEach(heading => {
                const title = heading.textContent.trim();
                if (!searchIndex.some(item => item.title === title && item.section === sectionTitle.substring(0, 35))) {
                    searchIndex.push({
                        title: title,
                        section: sectionTitle.substring(0, 35),
                        element: heading,
                        type: 'box-title',
                        preview: ''
                    });
                }
            });

            current = current.nextElementSibling;
        }
    });
}

// Type icons for search results
const SEARCH_TYPE_ICONS = {
    section: '📑',
    heading: '📝',
    box: '💡',
    'box-title': '📌'
};

function performSearch(query) {
    if (!query || query.length < 2) {
        searchResults.innerHTML = '';
        searchResults._results = null;
        // Clear ARIA attributes when search is cleared
        searchInput.setAttribute('aria-expanded', 'false');
        searchInput.removeAttribute('aria-activedescendant');
        return;
    }

    // Search both title and preview content
    const scored = searchIndex.map(item => {
        const titleScore = fuzzyMatch(item.title, query);
        const previewScore = item.preview ? fuzzyMatch(item.preview, query) * 0.5 : 0;
        return {
            ...item,
            score: Math.max(titleScore, previewScore)
        };
    }).filter(item => item.score > 0);

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const results = scored.slice(0, 10);

    if (results.length === 0) {
        searchResults.innerHTML = '<div class="no-results" role="status">No results found for "' + escapeHtml(query) + '"</div>';
        searchInput.setAttribute('aria-expanded', 'false');
        searchInput.removeAttribute('aria-activedescendant');
        return;
    }

    // Build results HTML with previews, icons, and ARIA roles
    const html = `
        <div class="search-results-header">
            <span class="search-results-count">${results.length} result${results.length !== 1 ? 's' : ''}</span>
            <span class="search-results-hint">↑↓ to navigate, Enter to select</span>
        </div>
        ${results.map((item, index) => {
            const highlighted = highlightMatch(item.title, query);
            const resultId = 'search-result-' + index;
            const icon = SEARCH_TYPE_ICONS[item.type] || '📄';
            const previewHighlighted = item.preview ? highlightMatch(item.preview, query) : '';

            return `
                <div class="search-result-item" data-index="${index}" id="${resultId}"
                     role="option" tabindex="-1" aria-selected="false">
                    <span class="search-result-icon">${icon}</span>
                    <div class="search-result-content">
                        <div class="search-result-title">${highlighted}</div>
                        ${item.section && item.type !== 'section' ?
                            `<div class="search-result-context">in ${escapeHtml(item.section)}...</div>` : ''}
                        ${previewHighlighted ?
                            `<div class="search-result-preview">${previewHighlighted}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('')}
    `;

    searchResults.innerHTML = html;
    searchResults._results = results;
    searchInput.setAttribute('aria-expanded', 'true');
    searchInput.removeAttribute('aria-activedescendant');
}

function highlightMatch(text, query) {
    const escaped = escapeHtml(text);
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();

    // Try exact substring match first
    const idx = textLower.indexOf(queryLower);
    if (idx !== -1) {
        const before = escapeHtml(text.substring(0, idx));
        const match = escapeHtml(text.substring(idx, idx + query.length));
        const after = escapeHtml(text.substring(idx + query.length));
        return before + '<span class="search-highlight">' + match + '</span>' + after;
    }

    // Highlight individual matching words
    const queryWords = query.toLowerCase().split(/\s+/);
    let result = escaped;
    for (const word of queryWords) {
        if (word.length >= 2) {
            const regex = new RegExp('(' + escapeRegex(word) + ')', 'gi');
            result = result.replace(regex, '<span class="search-highlight">$1</span>');
        }
    }
    return result;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Click handler using event delegation
searchResults.addEventListener('click', function(e) {
    const resultItem = e.target.closest('.search-result-item');
    if (resultItem && searchResults._results) {
        const index = parseInt(resultItem.dataset.index, 10);
        const result = searchResults._results[index];
        if (result && result.element) {
            result.element.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
            searchInput.value = '';
            searchResults.innerHTML = '';
            searchResults._results = null;
            searchInput.setAttribute('aria-expanded', 'false');
            searchInput.removeAttribute('aria-activedescendant');
            closeMobileMenu();
        }
    }
});

// Search on input with debounce
let searchTimeout;
searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        performSearch(this.value.trim());
    }, 100);
});

// Also trigger search on focus if there's already text
searchInput.addEventListener('focus', function() {
    if (this.value.trim().length >= 2) {
        performSearch(this.value.trim());
    }
});

searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        this.value = '';
        searchResults.innerHTML = '';
        searchResults._results = null;
        searchInput.setAttribute('aria-expanded', 'false');
        searchInput.removeAttribute('aria-activedescendant');
        this.blur();
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        const selected = searchResults.querySelector('.search-result-item[aria-selected="true"]');
        const firstResult = selected || searchResults.querySelector('.search-result-item');
        if (firstResult) {
            firstResult.click();
        }
    }
    // Arrow key navigation in search results
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = searchResults.querySelectorAll('.search-result-item');
        if (items.length === 0) return;

        const current = searchResults.querySelector('.search-result-item[aria-selected="true"]');
        let nextIndex = 0;

        if (current) {
            current.classList.remove('selected');
            current.setAttribute('aria-selected', 'false');
            const currentIndex = Array.from(items).indexOf(current);
            if (e.key === 'ArrowDown') {
                nextIndex = (currentIndex + 1) % items.length;
            } else {
                nextIndex = (currentIndex - 1 + items.length) % items.length;
            }
        }

        const nextItem = items[nextIndex];
        nextItem.classList.add('selected');
        nextItem.setAttribute('aria-selected', 'true');
        nextItem.scrollIntoView({ block: 'nearest' });
        searchInput.setAttribute('aria-activedescendant', nextItem.id);
    }
});

// ==================== DARK MODE ====================
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    darkModeBtn.textContent = isDark ? '☀️' : '🌙';
    darkModeBtn.classList.toggle('active', isDark);
    darkModeBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    safeSetItem(STORAGE_KEYS.darkMode, isDark ? 'true' : 'false');
}

function loadDarkMode() {
    const saved = safeGetItem(STORAGE_KEYS.darkMode);
    if (saved === 'true') {
        document.body.classList.add('dark-mode');
        darkModeBtn.textContent = '☀️';
        darkModeBtn.classList.add('active');
        darkModeBtn.setAttribute('aria-pressed', 'true');
    }
}

darkModeBtn.addEventListener('click', toggleDarkMode);

// ==================== FONT SIZE ====================
// Font sizes: small (14px) -> normal (16px) -> large (18px) -> xlarge (20px)
const FONT_SIZES = ['small', 'normal', 'large', 'xlarge'];
let currentFontSizeIndex = 1; // Start at normal (index 1)

function setFontSize(size) {
    document.body.classList.remove('font-small', 'font-large', 'font-xlarge');

    if (size === 'small') {
        document.body.classList.add('font-small');
        currentFontSizeIndex = 0;
    } else if (size === 'large') {
        document.body.classList.add('font-large');
        currentFontSizeIndex = 2;
    } else if (size === 'xlarge') {
        document.body.classList.add('font-xlarge');
        currentFontSizeIndex = 3;
    } else {
        currentFontSizeIndex = 1; // normal
    }

    safeSetItem(STORAGE_KEYS.fontSize, size || 'normal');
}

function loadFontSize() {
    const saved = safeGetItem(STORAGE_KEYS.fontSize);
    if (saved && saved !== 'normal') {
        setFontSize(saved);
    }
}

// A- decreases font size
fontSmallBtn.addEventListener('click', function() {
    if (currentFontSizeIndex > 0) {
        currentFontSizeIndex--;
        setFontSize(FONT_SIZES[currentFontSizeIndex]);
    }
});

// A+ increases font size
fontLargeBtn.addEventListener('click', function() {
    if (currentFontSizeIndex < FONT_SIZES.length - 1) {
        currentFontSizeIndex++;
        setFontSize(FONT_SIZES[currentFontSizeIndex]);
    }
});

// ==================== KEYBOARD SHORTCUTS ====================
function toggleKeyboardHint() {
    keyboardHint.classList.toggle('visible');
    const isVisible = keyboardHint.classList.contains('visible');
    helpBtn.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
}

helpBtn.addEventListener('click', toggleKeyboardHint);

function navigateSection(direction) {
    const currentIndex = sectionsArray.findIndex(s => s === currentActiveSection);
    let newIndex = currentIndex + direction;

    if (newIndex < 0) newIndex = 0;
    if (newIndex >= sectionsArray.length) newIndex = sectionsArray.length - 1;

    const targetSection = sectionsArray[newIndex];
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
    }
}

document.addEventListener('keydown', function(e) {
    // Ignore if typing in an input
    if (e.target.matches('input, textarea, [contenteditable]')) {
        return;
    }

    // Press '/' to focus search
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        searchInput.focus();
        return;
    }

    // Press 'D' for dark mode
    if (e.key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        toggleDarkMode();
        return;
    }

    // Press 'F' for focus mode (only lowercase f without modifiers)
    if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Don't trigger if command palette is open
        if (commandPalette && commandPalette.classList.contains('active')) return;
        e.preventDefault();
        toggleFocusMode();
        return;
    }

    // Press 'Escape' to disable spider cursor (if active)
    if (e.key === 'Escape' && isSpideyActive) {
        disableSpidey(true);
        return;
    }

    // Press '?' for help
    if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        toggleKeyboardHint();
        return;
    }

    // Arrow keys for navigation
    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateSection(-1);
        return;
    }
    if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateSection(1);
        return;
    }

    // Press Escape to close things
    if (e.key === 'Escape') {
        closeMobileMenu();
        keyboardHint.classList.remove('visible');
        searchInput.blur();
        searchResults.innerHTML = '';
        searchResults._results = null;
        searchInput.setAttribute('aria-expanded', 'false');
        searchInput.removeAttribute('aria-activedescendant');
    }
});

// ==================== READING PROGRESS (localStorage) ====================
function saveReadingProgress(sectionId) {
    if (sectionId) {
        safeSetItem(STORAGE_KEYS.lastSection, sectionId);
        safeSetItem(STORAGE_KEYS.lastScrollPos, window.scrollY.toString());
    }
}

function loadReadingProgress() {
    const lastSection = safeGetItem(STORAGE_KEYS.lastSection);
    const lastScrollPos = parseInt(safeGetItem(STORAGE_KEYS.lastScrollPos) || '0', 10);

    // Only show resume banner if user scrolled past intro and not at top
    if (lastSection && lastSection !== 'intro' && lastScrollPos > 500) {
        const sectionElement = document.getElementById(lastSection);
        if (sectionElement) {
            const link = sidebar.querySelector(`a[href="#${lastSection}"]`);
            const sectionName = link ? link.textContent : lastSection;
            resumeSection.textContent = sectionName;
            resumeBanner.style.display = 'flex';
        }
    }
}

// Resume banner click - go to saved section
const resumeAction = document.getElementById('resumeAction');
if (resumeAction) {
    resumeAction.addEventListener('click', function() {
        const lastSection = safeGetItem(STORAGE_KEYS.lastSection);
        if (lastSection) {
            const target = document.getElementById(lastSection);
            if (target) {
                target.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
            }
        }
        resumeBanner.style.display = 'none';
    });
}

if (resumeClose) {
    resumeClose.addEventListener('click', function() {
        resumeBanner.style.display = 'none';
    });
}

// ==================== SMOOTH SCROLL FOR SIDEBAR LINKS ====================
sidebarLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
            // Use replaceState to update URL without polluting browser history
            try {
                history.replaceState(null, null, targetId);
            } catch (e) {
                // Ignore if replaceState fails (e.g., in restricted contexts)
            }
        }
    });
});

// ==================== SCROLL EVENT LISTENER ====================
let ticking = false;
let lastSaveTime = 0;

window.addEventListener('scroll', function() {
    if (!ticking) {
        window.requestAnimationFrame(function() {
            updateProgressBar();
            toggleBackToTop();
            updateActiveSection();

            // Save scroll position periodically (every 2 seconds while scrolling)
            const now = Date.now();
            if (now - lastSaveTime > 2000) {
                if (currentActiveSection) {
                    saveReadingProgress(currentActiveSection.id);
                }
                lastSaveTime = now;
            }

            ticking = false;
        });
        ticking = true;
    }
});

// ==================== INITIALIZATION ====================
function init() {
    buildSearchIndex();
    loadDarkMode();
    loadFontSize();
    updateProgressBar();
    toggleBackToTop();
    updateActiveSection();

    // Show resume banner after a short delay
    setTimeout(loadReadingProgress, 500);

    // Initialize TrueFocus animation on title
    initTrueFocus();
}

// ==================== TRUE FOCUS ANIMATION ====================
function initTrueFocus() {
    const containers = document.querySelectorAll('[data-true-focus]');

    containers.forEach(container => {
        const text = container.textContent.trim();
        const words = text.split(' ');
        const manualMode = container.dataset.trueFocusManual === 'true';
        const duration = parseFloat(container.dataset.trueFocusDuration) || 0.5;
        const pause = parseFloat(container.dataset.trueFocusPause) || 1.5;

        // Clear original content
        container.textContent = '';
        container.classList.add('true-focus-container');

        // Create word spans
        const wordElements = words.map((word, index) => {
            const span = document.createElement('span');
            span.className = 'true-focus-word' + (manualMode ? ' manual-mode' : '');
            span.textContent = word;
            span.dataset.index = index;
            container.appendChild(span);
            return span;
        });

        // Create focus frame with corners
        const frame = document.createElement('div');
        frame.className = 'true-focus-frame';
        frame.innerHTML = `
            <span class="true-focus-corner top-left"></span>
            <span class="true-focus-corner top-right"></span>
            <span class="true-focus-corner bottom-left"></span>
            <span class="true-focus-corner bottom-right"></span>
        `;
        container.appendChild(frame);

        let currentIndex = 0;
        let intervalId = null;

        // Update frame position
        function updateFrame(index) {
            if (index < 0 || index >= wordElements.length) return;

            const word = wordElements[index];
            const containerRect = container.getBoundingClientRect();
            const wordRect = word.getBoundingClientRect();

            frame.style.left = (wordRect.left - containerRect.left) + 'px';
            frame.style.top = (wordRect.top - containerRect.top) + 'px';
            frame.style.width = wordRect.width + 'px';
            frame.style.height = wordRect.height + 'px';
            frame.classList.add('visible');
        }

        // Set active word
        function setActiveWord(index) {
            wordElements.forEach((el, i) => {
                el.classList.toggle('active', i === index);
            });
            updateFrame(index);
            currentIndex = index;
        }

        // Auto-advance animation
        function startAutoAnimation() {
            if (manualMode) return;

            // Initial activation
            setActiveWord(0);

            intervalId = setInterval(() => {
                const nextIndex = (currentIndex + 1) % wordElements.length;
                setActiveWord(nextIndex);
            }, (duration + pause) * 1000);
        }

        // Manual mode: hover to focus
        if (manualMode) {
            wordElements.forEach((word, index) => {
                word.addEventListener('mouseenter', () => setActiveWord(index));
            });
            // Start with first word active
            setActiveWord(0);
        } else {
            startAutoAnimation();
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            updateFrame(currentIndex);
        });

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (intervalId) clearInterval(intervalId);
        });
    });
}

// ==================== SPIDER ANIMATION (Canvas-based) ====================
// Adapted from codingtorque.com spider cursor animation
// Features: Single spider that follows cursor with animated legs
// Performance optimized: reduced point count, respects reduced-motion

const spiderCanvas = document.getElementById('spiderCanvas');
const spideyToggleBtn = document.getElementById('spideyToggleBtn');
let isSpideyActive = false;
let spiderAnimationId = null;

// Check if user prefers reduced motion (reactive to changes)
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let prefersReducedMotion = reducedMotionQuery.matches;

// Re-evaluate when reduced motion preference changes
reducedMotionQuery.addEventListener('change', function(e) {
    prefersReducedMotion = e.matches;
    updateSpideyAvailability();
});

// Dynamic availability check
function isSpideyAvailable() {
    return window.innerWidth >= 768 && !prefersReducedMotion;
}

// ==================== SPIDER ANIMATION ENGINE ====================
let spiderEngine = null;

function initSpiderEngine() {
    if (!spiderCanvas) return null;

    const ctx = spiderCanvas.getContext('2d');
    const { sin, cos, PI, hypot, min, max } = Math;

    // Helper functions
    function rnd(x = 1, dx = 0) {
        return Math.random() * x + dx;
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function noise(x, y, t = 101) {
        const w0 = sin(0.3 * x + 1.4 * t + 2.0 + 2.5 * sin(0.4 * y + -1.3 * t + 1.0));
        const w1 = sin(0.2 * y + 1.5 * t + 2.8 + 2.3 * sin(0.5 * x + -1.2 * t + 0.5));
        return w0 + w1;
    }

    function many(n, f) {
        return [...Array(n)].map((_, i) => f(i));
    }

    // Get spider color based on dark mode
    function getSpiderColor() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        return isDarkMode ? '#ffffff' : '#1e293b'; // White in dark mode, dark in light mode
    }

    function drawCircle(x, y, r) {
        ctx.beginPath();
        ctx.ellipse(x, y, r, r, 0, 0, PI * 2);
        ctx.fill();
    }

    function drawLine(x0, y0, x1, y1) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        many(50, (i) => { // Reduced from 100 for performance
            i = (i + 1) / 50;
            const x = lerp(x0, x1, i);
            const y = lerp(y0, y1, i);
            const k = noise(x / 5 + x0, y / 5 + y0) * 1.5;
            ctx.lineTo(x + k, y + k);
        });
        ctx.stroke();
    }

    // Create a single spider that follows cursor
    function createSpider() {
        // Reduced point count for performance (150 instead of 333)
        const pts = many(150, () => ({
            x: rnd(innerWidth),
            y: rnd(innerHeight),
            len: 0,
            r: 0
        }));

        // 8 legs around the body
        const pts2 = many(8, (i) => ({
            x: cos((i / 8) * PI * 2),
            y: sin((i / 8) * PI * 2)
        }));

        const seed = rnd(100);
        let tx = innerWidth / 2;
        let ty = innerHeight / 2;
        let x = innerWidth / 2;
        let y = innerHeight / 2;
        const kx = rnd(0.5, 0.5);
        const ky = rnd(0.5, 0.5);
        const walkRadius = { x: rnd(30, 20), y: rnd(30, 20) }; // Smaller walk radius
        let r = min(innerWidth, innerHeight) / rnd(80, 100); // Smaller spider body

        function paintPt(pt) {
            pts2.forEach((pt2) => {
                if (!pt.len) return;
                drawLine(
                    lerp(x + pt2.x * r, pt.x, pt.len * pt.len),
                    lerp(y + pt2.y * r, pt.y, pt.len * pt.len),
                    x + pt2.x * r,
                    y + pt2.y * r
                );
            });
            drawCircle(pt.x, pt.y, pt.r);
        }

        return {
            follow(newX, newY) {
                tx = newX;
                ty = newY;
            },

            tick(t) {
                const selfMoveX = cos(t * kx + seed) * walkRadius.x;
                const selfMoveY = sin(t * ky + seed) * walkRadius.y;
                const fx = tx + selfMoveX;
                const fy = ty + selfMoveY;

                // Smoother, faster following
                x += min(innerWidth / 80, (fx - x) / 8);
                y += min(innerWidth / 80, (fy - y) / 8);

                let legCount = 0;
                pts.forEach((pt) => {
                    const dx = pt.x - x;
                    const dy = pt.y - y;
                    const len = hypot(dx, dy);
                    let ptR = min(2.5, innerWidth / len / 6);
                    const increasing = len < innerWidth / 12 && (legCount++) < 8;
                    const dir = increasing ? 0.12 : -0.08;
                    if (increasing) ptR *= 1.3;
                    pt.r = ptR;
                    pt.len = max(0, min(pt.len + dir, 1));
                    paintPt(pt);
                });

                // Draw spider body (center)
                drawCircle(x, y, r * 0.8);
                // Draw spider head (smaller, offset)
                drawCircle(x, y - r * 0.6, r * 0.5);
            }
        };
    }

    // Single spider instance
    let spider = null;
    let mouseX = innerWidth / 2;
    let mouseY = innerHeight / 2;
    let w = 0, h = 0;
    let dpr = window.devicePixelRatio || 1;

    function animate(t) {
        if (!isSpideyActive) {
            spiderAnimationId = null;
            return;
        }

        // Resize canvas if needed (with HiDPI/Retina support)
        const newDpr = window.devicePixelRatio || 1;
        if (w !== innerWidth || h !== innerHeight || dpr !== newDpr) {
            dpr = newDpr;
            w = innerWidth;
            h = innerHeight;
            // Set canvas size scaled for device pixel ratio
            spiderCanvas.width = w * dpr;
            spiderCanvas.height = h * dpr;
            // Scale context to match
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        // Clear canvas (transparent)
        ctx.clearRect(0, 0, w, h);

        // Set spider color based on theme
        const color = getSpiderColor();
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        // Initialize spider if needed
        if (!spider) {
            spider = createSpider();
        }

        // Update spider target
        spider.follow(mouseX, mouseY);

        // Animate
        t /= 1000;
        spider.tick(t);

        // Draw cursor crosshair at actual mouse position for click accuracy
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // Small crosshair
        ctx.moveTo(mouseX - 8, mouseY);
        ctx.lineTo(mouseX - 3, mouseY);
        ctx.moveTo(mouseX + 3, mouseY);
        ctx.lineTo(mouseX + 8, mouseY);
        ctx.moveTo(mouseX, mouseY - 8);
        ctx.lineTo(mouseX, mouseY - 3);
        ctx.moveTo(mouseX, mouseY + 3);
        ctx.lineTo(mouseX, mouseY + 8);
        ctx.stroke();
        // Center dot
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 2, 0, Math.PI * 2);
        ctx.fill();

        spiderAnimationId = requestAnimationFrame(animate);
    }

    // Mouse tracking
    function handleMouseMove(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    }

    return {
        start() {
            spider = null; // Reset spider
            document.addEventListener('mousemove', handleMouseMove);
            if (!spiderAnimationId) {
                spiderAnimationId = requestAnimationFrame(animate);
            }
        },
        stop() {
            document.removeEventListener('mousemove', handleMouseMove);
            if (spiderAnimationId) {
                cancelAnimationFrame(spiderAnimationId);
                spiderAnimationId = null;
            }
            // Clear canvas
            if (spiderCanvas) {
                const ctx = spiderCanvas.getContext('2d');
                ctx.clearRect(0, 0, spiderCanvas.width, spiderCanvas.height);
            }
            spider = null;
        }
    };
}

// ==================== SPIDEY TOGGLE FUNCTIONS ====================
function enableSpidey(savePreference = true) {
    if (!isSpideyAvailable()) return;
    isSpideyActive = true;
    document.body.classList.add('spidey-mode');
    spideyToggleBtn.classList.add('active');
    spideyToggleBtn.setAttribute('aria-pressed', 'true');

    // Initialize and start spider animation
    if (!spiderEngine) {
        spiderEngine = initSpiderEngine();
    }
    if (spiderEngine) {
        spiderEngine.start();
    }

    // Only persist if user explicitly toggled (not on forced enable)
    if (savePreference) {
        safeSetItem(STORAGE_KEYS.spideyCursor, 'true');
    }
}

function disableSpidey(savePreference = true) {
    isSpideyActive = false;
    document.body.classList.remove('spidey-mode');
    spideyToggleBtn.classList.remove('active');
    spideyToggleBtn.setAttribute('aria-pressed', 'false');

    // Stop spider animation
    if (spiderEngine) {
        spiderEngine.stop();
    }

    // Only persist if user explicitly toggled (not on forced disable like resize)
    if (savePreference) {
        safeSetItem(STORAGE_KEYS.spideyCursor, 'false');
    }
}

function toggleSpidey() {
    if (isSpideyActive) {
        disableSpidey(true); // User action - save preference
    } else {
        enableSpidey(true); // User action - save preference
    }
}

// Update availability on resize/orientation change
function updateSpideyAvailability() {
    const available = isSpideyAvailable();
    spideyToggleBtn.style.display = available ? '' : 'none';

    if (!available && isSpideyActive) {
        // Disable WITHOUT saving - don't overwrite user's preference
        disableSpidey(false);
    } else if (available && !isSpideyActive) {
        // Re-check saved preference when becoming available again
        const saved = safeGetItem(STORAGE_KEYS.spideyCursor);
        if (saved === 'true') {
            enableSpidey(false); // Restore without re-saving
        }
    }
}

// Load saved preference - DEFAULT TO OFF for first-time users
function loadSpideyPreference() {
    if (!isSpideyAvailable()) {
        spideyToggleBtn.style.display = 'none';
        return;
    }
    const saved = safeGetItem(STORAGE_KEYS.spideyCursor);
    // Only enable if user previously opted in (saved === 'true')
    // Default is OFF (null or any other value)
    if (saved === 'true') {
        enableSpidey(false); // Don't re-save on load
    }
    // Otherwise leave disabled (default state)
}

// Handle resize/orientation changes
window.addEventListener('resize', updateSpideyAvailability);

spideyToggleBtn.addEventListener('click', toggleSpidey);

// Initialize spidey preference
loadSpideyPreference();

// ==================== COMMAND PALETTE ====================
let commandPaletteSelectedIndex = 0;
let commandPaletteItems = [];
let recentCommands = [];

// Load recent commands safely
try {
    const saved = safeGetItem('odooTraining_recentCommands');
    if (saved) {
        recentCommands = JSON.parse(saved);
        if (!Array.isArray(recentCommands)) recentCommands = [];
    }
} catch (e) {
    recentCommands = [];
}

// Track command usage
function trackCommandUsage(commandId) {
    recentCommands = recentCommands.filter(id => id !== commandId);
    recentCommands.unshift(commandId);
    recentCommands = recentCommands.slice(0, 5); // Keep last 5
    safeSetItem('odooTraining_recentCommands', JSON.stringify(recentCommands));
}

// Fuzzy match for command palette (reuse scoring logic)
function commandFuzzyMatch(text, query) {
    if (!query) return 1000;
    text = text.toLowerCase();
    query = query.toLowerCase();

    if (text === query) return 1000;
    if (text.startsWith(query)) return 800;
    if (text.includes(query)) return 600;

    // Word matching
    const queryWords = query.split(/\s+/).filter(w => w.length > 0);
    let matchedWords = 0;
    for (const qWord of queryWords) {
        if (text.includes(qWord)) matchedWords++;
    }
    if (matchedWords === queryWords.length) return 400;
    if (matchedWords > 0) return 200 * (matchedWords / queryWords.length);

    // Subsequence matching
    let qi = 0;
    for (let ti = 0; ti < text.length && qi < query.length; ti++) {
        if (text[ti] === query[qi]) qi++;
    }
    if (qi === query.length) return 100;

    return 0;
}

// Define available commands - dynamic getters for state
function getCommands() {
    const isDark = document.body.classList.contains('dark-mode');
    const isFocusMode = document.body.classList.contains('focus-mode');

    return [
        // Actions (most commonly used)
        { id: 'dark-mode', type: 'action', icon: isDark ? '☀️' : '🌙', title: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode', action: toggleDarkMode, shortcut: 'D', keywords: ['dark', 'light', 'theme', 'mode', 'night'] },
        { id: 'focus-mode', type: 'action', icon: isFocusMode ? '📄' : '📖', title: isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode', action: () => { closeCommandPalette(); setTimeout(() => { if (focusModeBtn) focusModeBtn.click(); }, 100); }, shortcut: 'F', keywords: ['focus', 'reading', 'distraction', 'zen', 'clean'] },
        { id: 'search', type: 'action', icon: '🔍', title: 'Focus Search', action: () => { closeCommandPalette(); searchInput.focus(); }, shortcut: '/', keywords: ['search', 'find', 'lookup'] },
        { id: 'top', type: 'action', icon: '⬆️', title: 'Back to Top', action: () => { closeCommandPalette(); window.scrollTo({ top: 0, behavior: getScrollBehavior() }); }, keywords: ['top', 'scroll', 'beginning', 'start'] },
        { id: 'font-up', type: 'action', icon: '🔠', title: 'Increase Font Size', action: () => { if (currentFontSizeIndex < FONT_SIZES.length - 1) { currentFontSizeIndex++; setFontSize(FONT_SIZES[currentFontSizeIndex]); } }, keywords: ['font', 'larger', 'bigger', 'text', 'zoom'] },
        { id: 'font-down', type: 'action', icon: '🔡', title: 'Decrease Font Size', action: () => { if (currentFontSizeIndex > 0) { currentFontSizeIndex--; setFontSize(FONT_SIZES[currentFontSizeIndex]); } }, keywords: ['font', 'smaller', 'text', 'zoom'] },
        { id: 'print', type: 'action', icon: '🖨️', title: 'Print Page', action: () => { closeCommandPalette(); window.print(); }, keywords: ['print', 'pdf', 'export', 'save'] },
        { id: 'keyboard', type: 'action', icon: '⌨️', title: 'Show Keyboard Shortcuts', action: () => { closeCommandPalette(); toggleKeyboardHint(); }, shortcut: '?', keywords: ['keyboard', 'shortcuts', 'help', 'keys'] },
        { id: 'toc', type: 'action', icon: '📋', title: 'Toggle Table of Contents', action: () => { closeCommandPalette(); toggleMobileMenu(); }, shortcut: 'T', keywords: ['sidebar', 'menu', 'navigation', 'toc', 'contents'] },

        // Navigation
        { id: 'nav-what-is-odoo', type: 'nav', icon: '📖', title: 'Go to: What is Odoo?', action: () => navigateTo('what-is-odoo'), keywords: ['intro', 'start', 'beginning', 'overview'] },
        { id: 'nav-models', type: 'nav', icon: '📖', title: 'Go to: Models', action: () => navigateTo('models'), keywords: ['model', 'database', 'table', 'record'] },
        { id: 'nav-fields', type: 'nav', icon: '📖', title: 'Go to: Field Types', action: () => navigateTo('field-types'), keywords: ['fields', 'char', 'integer', 'boolean', 'selection'] },
        { id: 'nav-relations', type: 'nav', icon: '📖', title: 'Go to: Relationships', action: () => navigateTo('relationships'), keywords: ['many2one', 'one2many', 'many2many', 'relation', 'link'] },
        { id: 'nav-computed', type: 'nav', icon: '📖', title: 'Go to: Computed Fields', action: () => navigateTo('computed'), keywords: ['compute', 'calculate', 'depends', 'dynamic'] },
        { id: 'nav-views', type: 'nav', icon: '📖', title: 'Go to: Views', action: () => navigateTo('views'), keywords: ['form', 'list', 'kanban', 'tree', 'calendar'] },
        { id: 'nav-domains', type: 'nav', icon: '📖', title: 'Go to: Domains', action: () => navigateTo('domains'), keywords: ['filter', 'domain', 'search', 'condition'] },
        { id: 'nav-access', type: 'nav', icon: '📖', title: 'Go to: Access Rights', action: () => navigateTo('access'), keywords: ['security', 'permissions', 'groups', 'acl'] },
        { id: 'nav-actions', type: 'nav', icon: '📖', title: 'Go to: Actions', action: () => navigateTo('actions'), keywords: ['automation', 'server action', 'scheduled', 'cron'] },
        { id: 'nav-studio', type: 'nav', icon: '📖', title: 'Go to: Odoo Studio', action: () => navigateTo('studio'), keywords: ['studio', 'customize', 'no-code', 'drag'] },
        { id: 'nav-chatter', type: 'nav', icon: '📖', title: 'Go to: Chatter', action: () => navigateTo('chatter'), keywords: ['messages', 'followers', 'activities', 'discuss'] },
        { id: 'nav-email', type: 'nav', icon: '📖', title: 'Go to: Email', action: () => navigateTo('emails'), keywords: ['email', 'smtp', 'mail', 'template'] },
        { id: 'nav-context', type: 'nav', icon: '📖', title: 'Go to: Context', action: () => navigateTo('context'), keywords: ['context', 'default', 'parameter', 'active_id'] },
    ];
}

function navigateTo(sectionId) {
    closeCommandPalette();
    const target = document.getElementById(sectionId);
    if (target) {
        target.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
    }
}

function openCommandPalette() {
    commandPalette.classList.add('active');
    commandPaletteOverlay.classList.add('active');
    commandPalette.setAttribute('aria-hidden', 'false');
    commandPaletteOverlay.setAttribute('aria-hidden', 'false');
    commandPaletteInput.value = '';
    renderCommandPaletteResults('');
    document.body.style.overflow = 'hidden';

    // Focus after the element becomes visible (next frame ensures CSS visibility is applied)
    requestAnimationFrame(() => {
        commandPaletteInput.focus();
    });
}

function closeCommandPalette() {
    commandPalette.classList.remove('active');
    commandPaletteOverlay.classList.remove('active');
    commandPalette.setAttribute('aria-hidden', 'true');
    commandPaletteOverlay.setAttribute('aria-hidden', 'true');
    commandPaletteInput.value = '';
    document.body.style.overflow = '';
}

function renderCommandPaletteResults(query) {
    const lowerQuery = query.toLowerCase().trim();
    const commands = getCommands();

    // Score and filter commands with fuzzy matching
    let scoredCommands = commands.map(cmd => {
        const titleScore = commandFuzzyMatch(cmd.title, lowerQuery);
        const keywordScore = cmd.keywords
            ? Math.max(...cmd.keywords.map(k => commandFuzzyMatch(k, lowerQuery)))
            : 0;
        return { ...cmd, score: Math.max(titleScore, keywordScore * 0.8) };
    }).filter(cmd => cmd.score > 0);

    // Sort by score
    scoredCommands.sort((a, b) => b.score - a.score);

    // Also search through sections from the search index with fuzzy matching
    let sectionResults = [];
    if (lowerQuery && searchIndex.length > 0) {
        sectionResults = searchIndex
            .map(item => ({
                ...item,
                score: commandFuzzyMatch(item.title, lowerQuery)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(item => ({
                type: 'search',
                icon: item.type === 'section' ? '📑' : '📝',
                title: item.title,
                description: item.section !== item.title ? `in ${item.section}` : '',
                action: () => {
                    closeCommandPalette();
                    item.element.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
                }
            }));
    }

    // Get recent commands if no query
    let recentItems = [];
    if (!lowerQuery && recentCommands.length > 0) {
        recentItems = recentCommands
            .map(id => commands.find(cmd => cmd.id === id))
            .filter(Boolean)
            .slice(0, 3);
    }

    // Group results
    const actionCommands = scoredCommands.filter(c => c.type === 'action').slice(0, 8);
    const navCommands = scoredCommands.filter(c => c.type === 'nav').slice(0, lowerQuery ? 8 : 4);

    commandPaletteItems = [];
    let html = '';

    // Recent commands (only when no query)
    if (recentItems.length > 0 && !lowerQuery) {
        html += `<div class="command-palette-group">
            <div class="command-palette-group-title">Recent</div>
            ${recentItems.map((cmd, i) => {
                commandPaletteItems.push(cmd);
                return renderCommandItem(cmd, commandPaletteItems.length - 1, lowerQuery);
            }).join('')}
        </div>`;
    }

    // Actions group
    if (actionCommands.length > 0) {
        html += `<div class="command-palette-group">
            <div class="command-palette-group-title">Actions</div>
            ${actionCommands.map((cmd) => {
                // Skip if already in recent
                if (recentItems.some(r => r.id === cmd.id)) return '';
                commandPaletteItems.push(cmd);
                return renderCommandItem(cmd, commandPaletteItems.length - 1, lowerQuery);
            }).join('')}
        </div>`;
    }

    // Navigation group
    if (navCommands.length > 0) {
        html += `<div class="command-palette-group">
            <div class="command-palette-group-title">Navigation</div>
            ${navCommands.map((cmd) => {
                if (recentItems.some(r => r.id === cmd.id)) return '';
                commandPaletteItems.push(cmd);
                return renderCommandItem(cmd, commandPaletteItems.length - 1, lowerQuery);
            }).join('')}
        </div>`;
    }

    // Search results group
    if (sectionResults.length > 0) {
        html += `<div class="command-palette-group">
            <div class="command-palette-group-title">Content Search</div>
            ${sectionResults.map((cmd) => {
                commandPaletteItems.push(cmd);
                return renderCommandItem(cmd, commandPaletteItems.length - 1, lowerQuery);
            }).join('')}
        </div>`;
    }

    commandPaletteSelectedIndex = 0;

    if (commandPaletteItems.length === 0) {
        commandPaletteResults.innerHTML = `
            <div class="command-palette-empty">
                <div class="command-palette-empty-icon">🔍</div>
                <div>No results found for "${escapeHtml(query)}"</div>
                <div class="command-palette-empty-hint">Try a different search term</div>
            </div>
        `;
        return;
    }

    commandPaletteResults.innerHTML = html;
    updateSelectedItem();
}

function renderCommandItem(cmd, index, query) {
    // Highlight matching text
    let titleHtml = escapeHtml(cmd.title);
    if (query) {
        const lowerTitle = cmd.title.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const idx = lowerTitle.indexOf(lowerQuery);
        if (idx !== -1) {
            const before = escapeHtml(cmd.title.substring(0, idx));
            const match = escapeHtml(cmd.title.substring(idx, idx + query.length));
            const after = escapeHtml(cmd.title.substring(idx + query.length));
            titleHtml = before + '<mark>' + match + '</mark>' + after;
        } else {
            // Highlight individual words
            const words = query.split(/\s+/).filter(w => w.length >= 2);
            for (const word of words) {
                const regex = new RegExp('(' + escapeRegex(word) + ')', 'gi');
                titleHtml = titleHtml.replace(regex, '<mark>$1</mark>');
            }
        }
    }

    return `
        <div class="command-palette-item" data-index="${index}" role="option">
            <div class="command-palette-item-icon">${cmd.icon}</div>
            <div class="command-palette-item-content">
                <div class="command-palette-item-title">${titleHtml}</div>
                ${cmd.description ? `<div class="command-palette-item-description">${escapeHtml(cmd.description)}</div>` : ''}
            </div>
            ${cmd.shortcut ? `<div class="command-palette-item-shortcut"><kbd>${cmd.shortcut}</kbd></div>` : ''}
        </div>
    `;
}

function updateSelectedItem() {
    const items = commandPaletteResults.querySelectorAll('.command-palette-item');
    items.forEach((item, i) => {
        item.classList.toggle('selected', i === commandPaletteSelectedIndex);
        item.setAttribute('aria-selected', i === commandPaletteSelectedIndex ? 'true' : 'false');
    });

    // Scroll selected item into view
    const selectedItem = items[commandPaletteSelectedIndex];
    if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
    }
}

function executeSelectedCommand() {
    const cmd = commandPaletteItems[commandPaletteSelectedIndex];
    if (cmd) {
        // Track usage for recent commands
        if (cmd.id) {
            trackCommandUsage(cmd.id);
        }
        cmd.action();
    }
}

// Event listeners for command palette
commandPaletteOverlay.addEventListener('click', closeCommandPalette);

// Close button for mobile
const commandPaletteClose = document.getElementById('commandPaletteClose');
if (commandPaletteClose) {
    commandPaletteClose.addEventListener('click', closeCommandPalette);
}

commandPaletteInput.addEventListener('input', function() {
    renderCommandPaletteResults(this.value);
});

commandPaletteInput.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCommandPalette();
    } else if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        commandPaletteSelectedIndex = Math.min(commandPaletteSelectedIndex + 1, commandPaletteItems.length - 1);
        updateSelectedItem();
    } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        commandPaletteSelectedIndex = Math.max(commandPaletteSelectedIndex - 1, 0);
        updateSelectedItem();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        executeSelectedCommand();
    }
});

commandPaletteResults.addEventListener('click', function(e) {
    const item = e.target.closest('.command-palette-item');
    if (item) {
        const index = parseInt(item.dataset.index, 10);
        if (!isNaN(index) && commandPaletteItems[index]) {
            commandPaletteItems[index].action();
        }
    }
});

// Global keyboard shortcut for command palette (Cmd/Ctrl + K)
document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (commandPalette.classList.contains('active')) {
            closeCommandPalette();
        } else {
            openCommandPalette();
        }
    }
});

// ==================== FOCUS/READING MODE ====================
let focusModeActive = false;

function toggleFocusMode() {
    focusModeActive = !focusModeActive;
    document.body.classList.toggle('focus-mode', focusModeActive);

    // Update button state
    if (focusModeBtn) {
        focusModeBtn.setAttribute('aria-pressed', focusModeActive ? 'true' : 'false');
        focusModeBtn.title = focusModeActive ? 'Exit focus mode (F)' : 'Toggle focus mode (F)';
    }

    // Save preference
    safeSetItem(STORAGE_KEYS.focusMode, focusModeActive ? 'true' : 'false');

    // Close mobile sidebar if open when entering focus mode
    if (focusModeActive && sidebar.classList.contains('open')) {
        closeMobileMenu();
    }
}

// Focus mode button click handler
if (focusModeBtn) {
    focusModeBtn.addEventListener('click', toggleFocusMode);
}

// Restore focus mode preference on load
function initFocusMode() {
    const savedFocusMode = safeGetItem(STORAGE_KEYS.focusMode);
    if (savedFocusMode === 'true') {
        focusModeActive = true;
        document.body.classList.add('focus-mode');
        if (focusModeBtn) {
            focusModeBtn.setAttribute('aria-pressed', 'true');
            focusModeBtn.title = 'Exit focus mode (F)';
        }
    }
}

initFocusMode();

// ==================== INTERACTIVE QUIZ WITH PROGRESS ====================
const QUIZ_STORAGE_KEY = 'odoo_training_quiz_progress';

// Quiz progress state
let quizProgress = {
    answered: {},  // quizId -> { selected: 'a', correct: true/false }
    correctCount: 0,
    totalAnswered: 0
};

function loadQuizProgress() {
    const saved = safeGetItem(QUIZ_STORAGE_KEY);
    if (saved) {
        try {
            quizProgress = JSON.parse(saved);
        } catch (e) {
            quizProgress = { answered: {}, correctCount: 0, totalAnswered: 0 };
        }
    }
}

function saveQuizProgress() {
    safeSetItem(QUIZ_STORAGE_KEY, JSON.stringify(quizProgress));
}

function resetQuizProgress() {
    quizProgress = { answered: {}, correctCount: 0, totalAnswered: 0 };
    saveQuizProgress();
    // Reload page to reset quiz UI
    location.reload();
}

function updateQuizProgressUI(totalQuizzes) {
    const progressContainer = document.getElementById('quizProgress');
    if (!progressContainer) return;

    const { correctCount, totalAnswered } = quizProgress;
    const percentage = totalQuizzes > 0 ? Math.round((totalAnswered / totalQuizzes) * 100) : 0;
    const scorePercentage = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    // Determine badge
    let badge = '';
    let badgeClass = '';
    if (totalAnswered === totalQuizzes && totalQuizzes > 0) {
        if (scorePercentage === 100) {
            badge = 'Perfect Score!';
            badgeClass = 'quiz-badge-gold';
        } else if (scorePercentage >= 75) {
            badge = 'Well Done!';
            badgeClass = 'quiz-badge-silver';
        } else {
            badge = 'Completed';
            badgeClass = 'quiz-badge-bronze';
        }
    }

    progressContainer.innerHTML = `
        <div class="quiz-progress-header">
            <span class="quiz-progress-title">Quiz Progress</span>
            ${totalAnswered > 0 ? `<button class="quiz-reset-btn" id="quizResetBtn" title="Reset all quizzes">Reset</button>` : ''}
        </div>
        <div class="quiz-progress-bar-container">
            <div class="quiz-progress-bar" style="width: ${percentage}%"></div>
        </div>
        <div class="quiz-progress-stats">
            <span class="quiz-progress-count">${totalAnswered} / ${totalQuizzes} completed</span>
            <span class="quiz-progress-score">${correctCount} correct (${totalAnswered > 0 ? scorePercentage : 0}%)</span>
        </div>
        ${badge ? `<div class="quiz-badge ${badgeClass}">${badge}</div>` : ''}
    `;

    // Add reset button handler
    const resetBtn = document.getElementById('quizResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm('Reset all quiz progress? This cannot be undone.')) {
                resetQuizProgress();
            }
        });
    }
}

function initQuiz() {
    loadQuizProgress();

    const quizCards = document.querySelectorAll('.quiz-card');
    const totalQuizzes = quizCards.length;

    // Create progress UI if quiz container exists
    const quizContainer = document.querySelector('.quiz-container');
    if (quizContainer && !document.getElementById('quizProgress')) {
        const progressDiv = document.createElement('div');
        progressDiv.id = 'quizProgress';
        progressDiv.className = 'quiz-progress';
        quizContainer.insertBefore(progressDiv, quizContainer.firstChild);
    }

    quizCards.forEach((card, index) => {
        const quizId = card.dataset.quizId || `quiz-${index}`;
        card.dataset.quizId = quizId;  // Ensure ID is set

        const correctAnswer = card.dataset.correct;
        const options = card.querySelectorAll('.quiz-option');
        const answerSection = card.querySelector('.quiz-answer');

        // Check if already answered (from saved progress)
        const savedAnswer = quizProgress.answered[quizId];
        let answered = !!savedAnswer;

        // Restore UI state for previously answered quizzes
        if (savedAnswer) {
            options.forEach(opt => {
                opt.classList.add('disabled');
                opt.setAttribute('tabindex', '-1');
                opt.setAttribute('aria-disabled', 'true');
                if (opt.dataset.option === correctAnswer) {
                    opt.classList.add('correct');
                    opt.setAttribute('aria-pressed', 'true');
                } else if (opt.dataset.option === savedAnswer.selected && !savedAnswer.correct) {
                    opt.classList.add('incorrect');
                    opt.setAttribute('aria-pressed', 'true');
                }
            });
            if (answerSection) {
                answerSection.classList.add('show');
            }
            card.classList.add(savedAnswer.correct ? 'answered-correct' : 'answered-incorrect');
        }

        // Add accessibility attributes
        options.forEach((option) => {
            if (!answered) {
                option.setAttribute('role', 'button');
                option.setAttribute('tabindex', '0');
                option.setAttribute('aria-pressed', 'false');
            }
        });

        function selectOption(option) {
            if (answered) return;
            answered = true;

            const selectedOption = option.dataset.option;
            const isCorrect = selectedOption === correctAnswer;

            // Save progress
            quizProgress.answered[quizId] = { selected: selectedOption, correct: isCorrect };
            quizProgress.totalAnswered++;
            if (isCorrect) quizProgress.correctCount++;
            saveQuizProgress();

            // Mark all options
            options.forEach(opt => {
                opt.classList.add('disabled');
                opt.setAttribute('tabindex', '-1');
                opt.setAttribute('aria-disabled', 'true');
                if (opt.dataset.option === correctAnswer) {
                    opt.classList.add('correct');
                    opt.setAttribute('aria-pressed', 'true');
                } else if (opt === option && !isCorrect) {
                    opt.classList.add('incorrect');
                    opt.setAttribute('aria-pressed', 'true');
                }
            });

            // Show the answer explanation
            if (answerSection) {
                answerSection.classList.add('show');
            }

            // Add visual feedback
            if (isCorrect) {
                card.classList.add('answered-correct');
            } else {
                card.classList.add('answered-incorrect');
            }

            // Update progress UI
            updateQuizProgressUI(totalQuizzes);
        }

        options.forEach(option => {
            // Click handler
            option.addEventListener('click', function() {
                selectOption(this);
            });

            // Keyboard handler (Enter and Space)
            option.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectOption(this);
                }
            });
        });
    });

    // Initial progress update
    updateQuizProgressUI(totalQuizzes);
}

// Initialize quiz after DOM is ready
initQuiz();

// ==================== SECTION NAVIGATION (Prev/Next) ====================
function initSectionNavigation() {
    const container = document.querySelector('.container');
    if (!container) return;

    const allH2s = Array.from(container.querySelectorAll('h2[id]'));
    if (allH2s.length < 2) return;

    allH2s.forEach((h2, index) => {
        const prevSection = index > 0 ? allH2s[index - 1] : null;
        const nextSection = index < allH2s.length - 1 ? allH2s[index + 1] : null;

        // Find the end of this section (before next h2 or end of container)
        const nextH2 = allH2s[index + 1];
        let insertPoint = null;

        // Find the last element before the next section
        if (nextH2) {
            insertPoint = nextH2.previousElementSibling;
            // Make sure we're not inserting before an h2
            while (insertPoint && insertPoint.tagName === 'H2') {
                insertPoint = insertPoint.previousElementSibling;
            }
        } else {
            // Last section - find footer or end
            const footer = container.querySelector('.site-footer');
            insertPoint = footer ? footer.previousElementSibling : container.lastElementChild;
        }

        if (!insertPoint || insertPoint.classList.contains('section-nav')) return;

        // Create navigation element
        const nav = document.createElement('nav');
        nav.className = 'section-nav';
        nav.setAttribute('aria-label', 'Section navigation');

        const prevTitle = prevSection ? prevSection.textContent.trim() : '';
        const nextTitle = nextSection ? nextSection.textContent.trim() : '';

        // Truncate long titles
        const truncate = (str, max = 40) => str.length > max ? str.substring(0, max) + '...' : str;

        nav.innerHTML = `
            ${prevSection ? `
                <a href="#${prevSection.id}" class="section-nav-btn section-nav-prev" title="${escapeHtml(prevTitle)}">
                    <span class="section-nav-arrow">←</span>
                    <span class="section-nav-content">
                        <span class="section-nav-label">Previous</span>
                        <span class="section-nav-title">${escapeHtml(truncate(prevTitle))}</span>
                    </span>
                </a>
            ` : '<span class="section-nav-spacer"></span>'}
            ${nextSection ? `
                <a href="#${nextSection.id}" class="section-nav-btn section-nav-next" title="${escapeHtml(nextTitle)}">
                    <span class="section-nav-content">
                        <span class="section-nav-label">Next</span>
                        <span class="section-nav-title">${escapeHtml(truncate(nextTitle))}</span>
                    </span>
                    <span class="section-nav-arrow">→</span>
                </a>
            ` : '<span class="section-nav-spacer"></span>'}
        `;

        // Add click handlers for smooth scroll
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const target = document.getElementById(targetId);
                if (target) {
                    target.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
                    // Update URL without adding history entry
                    try {
                        history.replaceState(null, '', '#' + targetId);
                    } catch (e) {}
                }
            });
        });

        // Insert after the last element of this section
        if (insertPoint && insertPoint.parentNode) {
            insertPoint.parentNode.insertBefore(nav, insertPoint.nextSibling);
        }
    });
}

initSectionNavigation();

// ==================== GLOSSARY POPOVERS ====================
const GLOSSARY = {
    'ORM': 'Object-Relational Mapping - Odoo\'s layer that translates Python objects to database records, letting you work with data as objects instead of SQL.',
    'API': 'Application Programming Interface - A set of rules that allows different software applications to communicate with each other.',
    'Many2one': 'A field that creates a link to a single record in another model (like a foreign key). Example: Each sale order links to one customer.',
    'One2many': 'A virtual field that shows all records in another model that point back to this record. Example: A customer\'s list of sale orders.',
    'Many2many': 'A field that creates links between multiple records in two models. Example: Products can belong to multiple categories, and categories can have multiple products.',
    'Computed field': 'A field whose value is calculated automatically by a Python method using the @api.depends decorator.',
    'Related field': 'A field that automatically fetches a value from a linked record through a relationship chain.',
    'Domain': 'A filter condition written as a list of tuples that specifies which records to include/exclude. Example: [(\'state\', \'=\', \'sale\')]',
    'Context': 'A Python dictionary passed through method calls containing metadata like user language, company, and default values.',
    'XML-RPC': 'A protocol for calling Odoo methods from external applications over HTTP using XML.',
    'Recordset': 'A collection of records from a model, similar to a list but with special ORM methods.',
    'Decorator': 'Python syntax (@something) that modifies function behavior. Common in Odoo: @api.depends, @api.onchange, @api.model.',
    'Wizard': 'A TransientModel that provides a popup form for user input, often for batch operations.',
    'View': 'An XML definition that describes how records should be displayed (form, list, kanban, etc.).',
    'Action': 'A configuration that defines what happens when users click menu items or buttons.',
    'QWeb': 'Odoo\'s templating engine for generating HTML, PDF reports, and website pages.',
    'Module': 'A self-contained package of Odoo functionality including models, views, data, and business logic.',
    'Manifest': 'The __manifest__.py file that defines a module\'s metadata, dependencies, and data files.',
    'Cron': 'Scheduled actions that run automatically at specified intervals (ir.cron).',
    'Chatter': 'The messaging/activity tracking system found on many Odoo records.',
    'CRUD': 'Create, Read, Update, Delete - the four basic operations for database records.',
    'ACL': 'Access Control List - defines which user groups can perform CRUD operations on models.',
    'Record Rules': 'Fine-grained security rules that filter which specific records users can access.',
    'Superuser': 'A mode that bypasses all security checks, used carefully for system operations.',
    'Environment': 'The self.env object providing access to models, user, context, and database cursor.',
    'Odoo.sh': 'Odoo\'s official cloud hosting platform with Git integration and staging environments.',
    'Studio': 'Odoo\'s visual customization tool for modifying apps without code (Enterprise feature).'
};

function initGlossary() {
    // Create popover element with ID for aria-describedby
    const popover = document.createElement('div');
    popover.className = 'glossary-popover';
    popover.id = 'glossary-popover';
    popover.setAttribute('role', 'tooltip');
    popover.setAttribute('aria-hidden', 'true');
    document.body.appendChild(popover);

    let hideTimeout = null;

    // Find and wrap glossary terms in the content
    const container = document.querySelector('.container');
    if (!container) return;

    // Escape special regex characters in glossary keys
    const escapedTerms = Object.keys(GLOSSARY).map(term =>
        term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );

    // Process text nodes to find and wrap glossary terms
    const termRegex = new RegExp('\\b(' + escapedTerms.join('|') + ')\\b', 'g');

    // Only process leaf text containers - avoid processing parent containers that contain child processable elements
    const processableElements = container.querySelectorAll('p, li, td');
    const processedParents = new Set();

    processableElements.forEach(element => {
        // Skip if already processed or is inside a code block
        if (element.dataset.glossaryProcessed) return;
        if (element.closest('pre, code, .quiz-option')) return;

        // Skip if any ancestor was already processed (prevents double-processing)
        let parent = element.parentElement;
        while (parent && parent !== container) {
            if (processedParents.has(parent)) return;
            parent = parent.parentElement;
        }

        element.dataset.glossaryProcessed = 'true';
        processedParents.add(element);

        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];

        while (walker.nextNode()) {
            // Skip text inside code elements or already processed glossary terms
            if (!walker.currentNode.parentElement.closest('code, pre, a, .glossary-term')) {
                textNodes.push(walker.currentNode);
            }
        }

        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            if (!termRegex.test(text)) return;

            termRegex.lastIndex = 0; // Reset regex

            const fragment = document.createDocumentFragment();
            let lastIndex = 0;
            let match;

            while ((match = termRegex.exec(text)) !== null) {
                // Add text before match
                if (match.index > lastIndex) {
                    fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                }

                // Create glossary term span
                const span = document.createElement('span');
                span.className = 'glossary-term';
                span.textContent = match[0];
                span.dataset.term = match[0];
                span.setAttribute('tabindex', '0');
                span.setAttribute('aria-describedby', 'glossary-popover');
                fragment.appendChild(span);

                lastIndex = match.index + match[0].length;
            }

            // Add remaining text
            if (lastIndex < text.length) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
            }

            textNode.parentNode.replaceChild(fragment, textNode);
        });
    });

    // Show/hide popover handlers
    function showPopover(term, target) {
        clearTimeout(hideTimeout);
        const definition = GLOSSARY[term];
        if (!definition) return;

        popover.innerHTML = `
            <div class="glossary-popover-term">${escapeHtml(term)}</div>
            <div class="glossary-popover-definition">${escapeHtml(definition)}</div>
        `;
        popover.setAttribute('aria-hidden', 'false');
        popover.classList.add('visible');

        // Position the popover
        const rect = target.getBoundingClientRect();
        const popoverRect = popover.getBoundingClientRect();

        let top = rect.top - popoverRect.height - 8;
        let left = rect.left + (rect.width / 2) - (popoverRect.width / 2);

        // Keep within viewport
        if (top < 10) {
            top = rect.bottom + 8;
            popover.classList.add('below');
        } else {
            popover.classList.remove('below');
        }
        if (left < 10) left = 10;
        if (left + popoverRect.width > window.innerWidth - 10) {
            left = window.innerWidth - popoverRect.width - 10;
        }

        popover.style.top = (top + window.scrollY) + 'px';
        popover.style.left = left + 'px';
    }

    function hidePopover() {
        hideTimeout = setTimeout(() => {
            popover.classList.remove('visible');
            popover.setAttribute('aria-hidden', 'true');
        }, 150);
    }

    // Event delegation for glossary terms
    document.addEventListener('mouseenter', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('glossary-term')) {
            showPopover(e.target.dataset.term, e.target);
        }
    }, true);

    document.addEventListener('mouseleave', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('glossary-term')) {
            hidePopover();
        }
    }, true);

    document.addEventListener('focusin', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('glossary-term')) {
            showPopover(e.target.dataset.term, e.target);
        }
    });

    document.addEventListener('focusout', function(e) {
        if (e.target && e.target.classList && e.target.classList.contains('glossary-term')) {
            hidePopover();
        }
    });

    // Keep popover open when hovering over it
    popover.addEventListener('mouseenter', function() {
        clearTimeout(hideTimeout);
    });

    popover.addEventListener('mouseleave', function() {
        hidePopover();
    });
}

// Initialize glossary after a short delay to not block initial render
setTimeout(initGlossary, 500);

// ==================== PERSONALIZATION SETTINGS ====================
const PERSONALIZATION_KEY = 'odoo_training_personalization';

const DEFAULT_SETTINGS = {
    // Appearance
    accentColor: 'purple',
    codeTheme: 'dark',
    highContrast: false,
    eyeComfort: false,
    // Typography
    fontFamily: 'system',
    lineHeight: 'normal',
    linkStyle: 'hover',
    // Layout
    density: 'default',
    sidebarWidth: 'default',
    contentWidth: 'wide',
    // Motion
    animations: 'normal'
};

const ACCENT_COLORS = {
    purple: { primary: '#714B67', primaryDark: '#5a3d53', primaryLight: '#9f7aea' },
    blue: { primary: '#3b82f6', primaryDark: '#2563eb', primaryLight: '#60a5fa' },
    green: { primary: '#10b981', primaryDark: '#059669', primaryLight: '#34d399' },
    orange: { primary: '#f97316', primaryDark: '#ea580c', primaryLight: '#fb923c' },
    pink: { primary: '#ec4899', primaryDark: '#db2777', primaryLight: '#f472b6' }
};

const FONT_FAMILIES = {
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", Times, serif',
    mono: '"SF Mono", "Fira Code", Consolas, monospace'
};

const LINE_HEIGHTS = {
    tight: '1.4',
    normal: '1.6',
    relaxed: '1.8',
    loose: '2.0'
};

const SIDEBAR_WIDTHS = {
    narrow: '240px',
    default: '280px',
    wide: '320px'
};

const CONTENT_WIDTHS = {
    narrow: '800px',
    default: '1000px',
    wide: '1200px',
    full: 'none'
};

let currentSettings = { ...DEFAULT_SETTINGS };

function loadPersonalization() {
    const saved = safeGetItem(PERSONALIZATION_KEY);
    if (saved) {
        try {
            currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch (e) {
            currentSettings = { ...DEFAULT_SETTINGS };
        }
    }
    applyPersonalization();
}

function savePersonalization() {
    safeSetItem(PERSONALIZATION_KEY, JSON.stringify(currentSettings));
}

function applyPersonalization() {
    const root = document.documentElement;
    const body = document.body;

    // === APPEARANCE ===
    // Apply accent color
    const colors = ACCENT_COLORS[currentSettings.accentColor] || ACCENT_COLORS.purple;
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-dark', colors.primaryDark);
    root.style.setProperty('--primary-light', colors.primaryLight);
    root.style.setProperty('--accent-color', colors.primary);

    // Apply code theme
    body.classList.remove('code-theme-dark', 'code-theme-light', 'code-theme-high-contrast');
    body.classList.add('code-theme-' + (currentSettings.codeTheme || 'dark'));

    // Apply high contrast mode
    body.classList.toggle('high-contrast', currentSettings.highContrast === true);

    // Apply eye comfort mode (blue light filter)
    body.classList.toggle('eye-comfort', currentSettings.eyeComfort === true);

    // === TYPOGRAPHY ===
    // Apply font family
    const font = FONT_FAMILIES[currentSettings.fontFamily] || FONT_FAMILIES.system;
    root.style.setProperty('--font-sans', font);

    // Apply line height
    const lineHeight = LINE_HEIGHTS[currentSettings.lineHeight] || LINE_HEIGHTS.normal;
    root.style.setProperty('--line-height-content', lineHeight);

    // Apply link style
    body.classList.remove('links-always', 'links-hover', 'links-never');
    body.classList.add('links-' + (currentSettings.linkStyle || 'hover'));

    // === LAYOUT ===
    // Apply density
    body.classList.remove('density-compact', 'density-relaxed');
    if (currentSettings.density !== 'default') {
        body.classList.add('density-' + currentSettings.density);
    }

    // Apply sidebar width (desktop only)
    const sidebarWidth = SIDEBAR_WIDTHS[currentSettings.sidebarWidth] || SIDEBAR_WIDTHS.default;
    root.style.setProperty('--sidebar-width', sidebarWidth);

    // Apply content width
    const contentWidth = CONTENT_WIDTHS[currentSettings.contentWidth] || CONTENT_WIDTHS.default;
    root.style.setProperty('--content-max-width', contentWidth);

    // === MOTION ===
    // Apply animation preferences
    body.classList.remove('animations-normal', 'animations-reduced', 'animations-none');
    body.classList.add('animations-' + (currentSettings.animations || 'normal'));

    // Update UI
    updateSettingsUI();
}

function updateSettingsUI() {
    // Helper to update radio-style options
    function updateOptionGroup(selector, dataAttr, settingValue) {
        document.querySelectorAll(selector).forEach(btn => {
            const isSelected = btn.dataset[dataAttr] === settingValue;
            btn.classList.toggle('selected', isSelected);
            btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        });
    }

    // Helper to update toggle options (role="switch" uses aria-checked)
    function updateToggle(selector, settingValue) {
        const toggle = document.querySelector(selector);
        if (toggle) {
            toggle.classList.toggle('active', settingValue === true);
            toggle.setAttribute('aria-checked', settingValue ? 'true' : 'false');
        }
    }

    // Appearance
    updateOptionGroup('.color-option', 'color', currentSettings.accentColor);
    updateOptionGroup('.code-theme-option', 'codetheme', currentSettings.codeTheme);
    updateToggle('#highContrastToggle', currentSettings.highContrast);
    updateToggle('#eyeComfortToggle', currentSettings.eyeComfort);

    // Typography
    updateOptionGroup('.font-option', 'font', currentSettings.fontFamily);
    updateOptionGroup('.line-height-option', 'lineheight', currentSettings.lineHeight);
    updateOptionGroup('.link-style-option', 'linkstyle', currentSettings.linkStyle);

    // Layout
    updateOptionGroup('.density-option', 'density', currentSettings.density);
    updateOptionGroup('.sidebar-width-option', 'sidebarwidth', currentSettings.sidebarWidth);
    updateOptionGroup('.content-width-option', 'contentwidth', currentSettings.contentWidth);

    // Motion
    updateOptionGroup('.animation-option', 'animation', currentSettings.animations);
}

function initPersonalization() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsOverlay = document.getElementById('settingsPanelOverlay');
    const settingsClose = document.getElementById('settingsClose');
    const settingsReset = document.getElementById('settingsReset');

    if (!settingsBtn || !settingsPanel) return;

    // Get focusable elements in settings panel
    function getFocusableElements() {
        return settingsPanel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    }

    function openSettings() {
        settingsPanel.classList.add('open');
        if (settingsOverlay) settingsOverlay.classList.add('open');
        settingsBtn.setAttribute('aria-expanded', 'true');
        settingsPanel.setAttribute('aria-hidden', 'false');
        if (settingsOverlay) settingsOverlay.setAttribute('aria-hidden', 'false');

        // Focus first focusable element
        setTimeout(() => {
            const focusable = getFocusableElements();
            if (focusable.length) focusable[0].focus();
        }, 100);
    }

    function closeSettings() {
        settingsPanel.classList.remove('open');
        if (settingsOverlay) settingsOverlay.classList.remove('open');
        settingsBtn.setAttribute('aria-expanded', 'false');
        settingsPanel.setAttribute('aria-hidden', 'true');
        if (settingsOverlay) settingsOverlay.setAttribute('aria-hidden', 'true');

        // Restore focus to trigger button
        settingsBtn.focus();
    }

    // Focus trap for modal
    settingsPanel.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSettings();
            return;
        }

        if (e.key !== 'Tab') return;

        const focusable = getFocusableElements();
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });

    // Toggle settings panel
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = settingsPanel.classList.contains('open');
        if (isOpen) {
            closeSettings();
        } else {
            openSettings();
        }
    });

    // Close on overlay click
    if (settingsOverlay) {
        settingsOverlay.addEventListener('click', closeSettings);
    }

    // Close settings button
    if (settingsClose) {
        settingsClose.addEventListener('click', closeSettings);
    }

    // Reset to defaults
    if (settingsReset) {
        settingsReset.addEventListener('click', () => {
            currentSettings = { ...DEFAULT_SETTINGS };
            savePersonalization();
            applyPersonalization();
        });
    }

    // Generic handler for option groups
    function bindOptionGroup(selector, dataAttr, settingKey) {
        document.querySelectorAll(selector).forEach(btn => {
            btn.addEventListener('click', () => {
                currentSettings[settingKey] = btn.dataset[dataAttr];
                savePersonalization();
                applyPersonalization();
            });
        });
    }

    // === APPEARANCE ===
    bindOptionGroup('.color-option', 'color', 'accentColor');
    bindOptionGroup('.code-theme-option', 'codetheme', 'codeTheme');

    // High contrast toggle
    const highContrastToggle = document.getElementById('highContrastToggle');
    if (highContrastToggle) {
        highContrastToggle.addEventListener('click', () => {
            currentSettings.highContrast = !currentSettings.highContrast;
            savePersonalization();
            applyPersonalization();
        });
    }

    // Eye comfort toggle (blue light filter)
    const eyeComfortToggle = document.getElementById('eyeComfortToggle');
    if (eyeComfortToggle) {
        eyeComfortToggle.addEventListener('click', () => {
            currentSettings.eyeComfort = !currentSettings.eyeComfort;
            savePersonalization();
            applyPersonalization();
        });
    }

    // === TYPOGRAPHY ===
    bindOptionGroup('.font-option', 'font', 'fontFamily');
    bindOptionGroup('.line-height-option', 'lineheight', 'lineHeight');
    bindOptionGroup('.link-style-option', 'linkstyle', 'linkStyle');

    // === LAYOUT ===
    bindOptionGroup('.density-option', 'density', 'density');
    bindOptionGroup('.sidebar-width-option', 'sidebarwidth', 'sidebarWidth');
    bindOptionGroup('.content-width-option', 'contentwidth', 'contentWidth');

    // === MOTION ===
    bindOptionGroup('.animation-option', 'animation', 'animations');

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (settingsPanel.classList.contains('open') &&
            !settingsPanel.contains(e.target) &&
            !settingsBtn.contains(e.target)) {
            settingsPanel.classList.remove('open');
            settingsBtn.setAttribute('aria-expanded', 'false');
            settingsPanel.setAttribute('aria-hidden', 'true');
        }
    });

    // Load and apply saved settings
    loadPersonalization();
}

initPersonalization();

// ==================== SHAREABILITY FEATURES ====================
function initShareability() {
    // Add share button to each h2 section heading
    const sections = document.querySelectorAll('h2[id]');

    sections.forEach(section => {
        const shareWrapper = document.createElement('span');
        shareWrapper.className = 'section-share-wrapper';

        const shareBtn = document.createElement('button');
        shareBtn.className = 'section-share-btn';
        shareBtn.innerHTML = '🔗';
        shareBtn.title = 'Copy link to this section';
        shareBtn.setAttribute('aria-label', 'Copy link to ' + section.textContent);

        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const url = window.location.origin + window.location.pathname + '#' + section.id;
            copyToClipboard(url, shareBtn);
        });

        shareWrapper.appendChild(shareBtn);
        section.appendChild(shareWrapper);
    });

}

function copyToClipboard(text, triggerElement) {
    function onSuccess() {
        showToast('Link copied to clipboard!');
        if (triggerElement) {
            triggerElement.classList.add('copied');
            setTimeout(() => triggerElement.classList.remove('copied'), 1500);
        }
    }

    function fallbackCopy() {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            onSuccess();
        } catch (e) {
            showToast('Failed to copy link');
        }
        document.body.removeChild(textarea);
    }

    // Guard: clipboard API may not exist in non-secure contexts
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).then(onSuccess).catch(fallbackCopy);
    } else {
        fallbackCopy();
    }
}

function showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('visible');
    });

    // Auto-remove
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

initShareability();

// ==================== SERVICE WORKER REGISTRATION ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Use relative path for flexibility when not hosted at domain root
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('[PWA] Service Worker registered:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available - show update notification
                            showUpdateNotification();
                        }
                    });
                });
            })
            .catch(error => {
                console.log('[PWA] Service Worker registration failed:', error);
            });
    });
}

function showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';

    const span = document.createElement('span');
    span.textContent = 'A new version is available!';

    const updateBtn = document.createElement('button');
    updateBtn.className = 'update-btn';
    updateBtn.textContent = 'Update';
    updateBtn.addEventListener('click', () => location.reload());

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'update-dismiss';
    dismissBtn.innerHTML = '&times;';
    dismissBtn.addEventListener('click', () => notification.remove());

    notification.appendChild(span);
    notification.appendChild(updateBtn);
    notification.appendChild(dismissBtn);
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('visible'), 100);
}

// ==================== CODE BLOCK COPY BUTTONS ====================
function addCopyButtons() {
    const codeBlocks = document.querySelectorAll('pre');

    codeBlocks.forEach(pre => {
        // Skip if already has a copy button
        if (pre.querySelector('.copy-btn')) return;

        // Create wrapper if needed
        pre.style.position = 'relative';

        // Create copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        copyBtn.title = 'Copy code';
        copyBtn.setAttribute('aria-label', 'Copy code to clipboard');

        copyBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const code = pre.querySelector('code') ? pre.querySelector('code').textContent : pre.textContent;

            try {
                await navigator.clipboard.writeText(code);
                copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                copyBtn.classList.add('copied');

                setTimeout(() => {
                    copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                    copyBtn.classList.remove('copied');
                }, 2000);
            } catch (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = code;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                copyBtn.classList.add('copied');

                setTimeout(() => {
                    copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                    copyBtn.classList.remove('copied');
                }, 2000);
            }
        });

        pre.appendChild(copyBtn);
    });
}

// Run on load
addCopyButtons();

// Wrap tables for mobile horizontal scrolling
function wrapTablesForMobile() {
    const tables = document.querySelectorAll('.container table:not(.table-wrapper table)');
    tables.forEach(table => {
        // Skip if already wrapped
        if (table.parentElement.classList.contains('table-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);

        // Hide scroll hint once user scrolls
        wrapper.addEventListener('scroll', function() {
            if (this.scrollLeft > 10) {
                this.classList.add('scrolled');
            }
        }, { passive: true });
    });
}

wrapTablesForMobile();

// ==================== SYNTAX HIGHLIGHTING ====================
/**
 * Lightweight syntax highlighter for Python and XML code blocks.
 * Uses a tokenizer approach to avoid nested span issues.
 * No external dependencies - pure vanilla JS.
 */
const SyntaxHighlighter = {
    /**
     * Escape HTML entities
     */
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    /**
     * Check if code is ASCII art (box drawing characters)
     */
    isAsciiArt(code) {
        const asciiArtChars = /[┌┐└┘│─┬┴├┤┼▼▲◄►═║╔╗╚╝╠╣╬]/;
        const boxDrawingCount = (code.match(/[┌┐└┘│─═║╔╗╚╝]/g) || []).length;
        return asciiArtChars.test(code) && boxDrawingCount > 10;
    },

    /**
     * Detect language from code content
     */
    detectLanguage(code) {
        // Skip ASCII art diagrams
        if (this.isAsciiArt(code)) return null;

        const pythonIndicators = [
            /\bdef\s+\w+\s*\(/,
            /\bclass\s+\w+.*:/,
            /^\s*import\s+\w+/m,
            /^\s*from\s+\w+\s+import/m,
            /@api\.\w+/,
            /fields\.\w+\(/,
            /self\.\w+/,
            /_name\s*=/,
            /_inherit\s*=/,
        ];

        const xmlIndicators = [
            /<\?xml/,
            /<odoo\b/,
            /<record\b/,
            /<field\s+name=/,
            /<template\b/,
            /<\/\w+>/,
            /xmlns[:=]/,
            /<data\b/,
            /<menuitem\b/,
        ];

        const pythonScore = pythonIndicators.filter(r => r.test(code)).length;
        const xmlScore = xmlIndicators.filter(r => r.test(code)).length;

        if (pythonScore > xmlScore && pythonScore >= 2) return 'python';
        if (xmlScore > pythonScore && xmlScore >= 2) return 'xml';
        if (pythonScore >= 2) return 'python';
        if (xmlScore >= 2) return 'xml';
        return null;
    },

    /**
     * Tokenize and highlight Python code
     */
    highlightPython(code) {
        const escaped = this.escapeHtml(code);
        let result = '';

        // Keywords that should be highlighted
        const keywords = /^(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|raise|pass|break|continue|and|or|not|in|is|lambda|None|True|False|async|await|global|nonlocal|assert)$/;
        const builtins = /^(print|len|range|str|int|float|list|dict|tuple|set|bool|type|isinstance|hasattr|getattr|setattr|super|enumerate|zip|map|filter|sorted|reversed|any|all|min|max|sum|abs|round|open|input)$/;
        const odooKeywords = /^(fields|models|api|Command|Domain)$/;
        const odooFields = /^(Many2one|One2many|Many2many|Char|Text|Html|Integer|Float|Boolean|Date|Datetime|Binary|Selection|Reference|Monetary|Image)$/;
        const odooAttrs = /^(_name|_description|_inherit|_inherits|_order|_rec_name|_sql_constraints|compute|inverse|search|store|readonly|required|default|string|help|comodel_name|inverse_name|relation|domain|context|ondelete|tracking|copy|index)$/;

        // Process character by character with lookahead
        let i = 0;
        while (i < escaped.length) {
            const char = escaped[i];
            const rest = escaped.slice(i);

            // Comments
            if (char === '#') {
                const endOfLine = escaped.indexOf('\n', i);
                const comment = endOfLine === -1 ? escaped.slice(i) : escaped.slice(i, endOfLine);
                result += `<span class="sh-comment">${comment}</span>`;
                i += comment.length;
                continue;
            }

            // Triple-quoted strings
            if (rest.startsWith('"""') || rest.startsWith("'''")) {
                const quote = rest.slice(0, 3);
                const endIdx = escaped.indexOf(quote, i + 3);
                if (endIdx !== -1) {
                    const str = escaped.slice(i, endIdx + 3);
                    result += `<span class="sh-string">${str}</span>`;
                    i = endIdx + 3;
                    continue;
                }
            }

            // Regular strings
            if (char === '"' || char === "'") {
                let j = i + 1;
                while (j < escaped.length) {
                    if (escaped[j] === '\\') {
                        j += 2; // Skip escaped character
                    } else if (escaped[j] === char) {
                        j++;
                        break;
                    } else {
                        j++;
                    }
                }
                const str = escaped.slice(i, j);
                result += `<span class="sh-string">${str}</span>`;
                i = j;
                continue;
            }

            // Decorators
            if (char === '@' && /[a-zA-Z_]/.test(escaped[i + 1] || '')) {
                let j = i + 1;
                while (j < escaped.length && /[\w.]/.test(escaped[j])) j++;
                const decorator = escaped.slice(i, j);
                result += `<span class="sh-decorator">${decorator}</span>`;
                i = j;
                continue;
            }

            // Identifiers and keywords
            if (/[a-zA-Z_]/.test(char)) {
                let j = i;
                while (j < escaped.length && /[\w]/.test(escaped[j])) j++;
                const word = escaped.slice(i, j);

                // Check what comes before for context (is this a function/class name?)
                const isDefName = result.endsWith('<span class="sh-keyword">def</span> ') || result.endsWith('<span class="sh-keyword">def</span>  ');
                const isClassName = result.endsWith('<span class="sh-keyword">class</span> ') || result.endsWith('<span class="sh-keyword">class</span>  ');

                if (isDefName) {
                    result += `<span class="sh-function">${word}</span>`;
                } else if (isClassName) {
                    result += `<span class="sh-class">${word}</span>`;
                } else if (word === 'self' || word === 'cls') {
                    result += `<span class="sh-self">${word}</span>`;
                } else if (keywords.test(word)) {
                    result += `<span class="sh-keyword">${word}</span>`;
                } else if (builtins.test(word)) {
                    result += `<span class="sh-builtin">${word}</span>`;
                } else if (odooKeywords.test(word)) {
                    result += `<span class="sh-keyword">${word}</span>`;
                } else if (odooFields.test(word)) {
                    result += `<span class="sh-field">${word}</span>`;
                } else if (odooAttrs.test(word)) {
                    result += `<span class="sh-field">${word}</span>`;
                } else {
                    result += word;
                }
                i = j;
                continue;
            }

            // Numbers
            if (/\d/.test(char)) {
                let j = i;
                while (j < escaped.length && /[\d.]/.test(escaped[j])) j++;
                const num = escaped.slice(i, j);
                result += `<span class="sh-number">${num}</span>`;
                i = j;
                continue;
            }

            // Everything else (operators, punctuation, whitespace)
            result += char;
            i++;
        }

        return result;
    },

    /**
     * Tokenize and highlight XML code
     */
    highlightXml(code) {
        const escaped = this.escapeHtml(code);
        let result = '';
        let i = 0;

        while (i < escaped.length) {
            const rest = escaped.slice(i);

            // Comments: &lt;!-- ... --&gt;
            if (rest.startsWith('&lt;!--')) {
                const endIdx = escaped.indexOf('--&gt;', i);
                if (endIdx !== -1) {
                    const comment = escaped.slice(i, endIdx + 6);
                    result += `<span class="sh-comment">${comment}</span>`;
                    i = endIdx + 6;
                    continue;
                }
            }

            // Tags: &lt;tagname or &lt;/tagname
            if (rest.startsWith('&lt;')) {
                const isClosing = rest.startsWith('&lt;/');
                const tagStart = isClosing ? 5 : 4;

                // Find tag name
                let j = i + tagStart;
                while (j < escaped.length && /[\w:-]/.test(escaped[j])) j++;
                const tagName = escaped.slice(i + tagStart, j);

                if (tagName) {
                    result += escaped.slice(i, i + tagStart);
                    result += `<span class="sh-tag">${tagName}</span>`;
                    i = j;

                    // Parse attributes until &gt; or /&gt;
                    while (i < escaped.length) {
                        const attrRest = escaped.slice(i);

                        // End of tag
                        if (attrRest.startsWith('&gt;') || attrRest.startsWith('/&gt;')) {
                            const endTag = attrRest.startsWith('/&gt;') ? '/&gt;' : '&gt;';
                            result += endTag;
                            i += endTag.length;
                            break;
                        }

                        // Whitespace
                        if (/\s/.test(escaped[i])) {
                            result += escaped[i];
                            i++;
                            continue;
                        }

                        // Attribute name
                        if (/[\w:-]/.test(escaped[i])) {
                            let k = i;
                            while (k < escaped.length && /[\w:-]/.test(escaped[k])) k++;
                            const attrName = escaped.slice(i, k);
                            result += `<span class="sh-attribute">${attrName}</span>`;
                            i = k;

                            // = sign
                            if (escaped[i] === '=') {
                                result += '=';
                                i++;

                                // Attribute value
                                if (escaped[i] === '"' || escaped[i] === "'") {
                                    const quote = escaped[i];
                                    let m = i + 1;
                                    while (m < escaped.length && escaped[m] !== quote) m++;
                                    const attrValue = escaped.slice(i, m + 1);
                                    result += `<span class="sh-attr-value">${attrValue}</span>`;
                                    i = m + 1;
                                }
                            }
                            continue;
                        }

                        // Other characters in tag
                        result += escaped[i];
                        i++;
                    }
                    continue;
                }
            }

            // Regular text
            result += escaped[i];
            i++;
        }

        return result;
    },

    /**
     * Apply syntax highlighting to code
     */
    highlight(code, language) {
        if (language === 'python') {
            return this.highlightPython(code);
        } else if (language === 'xml') {
            return this.highlightXml(code);
        }
        return this.escapeHtml(code);
    },

    /**
     * Initialize syntax highlighting for all code blocks
     */
    init() {
        // Select pre > code but exclude those inside .diagram
        const codeBlocks = document.querySelectorAll('pre:not(.diagram pre) code');

        codeBlocks.forEach(codeElement => {
            const pre = codeElement.parentElement;

            // Skip if already highlighted or inside a diagram
            if (pre.dataset.highlighted === 'true') return;
            if (pre.closest('.diagram')) return;

            const originalCode = codeElement.textContent;

            // Skip ASCII art
            if (this.isAsciiArt(originalCode)) return;

            const language = this.detectLanguage(originalCode);

            if (language) {
                codeElement.innerHTML = this.highlight(originalCode, language);
                pre.dataset.language = language;
                pre.dataset.highlighted = 'true';
            }
        });
    }
};

// ==================== INTERACTIVE DIAGRAMS ====================
/**
 * Makes diagram boxes clickable to highlight related elements.
 * Supports relationship highlighting and tooltips.
 */
const InteractiveDiagrams = {
    /**
     * Define relationships between diagram elements
     * Key: box text content (lowercase), Value: array of related box texts
     */
    relationships: {
        // Many2one relationships
        'sale order': ['customer', 'partner', 'salesperson', 'warehouse', 'pricelist'],
        'sale order #1': ['customer: acme corp', 'acme corp'],
        'sale order #2': ['customer: acme corp', 'acme corp'],
        'sale order #3': ['customer: beta inc', 'beta inc'],
        'customer: acme corp': ['sale order #1', 'sale order #2'],
        'customer: beta inc': ['sale order #3'],
        'acme corp': ['sale order #1', 'sale order #2'],
        'beta inc': ['sale order #3'],

        // Model relationships
        'sale.order': ['res.partner', 'product.product', 'account.move', 'stock.picking', 'mail.thread', 'crm.lead', 'project.task'],
        'account.move': ['res.partner', 'mail.thread', 'sale.order'],
        'project.task': ['mail.thread', 'res.users', 'project.project'],
        'crm.lead': ['res.partner', 'mail.thread', 'crm.stage'],
        'mail.thread': ['sale.order', 'account.move', 'project.task', 'crm.lead'],
        'res.partner': ['sale.order', 'account.move', 'crm.lead'],

        // Many2one visual
        'many2one': ['one2many', 'n : 1', '1 : n'],
        'one2many': ['many2one', '1 : n', 'n : 1'],

        // Odoo architecture
        'javascript frontend (owl)': ['python backend', 'json-rpc / http'],
        'python backend': ['javascript frontend (owl)', 'postgresql database', 'orm'],
        'postgresql database': ['python backend', 'orm'],
        'owl components': ['web client', 'widgets', 'actions'],
        'odoo orm': ['models', 'fields', 'methods'],
    },

    /**
     * Get related boxes for a given box
     */
    getRelated(boxText) {
        const normalized = boxText.toLowerCase().trim();
        return this.relationships[normalized] || [];
    },

    /**
     * Initialize interactive diagrams
     */
    init() {
        const diagrams = document.querySelectorAll('.diagram');

        diagrams.forEach(diagram => {
            const boxes = diagram.querySelectorAll('.diagram-box');

            // Skip diagrams with no boxes or only one box
            if (boxes.length < 2) return;

            // Add interactive class
            diagram.classList.add('diagram-interactive');

            // Add reset button
            const resetBtn = document.createElement('button');
            resetBtn.className = 'diagram-reset';
            resetBtn.textContent = 'Reset view';
            resetBtn.setAttribute('aria-label', 'Reset diagram highlighting');
            diagram.appendChild(resetBtn);

            // Make boxes focusable for accessibility
            boxes.forEach(box => {
                box.setAttribute('tabindex', '0');
                box.setAttribute('role', 'button');
            });

            // Handle box clicks
            boxes.forEach(box => {
                const handleActivate = (e) => {
                    e.stopPropagation();
                    this.highlightRelated(diagram, box);
                };

                box.addEventListener('click', handleActivate);
                box.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleActivate(e);
                    }
                });
            });

            // Reset button handler
            resetBtn.addEventListener('click', () => {
                this.resetDiagram(diagram);
            });

            // Click outside to reset
            document.addEventListener('click', (e) => {
                if (!diagram.contains(e.target)) {
                    this.resetDiagram(diagram);
                }
            });
        });
    },

    /**
     * Highlight related elements in a diagram
     */
    highlightRelated(diagram, clickedBox) {
        const boxes = diagram.querySelectorAll('.diagram-box');
        const arrows = diagram.querySelectorAll('.arrow, .arrow-down');
        const clickedText = clickedBox.textContent.toLowerCase().trim();
        const relatedTexts = this.getRelated(clickedText);

        // Mark diagram as having a selection
        diagram.classList.add('has-selection');

        // Reset all first
        boxes.forEach(box => {
            box.classList.remove('highlighted', 'dimmed');
        });
        arrows.forEach(arrow => {
            arrow.classList.remove('highlighted', 'dimmed');
        });

        // Highlight clicked box
        clickedBox.classList.add('highlighted');

        // Find and highlight related boxes
        let hasRelated = false;
        boxes.forEach(box => {
            if (box === clickedBox) return;

            const boxText = box.textContent.toLowerCase().trim();
            const isRelated = relatedTexts.some(related =>
                boxText.includes(related) || related.includes(boxText)
            );

            if (isRelated) {
                box.classList.add('highlighted');
                hasRelated = true;
            } else {
                box.classList.add('dimmed');
            }
        });

        // If no relationships found, just highlight clicked box without dimming others
        if (!hasRelated) {
            boxes.forEach(box => {
                box.classList.remove('dimmed');
            });
        } else {
            // Highlight arrows between highlighted boxes
            arrows.forEach(arrow => {
                const prev = arrow.previousElementSibling;
                const next = arrow.nextElementSibling;

                const prevHighlighted = prev && prev.classList.contains('highlighted');
                const nextHighlighted = next && next.classList.contains('highlighted');

                if (prevHighlighted || nextHighlighted) {
                    arrow.classList.add('highlighted');
                } else {
                    arrow.classList.add('dimmed');
                }
            });
        }
    },

    /**
     * Reset diagram to default state
     */
    resetDiagram(diagram) {
        diagram.classList.remove('has-selection');

        const boxes = diagram.querySelectorAll('.diagram-box');
        const arrows = diagram.querySelectorAll('.arrow, .arrow-down');

        boxes.forEach(box => {
            box.classList.remove('highlighted', 'dimmed');
        });
        arrows.forEach(arrow => {
            arrow.classList.remove('highlighted', 'dimmed');
        });
    }
};

// Initialize syntax highlighting and interactive diagrams
SyntaxHighlighter.init();
InteractiveDiagrams.init();

init();
});
