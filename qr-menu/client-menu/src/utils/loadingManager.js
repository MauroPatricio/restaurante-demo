class LoadingManager {
    constructor() {
        this.listeners = [];
        this.isLoading = false;
        this.activeRequests = 0;
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.isLoading));
    }

    start() {
        this.activeRequests++;
        if (!this.isLoading) {
            this.isLoading = true;
            this.notify();
        }
    }

    stop() {
        this.activeRequests--;
        if (this.activeRequests <= 0) {
            this.activeRequests = 0;
            this.isLoading = false;
            this.notify();
        }
    }

    // Force stop all loading
    reset() {
        this.activeRequests = 0;
        this.isLoading = false;
        this.notify();
    }
}

export const loadingManager = new LoadingManager();
