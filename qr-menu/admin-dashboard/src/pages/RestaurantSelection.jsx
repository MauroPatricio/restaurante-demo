import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { restaurantAPI } from '../services/api';
import { LogOut, Building2, ChevronRight, PlusCircle, ArrowRight, Power } from 'lucide-react';

const RestaurantSelection = () => {
    const { user, selectRestaurant } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [togglingId, setTogglingId] = useState(null);

    const isOwner = user?.role?.name === 'Owner' || user?.role?.isSystem;

    useEffect(() => {
        if (location.state?.restaurants) {
            setRestaurants(location.state.restaurants);
        } else if (user?.restaurants && Array.isArray(user.restaurants)) {
            setRestaurants(user.restaurants);
        } else if (!user) {
            navigate('/login');
        }
    }, [user, location.state]);

    const handleSelectRestaurant = async (restaurantId) => {
        setLoading(true);
        setError('');
        try {
            await selectRestaurant(restaurantId);
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError('Falha ao entrar no restaurante. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (e, restaurantId) => {
        e.stopPropagation(); // Prevent restaurant selection
        setTogglingId(restaurantId);
        try {
            const { data } = await restaurantAPI.toggleActive(restaurantId);

            // Update local state
            setRestaurants(prev => prev.map(r =>
                (r.id || r._id) === restaurantId
                    ? { ...r, active: data.active }
                    : r
            ));
        } catch (err) {
            console.error('Failed to toggle restaurant status:', err);
            alert('Falha ao alterar status do restaurante');
        } finally {
            setTogglingId(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    return (
        <div className="selection-layout">
            {/* LEFT SIDE: CONTENT */}
            <div className="selection-left">
                <div className="selection-card">
                    <div className="selection-header">
                        <div className="icon-badge">
                            <Building2 size={28} />
                        </div>
                        <h1>Bem-vindo de volta</h1>
                        <p>Selecione um restaurante para gerir</p>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <div className="action-list">
                        {/* Global Dashboard Button (for Owners) */}
                        {isOwner && (
                            <button
                                onClick={() => navigate('/owner-dashboard')}
                                className="global-dash-btn"
                            >
                                <div className="btn-content">
                                    <Building2 size={20} className="icon-primary" />
                                    <span>Dashboard Global do Proprietário</span>
                                </div>
                                <ArrowRight size={18} className="arrow-icon" />
                            </button>
                        )}

                        {/* Separator */}
                        <div className="separator">
                            <span>Seus Restaurantes</span>
                        </div>

                        {/* Restaurants List */}
                        <div className="restaurants-list custom-scrollbar">
                            {restaurants.map((restaurant) => {
                                const restaurantId = restaurant.id || restaurant._id;
                                const isActive = restaurant.active !== false; // Default to true if undefined
                                const isToggling = togglingId === restaurantId;

                                return (
                                    <div key={restaurantId} className="restaurant-item-wrapper">
                                        <button
                                            onClick={() => handleSelectRestaurant(restaurantId)}
                                            disabled={loading || !isActive}
                                            className={`restaurant-item ${!isActive ? 'inactive' : ''}`}
                                        >
                                            <div className="rest-info">
                                                <div className="rest-avatar">
                                                    {restaurant.name.charAt(0)}
                                                </div>
                                                <div className="rest-details">
                                                    <h3>{restaurant.name}</h3>
                                                    <div className="rest-meta">
                                                        <span className="role-badge">{restaurant.role || 'Membro'}</span>
                                                        <span className={`status-badge ${isActive ? 'status-active' : 'status-inactive'}`}>
                                                            {isActive ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronRight size={18} className="chevron" />
                                        </button>

                                        {/* Toggle Switch (Owner only) */}
                                        {isOwner && (
                                            <button
                                                onClick={(e) => handleToggleActive(e, restaurantId)}
                                                disabled={isToggling}
                                                className={`toggle-btn ${isActive ? 'active' : 'inactive'}`}
                                                title={isActive ? 'Desativar restaurante' : 'Ativar restaurante'}
                                            >
                                                <Power size={16} className={isToggling ? 'spinning' : ''} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}

                            <button
                                onClick={() => navigate('/create-restaurant')}
                                className="add-new-btn"
                            >
                                <PlusCircle size={20} />
                                <span>Adicionar Novo Restaurante</span>
                            </button>
                        </div>
                    </div>

                    <div className="selection-footer">
                        <button onClick={handleLogout} className="logout-btn">
                            <LogOut size={16} />
                            <span>Sair de {user?.email}</span>
                        </button>
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
                    src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop"
                    alt="Restaurant Ambiance"
                    className="responsive-image"
                />
            </div>

            <style>{`
                .selection-layout { display: flex; min-height: 100vh; font-family: 'Inter', sans-serif; }
                
                /* Left Side */
                .selection-left { flex: 1; padding: 40px; display: flex; justify-content: center; align-items: center; overflow-y: auto; background-color: #f8fafc; }
                .selection-card { width: 100%; max-width: 500px; background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                
                .selection-header { margin-bottom: 30px; text-align: center; }
                .selection-header h1 { font-size: 1.8rem; color: #1e293b; margin-bottom: 8px; font-weight: 700; }
                .selection-header p { color: #64748b; font-size: 1rem; }
                
                .icon-badge { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; background: #4f46e5; color: white; border-radius: 16px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }

                /* Global Dashboard Button */
                .global-dash-btn { width: 100%; padding: 16px; background: #0f172a; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; border: none; cursor: pointer; transition: all 0.2s; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(15, 23, 42, 0.2); }
                .global-dash-btn:hover { background: #1e293b; transform: translateY(-1px); }
                .btn-content { display: flex; align-items: center; gap: 12px; font-weight: 600; }
                .icon-primary { color: #818cf8; }
                .arrow-icon { color: #94a3b8; transition: transform 0.2s; }
                .global-dash-btn:hover .arrow-icon { transform: translateX(4px); color: white; }

                /* Separator */
                .separator { position: relative; text-align: center; margin: 24px 0; }
                .separator::before { content: ''; position: absolute; left: 0; top: 50%; width: 100%; height: 1px; background: #e2e8f0; z-index: 1; }
                .separator span { position: relative; z-index: 2; background: white; padding: 0 16px; color: #94a3b8; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

                /* Restaurants List */
                .restaurants-list { display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto; padding-right: 4px; }
                
                .restaurant-item-wrapper { position: relative; display: flex; align-items: center; gap: 8px; }
                
                .restaurant-item { flex: 1; padding: 16px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s; text-align: left; }
                .restaurant-item:hover { border-color: #4f46e5; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.1); }
                .restaurant-item.inactive { opacity: 0.5; cursor: not-allowed; }
                .restaurant-item.inactive:hover { border-color: #e2e8f0; box-shadow: none; }
                
                .rest-info { display: flex; align-items: center; gap: 16px; }
                .rest-avatar { width: 48px; height: 48px; background: #eef2ff; color: #4f46e5; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; }
                .restaurant-item:hover .rest-avatar { background: #4f46e5; color: white; }
                .restaurant-item.inactive .rest-avatar { background: #f1f5f9; color: #94a3b8; }
                
                .rest-details h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0; }
                .rest-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
                .role-badge { background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; }
                
                .status-badge { font-size: 0.75rem; font-weight: 500; display: flex; align-items: center; gap: 4px; }
                .status-badge::before { content: ''; display: block; width: 6px; height: 6px; border-radius: 50%; }
                .status-active { color: #10b981; }
                .status-active::before { background: #10b981; }
                .status-inactive { color: #ef4444; }
                .status-inactive::before { background: #ef4444; }

                .chevron { color: #cbd5e1; transition: color 0.2s; }
                .restaurant-item:hover .chevron { color: #4f46e5; }

                /* Toggle Button */
                .toggle-btn { padding: 10px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
                .toggle-btn.active { background: #ecfdf5; border-color: #10b981; color: #10b981; }
                .toggle-btn.active:hover { background: #10b981; color: white; }
                .toggle-btn.inactive { background: #fef2f2; border-color: #ef4444; color: #ef4444; }
                .toggle-btn.inactive:hover { background: #ef4444; color: white; }
                .toggle-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spinning { animation: spin 1s linear infinite; }

                .add-new-btn { width: 100%; padding: 16px; border: 2px dashed #cbd5e1; background: transparent; color: #64748b; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; transition: all 0.2s; margin-top: 12px; }
                .add-new-btn:hover { border-color: #4f46e5; color: #4f46e5; background: #eef2ff; }

                /* Footer */
                .selection-footer { margin-top: 32px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 24px; }
                .logout-btn { background: none; border: none; color: #64748b; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-size: 0.9rem; transition: color 0.2s; }
                .logout-btn:hover { color: #ef4444; }

                .error-message { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; border: 1px solid #fecaca; }

                /* Right Side (Image) */
                .selection-right { flex: 1; display: none; position: relative; }
                .responsive-image { width: 100%; height: 100%; object-fit: cover; }
                .image-overlay { position: absolute; inset: 0; background: linear-gradient(to top, #0f172a, transparent); opacity: 0.8; }
                .image-content { position: absolute; bottom: 60px; left: 60px; right: 60px; color: white; z-index: 10; }
                .image-content h2 { font-size: 2.5rem; font-weight: 700; line-height: 1.1; margin-bottom: 16px; }
                .image-content p { font-size: 1.1rem; color: #cbd5e1; }

                @media(min-width: 900px) {
                    .selection-right { display: block; }
                }

                /* Scrollbar */
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
            `}</style>
        </div>
    );
};

export default RestaurantSelection;
