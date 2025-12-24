import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function CreateRestaurant() {
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        email: ''
    });
    const [image, setImage] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
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
            const data = new FormData();
            data.append('name', formData.name);
            data.append('address', formData.address);
            data.append('phone', formData.phone);
            data.append('email', formData.email);

            if (image) {
                data.append('image', image);
            }

            // POST to /restaurants using authenticated api instance
            const response = await api.post('/restaurants', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data) {
                // Success! Redirect back to selection which will fetch the new list
                alert('Restaurante criado com sucesso!');
                navigate('/select-restaurant');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Falha ao criar restaurante');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-layout">
            {/* Left Content */}
            <div className="create-left">
                <div className="create-card">
                    <div className="create-header">
                        <h1>🏭 Novo Restaurante</h1>
                        <p>Configure os detalhes do seu novo estabelecimento</p>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="create-form">

                        <div className="form-group center-upload">
                            <label htmlFor="image" className="logo-upload-label">
                                {image ? (
                                    <img src={URL.createObjectURL(image)} alt="Preview" className="logo-preview" />
                                ) : (
                                    <div className="logo-placeholder">
                                        <span>🏪</span>
                                        <small>Logo do Restaurante</small>
                                    </div>
                                )}
                                <input
                                    id="image"
                                    type="file"
                                    accept="image/*"
                                    className="hidden-input"
                                    onChange={(e) => setImage(e.target.files[0])}
                                />
                            </label>
                        </div>

                        <div className="form-group">
                            <label htmlFor="name">Nome do Restaurante</label>
                            <input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Ex: Pizzaria do Zé"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="address">Endereço / Localização</label>
                            <input
                                id="address"
                                type="text"
                                value={formData.address}
                                onChange={handleChange}
                                required
                                placeholder="Ex: Av. 24 de Julho, Maputo"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="phone">Telefone (Comercial)</label>
                            <input
                                id="phone"
                                type="text"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+258 84 ..."
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email (Comercial)</label>
                            <input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="contato@restaurante.com"
                            />
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                className="btn-text"
                                onClick={() => navigate('/select-restaurant')}
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                            >
                                {loading ? 'A criar...' : 'Criar Restaurante'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Side - Image */}
            <div className="create-right">
                <div className="image-overlay"></div>
                <div className="image-content">
                    <h2>Expanda seu império.</h2>
                    <p>Adicione novas localizações e gerencie-as centralmente.</p>
                </div>
                <img
                    src="https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80"
                    alt="Restaurant Interior"
                    className="responsive-image"
                />
            </div>

            <style>{`
                .create-layout { display: flex; min-height: 100vh; font-family: 'Inter', sans-serif; }
                
                /* Left Side */
                .create-left { flex: 1; padding: 40px; display: flex; justify-content: center; align-items: center; overflow-y: auto; background-color: #f8fafc; }
                .create-card { width: 100%; max-width: 500px; background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                
                .create-header { margin-bottom: 30px; text-align: center; }
                .create-header h1 { font-size: 1.5rem; color: #1e293b; margin-bottom: 8px; }
                .create-header p { color: #64748b; font-size: 0.9rem; }
                
                .form-group { margin-bottom: 16px; }
                .form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.875rem; color: #475569; }
                .form-group input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; transition: border-color 0.2s; }
                .form-group input:focus { outline: none; border-color: #2563eb; ring: 2px solid #2563eb33; }
                
                .form-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 24px; }
                .btn-primary { padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 600; transition: background 0.2s; }
                .btn-primary:hover { background: #1d4ed8; }
                .btn-primary:disabled { opacity: 0.7; }
                .btn-text { background: none; border: none; color: #64748b; cursor: pointer; font-size: 0.95rem; font-weight: 500; }
                .btn-text:hover { color: #334155; }

                .error-message { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; border: 1px solid #fecaca; }

                /* Logo Upload */
                .center-upload { display: flex; justify-content: center; margin-bottom: 24px; }
                .logo-upload-label { cursor: pointer; transition: transform 0.2s; }
                .logo-upload-label:hover { transform: scale(1.05); }
                .logo-placeholder { width: 100px; height: 100px; border-radius: 12px; background: #f1f5f9; border: 2px dashed #cbd5e1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #64748b; }
                .logo-placeholder span { font-size: 24px; margin-bottom: 4px; }
                .logo-preview { width: 100px; height: 100px; border-radius: 12px; object-fit: cover; border: 2px solid #2563eb; }
                .hidden-input { display: none; }

                /* Right Side (Image) */
                .create-right { flex: 1; display: none; position: relative; }
                .responsive-image { width: 100%; height: 100%; object-fit: cover; }
                .image-overlay { position: absolute; inset: 0; background: linear-gradient(to top, #0f172a, transparent); opacity: 0.8; }
                .image-content { position: absolute; bottom: 60px; left: 60px; right: 60px; color: white; z-index: 10; }
                .image-content h2 { font-size: 2.5rem; font-weight: 700; line-height: 1.1; margin-bottom: 16px; }
                .image-content p { font-size: 1.1rem; color: #cbd5e1; }

                @media(min-width: 900px) {
                    .create-right { display: block; }
                }
            `}</style>
        </div>
    );
}
