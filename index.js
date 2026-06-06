const CONFIG = {
    API_BASE_URL: 'http://localhost:3000/api',
    ITEMS_PER_PAGE: 20,
    SEARCH_DEBOUNCE_MS: 300,
    CACHE_EXPIRY_MS: 600000,
    IMAGE_BASE_URL: 'https://image.tmdb.org/t/p/w500',
    DEFAULT_LANGUAGE: 'es'
};

class API {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
        this.cache = new Map();
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const cacheKey = `${endpoint}-${JSON.stringify(options)}`;

        if (options.method === 'GET' && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CONFIG.CACHE_EXPIRY_MS) {
                return cached.data;
            }
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            if (options.method === 'GET' || !options.method) {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    getMovies(params = {}) {
        return this.request('/movies', { method: 'GET' });
    }

    getMovieById(id) {
        return this.request(`/movies/${id}`, { method: 'GET' });
    }

    searchContent(query) {
        return this.request('/search', { 
            method: 'GET',
            headers: { 'X-Query': query }
        });
    }

    getSeries(params = {}) {
        return this.request('/series', { method: 'GET' });
    }

    getSeriesById(id) {
        return this.request(`/series/${id}`, { method: 'GET' });
    }

    getCategories() {
        return this.request('/categories', { method: 'GET' });
    }

    getContentByCategory(categoryId) {
        return this.request(`/categories/${categoryId}/content`, { method: 'GET' });
    }

    getFeatured() {
        return this.request('/featured', { method: 'GET' });
    }

    clearCache() {
        this.cache.clear();
    }
}

const api = new API();

class ThemeManager {
    constructor() {
        this.root = document.documentElement;
        this.themeKey = 'filmbox-theme';
        this.init();
    }

    init() {
        const savedTheme = this.getTheme();
        this.setTheme(savedTheme);
        this.setupThemeToggle();
    }

    getTheme() {
        const saved = localStorage.getItem(this.themeKey);
        if (saved) return saved;

        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark-mode' : 'light-mode';
    }

    setTheme(theme) {
        this.root.className = theme;
        localStorage.setItem(this.themeKey, theme);
    }

    toggle() {
        const current = this.root.className;
        const newTheme = current === 'dark-mode' ? 'light-mode' : 'dark-mode';
        this.setTheme(newTheme);
    }

    setupThemeToggle() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    }
}

const themeManager = new ThemeManager();

class SearchManager {
    constructor() {
        this.searchInput = document.getElementById('search-input');
        this.debounceTimeout = null;
        this.searchResultsSection = document.getElementById('search-results-section');
        this.searchResultsGrid = document.getElementById('search-results-grid');
        this.init();
    }

    init() {
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => this.handleSearch(e));
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.performSearch(this.searchInput.value);
            });
        }
    }

    handleSearch(event) {
        clearTimeout(this.debounceTimeout);
        const query = event.target.value.trim();

        if (query.length === 0) {
            this.clearSearch();
            return;
        }

        this.debounceTimeout = setTimeout(() => {
            this.performSearch(query);
        }, CONFIG.SEARCH_DEBOUNCE_MS);
    }

    async performSearch(query) {
        if (query.length < 2) return;

        try {
            const results = await api.searchContent(query);
            this.displayResults(results);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    displayResults(results) {
        this.searchResultsGrid.innerHTML = '';

        if (!results || results.length === 0) {
            this.searchResultsGrid.innerHTML = '<p class="no-results">No se encontraron resultados</p>';
            this.searchResultsSection.style.display = 'block';
            return;
        }

        results.forEach(item => {
            const card = ui.createContentCard(item);
            this.searchResultsGrid.appendChild(card);
        });

        this.searchResultsSection.style.display = 'block';
    }

    clearSearch() {
        this.searchInput.value = '';
        this.searchResultsSection.style.display = 'none';
        this.searchResultsGrid.innerHTML = '';
    }
}

const searchManager = new SearchManager();

class UIManager {
    constructor() {
        this.modal = document.getElementById('detail-modal');
        this.modalOverlay = document.getElementById('modal-overlay');
        this.modalClose = document.querySelector('.modal-close');
        this.detailContainer = document.getElementById('detail-container');
        this.setupModal();
    }

    setupModal() {
        if (this.modalClose) {
            this.modalClose.addEventListener('click', () => this.closeModal());
        }
        if (this.modalOverlay) {
            this.modalOverlay.addEventListener('click', () => this.closeModal());
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    createContentCard(item) {
        const card = document.createElement('div');
        card.className = 'content-card';
        
        const type = item.type || 'movie';
        const posterUrl = item.poster_path ? `${CONFIG.IMAGE_BASE_URL}${item.poster_path}` : 'data:image/svg+xml,<svg></svg>';
        const rating = item.vote_average ? (item.vote_average / 2).toFixed(1) : 'N/A';
        const year = item.release_date ? new Date(item.release_date).getFullYear() : '';

        card.innerHTML = `
            <div class="card-image">
                <img src="${posterUrl}" alt="${item.title || item.name}" loading="lazy">
                <span class="card-badge">${type.toUpperCase()}</span>
            </div>
            <div class="card-info">
                <h4 class="card-title">${item.title || item.name}</h4>
                <div class="card-meta">
                    <span>${year}</span>
                    <div class="card-rating">
                        <span>${rating}</span>
                    </div>
                </div>
            </div>
        `;

        card.addEventListener('click', () => this.openModal(item));
        return card;
    }

    async openModal(item) {
        try {
            const itemId = item.id;
            const type = item.type || 'movie';
            
            let fullData;
            if (type === 'series') {
                fullData = await api.getSeriesById(itemId);
            } else {
                fullData = await api.getMovieById(itemId);
            }

            this.displayDetail(fullData, type);
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        } catch (error) {
            console.error('Error loading detail:', error);
        }
    }

    displayDetail(item, type) {
        const posterUrl = item.poster_path ? `${CONFIG.IMAGE_BASE_URL}${item.poster_path}` : '';
        const rating = item.vote_average ? (item.vote_average / 2).toFixed(1) : 'N/A';
        const year = item.release_date || item.first_air_date || '';

        let serversHTML = '';
        if (item.servers && item.servers.length > 0) {
            item.servers.forEach((server, index) => {
                serversHTML += `
                    <div class="player-container">
                        <div class="player-label">Servidor ${index + 1}</div>
                        <iframe 
                            class="player-frame" 
                            src="${server.url}" 
                            allowfullscreen 
                            allow="encrypted-media"
                        ></iframe>
                    </div>
                `;
            });
        }

        this.detailContainer.innerHTML = `
            <div class="detail-image">
                <img src="${posterUrl}" alt="${item.title || item.name}">
            </div>
            <div class="detail-info">
                <h1 class="detail-title">${item.title || item.name}</h1>
                <div class="detail-meta">
                    <span class="detail-tag">${year}</span>
                    <div class="rating-value">${rating}</div>
                </div>
                <p class="detail-description">${item.overview || ''}</p>
                <div class="video-players">
                    ${serversHTML}
                </div>
            </div>
        `;
    }

    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    createCategoryButton(category) {
        const btn = document.createElement('button');
        btn.className = 'category-item';
        btn.textContent = category.name;
        btn.dataset.categoryId = category.id;
        btn.addEventListener('click', () => this.selectCategory(btn, category.id));
        return btn;
    }

    selectCategory(element, categoryId) {
        document.querySelectorAll('.category-item').forEach(btn => {
            btn.classList.remove('active');
        });
        element.classList.add('active');
    }

    createLoadingCard() {
        const card = document.createElement('div');
        card.className = 'loading-card';
        return card;
    }

    showLoadingState(container, count = 12) {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            container.appendChild(this.createLoadingCard());
        }
    }
}

const ui = new UIManager();

class FilmBoxApp {
    constructor() {
        this.moviesGrid = document.getElementById('movies-grid');
        this.seriesGrid = document.getElementById('series-grid');
        this.categoriesList = document.getElementById('categories-list');
        this.featuredCarousel = document.getElementById('featured-carousel');
        this.init();
    }

    async init() {
        await this.loadCategories();
        await this.loadFeatured();
        await this.loadMovies();
        await this.loadSeries();
    }

    async loadCategories() {
        try {
            const categories = await api.getCategories();
            this.displayCategories(categories);
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    displayCategories(categories) {
        this.categoriesList.innerHTML = '';
        categories.forEach((category, index) => {
            const btn = ui.createCategoryButton(category);
            this.categoriesList.appendChild(btn);
            if (index === 0) btn.classList.add('active');
        });
    }

    async loadFeatured() {
        try {
            const featured = await api.getFeatured();
            this.displayFeatured(featured);
        } catch (error) {
            console.error('Error loading featured:', error);
        }
    }

    displayFeatured(items) {
        if (!items || items.length === 0) return;

        let currentIndex = 0;

        const displayFeaturedItem = () => {
            const item = items[currentIndex];
            const posterUrl = item.poster_path ? `${CONFIG.IMAGE_BASE_URL}${item.poster_path}` : '';
            const rating = item.vote_average ? (item.vote_average / 2).toFixed(1) : 'N/A';
            const year = item.release_date || item.first_air_date || '';

            this.featuredCarousel.innerHTML = `
                <div class="featured-item">
                    <div class="featured-image">
                        <img src="${posterUrl}" alt="${item.title || item.name}" class="featured-img">
                    </div>
                    <div class="featured-info">
                        <h2 class="featured-title">${item.title || item.name}</h2>
                        <p class="featured-description">${item.overview || ''}</p>
                        <div class="featured-meta">
                            <span class="featured-year">${year}</span>
                            <span class="featured-rating">${rating}</span>
                        </div>
                    </div>
                </div>
            `;
        };

        displayFeaturedItem();

        setInterval(() => {
            currentIndex = (currentIndex + 1) % items.length;
            displayFeaturedItem();
        }, 8000);
    }

    async loadMovies() {
        try {
            ui.showLoadingState(this.moviesGrid);
            const movies = await api.getMovies();
            this.displayMovies(movies);
        } catch (error) {
            console.error('Error loading movies:', error);
            this.moviesGrid.innerHTML = '<p>Error al cargar películas</p>';
        }
    }

    displayMovies(movies) {
        this.moviesGrid.innerHTML = '';
        if (!movies || movies.length === 0) {
            this.moviesGrid.innerHTML = '<p>No hay películas disponibles</p>';
            return;
        }

        movies.forEach(movie => {
            const card = ui.createContentCard(movie);
            this.moviesGrid.appendChild(card);
        });
    }

    async loadSeries() {
        try {
            ui.showLoadingState(this.seriesGrid);
            const series = await api.getSeries();
            this.displaySeries(series);
        } catch (error) {
            console.error('Error loading series:', error);
            this.seriesGrid.innerHTML = '<p>Error al cargar series</p>';
        }
    }

    displaySeries(series) {
        this.seriesGrid.innerHTML = '';
        if (!series || series.length === 0) {
            this.seriesGrid.innerHTML = '<p>No hay series disponibles</p>';
            return;
        }

        series.forEach(show => {
            const card = ui.createContentCard(show);
            this.seriesGrid.appendChild(card);
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new FilmBoxApp();
    });
} else {
    const app = new FilmBoxApp();
}
