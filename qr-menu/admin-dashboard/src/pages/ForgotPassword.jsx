import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Layout, Send, ArrowLeft, CheckCircle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data } = await authAPI.forgotPassword(email.trim());
            setSuccess(true);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || t('failed_to_send_email') || 'Falha ao enviar email');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="selection-layout">
                <div className="selection-left">
                    <div className="selection-card">
                        <div className="selection-header">
                            <div className="icon-badge success-badge">
                                <CheckCircle size={28} />
                            </div>
                            <h1 className="brand-title">{t('email_sent') || 'Email Enviado'}</h1>
                            <p className="dynamic-subtitle">
                                {t('reset_email_desc') || 'Se o seu email estiver registado, receberá um link de recuperação em instantes.'}
                            </p>
                        </div>

                        <div className="success-info-box">
                            <p>{t('check_spam_folder') || 'Não se esqueça de verificar a sua pasta de spam se não encontrar o email.'}</p>
                        </div>

                        <Link to="/login" className="submit-btn text-center-link">
                            <div className="btn-content center-content">
                                <ArrowLeft size={20} />
                                <span>{t('back_to_login') || 'Voltar ao Login'}</span>
                            </div>
                        </Link>
                    </div>
                </div>
                {/* Right side same as Login */}
                <div className="selection-right">
                    <div className="image-overlay"></div>
                    <div className="image-content">
                        <h2>{t('manage_everything_place')}</h2>
                        <p>{t('control_orders_tables_desc')}</p>
                    </div>
                    <img src="/image/interno.avif" alt="Restaurant Ambiance" className="responsive-image" />
                </div>
                <style>{sharedStyles}</style>
            </div>
        );
    }

    return (
        <div className="selection-layout">
            <div className="selection-left">
                <div className="selection-card">
                    <div className="selection-header">
                        <div className="icon-badge">
                            <Layout size={28} />
                        </div>
                        <h1 className="brand-title">{t('recover_password') || 'Recuperar Senha'}</h1>
                        <p className="dynamic-subtitle">
                            {t('recover_password_desc') || 'Insira o seu email para receber um link de redefinição.'}
                        </p>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form-stack">
                        <div className="form-group">
                            <label htmlFor="email">{t('email')}</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="seuemail@email.com"
                                className="modern-input"
                            />
                        </div>

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={loading}
                        >
                            <div className="btn-content center-content">
                                {loading ? <LoadingSpinner size={20} color="white" /> : <Send size={20} />}
                                <span>{loading ? (t('sending') || 'Enviando...') : (t('send_link') || 'Enviar Link')}</span>
                            </div>
                        </button>
                    </form>

                    <div className="selection-footer">
                        <Link to="/login" className="back-link">
                            <ArrowLeft size={16} />
                            <span>{t('back_to_login') || 'Voltar ao Login'}</span>
                        </Link>
                    </div>
                </div>
            </div>
            <div className="selection-right">
                <div className="image-overlay"></div>
                <div className="image-content">
                    <h2>{t('manage_everything_place')}</h2>
                    <p>{t('control_orders_tables_desc')}</p>
                </div>
                <img src="/image/interno.avif" alt="Restaurant Ambiance" className="responsive-image" />
            </div>
            <style>{sharedStyles}</style>
        </div>
    );
}

const sharedStyles = `
    .selection-layout { display: flex; min-height: 100vh; font-family: 'Inter', sans-serif; }
    .selection-left { flex: 1; padding: 40px; display: flex; justify-content: center; align-items: center; background-color: #f8fafc; }
    .selection-card { width: 100%; max-width: 480px; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
    .selection-header { margin-bottom: 32px; text-align: center; }
    .icon-badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: white; border-radius: 16px; margin-bottom: 24px; }
    .icon-badge.success-badge { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
    .brand-title { font-size: 1.8rem; color: #1e293b; margin-bottom: 8px; font-weight: 800; }
    .dynamic-subtitle { color: #64748b; font-size: 1rem; font-weight: 500; margin: 0; }
    .login-form-stack { display: flex; flex-direction: column; gap: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-size: 0.875rem; font-weight: 600; color: #334155; }
    .modern-input { width: 100%; padding: 14px 16px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 0.95rem; background: #f8fafc; }
    .modern-input:focus { border-color: #4f46e5; outline: none; background: white; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
    .submit-btn { width: 100%; padding: 16px; background: #0f172a; color: white !important; border-radius: 12px; border: none; cursor: pointer; text-decoration: none; display: block; }
    .btn-content { display: flex; align-items: center; gap: 10px; font-weight: 600; }
    .center-content { justify-content: center; }
    .selection-footer { margin-top: 32px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 24px; }
    .back-link { display: inline-flex; align-items: center; gap: 8px; color: #64748b; text-decoration: none; font-weight: 600; transition: color 0.2s; }
    .back-link:hover { color: #4f46e5; }
    .error-message { background: #fee2e2; color: #991b1b; padding: 14px; border-radius: 12px; margin-bottom: 24px; font-size: 0.9rem; border: 1px solid #fecaca; }
    .success-info-box { background: #ecfdf5; border: 1px solid #d1fae5; color: #065f46; padding: 16px; border-radius: 12px; margin-bottom: 24px; font-size: 0.9rem; line-height: 1.5; }
    .text-center-link { text-align: center; }
    .selection-right { flex: 1; display: none; position: relative; }
    .responsive-image { width: 100%; height: 100%; object-fit: cover; }
    .image-overlay { position: absolute; inset: 0; background: linear-gradient(to top, #0f172a, transparent); opacity: 0.85; }
    .image-content { position: absolute; bottom: 80px; left: 60px; right: 60px; color: white; z-index: 10; }
    .image-content h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 20px; color: white; }
    .image-content p { font-size: 1.15rem; color: #ffffff; }
    @media(min-width: 1024px) { .selection-right { display: block; } }
`;
