export const formatOrderNumber = (orderOrId) => {
    if (!orderOrId) return '000000';
    if (typeof orderOrId === 'object' && orderOrId.orderNumber) return orderOrId.orderNumber;
    
    const id = (typeof orderOrId === 'string' ? orderOrId : (orderOrId._id || orderOrId.id || '')).toString();
    if (!id || id === '[object Object]') return '000000';
    
    // Convert the last 6 chars of hex ID to an integer, then pad/slice to exactly 6 digits
    const hexSlice = id.slice(-6);
    const intValue = parseInt(hexSlice, 16);
    
    if (isNaN(intValue)) {
        return Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    }
    
    return intValue.toString().padStart(6, '0').slice(-6);
};
