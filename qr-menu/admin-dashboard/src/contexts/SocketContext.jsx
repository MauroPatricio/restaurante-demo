import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const socketRef = useRef(null);
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [activeCalls, setActiveCalls] = useState([]);

    // Get restaurant data safely from user object 
    const restaurant = user?.restaurant;

    const [pendingAlerts, setPendingAlerts] = useState(() => {
        // Load initial state from localStorage to persist across refreshes
        if (!restaurant?._id) return [];
        const saved = localStorage.getItem(`pending-alerts-${restaurant._id}`);
        return saved ? JSON.parse(saved) : [];
    });

    // Save alerts to localStorage whenever they change
    useEffect(() => {
        if (restaurant?._id) {
            localStorage.setItem(`pending-alerts-${restaurant._id}`, JSON.stringify(pendingAlerts));
        }
    }, [pendingAlerts, restaurant?._id]);

    useEffect(() => {
        // Only connect if user is authenticated and has restaurant context
        if (!user || !restaurant?._id) {
            if (socketRef.current) {
                console.log('Disconnecting socket - no user/restaurant');
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setConnected(false);
            }
            return;
        }

        // Create socket connection
        console.log('Creating socket connection to:', SOCKET_URL);
        const newSocket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current = newSocket;

        // Connection events
        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setConnected(true);

            // Join restaurant room
            newSocket.emit('join:restaurant', { restaurantId: restaurant._id });
        });

        newSocket.on('joined:restaurant', (data) => {
            console.log('Joined restaurant room:', data);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            setConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        // New Order Alert
        newSocket.on('order:new', (data) => {
            console.log('🔔 New order received:', data);
            setPendingAlerts(prev => {
                // Avoid duplicates
                if (prev.some(a => a.orderId === data.orderId)) return prev;
                return [...prev, { ...data, timestamp: new Date(), type: 'new' }];
            });
        });

        // Order Updated Alert (e.g. from client adding items)
        newSocket.on('order-updated', (data) => {
            console.log('📝 Order updated:', data);
            // We only care about updates that haven't been acknowledged yet
            // In the future, we could filter by source (client vs staff)
            // For now, if it's already in pending, we update it, if not, we might add it
            // if it's a specific type of update.
        });

        // Waiter call events
        newSocket.on('waiter:call', (data) => {
            console.log('Received waiter call:', data);
            setActiveCalls(prev => {
                // Check if call already exists
                if (prev.some(call => call.callId === data.callId)) {
                    return prev;
                }
                return [...prev, data];
            });
        });

        newSocket.on('waiter:call:acknowledged', (data) => {
            console.log('Call acknowledged:', data);
            setActiveCalls(prev =>
                prev.map(call =>
                    call.callId === data.callId
                        ? { ...call, acknowledged: true, acknowledgedAt: data.acknowledgedAt }
                        : call
                )
            );
        });

        newSocket.on('waiter:call:resolved', (data) => {
            console.log('Call resolved:', data);
            setActiveCalls(prev =>
                prev.filter(call => call.callId !== data.callId)
            );
        });

        // Client reaction events
        newSocket.on('client:reaction', (data) => {
            console.log('Received client reaction:', data);
            // Handle reaction notification (optional toast/badge)
        });

        setSocket(newSocket);

        // Cleanup on unmount
        return () => {
            console.log('Cleaning up socket connection');
            if (newSocket) {
                newSocket.emit('leave:restaurant', { restaurantId: restaurant._id });
                newSocket.disconnect();
            }
        };
    }, [user, restaurant]);

    const acknowledgeOrderAlert = (orderIdOrTableNumber) => {
        setPendingAlerts(prev => prev.filter(a =>
            a.orderId !== orderIdOrTableNumber && a.tableNumber !== orderIdOrTableNumber
        ));
    };

    const acknowledgeCall = (callId) => {
        setActiveCalls(prev =>
            prev.map(call =>
                call.callId === callId
                    ? { ...call, acknowledged: true }
                    : call
            )
        );
    };

    const removeCall = (callId) => {
        setActiveCalls(prev => prev.filter(call => call.callId !== callId));
    };

    const value = {
        socket,
        connected,
        activeCalls,
        pendingAlerts,
        acknowledgeOrderAlert,
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
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export default SocketContext;
