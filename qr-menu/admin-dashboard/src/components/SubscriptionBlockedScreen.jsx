import { useTranslation } from 'react-i18next';
import { AlertTriangle, Lock, CreditCard, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const SubscriptionBlockedScreen = ({ userType = 'staff', subscription }) => {
    const { t } = useTranslation();

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px'
    };

    const modalStyle = {
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        animation: 'fadeIn 0.3s ease-out'
    };

    const iconLocalContainerStyle = {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: '#fee2e2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px auto'
    };

    const titleStyle = {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '12px'
    };

    const descriptionStyle = {
        fontSize: '16px',
        color: '#4b5563',
        marginBottom: '32px',
        lineHeight: '1.5'
    };

    const buttonsContainerStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    };

    const primaryButtonStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '14px',
        backgroundColor: '#2563eb',
        color: '#ffffff',
        borderRadius: '10px',
        fontWeight: '600',
        textDecoration: 'none',
        fontSize: '16px',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    };

    const secondaryButtonStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '14px',
        backgroundColor: 'transparent',
        color: '#6b7280',
        borderRadius: '10px',
        fontWeight: '500',
        textDecoration: 'none',
        fontSize: '16px',
        border: '1px solid #e5e7eb',
        cursor: 'pointer'
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <div style={iconLocalContainerStyle}>
                    <Lock size={40} color="#dc2626" />
                </div>

                <h2 style={titleStyle}>
                    {t('subscription_expired_title') || 'Subscription Expired'}
                </h2>

                <p style={descriptionStyle}>
                    {t('subscription_expired_message') || 'The subscription period for this restaurant has expired. Renew now for 30 more days to continue using all features.'}
                </p>

                <div style={buttonsContainerStyle}>
                    {(userType === 'owner' || userType === 'admin') ? (
                        <Link
                            to="/dashboard/subscription"
                            style={primaryButtonStyle}
                        >
                            <CreditCard size={18} />
                            {t('subscription_renew_button') || 'Renew Subscription'}
                        </Link>
                    ) : (
                        <div style={{ ...secondaryButtonStyle, backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}>
                            {t('contact_manager_access') || 'Contact your manager to renew access'}
                        </div>
                    )}

                    <Link
                        to="/select-restaurant"
                        style={secondaryButtonStyle}
                    >
                        {t('back_to_restaurants') || 'Selecionar Outro Restaurante'}
                    </Link>

                    <button
                        style={{ ...secondaryButtonStyle, border: 'none', color: '#ef4444', marginTop: '-8px' }}
                        onClick={() => window.location.href = '/login'}
                    >
                        {t('logout') || 'Sair'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionBlockedScreen;
