export const formatDate = (dateString, options = {}) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString(undefined, options);
    } catch (e) {
        return 'Error Date';
    }
};

export const formatTime = (dateString, options = {}) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-:-';
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', ...options });
    } catch (e) {
        return '-:-';
    }
};

export const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
        return 'Error Date';
    }
};
