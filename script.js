class PageViewer {
    constructor() {
        this.currentUrl = '';
        this.isUsingProxy = false;
        this.init();
    }

    init() {
        this.urlInput = document.getElementById('urlInput');
        this.viewBtn = document.getElementById('viewBtn');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.errorMessage = document.getElementById('errorMessage');
        this.tryProxyBtn = document.getElementById('tryProxyBtn');
        this.contentArea = document.getElementById('contentArea');
        this.backBtn = document.getElementById('backBtn');
        this.currentUrlSpan = document.getElementById('currentUrl');
        this.directFrame = document.getElementById('directFrame');
        this.proxyFrame = document.getElementById('proxyFrame');
        
        this.bindEvents();
    }

    bindEvents() {
        this.viewBtn.addEventListener('click', () => this.loadUrl());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadUrl();
        });
        this.tryProxyBtn.addEventListener('click', () => this.tryWithProxy());
        this.backBtn.addEventListener('click', () => this.resetViewer());
        
        // Handle iframe errors
        this.directFrame.addEventListener('load', () => this.hideLoading());
        this.directFrame.addEventListener('error', () => this.handleFrameError());
        this.proxyFrame.addEventListener('load', () => this.hideLoading());
        this.proxyFrame.addEventListener('error', () => this.handleFrameError());
    }

    async loadUrl() {
        let url = this.urlInput.value.trim();
        
        if (!url) {
            this.showError('Please enter a URL');
            return;
        }

        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
            this.urlInput.value = url;
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            this.showError('Please enter a valid URL');
            return;
        }

        this.currentUrl = url;
        this.isUsingProxy = false;
        this.showLoading();
        this.hideError();
        this.hideContentArea();

        // Try direct iframe first
        await this.tryDirectFrame(url);
    }

    async tryDirectFrame(url) {
        try {
            this.directFrame.src = url;
            this.directFrame.classList.remove('hidden');
            this.proxyFrame.classList.add('hidden');
            
            // Set timeout to detect if iframe is blocked
            setTimeout(() => {
                if (this.loading.style.display !== 'none') {
                    this.handleFrameError();
                }
            }, 5000);
            
        } catch (error) {
            this.handleFrameError();
        }
    }

    async tryWithProxy() {
        if (!this.currentUrl) return;
        
        this.isUsingProxy = true;
        this.showLoading();
        this.hideError();

        try {
            // Use a CORS proxy service
            const proxyUrl = this.getProxyUrl(this.currentUrl);
            this.proxyFrame.src = proxyUrl;
            this.proxyFrame.classList.remove('hidden');
            this.directFrame.classList.add('hidden');
            
            this.showContentArea('Using proxy for: ' + this.currentUrl);
            
        } catch (error) {
            this.showError('Proxy also failed: ' + error.message);
        }
    }

    getProxyUrl(url) {
        // Using public CORS proxies (note: these may have limitations)
        const proxies = [
            `https://corsproxy.io/?${encodeURIComponent(url)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
            `https://cors-anywhere.herokuapp.com/${url}`
        ];
        
        // Return a random proxy to distribute load
        return proxies[Math.floor(Math.random() * proxies.length)];
    }

    handleFrameError() {
        if (this.isUsingProxy) {
            this.showError('Failed to load page even with proxy. The site may have strong security restrictions.');
        } else {
            this.showError(
                'This site cannot be embedded directly due to security restrictions. ' +
                'You can try loading it through a proxy.',
                true
            );
        }
        this.hideLoading();
        this.hideContentArea();
    }

    showLoading() {
        this.loading.classList.remove('hidden');
    }

    hideLoading() {
        this.loading.classList.add('hidden');
    }

    showError(message, showProxyButton = false) {
        this.errorMessage.textContent = message;
        this.error.classList.remove('hidden');
        this.tryProxyBtn.classList.toggle('hidden', !showProxyButton);
    }

    hideError() {
        this.error.classList.add('hidden');
    }

    showContentArea(message = '') {
        this.contentArea.classList.remove('hidden');
        this.currentUrlSpan.textContent = message || this.currentUrl;
    }

    hideContentArea() {
        this.contentArea.classList.add('hidden');
    }

    resetViewer() {
        this.currentUrl = '';
        this.urlInput.value = '';
        this.isUsingProxy = false;
        this.directFrame.src = '';
        this.proxyFrame.src = '';
        this.directFrame.classList.add('hidden');
        this.proxyFrame.classList.add('hidden');
        this.hideContentArea();
        this.hideError();
        this.hideLoading();
    }
}

// Initialize the page viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PageViewer();
});

// Add some example URLs for quick testing
document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('urlInput');
    urlInput.placeholder = 'Try: example.com or httpbin.org/html';
});
