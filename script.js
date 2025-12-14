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
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
    mobileMenuToggle.classList.toggle('active');
}

function closeMobileMenu() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    mobileMenuToggle.classList.remove('active');
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
    // Ignore if typing in search
    if (document.activeElement === searchInput) {
        return;
    }

    // Press '/' to focus search
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchInput.focus();
        return;
    }

    // Press 'D' for dark mode
    if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey) {
        toggleDarkMode();
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
resumeBanner.addEventListener('click', function(e) {
    if (e.target === resumeClose) return;
    const lastSection = safeGetItem(STORAGE_KEYS.lastSection);
    if (lastSection) {
        const target = document.getElementById(lastSection);
        if (target) {
            target.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
        }
    }
    resumeBanner.style.display = 'none';
});

resumeClose.addEventListener('click', function(e) {
    e.stopPropagation();
    resumeBanner.style.display = 'none';
});

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

// Define available commands
const commands = [
    // Navigation
    { type: 'nav', icon: '📖', title: 'Go to: What is Odoo?', action: () => navigateTo('what-is-odoo'), keywords: ['intro', 'start', 'beginning'] },
    { type: 'nav', icon: '📖', title: 'Go to: Models', action: () => navigateTo('models'), keywords: ['model', 'database', 'table'] },
    { type: 'nav', icon: '📖', title: 'Go to: Field Types', action: () => navigateTo('field-types'), keywords: ['fields', 'char', 'integer', 'boolean'] },
    { type: 'nav', icon: '📖', title: 'Go to: Relationships', action: () => navigateTo('relationships'), keywords: ['many2one', 'one2many', 'many2many', 'relation'] },
    { type: 'nav', icon: '📖', title: 'Go to: Computed Fields', action: () => navigateTo('computed'), keywords: ['compute', 'calculate', 'depends'] },
    { type: 'nav', icon: '📖', title: 'Go to: Views', action: () => navigateTo('views'), keywords: ['form', 'list', 'kanban', 'tree'] },
    { type: 'nav', icon: '📖', title: 'Go to: Domains', action: () => navigateTo('domains'), keywords: ['filter', 'domain', 'search'] },
    { type: 'nav', icon: '📖', title: 'Go to: Access Rights', action: () => navigateTo('access'), keywords: ['security', 'permissions', 'groups'] },
    { type: 'nav', icon: '📖', title: 'Go to: Actions', action: () => navigateTo('actions'), keywords: ['automation', 'server action', 'scheduled'] },
    { type: 'nav', icon: '📖', title: 'Go to: Odoo Studio', action: () => navigateTo('studio'), keywords: ['studio', 'customize', 'no-code'] },
    { type: 'nav', icon: '📖', title: 'Go to: Chatter', action: () => navigateTo('chatter'), keywords: ['messages', 'followers', 'activities'] },
    { type: 'nav', icon: '📖', title: 'Go to: Email', action: () => navigateTo('emails'), keywords: ['email', 'smtp', 'mail'] },
    { type: 'nav', icon: '📖', title: 'Go to: Context', action: () => navigateTo('context'), keywords: ['context', 'default', 'parameter'] },

    // Actions
    { type: 'action', icon: '🌙', title: 'Toggle Dark Mode', action: toggleDarkMode, shortcut: 'D', keywords: ['dark', 'light', 'theme', 'mode'] },
    { type: 'action', icon: '📖', title: 'Toggle Focus Mode', action: () => { closeCommandPalette(); setTimeout(() => { if (focusModeBtn) focusModeBtn.click(); }, 100); }, shortcut: 'F', keywords: ['focus', 'reading', 'distraction', 'zen'] },
    { type: 'action', icon: '🔍', title: 'Focus Search', action: () => { closeCommandPalette(); searchInput.focus(); }, shortcut: '/', keywords: ['search', 'find'] },
    { type: 'action', icon: '⬆️', title: 'Back to Top', action: () => { closeCommandPalette(); window.scrollTo({ top: 0, behavior: getScrollBehavior() }); }, keywords: ['top', 'scroll', 'beginning'] },
    { type: 'action', icon: '📏', title: 'Increase Font Size', action: () => { if (currentFontSizeIndex < FONT_SIZES.length - 1) { currentFontSizeIndex++; setFontSize(FONT_SIZES[currentFontSizeIndex]); } }, keywords: ['font', 'larger', 'bigger', 'text'] },
    { type: 'action', icon: '📏', title: 'Decrease Font Size', action: () => { if (currentFontSizeIndex > 0) { currentFontSizeIndex--; setFontSize(FONT_SIZES[currentFontSizeIndex]); } }, keywords: ['font', 'smaller', 'text'] },
    { type: 'action', icon: '🖨️', title: 'Print Page', action: () => { closeCommandPalette(); window.print(); }, keywords: ['print', 'pdf', 'export'] },
    { type: 'action', icon: '⌨️', title: 'Show Keyboard Shortcuts', action: () => { closeCommandPalette(); toggleKeyboardHint(); }, shortcut: '?', keywords: ['keyboard', 'shortcuts', 'help'] },
];

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
    commandPaletteInput.focus();
    renderCommandPaletteResults('');
    document.body.style.overflow = 'hidden';
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

    // Filter commands
    let filteredCommands = commands;
    if (lowerQuery) {
        filteredCommands = commands.filter(cmd => {
            const titleMatch = cmd.title.toLowerCase().includes(lowerQuery);
            const keywordMatch = cmd.keywords && cmd.keywords.some(k => k.includes(lowerQuery));
            return titleMatch || keywordMatch;
        });
    }

    // Also search through sections from the search index
    let sectionResults = [];
    if (lowerQuery && searchIndex.length > 0) {
        sectionResults = searchIndex
            .filter(item => item.title.toLowerCase().includes(lowerQuery))
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

    // Group results
    const navCommands = filteredCommands.filter(c => c.type === 'nav').slice(0, 6);
    const actionCommands = filteredCommands.filter(c => c.type === 'action');

    commandPaletteItems = [...actionCommands, ...navCommands, ...sectionResults];
    commandPaletteSelectedIndex = 0;

    if (commandPaletteItems.length === 0) {
        commandPaletteResults.innerHTML = `
            <div class="command-palette-empty">
                <div class="command-palette-empty-icon">🔍</div>
                <div>No results found for "${escapeHtml(query)}"</div>
            </div>
        `;
        return;
    }

    let html = '';

    // Actions group
    if (actionCommands.length > 0) {
        html += `<div class="command-palette-group">
            <div class="command-palette-group-title">Actions</div>
            ${actionCommands.map((cmd, i) => renderCommandItem(cmd, i)).join('')}
        </div>`;
    }

    // Navigation group
    if (navCommands.length > 0) {
        html += `<div class="command-palette-group">
            <div class="command-palette-group-title">Navigation</div>
            ${navCommands.map((cmd, i) => renderCommandItem(cmd, actionCommands.length + i)).join('')}
        </div>`;
    }

    // Search results group
    if (sectionResults.length > 0) {
        html += `<div class="command-palette-group">
            <div class="command-palette-group-title">Search Results</div>
            ${sectionResults.map((cmd, i) => renderCommandItem(cmd, actionCommands.length + navCommands.length + i)).join('')}
        </div>`;
    }

    commandPaletteResults.innerHTML = html;
    updateSelectedItem();
}

function renderCommandItem(cmd, index) {
    return `
        <div class="command-palette-item" data-index="${index}" role="option">
            <div class="command-palette-item-icon">${cmd.icon}</div>
            <div class="command-palette-item-content">
                <div class="command-palette-item-title">${escapeHtml(cmd.title)}</div>
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
    if (commandPaletteItems[commandPaletteSelectedIndex]) {
        commandPaletteItems[commandPaletteSelectedIndex].action();
    }
}

// Event listeners for command palette
commandPaletteOverlay.addEventListener('click', closeCommandPalette);

commandPaletteInput.addEventListener('input', function() {
    renderCommandPaletteResults(this.value);
});

commandPaletteInput.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeCommandPalette();
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        commandPaletteSelectedIndex = Math.min(commandPaletteSelectedIndex + 1, commandPaletteItems.length - 1);
        updateSelectedItem();
    } else if (e.key === 'ArrowUp') {
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
    if (focusModeActive && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }
}

// Focus mode button click handler
if (focusModeBtn) {
    focusModeBtn.addEventListener('click', toggleFocusMode);
}

// Keyboard shortcut for focus mode (F key)
document.addEventListener('keydown', function(e) {
    // Don't trigger if typing in an input or textarea
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    // Don't trigger if command palette is open
    if (commandPalette && commandPalette.classList.contains('active')) return;

    if (e.key === 'f' || e.key === 'F') {
        // Only lowercase 'f' without modifiers
        if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key === 'f') {
            e.preventDefault();
            toggleFocusMode();
        }
    }
});

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

init();
});
