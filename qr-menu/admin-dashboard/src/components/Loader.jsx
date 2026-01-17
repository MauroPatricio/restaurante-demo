import { Loader as LoaderIcon } from 'lucide-react';

/**
 * Reusable Loading Component
 * 
 * Variants:
 * - page: Fullscreen overlay (for route/page loading)
 * - section: Container-based loader (for cards/panels)
 * - inline: Inline loader (for buttons)
 * 
 * Sizes: small (20px), medium (40px), large (60px)
 */
export default function Loader({
    variant = 'section',
    size = 'medium',
    color = '#3b82f6',
    message = null
}) {
    const sizeMap = {
        small: 20,
        medium: 40,
        large: 60
    };

    const iconSize = sizeMap[size] || sizeMap.medium;

    const spinnerStyle = {
        animation: 'spin 0.6s linear infinite',
        color: color
    };

    // Inject keyframes if not already present
    if (typeof document !== 'undefined' && !document.getElementById('loader-keyframes')) {
        const style = document.createElement('style');
        style.id = 'loader-keyframes';
        style.textContent = `
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    if (variant === 'page') {
        return (
            <div style={styles.pageOverlay}>
                <div style={styles.pageContent}>
                    <LoaderIcon size={iconSize} style={spinnerStyle} />
                    {message && <p style={styles.message}>{message}</p>}
                </div>
            </div>
        );
    }

    if (variant === 'section') {
        return (
            <div style={styles.sectionContainer}>
                <LoaderIcon size={iconSize} style={spinnerStyle} />
                {message && <p style={styles.message}>{message}</p>}
            </div>
        );
    }

    if (variant === 'inline') {
        return (
            <span style={styles.inlineContainer}>
                <LoaderIcon size={iconSize} style={spinnerStyle} />
                {message && <span style={styles.inlineMessage}>{message}</span>}
            </span>
        );
    }

    return null;
}

const styles = {
    // Page Variant (Fullscreen)
    pageOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
    },
    pageContent: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
    },

    // Section Variant (Container)
    sectionContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        minHeight: '200px',
        gap: '12px'
    },

    // Inline Variant (Button/Text)
    inlineContainer: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px'
    },

    // Shared
    message: {
        fontSize: '14px',
        color: '#64748b',
        margin: 0
    },
    inlineMessage: {
        fontSize: '14px',
        color: '#64748b'
    }
};
