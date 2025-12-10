import axios from 'axios';
import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import Subscription from '../models/Subscription.js';
import Restaurant from '../models/Restaurant.js';
import { sendOrderNotification } from './firebaseService.js';
import { sendRenewalConfirmation } from './emailService.js';

// Generate unique payment reference
const generatePaymentReference = () => {
    return 'PAY-' + Date.now() + '-' + Math.random().toString(36).substring(7).toUpperCase();
};

// Initiate Mpesa payment
export const initiateMpesaPayment = async (paymentData) => {
    try {
        // This is a placeholder - actual implementation depends on Mpesa API
        // You'll need to integrate with the actual Mpesa API when credentials are available

        const reference = generatePaymentReference();

        const payment = await Payment.create({
            type: paymentData.type,
            reference,
            order: paymentData.orderId,
            subscription: paymentData.subscriptionId,
            restaurant: paymentData.restaurantId,
            method: 'mpesa',
            status: 'pending',
            amount: paymentData.amount,
            metadata: {
                phoneNumber: paymentData.phoneNumber,
                transactionId: null // Will be updated by webhook
            }
        });

        // TODO: Make actual API call to Mpesa
        // const mpesaResponse = await axios.post(process.env.MPESA_API_URL, {
        //   amount: paymentData.amount,
        //   phone: paymentData.phoneNumber,
        //   reference: reference
        // }, {
        //   headers: { 'Authorization': `Bearer ${process.env.MPESA_API_KEY}` }
        // });

        return {
            success: true,
            payment,
            reference,
            message: 'Payment initiated. Please check your phone to complete the transaction.'
        };
    } catch (error) {
        console.error('Mpesa payment error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Initiate eMola payment
export const initiateEmolaPayment = async (paymentData) => {
    try {
        // Placeholder for eMola integration
        const reference = generatePaymentReference();

        const payment = await Payment.create({
            type: paymentData.type,
            reference,
            order: paymentData.orderId,
            subscription: paymentData.subscriptionId,
            restaurant: paymentData.restaurantId,
            method: 'emola',
            status: 'pending',
            amount: paymentData.amount,
            metadata: {
                phoneNumber: paymentData.phoneNumber,
                transactionId: null
            }
        });

        // TODO: Integrate with actual eMola API

        return {
            success: true,
            payment,
            reference,
            message: 'Payment initiated via eMola.'
        };
    } catch (error) {
        console.error('eMola payment error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Handle bank receipt upload (BIM/BCI)
export const processBankReceiptPayment = async (paymentData, receiptFile) => {
    try {
        const reference = generatePaymentReference();

        const payment = await Payment.create({
            type: paymentData.type,
            reference,
            order: paymentData.orderId,
            subscription: paymentData.subscriptionId,
            restaurant: paymentData.restaurantId,
            method: paymentData.bank, // 'bim' or 'bci'
            status: 'pending', // Needs manual verification
            amount: paymentData.amount,
            receipt: receiptFile.path || receiptFile.filename,
            metadata: {
                accountNumber: paymentData.accountNumber,
                receiptNumber: paymentData.receiptNumber,
                notes: paymentData.notes
            }
        });

        return {
            success: true,
            payment,
            reference,
            message: 'Receipt uploaded. Payment is pending verification.'
        };
    } catch (error) {
        console.error('Bank receipt payment error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Record cash payment
export const recordCashPayment = async (paymentData) => {
    try {
        const reference = generatePaymentReference();

        const payment = await Payment.create({
            type: 'order',
            reference,
            order: paymentData.orderId,
            restaurant: paymentData.restaurantId,
            method: 'cash',
            status: 'completed', // Cash payments are immediately completed
            amount: paymentData.amount,
            processedAt: new Date(),
            metadata: {
                receiptNumber: paymentData.receiptNumber || reference,
                receivedBy: paymentData.receivedBy, // User ID of waiter who received payment
                notes: paymentData.notes
            }
        });

        // Update order payment status
        if (paymentData.orderId) {
            await Order.findByIdAndUpdate(paymentData.orderId, {
                paymentStatus: 'completed',
                paymentMethod: 'cash',
                paymentReference: reference
            });
        }

        return {
            success: true,
            payment,
            reference,
            message: 'Cash payment recorded successfully.'
        };
    } catch (error) {
        console.error('Cash payment error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Process payment webhook (for Mpesa/eMola callbacks)
export const processPaymentWebhook = async (webhookData) => {
    try {
        const { reference, status, transactionId, provider } = webhookData;

        const payment = await Payment.findOne({ reference });
        if (!payment) {
            throw new Error('Payment not found');
        }

        // Update payment status
        payment.status = status === 'success' ? 'completed' : 'failed';
        payment.processedAt = new Date();
        payment.metadata.transactionId = transactionId;

        if (status !== 'success' && webhookData.errorMessage) {
            payment.failureReason = webhookData.errorMessage;
        }

        await payment.save();

        // If payment successful, update related order or subscription
        if (payment.status === 'completed') {
            if (payment.type === 'order' && payment.order) {
                await Order.findByIdAndUpdate(payment.order, {
                    paymentStatus: 'completed',
                    paymentMethod: payment.method,
                    paymentReference: reference
                });

                const order = await Order.findById(payment.order);
                if (order) {
                    await sendOrderNotification(order, 'payment-received');
                }
            }

            if (payment.type === 'subscription' && payment.subscription) {
                const subscription = await Subscription.findById(payment.subscription);
                const restaurant = await Restaurant.findById(payment.restaurant);

                if (subscription && restaurant) {
                    // Update subscription
                    const now = new Date();
                    const nextPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                    subscription.status = 'active';
                    subscription.currentPeriodStart = now;
                    subscription.currentPeriodEnd = nextPeriodEnd;
                    subscription.graceEndDate = null;

                    // Reset reminder flags
                    subscription.remindersSent = {
                        sevenDays: false,
                        threeDays: false,
                        oneDay: false,
                        overdue: false
                    };

                    // Add to payment history
                    subscription.paymentHistory.push({
                        date: now,
                        amount: payment.amount,
                        method: payment.method,
                        reference: payment.reference,
                        status: 'completed'
                    });

                    await subscription.save();

                    // Reactivate restaurant if it was suspended
                    if (!restaurant.active) {
                        restaurant.active = true;
                        await restaurant.save();
                    }

                    // Send confirmation email
                    await sendRenewalConfirmation(restaurant, payment);
                }
            }
        }

        return {
            success: true,
            payment
        };
    } catch (error) {
        console.error('Webhook processing error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Verify payment status
export const verifyPaymentStatus = async (reference) => {
    try {
        const payment = await Payment.findOne({ reference })
            .populate('order')
            .populate('subscription');

        if (!payment) {
            return {
                success: false,
                error: 'Payment not found'
            };
        }

        return {
            success: true,
            payment: {
                reference: payment.reference,
                status: payment.status,
                amount: payment.amount,
                method: payment.method,
                type: payment.type,
                processedAt: payment.processedAt,
                createdAt: payment.createdAt
            }
        };
    } catch (error) {
        console.error('Payment verification error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

export default {
    initiateMpesaPayment,
    initiateEmolaPayment,
    processBankReceiptPayment,
    recordCashPayment,
    processPaymentWebhook,
    verifyPaymentStatus
};
