import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useSound } from '../hooks/useSound';
import { orderAPI } from '../services/api';

const SocketContext = createContext(null);

const getSocketUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL;

    if (apiUrl) {
        // Remove trailing /api or /api/
        let base = apiUrl.replace(/\/api\/?$/, '');

        // If the result is explicitly just a protocol or invalid, fallback
        try {
            new URL(base);
            return base;
        } catch (e) {
            console.error('Invalid VITE_API_URL for socket, falling back');
        }
    }

    // Auto-detect based on hostname
    const hostname = window.location.hostname;

    if (hostname.includes('gestaomodernaonline.com')) {
        return 'https://api.gestaomodernaonline.com';
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return ''; // Use same-origin to leverage Vite Proxy
    } else {
        return `http://${hostname}:5000`;
    }
};

const SOCKET_URL = getSocketUrl();

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const socketRef = useRef(null);
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [activeCalls, setActiveCalls] = useState([]);

    // Restaurant context
    const restaurant = user?.restaurant;

    // --- New Notification State ---
    const [audioEnabled, setAudioEnabled] = useState(() => {
        return localStorage.getItem('audioEnabled') !== 'false'; // Default to true
    });

    const [isRinging, setIsRinging] = useState(false);
    const [pendingCount, setPendingCount] = useState(0); // Total orders in 'pending' state
    const ringingIntervalRef = useRef(null);

    // Audio hooks
    const { play: playNewOrderSound } = useSound('/sounds/glass.mp3');
    const { play: playReadySound } = useSound('/sounds/bell3.mp3');

    // Persist Audio Setting
    useEffect(() => {
        localStorage.setItem('audioEnabled', audioEnabled);
    }, [audioEnabled]);

    // Ringing Loop Logic
    useEffect(() => {
        if (isRinging && audioEnabled) {
            // Play immediately
            playNewOrderSound();

            // Loop every 3 seconds
            ringingIntervalRef.current = setInterval(() => {
                playNewOrderSound();
            }, 3000);
        } else {
            // Stop logic
            if (ringingIntervalRef.current) {
                clearInterval(ringingIntervalRef.current);
                ringingIntervalRef.current = null;
            }
        }

        return () => {
            if (ringingIntervalRef.current) {
                clearInterval(ringingIntervalRef.current);
                ringingIntervalRef.current = null;
            }
        };
    }, [isRinging, audioEnabled, playNewOrderSound]);

    // Initial Fetch for Counts
    useEffect(() => {
        const fetchInitialCounts = async () => {
            if (restaurant?._id) {
                try {
                    // Fetch only pending orders to get count
                    const { data } = await orderAPI.getAll(restaurant._id, { status: 'pending' });
                    const orders = Array.isArray(data?.orders) ? data.orders : [];
                    setPendingCount(orders.length);
                } catch (err) {
                    console.error('Failed to fetch initial pending count', err);
                }
            }
        };
        fetchInitialCounts();
    }, [restaurant]);

    // ... (Socket Connection Logic remains similar, updated handlers below)

    useEffect(() => {
        if (!user || !restaurant?._id) {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setConnected(false);
            }
            return;
        }

        console.log('Creating socket connection to:', SOCKET_URL);
        const newSocket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setConnected(true);
            newSocket.emit('join:restaurant', { restaurantId: restaurant._id });
        });

        newSocket.on('disconnect', () => setConnected(false));

        // --- Event Handlers ---

        newSocket.on('order:new', (data) => {
            console.log('🔔 New order received:', data);

            // 1. Update Count
            setPendingCount(prev => prev + 1);

            // 2. Start Ringing (Notification)
            // If user is already on Orders page, maybe distinct logic? 
            // For now, always ring unless disabled.
            setIsRinging(true);
        });

        newSocket.on('order-updated', (data) => {
            console.log('📝 Order updated:', data);

            // Check Status Change for Count
            // Note: data might trigger update, but we might not know 'previous' status purely from event
            // unless backend sends it. 
            // Ideally we re-fetch or assume if it enters 'pending' from null (unlikely)
            // or leaves 'pending' (to preparing/ready).

            // Simplest approach: Re-fetch count strictly? Or estimate?
            // Re-fetching is safer for accuracy.
            // Let's do a lightweight re-check or just adjust if we know the transition.
            // Backend usually sends the FULL updated order.

            if (data.status !== 'pending') {
                // It might have been pending before. Safe to re-fetch to be accurate.
                // Optimization: Decrement if we knew it was pending? Hard to know.
                // Let's fetch count again to be consistent. 
                // (Debounced or just call it, distinct from main list fetch)
                orderAPI.getAll(restaurant._id, { status: 'pending' })
                    .then(({ data }) => {
                        const orders = Array.isArray(data?.orders) ? data.orders : [];
                        setPendingCount(orders.length);
                    })
                    .catch(console.error);
            }

            // Check for "Ready" Sound
            if (data.status === 'ready' && audioEnabled) {
                playReadySound();
            }
        });

        // Waiter Calls (Preserve existing logic)
        newSocket.on('waiter:call', (data) => {
            setActiveCalls(prev => {
                if (prev.some(call => call.callId === data.callId)) return prev;
                return [...prev, data];
            });
        });

        newSocket.on('waiter:call:acknowledged', (data) => {
            setActiveCalls(prev => prev.map(call =>
                call.callId === data.callId ? { ...call, acknowledged: true } : call
            ));
        });

        newSocket.on('waiter:call:resolved', (data) => {
            setActiveCalls(prev => prev.filter(call => call.callId !== data.callId));
        });

        setSocket(newSocket);

        return () => {
            if (newSocket) {
                newSocket.disconnect();
            }
        };
    }, [user, restaurant, audioEnabled, playNewOrderSound, playReadySound]);

    // actions
    const stopRinging = () => setIsRinging(false);
    const toggleAudio = () => setAudioEnabled(prev => !prev);

    // Keep acknowledge for waiter calls
    const acknowledgeCall = (callId) => {
        setActiveCalls(prev => prev.map(c => c.callId === callId ? { ...c, acknowledged: true } : c));
    };
    const removeCall = (callId) => {
        setActiveCalls(prev => prev.filter(c => c.callId !== callId));
    };

    const value = {
        socket,
        connected,
        activeCalls,
        // New Props
        isRinging,
        pendingCount,
        audioEnabled,
        stopRinging,
        toggleAudio,
        // Legacy
        acknowledgeCall,
        removeCall
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (context === undefined) throw new Error('useSocket must be used within a SocketProvider');
    return context;
};

export default SocketContext;
