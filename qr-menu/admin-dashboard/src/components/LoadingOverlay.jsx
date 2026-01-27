/**
 * DEPRECATED: Use GlobalLoader with mode="fullscreen" instead
 * This file provides backward compatibility for existing code
 */
import GlobalLoader from './GlobalLoader';

const LoadingOverlay = () => {
    return <GlobalLoader mode="fullscreen" size="lg" />;
};

export default LoadingOverlay;
