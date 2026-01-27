/**
 * Navigation helper to preserve URL parameters (table and token)
 * Prevents menu from failing to load after navigation
 */

export const getMenuUrl = (restaurantId, searchParams) => {
    // Try to get table and token from URL params
    const table = searchParams?.get('t') || searchParams?.get('table');
    const token = searchParams?.get('token');

    if (table && token) {
        return `/menu/${restaurantId}?t=${table}&token=${token}`;
    }

    // Fallback: try sessionStorage
    const validationStr = sessionStorage.getItem('qr_validation');
    if (validationStr) {
        try {
            const validation = JSON.parse(validationStr);
            const tableId = validation.table?._id || validation.table;
            const tokenVal = validation.token;

            if (tableId && tokenVal) {
                return `/menu/${restaurantId}?t=${tableId}&token=${tokenVal}`;
            }
        } catch (e) {
            console.error('Error parsing qr_validation from sessionStorage:', e);
        }
    }

    // Last resort: return URL without params (may fail to load menu)
    return `/menu/${restaurantId}`;
};
