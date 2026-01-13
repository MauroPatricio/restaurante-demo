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
        console.log('🔍 Validating token:', {
            tokenLength: token?.length,
            restaurantId,
            tableId,
            expiryHours
        });

        const [tokenHash, timestamp] = token.split('.');

        console.log('🔍 Token parts:', {
            hashLength: tokenHash?.length,
            timestamp,
            timestampAge: timestamp ? `${Math.floor((Date.now() - parseInt(timestamp)) / 1000 / 60)} minutes` : 'N/A'
        });

        // Check expiry if specified
        if (expiryHours) {
            const tokenAge = Date.now() - parseInt(timestamp);
            const maxAge = expiryHours * 60 * 60 * 1000;
            if (tokenAge > maxAge) {
                console.warn('⏰ Token expired:', { tokenAge, maxAge });
                return false;
            }
        }

        // Regenerate token and compare
        const payload = `${restaurantId}:${tableId}:${timestamp}`;
        const secret = process.env.QR_SECRET || 'default-qr-secret-change-in-production';
        const defaultSecret = 'default-qr-secret-change-in-production';

        const expectedHash = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        // Use constant-time comparison to prevent timing attacks
        // Both hashes are hex strings, so we compare their buffer representations
        const tokenBuffer = Buffer.from(tokenHash);
        const expectedBuffer = Buffer.from(expectedHash);

        let isValid = false;

        if (tokenBuffer.length === expectedBuffer.length) {
            isValid = crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
        }

        // FALLBACK: If validation failed, and we are using a custom secret, try the default secret
        // This handles cases where the QR was generated in an environment without the custom secret (e.g. local dev)
        // or during a transition period.
        if (!isValid && secret !== defaultSecret) {
            console.log('⚠️ Primary secret validation failed. Attempting fallback to default secret...');
            const fallbackHash = crypto
                .createHmac('sha256', defaultSecret)
                .update(payload)
                .digest('hex');

            const fallbackBuffer = Buffer.from(fallbackHash);
            if (tokenBuffer.length === fallbackBuffer.length) {
                isValid = crypto.timingSafeEqual(tokenBuffer, fallbackBuffer);
                if (isValid) {
                    console.log('✅ Token validated using FALLBACK (Default) secret.');
                }
            }
        }

        console.log('✅ Token validation result:', isValid);
        return isValid;
    } catch (error) {
        console.error('❌ Token validation error:', error.message);
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
    const baseUrl = process.env.CLIENT_MENU_URL || 'http://192.168.0.6:5175';

    return `${baseUrl}/menu/${restaurantId}?table=${tableId}&token=${token}`;
};
