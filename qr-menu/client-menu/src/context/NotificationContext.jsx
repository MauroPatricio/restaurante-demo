import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL, API_URL } from '../config/api';
import axios from 'axios';
import NotificationToast from '../components/NotificationToast';
import { useSound } from '../hooks/useSound';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState(null);
    const [socket, setSocket] = useState(null);
    const [lastMenuUpdate, setLastMenuUpdate] = useState(Date.now());
    const [lastTableUpdate, setLastTableUpdate] = useState(Date.now());
    const [isOnline, setIsOnline] = useState(false);

    // Audio for status updates
    const { play: playStatusSound } = useSound('/sounds/bell3.mp3');

    // Function to show notification manually if needed
    const notify = useCallback((data) => {
        setNotification(data);
        // Auto-close after 5 seconds
        setTimeout(() => setNotification(null), 5000);
    }, []);

    useEffect(() => {
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Notification socket connected');
            setIsOnline(true);
            // Force refresh data on reconnection to catch up
            setLastMenuUpdate(Date.now());
            setLastTableUpdate(Date.now());
            joinActiveOrderRooms(newSocket);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsOnline(false);
        });


        // Order Updates
        newSocket.on('order-updated', (updatedOrder) => {
            console.log('Real-time order update received:', updatedOrder);
            playStatusSound(); // Play sound!

            const statusMessages = {
                confirmed: 'Seu pedido foi confirmado e logo entrará em preparação.',
                preparing: 'O chef já está trabalhando no seu pedido!',
                ready: 'Seu pedido está pronto! Bom apetite!',
                completed: 'Pedido finalizado. Obrigado pela preferência!',
                cancelled: 'Lamentamos, mas seu pedido foi cancelado.'
            };

            notify({
                orderId: updatedOrder._id,
                status: updatedOrder.status,
                message: statusMessages[updatedOrder.status] || `Status atualizado para: ${updatedOrder.status}`
            });
        });

        // Menu Updates
        newSocket.on('menu-updated', (data) => {
            console.log('Menu updated:', data);
            setLastMenuUpdate(Date.now());
            notify({ message: 'O menu foi atualizado!' });
        });

        // Table Updates (for waiter assignment etc)
        newSocket.on('table-updated', (data) => {
            console.log('Table updated:', data);
            setLastTableUpdate(Date.now());
        });

        return () => {
            newSocket.disconnect();
        };
    }, [notify, playStatusSound]);

    const joinActiveOrderRooms = async (s) => {
        try {
            const keys = Object.keys(localStorage);
            const phones = keys.filter(k => k.startsWith('customer-phone-'));

            // Logic to rejoin rooms if needed
        } catch (e) {
            console.error('Error joining rooms', e);
        }
    };

    const joinOrderRoom = (orderId) => {
        if (socket && orderId) socket.emit('join-order', orderId);
    };

    const joinRestaurantRoom = (restaurantId) => {
        if (socket && restaurantId) {
            console.log(`Joining restaurant room: ${restaurantId}`);
            socket.emit('join-restaurant', restaurantId);
        }
    };

    const joinTableRoom = (tableId) => {
        if (socket && tableId) {
            console.log(`Joining table room: ${tableId}`);
            socket.emit('join-table', tableId);
        }
    };

    return (
        <NotificationContext.Provider value={{
            notify,
            joinOrderRoom,
            joinRestaurantRoom,
            joinTableRoom,
            lastMenuUpdate,
            lastTableUpdate,
            socket,
            isOnline
        }}>
            {children}
            <NotificationToast notification={notification} onClose={() => setNotification(null)} />
        </NotificationContext.Provider>
    );
};
