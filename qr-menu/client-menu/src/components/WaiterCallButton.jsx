import { useState } from 'react';
import { Bell } from 'lucide-react';
import { createWaiterCall } from '../services/waiterCallAPI';
import { useSound } from '../hooks/useSound';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './WaiterCallButton.css';

export default function WaiterCallButton({ tableId, className = '', variant = 'floating' }) {
    const { restaurantId } = useParams();
    const { t } = useTranslation();
    const [calling, setCalling] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [lastCallTime, setLastCallTime] = useState(null);

    // Sound notification for calling waiter
    const { play: playCallSound } = useSound('/sounds/bell2.mp3');

    const COOLDOWN_MS = 30000; // 30 seconds cooldown

    const canCall = () => {
        if (!lastCallTime) return true;
        const timeSinceLastCall = Date.now() - lastCallTime;
        return timeSinceLastCall >= COOLDOWN_MS;
    };

    const handleCallWaiter = async () => {
        if (!tableId) {
            alert(t('error_session_invalid'));
            return;
        }

        if (!canCall()) {
            const remainingSeconds = Math.ceil((COOLDOWN_MS - (Date.now() - lastCallTime)) / 1000);
            alert(t('waiter_call_cooldown', { seconds: remainingSeconds }));
            return;
        }

        setCalling(true);

        try {
            const customerName = localStorage.getItem(`customer-name-${restaurantId}`) || '';
            await createWaiterCall(tableId, 'call', customerName);

            // Play sound on successful call
            playCallSound();

            setShowConfirmation(true);
            setLastCallTime(Date.now());

            // Hide confirmation after 3 seconds
            setTimeout(() => {
                setShowConfirmation(false);
            }, 3000);
        } catch (error) {
            console.error('Failed to call waiter:', error);

            if (error.response?.status === 409) {
                alert(t('waiter_active_call'));
            } else {
                alert(t('waiter_call_error'));
            }
        } finally {
            setCalling(false);
        }
    };

    if (!tableId) {
        return null;
    }

    const baseClass = variant === 'floating' ? 'waiter-call-button' : 'waiter-call-button-inline';

    return (
        <>
            {/* Call Button */}
            <button
                onClick={handleCallWaiter}
                disabled={calling || !canCall()}
                className={`${baseClass} ${calling ? 'calling' : ''} ${!canCall() ? 'cooldown' : ''} ${className}`}
                aria-label={t('call_waiter')}
            >
                <Bell size={24} className="bell-icon" />
                <span className="button-text">
                    {calling ? t('calling') : t('call_waiter')}
                </span>
            </button>

            {/* Success Confirmation Toast */}
            {showConfirmation && (
                <div className="call-confirmation">
                    <div className="confirmation-content">
                        <span className="check-icon">✓</span>
                        <div>
                            <div className="confirmation-title">{t('waiter_called_title')}</div>
                            <div className="confirmation-message">
                                {t('waiter_confirmation_msg')}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
