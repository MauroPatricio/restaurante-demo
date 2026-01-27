/**
 * DEPRECATED: Use GlobalLoader with mode="discrete" instead
 * This file provides backward compatibility for existing code
 */
import GlobalLoader from './GlobalLoader';

const DiscreteLoader = () => {
    return <GlobalLoader mode="discrete" size="md" />;
};

export default DiscreteLoader;
