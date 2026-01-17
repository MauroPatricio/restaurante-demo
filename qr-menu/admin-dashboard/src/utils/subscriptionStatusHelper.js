/**
 * Subscription Status Helper Utility
 * Provides standardized functions for subscription status handling across the admin dashboard
 */

/**
 * Get the translated label for a subscription status
 * @param {string} status - The subscription status (trial, active, suspended, cancelled, expired)
 * @param {function} t - The i18n translation function
 * @returns {string} The translated status label
 */
export const getStatusLabel = (status, t) => {
    if (!status) return '';
    // Normalize status: lowercase and handle potential backend inconsistencies (e.g. PERIODO_DE_TESTE -> trial)
    let normalizedStatus = status.toLowerCase();

    // Map known legacy/bad statuses to standard ones if needed
    if (normalizedStatus === 'periodo_de_teste') normalizedStatus = 'trial';

    return t(`subscription_status_${normalizedStatus}`) || normalizedStatus;
};

export const getStatusBadgeStyle = (status) => {
    const styles = {
        trial: {
            color: '#0369a1',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            boxShadow: '0 1px 2px rgba(186, 230, 253, 0.4)',
            backgroundImage: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
        },
        active: {
            color: '#047857',
            backgroundColor: '#ecfdf5',
            border: '1px solid #6ee7b7',
            boxShadow: '0 1px 2px rgba(110, 231, 183, 0.4)',
            backgroundImage: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
        },
        suspended: {
            color: '#b45309',
            backgroundColor: '#fffbeb',
            border: '1px solid #fbbf24',
            boxShadow: '0 1px 2px rgba(251, 191, 36, 0.4)',
            backgroundImage: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
        },
        cancelled: {
            color: '#4b5563',
            backgroundColor: '#f9fafb',
            border: '1px solid #d1d5db',
            boxShadow: '0 1px 2px rgba(209, 213, 223, 0.4)',
            backgroundImage: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
        },
        expired: {
            color: '#be1212',
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            boxShadow: '0 1px 2px rgba(252, 165, 165, 0.4)',
            backgroundImage: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
        },
        pending_activation: {
            color: '#7c2d12',
            backgroundColor: '#fff7ed',
            border: '1px solid #fdba74',
            boxShadow: '0 1px 2px rgba(253, 186, 116, 0.4)',
            backgroundImage: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
        },
        expiring: {
            color: '#c2410c',
            backgroundColor: '#fffaf0',
            border: '1px solid #fbd38d',
            boxShadow: '0 1px 2px rgba(251, 211, 141, 0.4)',
            backgroundImage: 'linear-gradient(135deg, #fffaf0 0%, #feebc8 100%)',
            fontWeight: '700'
        }
    };

    return styles[status] || styles.expired;
};

/**
 * Check if a subscription status allows access to the system
 * @param {string} status - The subscription status
 * @returns {boolean} True if access is allowed
 */
export const isAccessAllowed = (status) => {
    return status === 'active' || status === 'trial';
};

/**
 * Check if a subscription status requires renewal
 * @param {string} status - The subscription status
 * @returns {boolean} True if renewal is required
 */
export const requiresRenewal = (status) => {
    return status === 'expired' || status === 'suspended' || status === 'cancelled';
};

/**
 * Get a status badge component props
 * @param {string} status - The subscription status
 * @param {function} t - The i18n translation function
 * @returns {object} Props for rendering a status badge
 */
export const getStatusBadgeProps = (status, t) => {
    return {
        label: getStatusLabel(status, t),
        style: {
            ...getStatusBadgeStyle(status),
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '600',
            display: 'inline-block',
            textAlign: 'center'
        }
    };
};
