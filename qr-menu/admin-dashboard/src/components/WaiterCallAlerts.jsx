import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Clock } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './WaiterCallAlerts.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function WaiterCallAlerts() {
    const { activeCalls, acknowledgeCall: localAcknowledge, removeCall } = useSocket();
    const { user } = useAuth();
    const [minimized, setMinimized] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const audioRef = useRef(null);
    const soundIntervalRef = useRef(null);

    // Check if user can manage calls
    const canManageCalls = () => {
        const allowedRoles = ['Owner', 'Manager', 'Waiter'];
        return user && allowedRoles.includes(user.role?.name);
    };

    // Play alert sound
    useEffect(() => {
        if (!soundEnabled || !canManageCalls()) return;

        // Check if there are unacknowledged calls
        const unacknowledgedCalls = activeCalls.filter(call => !call.acknowledged);

        if (unacknowledgedCalls.length > 0) {
            // Start playing sound
            if (!soundIntervalRef.current) {
                playAlertSound();
                soundIntervalRef.current = setInterval(() => {
                    playAlertSound();
                }, 3000); // Repeat every 3 seconds
            }
        } else {
            // Stop playing sound
            if (soundIntervalRef.current) {
                clearInterval(soundIntervalRef.current);
                soundIntervalRef.current = null;
            }
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        }

        return () => {
            if (soundIntervalRef.current) {
                clearInterval(soundIntervalRef.current);
                soundIntervalRef.current = null;
            }
        };
    }, [activeCalls, soundEnabled]);

    const playAlertSound = () => {
        if (!audioRef.current) {
            // Create audio element for beep sound
            audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRQ0PVqzl8LJrHAU+ltjz0YouBSh+zPLaizsIGGS57OmhUhELTKXh8bllHAU7k9Xy04k2BxxzvO/mnEsPD1Ws5fCya1oCPpbY89KLLgUofszx2os8ByBrwO/jmEUMEFWt5PC0bhwFPJXX8tOJNgcca7zv5p5LDxBVrOTwtm4cBT2W2PLSiy4FKH7M8duLOwcfassP46RFDBBS reXwsm0cBT2V1/LTiTUHHGy87+SeSwwRVazl8LJuHAU9ldjy0osuBSh+zPHbizwHH2rK8OOkRQwRUq7k8LNtHQU8ldfy04k2Bxttve/kn0sPEFSs5fCyaBwGPJXY8tOLLgUoft');
        }

        audioRef.current.play().catch(err => {
            console.log('Audio play failed:', err);
        });
    };

    const handleAcknowledge = async (callId) => {
        try {
            await axios.post(`${API_URL}/waiter-calls/${callId}/acknowledge`);
            localAcknowledge(callId);
        } catch (error) {
            console.error('Failed to acknowledge call:', error);
            alert('Erro ao reconhecer chamada. Por favor, tente novamente.');
        }
    };

    const handleResolve = async (callId) => {
        try {
            await axios.post(`${API_URL}/waiter-calls/${callId}/resolve`);
            removeCall(callId);
        } catch (error) {
            console.error('Failed to resolve call:', error);
            alert('Erro ao resolver chamada. Por favor, tente novamente.');
        }
    };

    const toggleSound = () => {
        setSoundEnabled(!soundEnabled);
        if (soundIntervalRef.current) {
            clearInterval(soundIntervalRef.current);
            soundIntervalRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    };

    if (!canManageCalls() || activeCalls.length === 0) {
        return null;
    }

    const unacknowledgedCount = activeCalls.filter(call => !call.acknowledged).length;

    return (
        <div className={`waiter-call-alerts ${minimized ? 'minimized' : ''} ${unacknowledgedCount > 0 ? 'has-unacknowledged' : ''}`}>
            {/* Header */}
            <div className="alerts-header" onClick={() => setMinimized(!minimized)}>
                <div className="header-content">
                    <div className="header-left">
                        <Bell
                            size={20}
                            className={`bell-icon ${unacknowledgedCount > 0 ? 'ringing' : ''}`}
                        />
                        <span className="header-title">
                            Chamadas Ativas
                            {unacknowledgedCount > 0 && (
                                <span className="urgent-badge">{unacknowledgedCount}</span>
                            )}
                        </span>
                    </div>
                    <div className="header-actions">
                        {unacknowledgedCount > 0 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSound();
                                }}
                                className="sound-toggle"
                                title={soundEnabled ? 'Silenciar' : 'Ativar Som'}
                            >
                                {soundEnabled ? '🔊' : '🔇'}
                            </button>
                        )}
                        <button
                            className="minimize-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setMinimized(!minimized);
                            }}
                        >
                            {minimized ? '▲' : '▼'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Calls List */}
            {!minimized && (
                <div className="alerts-body">
                    {activeCalls.map((call) => (
                        <div
                            key={call.callId}
                            className={`call-item ${call.acknowledged ? 'acknowledged' : 'pending'}`}
                        >
                            <div className="call-info">
                                <div className="call-header">
                                    <span className="table-number">Mesa {call.tableNumber}</span>
                                    <span className="call-time">
                                        <Clock size={12} />
                                        {formatTime(call.createdAt)}
                                    </span>
                                </div>
                                {call.waiterName && (
                                    <div className="call-waiter">
                                        Garçom: {call.waiterName}
                                    </div>
                                )}
                                <div className="call-type">
                                    {call.type === 'payment_request' ? 'Pedido de Conta' : 'Chamar Garçom'}
                                </div>
                            </div>

                            <div className="call-actions">
                                {!call.acknowledged ? (
                                    <button
                                        onClick={() => handleAcknowledge(call.callId)}
                                        className="btn-acknowledge"
                                        title="Reconhecer (para alarme)"
                                    >
                                        <Check size={16} />
                                        Atender
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleResolve(call.callId)}
                                        className="btn-resolve"
                                        title="Marcar como resolvido"
                                    >
                                        <X size={16} />
                                        Resolver
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
