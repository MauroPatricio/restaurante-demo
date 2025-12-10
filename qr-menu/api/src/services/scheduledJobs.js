import cron from 'node-cron';
import Subscription from '../models/Subscription.js';
import Restaurant from '../models/Restaurant.js';
import { sendPaymentReminder, sendSuspensionNotice } from './emailService.js';

// Check subscriptions daily at 9:00 AM
export const startSubscriptionMonitoring = () => {
    // Run every day at 09:00
    cron.schedule('0 9 * * *', async () => {
        console.log('Running daily subscription check...');
        await checkSubscriptionStatus();
    });

    console.log('Subscription monitoring scheduled');
};

// Check all subscriptions and send reminders/suspend as needed
export const checkSubscriptionStatus = async () => {
    try {
        const now = new Date();

        // Get all active and trial subscriptions
        const subscriptions = await Subscription.find({
            status: { $in: ['active', 'trial'] }
        }).populate('restaurant');

        for (const subscription of subscriptions) {
            const restaurant = await Restaurant.findById(subscription.restaurant);
            if (!restaurant) continue;

            const daysUntilDue = Math.ceil((subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24));

            // Check if trial period is ending
            if (subscription.status === 'trial') {
                if (daysUntilDue === 7 && !subscription.remindersSent.sevenDays) {
                    await sendPaymentReminder(restaurant, 7);
                    subscription.remindersSent.sevenDays = true;
                    await subscription.save();
                    console.log(`Sent 7-day reminder to ${restaurant.name}`);
                }
                else if (daysUntilDue === 3 && !subscription.remindersSent.threeDays) {
                    await sendPaymentReminder(restaurant, 3);
                    subscription.remindersSent.threeDays = true;
                    await subscription.save();
                    console.log(`Sent 3-day reminder to ${restaurant.name}`);
                }
                else if (daysUntilDue === 1 && !subscription.remindersSent.oneDay) {
                    await sendPaymentReminder(restaurant, 1);
                    subscription.remindersSent.oneDay = true;
                    await subscription.save();
                    console.log(`Sent 1-day reminder to ${restaurant.name}`);
                }
                else if (daysUntilDue <= 0) {
                    // Trial period has ended, convert to active with pending payment
                    subscription.status = 'active';
                    const nextPeriodEnd = new Date(subscription.currentPeriodEnd);
                    nextPeriodEnd.setDate(nextPeriodEnd.getDate() + 30);
                    subscription.currentPeriodStart = subscription.currentPeriodEnd;
                    subscription.currentPeriodEnd = nextPeriodEnd;

                    // Set grace period (3 days)
                    const graceEnd = new Date(subscription.currentPeriodStart);
                    graceEnd.setDate(graceEnd.getDate() + 3);
                    subscription.graceEndDate = graceEnd;

                    // Reset reminder flags
                    subscription.remindersSent = {
                        sevenDays: false,
                        threeDays: false,
                        oneDay: false,
                        overdue: false
                    };

                    await subscription.save();
                    await sendPaymentReminder(restaurant, -1); // Overdue notice
                    console.log(`Trial ended for ${restaurant.name}, grace period started`);
                }
            }

            // Check active subscriptions
            else if (subscription.status === 'active') {
                // Send reminders before due date
                if (daysUntilDue === 7 && !subscription.remindersSent.sevenDays) {
                    await sendPaymentReminder(restaurant, 7);
                    subscription.remindersSent.sevenDays = true;
                    await subscription.save();
                }
                else if (daysUntilDue === 3 && !subscription.remindersSent.threeDays) {
                    await sendPaymentReminder(restaurant, 3);
                    subscription.remindersSent.threeDays = true;
                    await subscription.save();
                }
                else if (daysUntilDue === 1 && !subscription.remindersSent.oneDay) {
                    await sendPaymentReminder(restaurant, 1);
                    subscription.remindersSent.oneDay = true;
                    await subscription.save();
                }

                // Check if payment is overdue
                if (daysUntilDue < 0) {
                    const graceDaysRemaining = subscription.graceEndDate
                        ? Math.ceil((subscription.graceEndDate - now) / (1000 * 60 * 60 * 24))
                        : 0;

                    if (!subscription.graceEndDate) {
                        // Set grace period if not already set
                        const graceEnd = new Date(subscription.currentPeriodEnd);
                        graceEnd.setDate(graceEnd.getDate() + 3);
                        subscription.graceEndDate = graceEnd;
                        await subscription.save();
                    }

                    // Send overdue notice
                    if (!subscription.remindersSent.overdue) {
                        await sendPaymentReminder(restaurant, -1);
                        subscription.remindersSent.overdue = true;
                        await subscription.save();
                    }

                    // Suspend if grace period has ended
                    if (graceDaysRemaining <= 0) {
                        subscription.status = 'suspended';
                        restaurant.active = false;
                        await subscription.save();
                        await restaurant.save();
                        await sendSuspensionNotice(restaurant);
                        console.log(`Suspended ${restaurant.name} due to non-payment`);
                    }
                }
            }
        }

        console.log('Subscription check completed');
    } catch (error) {
        console.error('Error checking subscriptions:', error);
    }
};

export default {
    startSubscriptionMonitoring,
    checkSubscriptionStatus
};
