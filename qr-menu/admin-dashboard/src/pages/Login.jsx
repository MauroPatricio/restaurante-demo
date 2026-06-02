import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Layout, LogIn } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import './Login.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('logoutSuccess') === 'true') {
            setSuccessMessage(t('logout_success_message') || 'Logout efectuado com sucesso.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [t]);

    // Dynamic Subtitle Logic
    const [subtitleIndex, setSubtitleIndex] = useState(0);
    const [fade, setFade] = useState(true);
    const subtitles = [
        t('system_mgmt_restaurants') || 'Sistema de Gestão de Restaurantes',
        t('system_mgmt_bars') || 'Sistema de Gestão de Bares',
        t('system_mgmt_cafes') || 'Sistema de Gestão de Cafés',
        t('system_mgmt_pastries') || 'Sistema de Gestão de Pastelarias',
        t('system_mgmt_snacks') || 'Sistema de Gestão de Lanchonetes',
        t('system_mgmt_pizzas') || 'Sistema de Gestão de Pizzarias'
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false);
            setTimeout(() => {
                setSubtitleIndex((prev) => (prev + 1) % subtitles.length);
                setFade(true);
            }, 500);
        }, 4000);

        return () => clearInterval(interval);
    }, [subtitles.length]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await login({
                email: email.trim(),
                password: password.trim()
            });

            if (data.user) {
                navigate('/select-restaurant', { state: { restaurants: data.user.restaurants || [] } });
            } else {
                setError(t('login_error_invalid_user'));
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || t('failed_login'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="selection-layout animate-fade">
            {/* LEFT SIDE: LOGIN FORM */}
            <div className="selection-left">
                <div className="selection-card animate-slide-up">
                    <div className="selection-header">
                        <div className="icon-badge">
                            <Layout size={32} />
                        </div>
                        <h1 className="brand-title">{t('smart_digital_mgmt')}</h1>
                        <div className={`dynamic-subtitle ${fade ? 'fade-in' : 'fade-out'}`}>
                            {subtitles[subtitleIndex]}
                        </div>
                    </div>

                    {error && (
                        <div className="error-message animate-fade">
                            {error}
                        </div>
                    )}

                    {successMessage && (
                        <div className="success-message animate-fade" style={{
                            backgroundColor: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            fontSize: '14px',
                            textAlign: 'center',
                            fontWeight: '500'
                        }}>
                            {successMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form-stack">
                        {/* Email */}
                        <div className="form-group">
                            <label htmlFor="email">{t('email')}</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="exemplo@restaurante.com"
                                className="modern-input"
                                autoComplete="email"
                            />
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <label htmlFor="password">{t('password')}</label>
                            <div className="password-input-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="modern-input"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="toggle-visibility-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? t('hide_password') : t('show_password')}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="forgot-password-link-wrapper">
                            <Link to="/forgot-password">
                                {t('forgot_password_q') || 'Esqueci minha senha'}
                            </Link>
                        </div>

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={loading}
                        >
                            <div className="btn-content">
                                {loading ? <LoadingSpinner size={20} color="white" /> : <LogIn size={20} />}
                                <span>{loading ? t('signing_in') : t('sign_in')}</span>
                            </div>
                        </button>
                    </form>

                    <div className="selection-footer">
                        <p className="footer-text">
                            {t('dont_have_account')}{' '}
                            <Link to="/register" className="register-link">
                                {t('register_here')}
                            </Link>
                        </p>
                        <p className="developer-credit">
                            {t('developed_by')} Nhiquela Servicos e Consultoria, LDA
                        </p>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: IMAGE */}
            <div className="selection-right">
                <div className="image-overlay"></div>
                <div className="image-content animate-slide-up">
                    <h2>{t('manage_everything_place')}</h2>
                    <p>{t('control_orders_tables_desc')}</p>
                </div>
                <img
                    src="/image/interno.avif"
                    alt="Restaurant Ambiance"
                    className="responsive-image"
                />
            </div>
        </div>
    );
}
