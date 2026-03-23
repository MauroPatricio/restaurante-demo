import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import { Layout, Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ResetPassword() {
    const { token } = useParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const { t } = useTranslation();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError(t('passwords_dont_match') || 'As senhas não coincidem');
            return;
        }

        if (password.length < 6) {
            setError(t('password_too_short') || 'A senha deve ter pelo menos 6 caracteres');
            return;
        }

        setLoading(true);

        try {
            await authAPI.resetPassword(token, password);
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || t('failed_to_reset_password') || 'Falha ao redefinir senha');
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
                            <h1 className="brand-title">{t('password_reset_success_title') || 'Senha Atualizada!'}</h1>
                            <p className="dynamic-subtitle">
                                {t('password_reset_success') || 'A sua senha foi redefinida com sucesso.'}
                            </p>
                        </div>
                        <p className="redirect-text">
                            {t('redirecting_to_login') || 'Redirecionando para o login...'}
                        </p>
                        <Link to="/login" className="submit-btn text-center-link">
                            <div className="btn-content center-content">
                                <ArrowLeft size={20} />
                                <span>{t('back_to_login') || 'Ir para Login'}</span>
                            </div>
                        </Link>
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

    return (
        <div className="selection-layout">
            <div className="selection-left">
                <div className="selection-card">
                    <div className="selection-header">
                        <div className="icon-badge">
                            <Lock size={28} />
                        </div>
                        <h1 className="brand-title">{t('reset_password') || 'Redefinir Senha'}</h1>
                        <p className="dynamic-subtitle">
                            {t('choose_new_password') || 'Escolha uma nova senha segura para a sua conta.'}
                        </p>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form-stack">
                        {/* New Password */}
                        <div className="form-group">
                            <label htmlFor="password">{t('new_password') || 'Nova Senha'}</label>
                            <div className="password-input-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="modern-input"
                                />
                                <button
                                    type="button"
                                    className="toggle-visibility-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="form-group">
                            <label htmlFor="confirmPassword">{t('confirm_new_password') || 'Confirmar Nova Senha'}</label>
                            <input
                                id="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="modern-input"
                            />
                        </div>

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={loading}
                        >
                            <div className="btn-content center-content">
                                {loading ? <LoadingSpinner size={20} color="white" /> : <CheckCircle size={20} />}
                                <span>{loading ? (t('updating') || 'Atualizando...') : (t('update_password') || 'Atualizar Senha')}</span>
                            </div>
                        </button>
                    </form>
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
    .password-input-wrapper { position: relative; }
    .toggle-visibility-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 6px; }
    .submit-btn { width: 100%; padding: 16px; background: #0f172a; color: white !important; border-radius: 12px; border: none; cursor: pointer; text-decoration: none; display: block; }
    .btn-content { display: flex; align-items: center; gap: 10px; font-weight: 600; }
    .center-content { justify-content: center; }
    .error-message { background: #fee2e2; color: #991b1b; padding: 14px; border-radius: 12px; margin-bottom: 24px; font-size: 0.9rem; border: 1px solid #fecaca; }
    .redirect-text { text-align: center; color: #64748b; margin-bottom: 24px; font-weight: 500; }
    .text-center-link { text-align: center; }
    .selection-right { flex: 1; display: none; position: relative; }
    .responsive-image { width: 100%; height: 100%; object-fit: cover; }
    .image-overlay { position: absolute; inset: 0; background: linear-gradient(to top, #0f172a, transparent); opacity: 0.85; }
    .image-content { position: absolute; bottom: 80px; left: 60px; right: 60px; color: white; z-index: 10; }
    .image-content h2 { font-size: 2.5rem; font-weight: 800; margin-bottom: 20px; }
    .image-content p { font-size: 1.15rem; color: #cbd5e1; }
    @media(min-width: 1024px) { .selection-right { display: block; } }
`;
