import nodemailer from 'nodemailer';

// Create email transporter
const createTransporter = () => {
    const port = parseInt(process.env.EMAIL_PORT) || 587;
    const config = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port,
        secure: port === 465, // true for 465 (SSL), false for 587 (STARTTLS)
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

// Send payment pending alert to admin (nhiquelaservicos@gmail.com)
export const sendPaymentPendingAlert = async ({ restaurantName, clientName, amount, currency, method, proofUrl }) => {
    const transporter = createTransporter();
    if (!transporter) return { success: false, error: 'Email not configured' };

    const ADMIN_EMAIL = 'nhiquelaservicos@gmail.com';
    const methodLabel = (method || 'N/A').toUpperCase();
    const dateStr = new Date().toLocaleString('pt-PT', { timeZone: 'Africa/Maputo' });

    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: ADMIN_EMAIL,
            subject: `💳 Novo Pagamento Aguarda Confirmação — ${restaurantName}`,
            html: `
                <div style="font-family: 'Segoe UI', sans-serif; max-width: 620px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #1e3a5f, #2563eb); padding: 28px 32px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">💳 Novo Pagamento Submetido</h1>
                        <p style="color: #bfdbfe; margin: 8px 0 0; font-size: 14px;">Nhiquela · Sistema de Restaurantes</p>
                    </div>

                    <!-- Body -->
                    <div style="padding: 32px; background: #ffffff;">
                        <p style="font-size: 15px; color: #334155; margin: 0 0 24px;">
                            Um cliente submeteu um comprovativo de pagamento e está a aguardar a sua confirmação.
                        </p>

                        <!-- Info Table -->
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                            <tr style="background: #f8fafc;">
                                <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0; width: 40%;">Restaurante</td>
                                <td style="padding: 12px 16px; font-size: 14px; color: #1e293b; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${restaurantName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Cliente / Contacto</td>
                                <td style="padding: 12px 16px; font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${clientName}</td>
                            </tr>
                            <tr style="background: #f8fafc;">
                                <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Valor do Pagamento</td>
                                <td style="padding: 12px 16px; font-size: 15px; color: #2563eb; font-weight: 800; border-bottom: 1px solid #e2e8f0;">${amount?.toLocaleString('pt-PT') || '—'} ${currency || 'MT'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Método</td>
                                <td style="padding: 12px 16px; font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${methodLabel}</td>
                            </tr>
                            <tr style="background: #f8fafc;">
                                <td style="padding: 12px 16px; font-size: 13px; color: #64748b; font-weight: 600;">Data / Hora</td>
                                <td style="padding: 12px 16px; font-size: 14px; color: #1e293b;">${dateStr}</td>
                            </tr>
                        </table>

                        ${proofUrl ? `
                        <div style="text-align: center; margin: 24px 0;">
                            <a href="${proofUrl}"
                               style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">
                               📎 Ver Comprovativo de Pagamento
                            </a>
                        </div>
                        ` : ''}

                        <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 24px 0 0;">
                            Por favor, aceda ao painel de administração para aprovar ou rejeitar este pagamento.
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background: #f1f5f9; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                            Nhiquela Serviços e Consultoria, LDA · nhiquelaservicos.com
                        </p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending payment pending alert:', error);
        return { success: false, error: error.message };
    }
};

export default {
    sendRenewalConfirmation,
    sendOrderReceipt,
    sendResetPasswordEmail,
    sendPaymentPendingAlert
};
