export const LOADING_TYPES = {
    FULL: 'full',
    BACKGROUND: 'background'
};

class LoadingManager {
    constructor() {
        this.listeners = [];
        this.isLoading = false;
        this.loadingType = LOADING_TYPES.FULL; // 'full' or 'background'
        this.message = null; // Custom message for loading state

        this.activeFullRequests = 0;
        this.activeBackgroundRequests = 0;
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener({
            isLoading: this.isLoading,
            type: this.loadingType,
            message: this.message
        }));
    }

    updateState() {
        // Priority: Full > Background
        if (this.activeFullRequests > 0) {
            this.isLoading = true;
            this.loadingType = LOADING_TYPES.FULL;
        } else if (this.activeBackgroundRequests > 0) {
            this.isLoading = true;
            this.loadingType = LOADING_TYPES.BACKGROUND;
        } else {
            this.isLoading = false;
            // Reset message when loading stops
            this.message = null;
            // Retain last type or reset to default? Resetting seems safer to avoid confusion.
            this.loadingType = LOADING_TYPES.FULL;
        }
        this.notify();
    }

    start(type = LOADING_TYPES.FULL, message = null) {
        // Store custom message if provided
        if (message) {
            this.message = message;
        }

        if (type === LOADING_TYPES.FULL) {
            this.activeFullRequests++;
        } else {
            this.activeBackgroundRequests++;
        }
        this.updateState();
    }

    stop(type = LOADING_TYPES.FULL) {
        if (type === LOADING_TYPES.FULL) {
            this.activeFullRequests--;
            if (this.activeFullRequests < 0) this.activeFullRequests = 0;
        } else {
            this.activeBackgroundRequests--;
            if (this.activeBackgroundRequests < 0) this.activeBackgroundRequests = 0;
        }
        this.updateState();
    }

    // Force stop all loading
    reset() {
        this.activeFullRequests = 0;
        this.activeBackgroundRequests = 0;
        this.isLoading = false;
        this.loadingType = LOADING_TYPES.FULL;
        this.message = null;
        this.notify();
    }
}

export const loadingManager = new LoadingManager();
