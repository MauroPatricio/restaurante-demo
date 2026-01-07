import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Layout, Loader2 } from 'lucide-react';

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
            }, 500); // Half second for fade out
        }, 4000); // 4 seconds interval

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
        <div className="login-page-wrapper">
            <div className="login-content-container">
                <main className="login-form-side">
                    <div className="login-box-card">
                        <header className="login-box-header">
                            <div className="brand-badge">
                                <Layout size={24} className="brand-icon" />
                            </div>
                            <h1 className="brand-title">Gestão Digital Inteligente</h1>
                            <div className={`dynamic-subtitle ${fade ? 'fade-in' : 'fade-out'}`}>
                                {subtitles[subtitleIndex]}
                            </div>
                        </header>

                        {error && (
                            <div className="login-error-alert" role="alert">
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="modern-login-form">
                            <div className="form-input-group">
                                <label htmlFor="email">{t('email')}</label>
                                <div className="input-wrapper">
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="seuemail@email.com"
                                    />
                                </div>
                            </div>

                            <div className="form-input-group">
                                <label htmlFor="password">{t('password')}</label>
                                <div className="input-wrapper password-wrapper">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
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
                                className="submit-btn-modern"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="spinner-icon" size={20} />
                                        {t('signing_in')}
                                    </>
                                ) : (
                                    t('sign_in')
                                )}
                            </button>
                        </form>

                        <footer className="login-box-footer">
                            <p>
                                {t('dont_have_account')}{' '}
                                <Link to="/register" className="register-link-action">
                                    {t('register_here')}
                                </Link>
                            </p>
                        </footer>

                        <div className="legal-branding-footer">
                            <p>Desenvolvido por Nhiquela Serviços e Consultoria, LDA</p>
                        </div>
                    </div>
                </main>

                <aside className="login-visual-side">
                    <div className="visual-overlay"></div>
                    <img
                        src="/src/assets/initial.png"
                        alt="Gestão Digital Inteligente"
                        className="hero-login-image"
                    />
                </aside>
            </div>

            <style>{`
                :root {
                    --primary: #6366f1;
                    --primary-hover: #4f46e5;
                    --text-main: #1e293b;
                    --text-muted: #64748b;
                    --bg-soft: #f8fafc;
                    --card-bg: #ffffff;
                    --accent-bg: #f3e8ff;
                    --accent-text: #7c3aed;
                    --error: #ef4444;
                    --transition-fast: 0.2s ease;
                    --transition-slow: 0.5s ease;
                }

                .login-page-wrapper {
                    min-height: 100vh;
                    background-color: var(--bg-soft);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    padding: 40px;
                }

                .login-content-container {
                    display: flex;
                    width: 100%;
                    max-width: 1200px;
                    align-items: center;
                    justify-content: center;
                    gap: 60px; /* Separação maior conforme solicitado */
                    animation: slideUpFade 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideUpFade {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .login-form-side {
                    flex: 0.8; /* Diminuído para dar mais espaço à imagem */
                    max-width: 480px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10;
                }

                .login-box-card {
                    width: 100%;
                    background: var(--card-bg);
                    padding: 32px 40px; /* Reduzido padding vertical de 48px para 32px */
                    border-radius: 32px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
                }

                .login-box-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.08);
                }

                .login-box-header {
                    text-align: left;
                    margin-bottom: 24px; /* Reduzido de 40px para 24px */
                }

                .brand-badge {
                    width: 48px; /* Ligeiramente menor */
                    height: 48px;
                    background: linear-gradient(135deg, var(--primary) 0%, #8b5cf6 100%);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    margin-bottom: 16px; /* Reduzido de 24px */
                    box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
                }

                .brand-title {
                    font-size: 2rem; /* Reduzido de 2.25rem */
                    font-weight: 800;
                    color: var(--text-main);
                    letter-spacing: -0.025em;
                    margin: 0 0 4px 0;
                }

                .dynamic-subtitle {
                    font-size: 1rem; /* Reduzido de 1.1rem */
                    color: var(--text-muted);
                    font-weight: 500;
                    line-height: 1.4;
                    transition: opacity var(--transition-slow), transform var(--transition-slow);
                }

                .fade-in { opacity: 1; transform: translateY(0); }
                .fade-out { opacity: 0; transform: translateY(-5px); }

                .login-error-alert {
                    background: #fef2f2;
                    border-left: 4px solid var(--error);
                    padding: 10px 14px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    color: #991b1b;
                    font-size: 0.875rem;
                    font-weight: 500;
                }

                .modern-login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px; /* Reduzido de 20px */
                }

                .form-input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px; /* Reduzido de 8px */
                }

                .form-input-group label {
                    font-size: 0.825rem; /* Ligeiramente menor */
                    font-weight: 600;
                    color: var(--text-main);
                }

                .input-wrapper {
                    position: relative;
                }

                .input-wrapper input {
                    width: 100%;
                    padding: 14px; /* Reduzido de 16px */
                    border-radius: 12px; /* Reduzido de 14px */
                    border: 1.5px solid #e2e8f0;
                    background: #f8fafc;
                    font-size: 0.95rem;
                    transition: all var(--transition-fast);
                    color: var(--text-main);
                }

                .input-wrapper input:focus {
                    outline: none;
                    background: white;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
                }

                .password-wrapper .toggle-visibility-btn {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    padding: 8px;
                    border-radius: 8px;
                }

                .submit-btn-modern {
                    margin-top: 6px;
                    padding: 14px;
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all var(--transition-fast);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2);
                }

                .submit-btn-modern:hover:not(:disabled) {
                    background: var(--primary-hover);
                    transform: translateY(-1px);
                    box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
                }

                .login-box-footer {
                    margin-top: 24px; /* Reduzido de 32px */
                    text-align: center;
                    font-size: 0.9rem; /* Ligeiramente menor */
                    color: var(--text-muted);
                }

                .register-link-action {
                    color: var(--primary);
                    font-weight: 700;
                    text-decoration: none;
                }

                .legal-branding-footer {
                    margin-top: 32px; /* Reduzido de 48px */
                    padding: 16px; /* Reduzido de 20px */
                    background: var(--bg-soft);
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    text-align: center;
                }

                .legal-branding-footer p {
                    margin: 0;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    font-weight: 600;
                }

                .login-visual-side {
                    flex: 1.2; /* Aumentado de 1.2 para alargar a imagem */
                    position: relative;
                    display: block;
                    height: 650px; /* Ligeiramente menor verticalmente para casar com o form compacto */
                    border-radius: 32px;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
                }

                .visual-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
                    z-index: 1;
                }

                .hero-login-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                @media (max-width: 1100px) {
                    .login-content-container { gap: 30px; flex-direction: column-reverse; }
                    .login-visual-side { width: 100%; height: 300px; order: 1; }
                    .login-form-side { order: 2; width: 100%; max-width: 100%; }
                    .login-box-card { max-width: 500px; margin: 0 auto; }
                }

                @media (max-width: 950px) {
                    .login-visual-side { display: none; }
                    .login-content-container { max-width: 500px; }
                }

                @media (max-width: 640px) {
                    .login-page-wrapper { padding: 0; }
                    .login-content-container { margin: 0; min-height: 100vh; gap: 0; }
                    .login-box-card { border-radius: 0; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 40px 24px; }
                }
            `}</style>
        </div>
    );
}
