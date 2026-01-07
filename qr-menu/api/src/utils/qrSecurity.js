import crypto from 'crypto';

/**
 * Generate a secure token for table QR codes
 * @param {string} restaurantId - Restaurant ID
 * @param {string} tableId - Table ID
 * @returns {string} Secure HMAC token
 */
export const generateTableToken = (restaurantId, tableId) => {
    const secret = process.env.QR_SECRET || 'default-qr-secret-change-in-production';
    const timestamp = Date.now();
    const payload = `${restaurantId}:${tableId}:${timestamp}`;

    const token = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

    // Return token with timestamp for optional expiry validation
    return `${token}.${timestamp}`;
};

/**
 * Validate a table token
 * @param {string} token - Token to validate
 * @param {string} restaurantId - Restaurant ID
 * @param {string} tableId - Table ID
 * @param {number} expiryHours - Optional: hours until token expires (default: no expiry)
 * @returns {boolean} Whether token is valid
 */
export const validateTableToken = (token, restaurantId, tableId, expiryHours = null) => {
    try {
        const [tokenHash, timestamp] = token.split('.');

        // Check expiry if specified
        if (expiryHours) {
            const tokenAge = Date.now() - parseInt(timestamp);
            const maxAge = expiryHours * 60 * 60 * 1000;
            if (tokenAge > maxAge) {
                return false;
            }
        }

        // Regenerate token and compare
        const payload = `${restaurantId}:${tableId}:${timestamp}`;
        const secret = process.env.QR_SECRET || 'default-qr-secret-change-in-production';
        const expectedHash = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        // Use constant-time comparison to prevent timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(tokenHash),
            Buffer.from(expectedHash)
        );
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
};

/**
 * Generate QR code URL for a table
 * @param {string} restaurantId - Restaurant ID
 * @param {string} tableId - Table ID
 * @returns {string} QR code URL
 */
export const generateQRCodeUrl = (restaurantId, tableId) => {
    const token = generateTableToken(restaurantId, tableId);
    const baseUrl = process.env.CLIENT_MENU_URL || 'http://192.168.88.65:5175';

    return `${baseUrl}/menu/${restaurantId}?table=${tableId}&token=${token}`;
};
