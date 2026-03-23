import nodemailer from 'nodemailer';

// Create email transporter
const createTransporter = () => {
    // Use environment variables for email configuration
    const config = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    };

    if (!config.auth.user || !config.auth.pass) {
        console.warn('Email credentials not configured. Emails will not be sent.');
        return null;
    }

    return nodemailer.createTransport(config);
};

// Send subscription payment reminder
export const sendPaymentReminder = async (restaurant, daysUntilDue) => {
    const transporter = createTransporter();
    if (!transporter) return { success: false, error: 'Email not configured' };

    try {
        let subject, message;

        if (daysUntilDue > 0) {
            subject = `Subscription Payment Reminder - ${daysUntilDue} Days Until Due`;
            message = `
        <h2>Payment Reminder</h2>
        <p>Dear ${restaurant.name},</p>
        <p>This is a friendly reminder that your subscription payment of <strong>10,000 ${restaurant?.settings?.currency || 'USD'}</strong> is due in <strong>${daysUntilDue} days</strong>.</p>
        <p>Please make your payment to avoid service interruption.</p>
        <p>Thank you for using our service!</p>
      `;
        } else {
            subject = 'Subscription Payment Overdue';
            message = `
        <h2>Payment Overdue</h2>
        <p>Dear ${restaurant.name},</p>
        <p>Your subscription payment of <strong>10,000 ${restaurant?.settings?.currency || 'USD'}</strong> is now overdue.</p>
        <p>Please make your payment immediately to avoid service suspension.</p>
        <p>You have a 3-day grace period before your account is suspended.</p>
      `;
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: restaurant.email,
            subject: subject,
            html: message
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending payment reminder:', error);
        return { success: false, error: error.message };
    }
};

// Send suspension notice
export const sendSuspensionNotice = async (restaurant) => {
    const transporter = createTransporter();
    if (!transporter) return { success: false, error: 'Email not configured' };

    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: restaurant.email,
            subject: 'Account Suspended - Payment Required',
            html: `
        <h2>Account Suspended</h2>
        <p>Dear ${restaurant.name},</p>
        <p>Your account has been suspended due to non-payment of the subscription fee.</p>
        <p>Amount due: <strong>10,000 ${restaurant?.settings?.currency || 'USD'}</strong></p>
        <p>Please make your payment to reactivate your account.</p>
        <p>Contact us if you have any questions.</p>
      `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending suspension notice:', error);
        return { success: false, error: error.message };
    }
};

// Send subscription renewal confirmation
export const sendRenewalConfirmation = async (restaurant, payment) => {
    const transporter = createTransporter();
    if (!transporter) return { success: false, error: 'Email not configured' };

    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: restaurant.email,
            subject: 'Subscription Renewed Successfully',
            html: `
        <h2>Subscription Renewed</h2>
        <p>Dear ${restaurant.name},</p>
        <p>Your subscription has been successfully renewed!</p>
        <p>Payment received: <strong>${payment.amount} ${payment.currency || 'USD'}</strong></p>
        <p>Reference: ${payment.reference}</p>
        <p>Thank you for your continued business!</p>
      `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending renewal confirmation:', error);
        return { success: false, error: error.message };
    }
};

// Send order receipt to customer
export const sendOrderReceipt = async (order, customerEmail) => {
    const transporter = createTransporter();
    if (!transporter) return { success: false, error: 'Email not configured' };

    try {
        const itemsList = order.items.map(item =>
            `<li>${item.item.name} x ${item.qty} - ${item.subtotal} ${order.currency || 'USD'}</li>`
        ).join('');

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: customerEmail,
            subject: `Order Confirmation - #${order._id.toString().slice(-6)}`,
            html: `
        <h2>Order Confirmation</h2>
        <p>Thank you for your order!</p>
        <p>Order #: <strong>${order._id.toString().slice(-6)}</strong></p>
        <h3>Items:</h3>
        <ul>${itemsList}</ul>
        <p><strong>Total: ${order.total} ${order.currency || 'USD'}</strong></p>
        <p>Status: ${order.status}</p>
        ${order.estimatedReadyTime ? `<p>Estimated ready time: ${new Date(order.estimatedReadyTime).toLocaleTimeString()}</p>` : ''}
      `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending order receipt:', error);
        return { success: false, error: error.message };
    }
};

// Send password reset email
export const sendResetPasswordEmail = async (user, resetUrl) => {
    const transporter = createTransporter();
    if (!transporter) return { success: false, error: 'Email not configured' };

    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: user.email,
            subject: 'Recuperação de Senha - Nhiquela',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #4f46e5; text-align: center;">Recuperação de Senha</h2>
                    <p>Olá <strong>${user.name}</strong>,</p>
                    <p>Recebemos um pedido para redefinir a senha da sua conta no sistema Nhiquela.</p>
                    <p>Clique no botão abaixo para escolher uma nova senha. Este link é válido por <strong>15 minutos</strong>.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Redefinir Senha</a>
                    </div>
                    <p>Se você não solicitou esta alteração, ignore este email. Sua senha permanecerá a mesma.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666; text-align: center;">Este é um email automático, por favor não responda.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending reset password email:', error);
        return { success: false, error: error.message };
    }
};

export default {
    sendRenewalConfirmation,
    sendOrderReceipt,
    sendResetPasswordEmail
};
