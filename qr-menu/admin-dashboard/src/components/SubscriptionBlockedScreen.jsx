import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SubscriptionBlockedScreen = ({ userType = 'staff', subscription }) => {
    const { t } = useTranslation();
    const { logout } = useAuth();
    const [isHovered, setIsHovered] = useState(false);

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
        borderRadius: '24px',
        padding: '48px 40px',
        maxWidth: '520px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        animation: 'fadeIn 0.3s ease-out',
        border: '1px solid #f1f5f9'
    };

    const iconContainerStyle = {
        width: '96px',
        height: '96px',
        borderRadius: '50%',
        backgroundColor: '#fee2e2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 28px auto'
    };

    const titleStyle = {
        fontSize: '28px',
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: '16px',
        letterSpacing: '-0.02em'
    };

    const descriptionStyle = {
        fontSize: '16px',
        color: '#64748b',
        marginBottom: '32px',
        lineHeight: '1.6'
    };

    const buttonsContainerStyle = {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    };

    const primaryButtonStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '16px',
        backgroundColor: isHovered ? '#1d4ed8' : '#2563eb',
        color: '#ffffff',
        borderRadius: '12px',
        fontWeight: '600',
        textDecoration: 'none',
        fontSize: '16px',
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
    };

    const secondaryButtonStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '16px',
        backgroundColor: 'transparent',
        color: '#64748b',
        borderRadius: '12px',
        fontWeight: '500',
        textDecoration: 'none',
        fontSize: '16px',
        border: '1px solid #e2e8f0',
        cursor: 'pointer',
        transition: 'all 0.2s'
    };

    const disabledButtonStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '16px',
        backgroundColor: '#f1f3f5',
        color: '#868e96',
        borderRadius: '12px',
        fontWeight: '500',
        textDecoration: 'none',
        fontSize: '16px',
        border: 'none',
        cursor: 'default'
    };

    const linkButtonStyle = {
        background: 'none',
        border: 'none',
        color: '#ef4444',
        fontSize: '16px',
        fontWeight: '500',
        cursor: 'pointer',
        marginTop: '8px',
        padding: '8px',
        alignSelf: 'center',
        transition: 'color 0.2s'
    };

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <div style={iconContainerStyle}>
                    <Lock size={44} color="#dc2626" />
                </div>

                <h2 style={titleStyle}>
                    {t('subscription_expired_title') || 'Subscrição Expirada'}
                </h2>

                <p style={descriptionStyle}>
                    {t('subscription_expired_message') || 'A sua subscrição expirou. O acesso está restringido.'}
                </p>

                <div style={buttonsContainerStyle}>
                    {(userType === 'owner' || userType === 'admin') ? (
                        <Link
                            to="/dashboard/subscription"
                            style={primaryButtonStyle}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                        >
                            <CreditCard size={18} />
                            {t('subscription_renew_button') || 'Renovar Assinatura'}
                        </Link>
                    ) : (
                        <div style={disabledButtonStyle}>
                            {t('contact_manager_access') || 'Contacte o seu gestor para renovar o acesso'}
                        </div>
                    )}

                    <button
                        style={linkButtonStyle}
                        onClick={logout}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#b91c1c'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#ef4444'}
                    >
                        {t('logout') || 'Sair'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionBlockedScreen;

