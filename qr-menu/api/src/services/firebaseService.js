import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firebaseInitialized = false;

// Initialize Firebase Admin SDK
export const initializeFirebase = () => {
    if (firebaseInitialized) return;

    try {
        const serviceAccountPath = path.join(__dirname, '../../firebase-config.json');

        // Check if firebase config exists
        if (!fs.existsSync(serviceAccountPath)) {
            console.warn('Firebase config not found. Push notifications will not work.');
            console.warn('Please add your firebase-config.json to the api directory');
            return;
        }

        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        firebaseInitialized = true;
        console.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error.message);
    }
};

// Send notification to a single user
export const sendNotificationToUser = async (userId, notification) => {
    if (!firebaseInitialized) {
        console.warn('Firebase not initialized. Notification not sent.');
        return { success: false, error: 'Firebase not initialized' };
    }

    try {
        const User = (await import('../models/User.js')).default;
        const user = await User.findById(userId);

        if (!user || !user.fcmToken) {
            return { success: false, error: 'User not found or no FCM token' };
        }

        const message = {
            notification: {
                title: notification.title,
                body: notification.body
            },
            data: notification.data || {},
            token: user.fcmToken
        };

        const response = await admin.messaging().send(message);
        return { success: true, messageId: response };
    } catch (error) {
        console.error('Error sending notification:', error);
        return { success: false, error: error.message };
    }
};

// Send notification to multiple users
export const sendNotificationToUsers = async (userIds, notification) => {
    if (!firebaseInitialized) {
        console.warn('Firebase not initialized. Notifications not sent.');
        return { success: false, error: 'Firebase not initialized' };
    }

    try {
        const User = (await import('../models/User.js')).default;
        const users = await User.find({ _id: { $in: userIds }, fcmToken: { $exists: true, $ne: null } });

        if (users.length === 0) {
            return { success: false, error: 'No users with FCM tokens found' };
        }

        const tokens = users.map(user => user.fcmToken);

        const message = {
            notification: {
                title: notification.title,
                body: notification.body
            },
            data: notification.data || {},
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        return {
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount
        };
    } catch (error) {
        console.error('Error sending notifications:', error);
        return { success: false, error: error.message };
    }
};

// Send notification by role (e.g., all kitchen staff, all waiters)
export const sendNotificationByRole = async (restaurantId, role, notification) => {
    if (!firebaseInitialized) {
        console.warn('Firebase not initialized. Notifications not sent.');
        return { success: false, error: 'Firebase not initialized' };
    }

    try {
        const User = (await import('../models/User.js')).default;
        const users = await User.find({
            restaurant: restaurantId,
            role: role,
            fcmToken: { $exists: true, $ne: null }
        });

        if (users.length === 0) {
            return { success: false, error: `No ${role} users with FCM tokens found` };
        }

        const tokens = users.map(user => user.fcmToken);

        const message = {
            notification: {
                title: notification.title,
                body: notification.body
            },
            data: notification.data || {},
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        return {
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
            targetRole: role
        };
    } catch (error) {
        console.error('Error sending role notifications:', error);
        return { success: false, error: error.message };
    }
};

// Send order notification to relevant staff
export const sendOrderNotification = async (order, type) => {
    if (!firebaseInitialized) {
        console.warn('Firebase not initialized. Notification not sent.');
        return;
    }

    try {
        let notification = {};
        let targetRole = null;

        switch (type) {
            case 'new-order':
                notification = {
                    title: 'New Order Received',
                    body: `Table ${order.table ? order.table.number : 'Delivery'} - Order #${order._id.toString().slice(-6)}`,
                    data: { orderId: order._id.toString(), type: 'new-order' }
                };
                targetRole = 'kitchen';
                break;

            case 'order-ready':
                notification = {
                    title: 'Order Ready',
                    body: `Order #${order._id.toString().slice(-6)} is ready for serving`,
                    data: { orderId: order._id.toString(), type: 'order-ready' }
                };
                targetRole = 'waiter';
                break;

            case 'payment-received':
                notification = {
                    title: 'Payment Received',
                    body: `Payment of ${order.total} MT received for Order #${order._id.toString().slice(-6)}`,
                    data: { orderId: order._id.toString(), type: 'payment-received' }
                };
                targetRole = 'manager';
                break;

            case 'delivery-assigned':
                notification = {
                    title: 'New Delivery Assignment',
                    body: `You have been assigned delivery order #${order._id.toString().slice(-6)}`,
                    data: { orderId: order._id.toString(), type: 'delivery-assigned' }
                };
                // Will be sent to specific delivery person
                break;
        }

        if (targetRole) {
            return await sendNotificationByRole(order.restaurant, targetRole, notification);
        }
    } catch (error) {
        console.error('Error sending order notification:', error);
    }
};

export default {
    initializeFirebase,
    sendNotificationToUser,
    sendNotificationToUsers,
    sendNotificationByRole,
    sendOrderNotification
};
