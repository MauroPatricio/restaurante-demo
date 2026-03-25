import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const socketInstance = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketInstance.on('connect', () => {
            console.log('🔌 Socket connected:', socketInstance.id);
            setConnected(true);
        });

        socketInstance.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
            setConnected(false);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    const joinRestaurant = (restaurantId) => {
        if (socket && connected) {
            socket.emit('join:restaurant', `restaurant:${restaurantId}`);
            console.log(`🔌 Joined restaurant room: restaurant:${restaurantId}`);
        }
    };

    return (
        <SocketContext.Provider value={{ socket, connected, joinRestaurant }}>
            {children}
        </SocketContext.Provider>
    );
};
