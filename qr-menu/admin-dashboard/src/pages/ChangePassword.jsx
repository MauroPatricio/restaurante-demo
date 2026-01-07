import { useState } from 'react';
import { usersAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ChangePassword() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { logout } = useAuth(); // Or function to update user state

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            return setError('New passwords do not match');
        }

        if (newPassword.length < 6) {
            return setError('Password must be at least 6 characters');
        }

        setLoading(true);
        try {
            await usersAPI.changePassword({ currentPassword, newPassword });
            alert('Password changed successfully! Please login again.');
            logout(); // Force re-login to clear default password flag in context/token
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to change password');
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'white' }}>
            {/* Left Side - Form */}
            <div style={{
                flex: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                maxWidth: '600px',
                width: '100%'
            }}>
                <div style={{ width: '100%', maxWidth: '400px' }}>
                    <div style={{ marginBottom: '40px' }}>
                        <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', marginBottom: '12px' }}>
                            Secure Your Account
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.6' }}>
                            Please set a new password to activate your account and access the dashboard.
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            background: '#fef2f2',
                            color: '#dc2626',
                            padding: '16px',
                            borderRadius: '12px',
                            marginBottom: '24px',
                            fontSize: '14px',
                            border: '1px solid #fecaca'
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>
                                Current Password
                            </label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '16px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    backgroundColor: '#f8fafc'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>
                                New Password
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '16px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    backgroundColor: '#f8fafc'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569', fontSize: '14px' }}>
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '16px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    backgroundColor: '#f8fafc'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#4f46e5'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontSize: '16px',
                                fontWeight: '600',
                                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                                transition: 'opacity 0.2s'
                            }}
                        >
                            {loading ? 'Updating Password...' : 'Set New Password'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Side - Image */}
            <div style={{
                flex: '1',
                display: 'none',
                '@media (min-width: 1024px)': { display: 'block' } // Note: Inline styles don't support media queries directly, will handle with conditional rendering or className if possible, but for inline simple let's use a class or just flex
            }} className="desktop-only-image">
                <div style={{
                    height: '100%',
                    width: '100%',
                    backgroundImage: 'url("https://images.unsplash.com/photo-1556740738-b6a63e27c4df?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative'
                }}>
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 20%)'
                    }}></div>
                </div>
            </div>

            <style>{`
                @media (min-width: 1024px) {
                    .desktop-only-image {
                        display: block !important;
                    }
                }
                @media (max-width: 1023px) {
                    .desktop-only-image {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
