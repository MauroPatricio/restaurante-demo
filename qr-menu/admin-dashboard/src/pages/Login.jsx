import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Login now returns { token, user: { ..., restaurants: [...] } }
            // The token is a GLOBAL token, not scoped to a restaurant yet.
            const data = await login({ email, password });

            // Check if user has associated restaurants OR needs to create one
            // We redirect to select-restaurant in both cases:
            // 1. Has restaurants -> Select one
            // 2. No restaurants -> See 'Add New' button
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
        <div className="login-layout">
            <div className="login-left">
                <div className="login-card">
                    <div className="login-header">
                        <h1>🍽️ Restaurante Digital</h1>
                        <p>Sistema de Gestao de Restaurante</p>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="your@email.com"
                            />
                        </div>

                        <div className="form-group password-field" style={{ position: 'relative' }}>
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                aria-describedby="togglePassword"
                            />
                            <button
                                type="button"
                                id="togglePassword"
                                onClick={() => setShowPassword((s) => !s)}
                                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'transparent',
                                    border: 'none',
                                    padding: 4,
                                    cursor: 'pointer'
                                }}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                        <path d="M3 3l18 18" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M10.58 10.58a3 3 0 0 0 4.24 4.24" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M14.12 14.12C12.88 15.36 11.12 16 9 16c-2.67 0-4.9-1.67-6.5-3.5C4.1 10.67 6.33 9 9 9c1.12 0 2.88.64 4.12 1.12" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                        <path d="M2.46 12C3.73 7.59 7.6 4 12 4c4.4 0 8.27 3.59 9.54 8-1.27 4.41-5.14 8-9.54 8-4.4 0-8.27-3.59-9.54-8z" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <circle cx="12" cy="12" r="3" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>Don't have an account? <Link to="/register" style={{ color: '#2563eb', fontWeight: 'bold' }}>Registre aqui</Link></p>
                    </div>
                </div>
            </div>

            <div className="login-right" aria-hidden={false}>
                <img
                    src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80"
                    alt="Restaurante interior"
                    className="responsive-restaurant-image"
                />
            </div>

            <style>{`
                .login-layout { display:flex; min-height:100vh; align-items:center; justify-content:center; gap:24px; padding:24px; }
                .login-left { flex:1 1 480px; max-width:520px; }
                .login-right { flex:1 1 520px; display:none; align-items:center; justify-content:center; }
                .responsive-restaurant-image { width:100%; height:auto; border-radius:8px; box-shadow:0 6px 20px rgba(0,0,0,0.12); }
                @media (min-width: 900px) {
                    .login-right { display:flex; }
                }
                @media (max-width: 899px) {
                    .login-layout { flex-direction:column; }
                    .login-left { max-width:720px; }
                }
            `}</style>
        </div>
    );
}
