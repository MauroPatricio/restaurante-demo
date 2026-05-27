export const formatOrderNumber = (order) => {
    if (!order) return '000000';
    if (order.orderNumber) return order.orderNumber;
    
    const id = (order._id || order.id || '').toString();
    if (!id) return '000000';
    
    // Convert the last 6 chars of hex ID to an integer, then pad/slice to exactly 6 digits
    const hexSlice = id.slice(-6);
    const intValue = parseInt(hexSlice, 16);
    
    if (isNaN(intValue)) {
        return Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    }
    
    return intValue.toString().padStart(6, '0').slice(-6);
};
