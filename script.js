class PageViewer {
    constructor() {
        this.currentUrl = '';
        this.history = [];
        this.historyIndex = -1;
        this.currentMethod = 'direct';
        this.isReaderMode = false;
        this.init();
    }

    init() {
        // DOM elements
        this.urlInput = document.getElementById('urlInput');
        this.viewBtn = document.getElementById('viewBtn');
        this.newTabBtn = document.getElementById('newTabBtn');
        this.loading = document.getElementById('loading');
        this.error = document.getElementById('error');
        this.errorMessage = document.getElementById('errorMessage');
        this.tryProxyBtn = document.getElementById('tryProxyBtn');
        this.tryDifferentBtn = document.getElementById('tryDifferentBtn');
        this.contentArea = document.getElementById('contentArea');
        this.backBtn = document.getElementById('backBtn');
        this.forwardBtn = document.getElementById('forwardBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.proxySelector = document.getElementById('proxySelector');
        this.toggleReaderBtn = document.getElementById('toggleReaderBtn');
        this.currentUrlSpan = document.getElementById('currentUrl');
        this.currentMethodSpan = document.getElementById('currentMethod');
        this.securityStatusSpan = document.getElementById('securityStatus');
        this.browserInfo = document.getElementById('browserInfo');
        this.mainFrame = document.getElementById('mainFrame');
        this.readerView = document.getElementById('readerView');
        this.readerTitle = document.getElementById('readerTitle');
        this.readerContent = document.getElementById('readerContent');
        this.closeReaderBtn = document.getElementById('closeReaderBtn');

        this.bindEvents();
        this.setupQuickLinks();
    }

    bindEvents() {
        this.viewBtn.addEventListener('click', () => this.loadUrl());
        this.newTabBtn.addEventListener('click', () => this.openInNewTab());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadUrl();
        });
        this.tryProxyBtn.addEventListener('click', () => this.tryWithProxy());
        this.tryDifferentBtn.addEventListener('click', () => this.tryDifferentMethod());
        this.backBtn.addEventListener('click', () => this.goBack());
        this.forwardBtn.addEventListener('click', () => this.goForward());
        this.refreshBtn.addEventListener('click', () => this.refresh());
        this.proxySelector.addEventListener('change', () => this.onProxyMethodChange());
        this.toggleReaderBtn.addEventListener('click', () => this.toggleReaderMode());
        this.closeReaderBtn.addEventListener('click', () => this.closeReaderMode());

        // Frame events
        this.mainFrame.addEventListener('load', () => this.onFrameLoad());
        this.mainFrame.addEventListener('error', () => this.onFrameError());

        // Navigation state
        window.addEventListener('popstate', (e) => this.handlePopState(e));
    }

    setupQuickLinks() {
        const buttons = document.querySelectorAll('.link-buttons button');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const url = e.target.getAttribute('data-url');
                this.urlInput.value = url;
                this.loadUrl();
            });
        });
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
        this.addToHistory(url);
        this.showLoading();
        this.hideError();
        
        const method = this.proxySelector.value;
        await this.loadWithMethod(url, method);
    }

    async loadWithMethod(url, method) {
        this.currentMethod = method;
        let targetUrl = url;

        switch (method) {
            case 'direct':
                targetUrl = url;
                break;
            case 'corsproxy':
                targetUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                break;
            case 'allorigins':
                targetUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                break;
            case 'corsanywhere':
                targetUrl = `https://cors-anywhere.herokuapp.com/${url}`;
                break;
        }

        try {
            this.mainFrame.src = targetUrl;
            this.showContentArea();
            this.updateBrowserInfo(url, method);
        } catch (error) {
            this.showError(`Failed to load with ${method}: ${error.message}`);
        }
    }

    onFrameLoad() {
        this.hideLoading();
        this.updateNavigationButtons();
        
        // Try to extract page title
        try {
            const frameDoc = this.mainFrame.contentDocument || this.mainFrame.contentWindow.document;
            const title = frameDoc.title || 'Untitled';
            document.title = `${title} - Page Viewer`;
        } catch (error) {
            // Cross-origin restriction
            document.title = 'Page Viewer';
        }
    }

    onFrameError() {
        this.showError(
            `Failed to load page using ${this.currentMethod}. The site may have security restrictions.`,
            true
        );
        this.hideLoading();
    }

    tryWithProxy() {
        if (!this.currentUrl) return;
        this.proxySelector.value = 'corsproxy';
        this.loadWithMethod(this.currentUrl, 'corsproxy');
    }

    tryDifferentMethod() {
        if (!this.currentUrl) return;
        const methods = ['direct', 'corsproxy', 'allorigins', 'corsanywhere'];
        const currentIndex = methods.indexOf(this.currentMethod);
        const nextMethod = methods[(currentIndex + 1) % methods.length];
        this.proxySelector.value = nextMethod;
        this.loadWithMethod(this.currentUrl, nextMethod);
    }

    onProxyMethodChange() {
        if (this.currentUrl) {
            this.loadWithMethod(this.currentUrl, this.proxySelector.value);
        }
    }

    addToHistory(url) {
        // Remove any future history if we're not at the end
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(url);
        this.historyIndex = this.history.length - 1;
        this.updateNavigationButtons();
    }

    goBack() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const url = this.history[this.historyIndex];
            this.urlInput.value = url;
            this.loadWithMethod(url, this.currentMethod);
        }
    }

    goForward() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const url = this.history[this.historyIndex];
            this.urlInput.value = url;
            this.loadWithMethod(url, this.currentMethod);
        }
    }

    refresh() {
        if (this.currentUrl) {
            this.loadWithMethod(this.currentUrl, this.currentMethod);
        }
    }

    updateNavigationButtons() {
        this.backBtn.disabled = this.historyIndex <= 0;
        this.forwardBtn.disabled = this.historyIndex >= this.history.length - 1;
        this.refreshBtn.disabled = !this.currentUrl;
    }

    updateBrowserInfo(url, method) {
        this.currentUrlSpan.textContent = url;
        this.currentMethodSpan.textContent = `Method: ${method}`;
        
        // Basic security assessment
        const isSecure = url.startsWith('https://');
        this.securityStatusSpan.textContent = isSecure ? '🔒 Secure' : '⚠️ Not Secure';
        this.securityStatusSpan.className = isSecure ? 'security-success' : 'security-warning';
        
        this.browserInfo.classList.remove('hidden');
    }

    async toggleReaderMode() {
        if (this.isReaderMode) {
            this.closeReaderMode();
            return;
        }

        if (!this.currentUrl) return;

        try {
            this.showLoading();
            const response = await fetch(this.getProxyUrl(this.currentUrl));
            const html = await response.text();
            
            // Simple content extraction (basic reader mode)
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const title = doc.querySelector('title')?.textContent || 'No Title';
            const content = doc.querySelector('article') || 
                           doc.querySelector('main') || 
                           doc.querySelector('.content') || 
                           doc.querySelector('#content') ||
                           doc.body;

            this.readerTitle.textContent = title;
            this.readerContent.innerHTML = content.innerHTML;
            
            // Basic styling for reader mode
            this.readerContent.querySelectorAll('*').forEach(el => {
                el.style.margin = '0';
                el.style.padding = '0';
                el.style.maxWidth = '100%';
            });

            this.readerView.classList.remove('hidden');
            this.contentArea.classList.add('hidden');
            this.isReaderMode = true;
            this.hideLoading();
            
        } catch (error) {
            this.showError('Failed to load reader mode: ' + error.message);
        }
    }

    closeReaderMode() {
        this.readerView.classList.add('hidden');
        this.contentArea.classList.remove('hidden');
        this.isReaderMode = false;
    }

    openInNewTab() {
        const url = this.urlInput.value.trim() || this.currentUrl;
        if (url) {
            window.open(url, '_blank');
        }
    }

    getProxyUrl(url) {
        const proxies = [
            `https://corsproxy.io/?${encodeURIComponent(url)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
        ];
        return proxies[0]; // Use first proxy for reader mode
    }

    handlePopState(event) {
        if (event.state && event.state.url) {
            this.urlInput.value = event.state.url;
            this.loadUrl();
        }
    }

    // Utility methods
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

    showContentArea() {
        this.contentArea.classList.remove('hidden');
        this.browserInfo.classList.remove('hidden');
    }

    hideContentArea() {
        this.contentArea.classList.add('hidden');
        this.browserInfo.classList.add('hidden');
    }
}

// Initialize the page viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PageViewer();
});

// Add some helpful tips
console.log('Page Viewer initialized. Try these test URLs:');
console.log('- https://example.com (should work directly)');
console.log('- https://httpbin.org/html (good for testing)');
console.log('- https://www.wikipedia.org (usually works)');
console.log('- https://google.com (may need proxy)');
