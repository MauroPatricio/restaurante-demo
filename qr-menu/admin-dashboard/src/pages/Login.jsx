import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Layout, Loader2, LogIn } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

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
                setError('Erro ao iniciar sessão: utilizador inválido.');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Falha no login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="selection-layout">
            {/* LEFT SIDE: LOGIN FORM */}
            <div className="selection-left">
                <div className="selection-card">
                    <div className="selection-header">
                        <div className="icon-badge">
                            <Layout size={28} />
                        </div>
                        <h1 className="brand-title">Gestão Digital Inteligente</h1>
                        <div className={`dynamic-subtitle ${fade ? 'fade-in' : 'fade-out'}`}>
                            {subtitles[subtitleIndex]}
                        </div>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
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
                                placeholder="seuemail@email.com"
                                className="modern-input"
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
                                />
                                <button
                                    type="button"
                                    className="toggle-visibility-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="submit-btn"
                            disabled={loading}
                        >
                            <div className="btn-content center-content">
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
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
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: IMAGE */}
            <div className="selection-right">
                <div className="image-overlay"></div>
                <div className="image-content">
                    <h2>Gerencie tudo num só lugar.</h2>
                    <p>Controle seus pedidos, mesas e equipa com eficiência.</p>
                </div>
                <img
                    src="/image/interno.avif"
                    alt="Restaurant Ambiance"
                    className="responsive-image"
                />
            </div>

            <style>{`
                /* Unified Style from RestaurantSelection.jsx */
                .selection-layout { display: flex; min-height: 100vh; font-family: 'Inter', sans-serif; }
                
                /* Left Side */
                .selection-left { flex: 1; padding: 40px; display: flex; justify-content: center; align-items: center; background-color: #f8fafc; }
                .selection-card { width: 100%; max-width: 480px; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); }

                /* Header */
                .selection-header { margin-bottom: 32px; text-align: center; }
                .icon-badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: white; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 8px 16px rgba(79, 70, 229, 0.2); }
                .brand-title { font-size: 1.8rem; color: #1e293b; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.025em; }
                .dynamic-subtitle { color: #64748b; font-size: 1rem; font-weight: 500; min-height: 1.5em; transition: opacity 0.3s ease; }
                .fade-in { opacity: 1; }
                .fade-out { opacity: 0; }

                /* Form */
                .login-form-stack { display: flex; flex-direction: column; gap: 20px; }
                .form-group { display: flex; flex-direction: column; gap: 8px; }
                .form-group label { font-size: 0.875rem; font-weight: 600; color: #334155; margin-left: 2px; }

                .modern-input { width: 100%; padding: 14px 16px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 0.95rem; transition: all 0.2s; color: #1e293b; background: #f8fafc; }
                .modern-input:focus { border-color: #4f46e5; background: white; outline: none; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }

                .password-input-wrapper { position: relative; }
                .toggle-visibility-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; border-radius: 6px; }
                .toggle-visibility-btn:hover { color: #4f46e5; background: #eef2ff; }

                /* Button */
                .submit-btn { width: 100%; padding: 16px; background: #0f172a; color: white; border-radius: 12px; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(15, 23, 42, 0.15); margin-top: 8px; }
                .submit-btn:hover:not(:disabled) { background: #1e293b; transform: translateY(-1px); box-shadow: 0 6px 12px rgba(15, 23, 42, 0.25); }
                .submit-btn:disabled { opacity: 0.7; cursor: wait; }
                .center-content { justify-content: center; }
                .btn-content { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 1rem; }

                /* Footer */
                .selection-footer { margin-top: 32px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 24px; }
                .footer-text { color: #64748b; font-size: 0.9rem; margin: 0; }
                .register-link { color: #4f46e5; font-weight: 600; text-decoration: none; transition: color 0.2s; }
                .register-link:hover { color: #4338ca; text-decoration: underline; }

                .error-message { background: #fee2e2; color: #991b1b; padding: 14px; border-radius: 12px; margin-bottom: 24px; font-size: 0.9rem; border: 1px solid #fecaca; display: flex; align-items: center; gap: 8px; }

                /* Right Side (Image) */
                .selection-right { flex: 1; display: none; position: relative; }
                .responsive-image { width: 100%; height: 100%; object-fit: cover; }
                .image-overlay { position: absolute; inset: 0; background: linear-gradient(to top, #0f172a, transparent); opacity: 0.85; }
                .image-content { position: absolute; bottom: 80px; left: 60px; right: 60px; color: white; z-index: 10; }
                .image-content h2 { font-size: 2.5rem; font-weight: 800; line-height: 1.1; margin-bottom: 20px; letter-spacing: -0.025em; }
                .image-content p { font-size: 1.15rem; color: #cbd5e1; line-height: 1.6; max-width: 90%; }

                @media(min-width: 1024px) {
                    .selection-right { display: block; }
                }

                @media(max-width: 640px) {
                    .selection-left { padding: 20px; }
                    .selection-card { padding: 24px; border-radius: 20px; }
                }
            `}</style>
        </div>
    );
}
