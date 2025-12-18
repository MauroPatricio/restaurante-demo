import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
    const [formData, setFormData] = useState({
        restaurantName: '',
        restaurantAddress: '',
        name: '', // Owner Name
        phone: '',
        email: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth(); // We can potentially auto-login
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.id]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Register
            const response = await axios.post('http://localhost:4001/api/auth/register', formData);

            // Auto login with the returned token/user data or redirect to login
            // The register endpoint returns token and user data similar to login
            if (response.data.token) {
                // We'd ideally need a way to set the auth context without calling the login API again, 
                // but for simplicity/robustness, let's just use the login function or redirect.
                // Since `login` context function usually calls the API, we might just redirect the user to login to be safe 
                // OR we can rely on the fact that if we have the token we can store it.
                // Let's redirect to login for now to ensure clean state initialization, 
                // OR better, alert success and redirect.
                alert('Registration successful! Please login.');
                navigate('/');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-layout">
            <div className="register-left">
                <div className="register-card">
                    <div className="register-header">
                        <h1>🚀 Join Aura</h1>
                        <p>Create your restaurant account</p>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="register-form">
                        <div className="form-section">
                            <h3>Restaurant Details</h3>
                            <div className="form-group">
                                <label htmlFor="restaurantName">Restaurant Name</label>
                                <input
                                    id="restaurantName"
                                    type="text"
                                    value={formData.restaurantName}
                                    onChange={handleChange}
                                    required
                                    placeholder="Tasty Bites"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="restaurantAddress">Address</label>
                                <input
                                    id="restaurantAddress"
                                    type="text"
                                    value={formData.restaurantAddress}
                                    onChange={handleChange}
                                    required
                                    placeholder="City, Street 123"
                                />
                            </div>
                        </div>

                        <div className="form-section">
                            <h3>Owner Details</h3>
                            <div className="form-group">
                                <label htmlFor="name">Full Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Phone</label>
                                <input
                                    id="phone"
                                    type="text"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                    placeholder="+258 84 123 4567"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="owner@example.com"
                                />
                            </div>
                            <div className="form-group password-field" style={{ position: 'relative' }}>
                                <label htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '65%', // adjusted for label
                                        transform: 'translateY(-50%)',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ marginTop: '20px' }}
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="register-footer">
                        <p>Already have an account? <Link to="/">Sign In</Link></p>
                    </div>
                </div>
            </div>

            <div className="register-right">
                <img
                    src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80"
                    alt="Restaurant"
                    className="responsive-image"
                />
            </div>

            <style>{`
                .register-layout { display:flex; min-height:100vh; }
                .register-left { flex:1; padding:40px; display:flex; justify-content:center; align-items:center; overflow-y: auto; }
                .register-card { width:100%; max-width:500px; }
                .register-right { flex:1; display:none; }
                .register-header { margin-bottom: 30px; text-align: center; }
                .form-section { margin-bottom: 20px; text-align: left; }
                .form-section h3 { font-size: 1rem; color: #666; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 15px; }
                .form-group { margin-bottom: 15px; }
                .form-group label { display: block; margin-bottom: 5px; font-weight: 500; font-size: 0.9rem; }
                .form-group input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
                .btn-primary { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: 600; }
                .btn-primary:hover { background: #1d4ed8; }
                .register-footer { margin-top: 20px; text-align: center; font-size: 0.9rem; }
                .register-footer a { color: #2563eb; text-decoration: none; font-weight: 600; }
                .error-message { background: #fee2e2; color: #dc2626; padding: 10px; border-radius: 6px; margin-bottom: 20px; font-size: 0.9rem; }
                
                .responsive-image { width: 100%; height: 100%; object-fit: cover; }

                @media (min-width: 900px) {
                    .register-right { display:block; }
                }
            `}</style>
        </div>
    );
}
