// ========== RaspBaby App ==========

let allProducts = [];
let filteredProducts = [];
let currentCategory = 'all';
let currentSort = 'popular';
let currentPriceFilter = 'all';
let currentRatingFilter = 'all';
let displayCount = 24;
const ITEMS_PER_PAGE = 24;
const AFFILIATE_TAG = 'grubsight-20';

// Short links map (populated later via SiteStripe)
const shortLinks = {};

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    setupSearch();
    setupNavScroll();
    setupScrollReveal();
    animateCounters();
});

// ===== Load Products =====
async function loadProducts() {
    try {
        const resp = await fetch('./data/products.json');
        allProducts = await resp.json();
        filteredProducts = [...allProducts];
        updateCategoryCounts();
        renderProducts();
    } catch (err) {
        console.error('Failed to load products:', err);
        document.getElementById('product-grid').innerHTML = `
            <div class="no-results">
                <div class="no-results-emoji">😿</div>
                <h3>Couldn't load products</h3>
                <p>Please try refreshing the page.</p>
            </div>`;
    }
}

// ===== Render Products =====
function renderProducts() {
    const grid = document.getElementById('product-grid');
    const visible = filteredProducts.slice(0, displayCount);

    if (visible.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <div class="no-results-emoji">🔍</div>
                <h3>No products found</h3>
                <p>Try adjusting your filters or search terms.</p>
            </div>`;
        document.getElementById('load-more-container').style.display = 'none';
        updateProductCount(0);
        return;
    }

    grid.innerHTML = visible.map((p, i) => {
        const link = getAffiliateLink(p.asin);
        const stars = getStars(p.rating);
        const imgSrc = p.image || `https://via.placeholder.com/300x300/FDF5F7/E8A0BF?text=${encodeURIComponent(p.name.substring(0, 20))}`;
        return `
        <div class="product-card" style="--i:${i}">
            ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
            <a href="${link}" target="_blank" rel="noopener noreferrer nofollow">
                <div class="product-img-wrap">
                    <img src="${imgSrc}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x300/FDF5F7/E8A0BF?text=Product'">
                </div>
            </a>
            <div class="product-info">
                <div class="product-name" title="${escapeHtml(p.name)}">${escapeHtml(p.name)}</div>
                <div class="product-rating">
                    <span class="stars">${stars}</span>
                    <span class="rating-text">${p.rating} (${p.reviews})</span>
                </div>
                <div class="product-price-row">
                    <span class="product-price">$${p.price.toFixed(2)}</span>
                    <a href="${link}" target="_blank" rel="noopener noreferrer nofollow" class="buy-btn">
                        View on Amazon
                    </a>
                </div>
            </div>
        </div>`;
    }).join('');

    // Show/hide load more
    const loadMoreContainer = document.getElementById('load-more-container');
    loadMoreContainer.style.display = displayCount < filteredProducts.length ? 'block' : 'none';
    updateProductCount(filteredProducts.length);
}

// ===== Affiliate Link =====
function getAffiliateLink(asin) {
    if (shortLinks[asin]) return shortLinks[asin];
    return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

// ===== Helpers =====
function getStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.3;
    let s = '★'.repeat(full);
    if (half) s += '½';
    s += '☆'.repeat(5 - full - (half ? 1 : 0));
    return s;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function updateProductCount(count) {
    const showing = Math.min(displayCount, count);
    document.getElementById('product-count').textContent = `Showing ${showing} of ${count} products`;
}

function updateCategoryCounts() {
    const counts = {};
    allProducts.forEach(p => {
        counts[p.category] = (counts[p.category] || 0) + 1;
    });
    document.querySelectorAll('.cat-count').forEach(el => {
        const cat = el.dataset.cat;
        el.textContent = counts[cat] || 0;
    });
}

// ===== Filtering =====
window.filterCategory = function(category, linkEl) {
    currentCategory = category;
    displayCount = ITEMS_PER_PAGE;
    applyFilters();

    // Update nav active state
    document.querySelectorAll('.nav-link[data-category]').forEach(l => l.classList.remove('active'));
    if (linkEl) {
        linkEl.classList.add('active');
    } else {
        const navLink = document.querySelector(`.nav-link[data-category="${category}"]`);
        if (navLink) navLink.classList.add('active');
    }

    // Update title
    const titles = {
        all: 'All Products',
        onesies: 'Onesies & Rompers',
        sleepwear: 'Sleepwear & Swaddles',
        outfits: 'Outfits & Sets',
        shoes: 'Shoes & Socks',
        maternity: 'Maternity & Nursing',
        nursery: 'Nursery & Bedding',
        strollers: 'Strollers & Car Seats',
        feeding: 'Feeding',
        bath: 'Bath & Skincare',
        diapering: 'Diapering'
    };
    document.getElementById('section-title').textContent = titles[category] || 'Products';

    // Scroll to products
    document.getElementById('products').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.resetFilters = function() {
    currentCategory = 'all';
    currentSort = 'popular';
    currentPriceFilter = 'all';
    currentRatingFilter = 'all';
    displayCount = ITEMS_PER_PAGE;
    document.getElementById('sort-select').value = 'popular';
    document.getElementById('price-filter').value = 'all';
    document.getElementById('rating-filter').value = 'all';
    document.getElementById('search').value = '';
    applyFilters();
    document.querySelectorAll('.nav-link[data-category]').forEach(l => l.classList.remove('active'));
    document.querySelector('.nav-link[data-category="all"]')?.classList.add('active');
    document.getElementById('section-title').textContent = 'All Products';
};

function applyFilters() {
    let products = [...allProducts];

    // Category
    if (currentCategory !== 'all') {
        products = products.filter(p => p.category === currentCategory);
    }

    // Search
    const query = document.getElementById('search').value.toLowerCase().trim();
    if (query) {
        products = products.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.category.toLowerCase().includes(query)
        );
    }

    // Price
    if (currentPriceFilter !== 'all') {
        if (currentPriceFilter === '100+') {
            products = products.filter(p => p.price >= 100);
        } else {
            const [min, max] = currentPriceFilter.split('-').map(Number);
            products = products.filter(p => p.price >= min && p.price < max);
        }
    }

    // Rating
    if (currentRatingFilter !== 'all') {
        const minRating = parseFloat(currentRatingFilter);
        products = products.filter(p => p.rating >= minRating);
    }

    // Sort
    switch (currentSort) {
        case 'price-low': products.sort((a, b) => a.price - b.price); break;
        case 'price-high': products.sort((a, b) => b.price - a.price); break;
        case 'rating': products.sort((a, b) => b.rating - a.rating); break;
        case 'name': products.sort((a, b) => a.name.localeCompare(b.name)); break;
        default: break; // popular = original order
    }

    filteredProducts = products;
    renderProducts();
}

window.applySort = function(val) { currentSort = val; applyFilters(); };
window.applyPriceFilter = function(val) { currentPriceFilter = val; applyFilters(); };
window.applyRatingFilter = function(val) { currentRatingFilter = val; applyFilters(); };

window.loadMore = function() {
    displayCount += ITEMS_PER_PAGE;
    renderProducts();
};

// ===== Search =====
function setupSearch() {
    let debounce;
    document.getElementById('search').addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
            displayCount = ITEMS_PER_PAGE;
            applyFilters();
        }, 300);
    });
}

// ===== Nav Scroll Effect =====
function setupNavScroll() {
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
        const scroll = window.scrollY;
        navbar.classList.toggle('scrolled', scroll > 20);
        lastScroll = scroll;
    }, { passive: true });
}

// ===== Scroll Reveal =====
function setupScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.cat-card, .article-card, .trust-item').forEach(el => {
        el.classList.add('reveal');
        observer.observe(el);
    });
}

// ===== Animated Counters =====
function animateCounters() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.count);
                let current = 0;
                const step = Math.max(1, Math.floor(target / 40));
                const timer = setInterval(() => {
                    current += step;
                    if (current >= target) {
                        current = target;
                        clearInterval(timer);
                    }
                    el.textContent = current;
                }, 30);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-num[data-count]').forEach(el => observer.observe(el));
}

// ===== Mobile Menu =====
window.toggleMobileMenu = function() {
    document.getElementById('nav-links').classList.toggle('open');
};

// ===== Articles =====
window.scrollToArticles = function() {
    document.getElementById('articles').scrollIntoView({ behavior: 'smooth' });
};

window.openArticle = function(slug) {
    // Future: navigate to article page
    alert('Article coming soon! Check back for our full guide.');
};

// ===== Newsletter =====
window.subscribeNewsletter = function() {
    alert('Thanks for subscribing! 💕 You\'ll get our best picks weekly.');
};
