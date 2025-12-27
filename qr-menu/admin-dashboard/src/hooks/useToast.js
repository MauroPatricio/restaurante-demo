import { useConnectivity } from '../contexts/ConnectivityContext';

export const useToast = () => {
    const { addToast, removeToast } = useConnectivity();

    const toast = {
        success: (message, duration = 3000) => addToast('success', message, false, duration),
        error: (message, persistent = false, duration = 5000) => addToast('error', message, persistent, duration),
        warning: (message, duration = 4000) => addToast('warning', message, false, duration),
        info: (message, duration = 3000) => addToast('info', message, false, duration),
    };

    return { toast, removeToast };
};
