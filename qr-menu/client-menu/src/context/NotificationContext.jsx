import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL, API_URL } from '../config/api';
import axios from 'axios';
import NotificationToast from '../components/NotificationToast';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const [notification, setNotification] = useState(null);
    const [socket, setSocket] = useState(null);

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

            // Join rooms for all previous orders of this customer
            joinActiveOrderRooms(newSocket);
        });

        newSocket.on('order-updated', (updatedOrder) => {
            console.log('Real-time order update received:', updatedOrder);

            // Map status to message
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

        return () => {
            newSocket.disconnect();
        };
    }, [notify]);

    const joinActiveOrderRooms = async (s) => {
        // Find all restaurantIds in localStorage keys (format: customer-phone-ID)
        const keys = Object.keys(localStorage);
        const phones = keys.filter(k => k.startsWith('customer-phone-'));

        for (const key of phones) {
            const restaurantId = key.replace('customer-phone-', '');
            const phone = localStorage.getItem(key);

            if (phone && restaurantId) {
                try {
                    const res = await axios.get(`${API_URL}/public/orders/history`, {
                        params: { restaurant: restaurantId, phone }
                    });

                    const orders = res.data.orders || [];
                    // Only join rooms for orders that are not completed/cancelled
                    orders.filter(o => !['completed', 'cancelled'].includes(o.status))
                        .forEach(o => {
                            console.log(`Joining room for order: ${o._id}`);
                            s.emit('join-order', o._id);
                        });
                } catch (err) {
                    console.warn(`Failed to join rooms for restaurant ${restaurantId}:`, err);
                }
            }
        }
    };

    // Public method to join a new order room immediately
    const joinOrderRoom = (orderId) => {
        if (socket && orderId) {
            console.log(`Manually joining room for order: ${orderId}`);
            socket.emit('join-order', orderId);
        }
    };

    return (
        <NotificationContext.Provider value={{ notify, joinOrderRoom }}>
            {children}
            <NotificationToast notification={notification} onClose={() => setNotification(null)} />
        </NotificationContext.Provider>
    );
};
