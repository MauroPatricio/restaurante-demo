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

        if (secret === 'default-qr-secret-change-in-production') {
            console.log('⚠️ Using DEFAULT QR secret for validation');
        } else {
            console.log('🔒 Using CUSTOM QR secret from env for validation');
        }

        const expectedHash = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        console.log('🔍 Hash comparison:', {
            providedHashStart: tokenHash?.substring(0, 10),
            expectedHashStart: expectedHash?.substring(0, 10),
            match: tokenHash === expectedHash
        });

        // Use constant-time comparison to prevent timing attacks
        // Both hashes are hex strings, so we compare their buffer representations
        const tokenBuffer = Buffer.from(tokenHash);
        const expectedBuffer = Buffer.from(expectedHash);

        if (tokenBuffer.length !== expectedBuffer.length) {
            console.error('❌ Token buffer length mismatch:', {
                tokenLength: tokenBuffer.length,
                expectedLength: expectedBuffer.length
            });
            return false;
        }

        const isValid = crypto.timingSafeEqual(tokenBuffer, expectedBuffer);

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
    const baseUrl = process.env.CLIENT_MENU_URL || 'http://46.62.246.24:5175';

    return `${baseUrl}/menu/${restaurantId}?table=${tableId}&token=${token}`;
};
