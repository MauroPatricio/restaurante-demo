/**
 * DEPRECATED: Use GlobalLoader with mode="inline" instead
 * This file provides backward compatibility for existing code
 */
import GlobalLoader from './GlobalLoader';

const LoadingSpinner = ({ size = 24, className = "", message = "" }) => {
    return (
        <GlobalLoader
            mode="inline"
            size={size}
            message={message}
            className={className}
        />
    );
};

export default LoadingSpinner;
