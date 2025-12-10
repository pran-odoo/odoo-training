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

// ==================== LOCAL STORAGE KEYS ====================
const STORAGE_KEYS = {
    darkMode: 'odoo_training_dark_mode',
    fontSize: 'odoo_training_font_size',
    lastSection: 'odoo_training_last_section',
    lastScrollPos: 'odoo_training_scroll_pos',
    spideyCursor: 'odoo_training_spidey_cursor'
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

// ==================== BACK TO TOP ====================
function toggleBackToTop() {
    if (window.scrollY > 500) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }
}

backToTop.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                        link.scrollIntoView({ block: 'center', behavior: 'smooth' });
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

        searchIndex.push({
            title: sectionTitle,
            section: sectionTitle,
            element: h2,
            type: 'section'
        });

        const nextH2 = allH2s[h2Index + 1];
        let current = h2.nextElementSibling;

        while (current && current !== nextH2) {
            if (current.tagName === 'H3' || current.tagName === 'H4') {
                searchIndex.push({
                    title: current.textContent.trim(),
                    section: sectionTitle.substring(0, 35),
                    element: current,
                    type: 'heading'
                });
            }

            const innerHeadings = current.querySelectorAll ? current.querySelectorAll('h3, h4') : [];
            innerHeadings.forEach(heading => {
                const title = heading.textContent.trim();
                if (!searchIndex.some(item => item.title === title && item.section === sectionTitle.substring(0, 35))) {
                    searchIndex.push({
                        title: title,
                        section: sectionTitle.substring(0, 35),
                        element: heading,
                        type: 'box-title'
                    });
                }
            });

            current = current.nextElementSibling;
        }
    });
}

function performSearch(query) {
    if (!query || query.length < 2) {
        searchResults.innerHTML = '';
        return;
    }

    const scored = searchIndex.map(item => ({
        ...item,
        score: fuzzyMatch(item.title, query)
    })).filter(item => item.score > 0);

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const results = scored.slice(0, 12);

    if (results.length === 0) {
        searchResults.innerHTML = '<div class="no-results" role="status">No results found for "' + escapeHtml(query) + '"</div>';
        searchInput.setAttribute('aria-expanded', 'false');
        return;
    }

    // Build results HTML with ARIA roles for accessibility
    const html = results.map((item, index) => {
        const highlighted = highlightMatch(item.title, query);
        const resultId = 'search-result-' + index;
        return `
            <div class="search-result-item" data-index="${index}" id="${resultId}"
                 role="option" tabindex="-1" aria-selected="false">
                <div class="search-result-title">${highlighted}</div>
                ${item.section && item.type !== 'section' ?
                    `<div class="search-result-context">in ${escapeHtml(item.section)}...</div>` : ''}
            </div>
        `;
    }).join('');

    searchResults.innerHTML = html;
    searchResults._results = results;
    searchResults._selectedIndex = -1;
    searchInput.setAttribute('aria-expanded', 'true');
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
            result.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    safeSetItem(STORAGE_KEYS.darkMode, isDark ? 'true' : 'false');
}

function loadDarkMode() {
    const saved = safeGetItem(STORAGE_KEYS.darkMode);
    if (saved === 'true') {
        document.body.classList.add('dark-mode');
        darkModeBtn.textContent = '☀️';
        darkModeBtn.classList.add('active');
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
}

helpBtn.addEventListener('click', toggleKeyboardHint);

function navigateSection(direction) {
    const currentIndex = sectionsArray.findIndex(s => s === currentActiveSection);
    let newIndex = currentIndex + direction;

    if (newIndex < 0) newIndex = 0;
    if (newIndex >= sectionsArray.length) newIndex = sectionsArray.length - 1;

    const targetSection = sectionsArray[newIndex];
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Use replaceState to update URL without polluting browser history
            history.replaceState(null, null, targetId);
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
}

// ==================== SPIDER-MAN CURSOR ====================
const spideyCursor = document.getElementById('spideyCursor');
const spideyToggleBtn = document.getElementById('spideyToggleBtn');
let lastX = 0, lastY = 0;
let isSpideyActive = false;

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

function enableSpidey() {
    if (!isSpideyAvailable()) return;
    isSpideyActive = true;
    document.body.classList.add('spidey-mode');
    spideyToggleBtn.classList.add('active');
    safeSetItem(STORAGE_KEYS.spideyCursor, 'true');
}

function disableSpidey() {
    isSpideyActive = false;
    document.body.classList.remove('spidey-mode');
    if (spideyCursor) spideyCursor.style.display = 'none';
    spideyToggleBtn.classList.remove('active');
    safeSetItem(STORAGE_KEYS.spideyCursor, 'false');
}

function toggleSpidey() {
    if (isSpideyActive) {
        disableSpidey();
    } else {
        enableSpidey();
    }
}

// Update availability on resize/orientation change
function updateSpideyAvailability() {
    const available = isSpideyAvailable();
    spideyToggleBtn.style.display = available ? '' : 'none';

    if (!available && isSpideyActive) {
        // Disable if no longer available (e.g., resized to mobile)
        disableSpidey();
    }
}

// Load saved preference (default: enabled on desktop if available)
function loadSpideyPreference() {
    if (!isSpideyAvailable()) {
        spideyToggleBtn.style.display = 'none';
        return;
    }
    const saved = safeGetItem(STORAGE_KEYS.spideyCursor);
    if (saved === 'false') {
        disableSpidey();
    } else {
        enableSpidey();
    }
}

// Handle resize/orientation changes
window.addEventListener('resize', updateSpideyAvailability);

spideyToggleBtn.addEventListener('click', toggleSpidey);

// Track mouse movement (always track, but only show cursor if active)
document.addEventListener('mousemove', function(e) {
    lastX = e.clientX;
    lastY = e.clientY;
    if (isSpideyActive && spideyCursor) {
        spideyCursor.style.left = e.clientX + 'px';
        spideyCursor.style.top = e.clientY + 'px';
        spideyCursor.style.display = 'block';
    }
});

// Hide cursor when mouse leaves window
document.addEventListener('mouseleave', function() {
    if (spideyCursor) {
        spideyCursor.style.display = 'none';
    }
});

// Web-slinging on click
document.addEventListener('mousedown', function(e) {
    if (!isSpideyActive) return;
    if (spideyCursor) spideyCursor.classList.add('clicking');
    // Shoot web from cursor to a random point above/around
    const angle = -Math.PI/2 + (Math.random() - 0.5) * Math.PI/2; // -90° ± 45°
    const distance = 150 + Math.random() * 100;
    const targetX = lastX + Math.cos(angle) * distance;
    const targetY = lastY + Math.sin(angle) * distance;
    shootWeb(lastX, lastY, targetX, targetY);
});

document.addEventListener('mouseup', function() {
    if (spideyCursor) spideyCursor.classList.remove('clicking');
});

// Initialize spidey preference
loadSpideyPreference();

function shootWeb(fromX, fromY, toX, toY) {
    // Create SVG for web line
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:9999;';

    // Create the web line path
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${fromX} ${fromY} L ${toX} ${toY}`);
    path.setAttribute('stroke', '#ffffff');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-linecap', 'round');

    svg.appendChild(path);
    document.body.appendChild(svg);

    // Animate the web shooting out
    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;
    path.style.transition = 'stroke-dashoffset 0.2s ease-out';

    // Trigger animation
    requestAnimationFrame(() => {
        path.style.strokeDashoffset = '0';
    });

    // Create web splat at end point
    const splat = document.createElement('div');
    splat.innerHTML = `
        <svg viewBox="0 0 40 40" width="24" height="24">
            <circle cx="20" cy="20" r="3" fill="#fff"/>
            <line x1="20" y1="20" x2="20" y2="6" stroke="#fff" stroke-width="1.5"/>
            <line x1="20" y1="20" x2="20" y2="34" stroke="#fff" stroke-width="1.5"/>
            <line x1="20" y1="20" x2="6" y2="20" stroke="#fff" stroke-width="1.5"/>
            <line x1="20" y1="20" x2="34" y2="20" stroke="#fff" stroke-width="1.5"/>
            <line x1="20" y1="20" x2="10" y2="10" stroke="#fff" stroke-width="1"/>
            <line x1="20" y1="20" x2="30" y2="10" stroke="#fff" stroke-width="1"/>
            <line x1="20" y1="20" x2="10" y2="30" stroke="#fff" stroke-width="1"/>
            <line x1="20" y1="20" x2="30" y2="30" stroke="#fff" stroke-width="1"/>
        </svg>
    `;
    splat.style.cssText = `position:fixed;left:${toX - 12}px;top:${toY - 12}px;pointer-events:none;z-index:9998;opacity:0;transform:scale(0);transition:all 0.15s ease-out;`;
    document.body.appendChild(splat);

    // Show splat after web reaches target
    setTimeout(() => {
        splat.style.opacity = '1';
        splat.style.transform = 'scale(1)';
    }, 150);

    // Fade out and clean up
    setTimeout(() => {
        svg.style.transition = 'opacity 0.3s';
        svg.style.opacity = '0';
        splat.style.opacity = '0';
        splat.style.transform = 'scale(0.5)';
        setTimeout(() => {
            svg.remove();
            splat.remove();
        }, 300);
    }, 500);
}

init();
});
