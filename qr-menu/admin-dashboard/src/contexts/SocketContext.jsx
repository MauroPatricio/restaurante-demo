import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useSound } from '../hooks/useSound';
import api, { orderAPI } from '../services/api';

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
        return 'http://127.0.0.1:5173'; // Force IPv4 to match Vite proxy
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
    const [pendingRenewals, setPendingRenewals] = useState([]); // For Admins

    // Restaurant context
    const restaurant = user?.restaurant;

    // --- New Notification State ---
    const [audioEnabled, setAudioEnabled] = useState(() => {
        return localStorage.getItem('audioEnabled') !== 'false'; // Default to true
    });

    const [isRinging, setIsRinging] = useState(false);
    const [dineInPendingCount, setDineInPendingCount] = useState(0); 
    const [roomPendingCount, setRoomPendingCount] = useState(0);
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
                    
                    const dineIn = orders.filter(o => !o.roomService).length;
                    const room = orders.filter(o => !!o.roomService).length;
                    
                    setDineInPendingCount(dineIn);
                    setRoomPendingCount(room);
                } catch (err) {
                    console.error('Failed to fetch initial pending counts', err);
                }
            }

            // If Admin, fetch pending renewals
            const isAdmin = user?.role?.isSystem === true || user?.role?.name === 'System Admin';
            if (isAdmin) {
                try {
                    const { data } = await api.get('/subscriptions/admin/transactions?status=pending');
                    setPendingRenewals(data.transactions || []);
                } catch (err) {
                    console.error('Failed to fetch initial renewals count', err);
                }
            }
        };
        fetchInitialCounts();
    }, [restaurant, user]);

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


        const newSocket = io(SOCKET_URL, {
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = newSocket;

        newSocket.on('connect', () => {

            setConnected(true);
            newSocket.emit('join:restaurant', { restaurantId: restaurant._id });
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
        });

        newSocket.on('disconnect', () => setConnected(false));

        // --- Event Handlers ---

        newSocket.on('order:new', (data) => {


            // 1. Update Count
            setDineInPendingCount(prev => prev + 1);

            // 2. Start Ringing (Notification)
            // If user is already on Orders page, maybe distinct logic? 
            // For now, always ring unless disabled.
            setIsRinging(true);

            // 3. Broadcast refresh to any listening components (e.g., Tables dashboard)
            window.dispatchEvent(new CustomEvent('data-refresh', { detail: { type: 'order', action: 'new' } }));
        });

        // Room-service orders — same notification as dine-in
        newSocket.on('room:order:new', (data) => {
            setRoomPendingCount(prev => prev + 1);
            setIsRinging(true);
            window.dispatchEvent(new CustomEvent('data-refresh', { detail: { type: 'order', action: 'new' } }));
        });

        newSocket.on('order-updated', (data) => {


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
                        setDineInPendingCount(orders.filter(o => !o.roomService).length);
                        setRoomPendingCount(orders.filter(o => !!o.roomService).length);
                    })
                    .catch(console.error);
            }

            // Check for "Ready" Sound
            if (data.status === 'ready' && audioEnabled) {
                playReadySound();
            }

            // Broadcast refresh
            window.dispatchEvent(new CustomEvent('data-refresh', { detail: { type: 'order', action: 'update', data } }));
        });

        // Waiter Calls (Preserve existing logic)
        newSocket.on('waiter:call', (data) => {
            setActiveCalls(prev => {
                if (prev.some(call => call.callId === data.callId)) return prev;
                return [...prev, data];
            });
            window.dispatchEvent(new CustomEvent('data-refresh', { detail: { type: 'call', action: 'new', data } }));
        });

        newSocket.on('waiter:call:acknowledged', (data) => {
            setActiveCalls(prev => prev.map(call =>
                call.callId === data.callId ? { ...call, acknowledged: true } : call
            ));
        });

        newSocket.on('waiter:call:resolved', (data) => {
            setActiveCalls(prev => prev.filter(call => call.callId !== data.callId));
            window.dispatchEvent(new CustomEvent('data-refresh', { detail: { type: 'call', action: 'resolved', data } }));
        });

        // --- Table Events ---
        newSocket.on('table:updated', (data) => {
            window.dispatchEvent(new CustomEvent('data-refresh', { detail: { type: 'table', action: 'updated', data } }));
        });

        newSocket.on('table:status-updated', (data) => {
            window.dispatchEvent(new CustomEvent('data-refresh', { detail: { type: 'table', action: 'status', data } }));
        });

        // --- Subscription Events ---
        newSocket.on('subscription:renewal_request', (data) => {
            const isAdmin = user?.role?.isSystem === true || user?.role?.name === 'System Admin';
            if (isAdmin) {

                setPendingRenewals(prev => {
                    if (prev.some(r => r._id === data.requestId)) return prev;
                    return [data, ...prev];
                });

                // Play sound for admins
                if (audioEnabled) {
                    playNewOrderSound(); // glass.mp3
                }
            }
        });

        newSocket.on('subscription:activated', (data) => {
            if (restaurant?._id === data.restaurantId || restaurant?.id === data.restaurantId) {

                // Broadcast to update context immediately if needed, 
                // but just a reload or re-fetch is standard.
                // We'll use a custom event for other contexts to listen
                window.dispatchEvent(new CustomEvent('subscription-updated'));
            }

            // If Admin, remove from pending list
            if (user?.role?.isSystem) {
                setPendingRenewals(prev => prev.filter(r => r._id !== data.requestId));
            }
        });

        newSocket.on('subscription:rejected', (data) => {
            if (restaurant?._id === data.restaurantId || restaurant?.id === data.restaurantId) {

                window.dispatchEvent(new CustomEvent('subscription-updated'));
            }

            // If Admin, remove from pending list
            if (user?.role?.isSystem) {
                setPendingRenewals(prev => prev.filter(r => r._id !== data.requestId));
            }
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

    const removeRenewal = (requestId) => {
        setPendingRenewals(prev => prev.filter(r => r._id !== requestId));
    };

    const value = {
        socket,
        connected,
        activeCalls,
        pendingRenewals,
        removeRenewal,
        // New Props
        isRinging,
        dineInPendingCount,
        roomPendingCount,
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
