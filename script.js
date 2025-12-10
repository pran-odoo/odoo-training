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
        searchResults._results = null;
        // Clear ARIA attributes when search is cleared
        searchInput.setAttribute('aria-expanded', 'false');
        searchInput.removeAttribute('aria-activedescendant');
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

    // Press 'S' to toggle spider cursor (only if available on desktop)
    if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
        if (isSpideyAvailable()) {
            toggleSpidey();
        }
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

    function animate(t) {
        if (!isSpideyActive) {
            spiderAnimationId = null;
            return;
        }

        // Resize canvas if needed
        if (w !== innerWidth) w = spiderCanvas.width = innerWidth;
        if (h !== innerHeight) h = spiderCanvas.height = innerHeight;

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

init();
});
