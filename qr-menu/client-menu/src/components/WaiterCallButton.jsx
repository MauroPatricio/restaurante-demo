import { useState } from 'react';
import { Bell } from 'lucide-react';
import { createWaiterCall } from '../services/waiterCallAPI';
import './WaiterCallButton.css';

export default function WaiterCallButton({ tableId }) {
    const [calling, setCalling] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [lastCallTime, setLastCallTime] = useState(null);

    const COOLDOWN_MS = 30000; // 30 seconds cooldown

    const canCall = () => {
        if (!lastCallTime) return true;
        const timeSinceLastCall = Date.now() - lastCallTime;
        return timeSinceLastCall >= COOLDOWN_MS;
    };

    const handleCallWaiter = async () => {
        if (!tableId) {
            alert('Mesa não identificada. Por favor, escaneie o QR code novamente.');
            return;
        }

        if (!canCall()) {
            const remainingSeconds = Math.ceil((COOLDOWN_MS - (Date.now() - lastCallTime)) / 1000);
            alert(`Por favor, aguarde ${remainingSeconds} segundos antes de chamar novamente.`);
            return;
        }

        setCalling(true);

        try {
            await createWaiterCall(tableId, 'call');
            setShowConfirmation(true);
            setLastCallTime(Date.now());

            // Hide confirmation after 3 seconds
            setTimeout(() => {
                setShowConfirmation(false);
            }, 3000);
        } catch (error) {
            console.error('Failed to call waiter:', error);

            if (error.response?.status === 409) {
                alert('Já existe uma chamada ativa para esta mesa. Por favor, aguarde o atendimento.');
            } else {
                alert('Erro ao chamar garçom. Por favor, tente novamente.');
            }
        } finally {
            setCalling(false);
        }
    };

    if (!tableId) {
        return null;
    }

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={handleCallWaiter}
                disabled={calling || !canCall()}
                className={`waiter-call-button ${calling ? 'calling' : ''} ${!canCall() ? 'cooldown' : ''}`}
                aria-label="Chamar Garçom"
            >
                <Bell size={24} className="bell-icon" />
                <span className="button-text">
                    {calling ? 'Chamando...' : 'Chamar Garçom'}
                </span>
            </button>

            {/* Success Confirmation Toast */}
            {showConfirmation && (
                <div className="call-confirmation">
                    <div className="confirmation-content">
                        <span className="check-icon">✓</span>
                        <div>
                            <div className="confirmation-title">Garçom Chamado!</div>
                            <div className="confirmation-message">
                                Em breve alguém virá atendê-lo
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
