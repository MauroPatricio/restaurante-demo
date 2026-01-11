import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Register() {
    const [formData, setFormData] = useState({
        name: '', // Owner Name
        street: '',
        number: '',
        neighborhood: '',
        city: 'Maputo',
        phone: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [image, setImage] = useState(null); // Separate state for file
    const [showPassword, setShowPassword] = useState(false);
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

        if (formData.password.trim() !== formData.confirmPassword.trim()) {
            setError('As senhas não coincidem');
            return;
        }

        setLoading(true);

        try {
            // Construct full address from parts
            const addressParts = [
                formData.street,
                formData.number,
                formData.neighborhood,
                formData.city
            ].filter(Boolean);
            const fullAddress = addressParts.join(', ');

            // Create FormData
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (key !== 'confirmPassword' && key !== 'street' && key !== 'number' && key !== 'neighborhood' && key !== 'city') {
                    // Trim text values before appending
                    const value = typeof formData[key] === 'string' ? formData[key].trim() : formData[key];
                    data.append(key, value);
                }
            });

            // Append constructed address
            data.append('address', fullAddress);

            if (image) {
                data.append('image', image);
            }

            // Register
            const response = await authAPI.register(data);

            if (response.data.token) {
                alert('Conta criada com sucesso! Por favor faça login para criar o seu restaurante.');
                navigate('/login');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Falha no registo');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-layout">
            <div className="register-left">
                <div className="register-card">
                    <div className="register-header">
                        <h1>👤 Registo do Proprietário</h1>
                        <p>Crie a sua conta de administrador</p>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="register-form">
                        <div className="form-section">
                            <h3>Dados do Proprietário (Owner)</h3>

                            <div className="form-group center-upload">
                                <label htmlFor="image" className="avatar-upload-label">
                                    {image ? (
                                        <img src={URL.createObjectURL(image)} alt="Preview" className="avatar-preview" />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            <span>📷</span>
                                            <small>Foto de Perfil</small>
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
                                <label htmlFor="name">Nome Completo</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ex: João da Silva"
                                />
                            </div>

                            {/* Address Fields - Detailed */}
                            <div className="form-group">
                                <label htmlFor="street">Rua/Avenida</label>
                                <input
                                    id="street"
                                    type="text"
                                    value={formData.street}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ex: Rua dos Coqueiros"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="number">Número</label>
                                    <input
                                        id="number"
                                        type="text"
                                        value={formData.number}
                                        onChange={handleChange}
                                        placeholder="10"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="neighborhood">Bairro</label>
                                    <input
                                        id="neighborhood"
                                        type="text"
                                        value={formData.neighborhood}
                                        onChange={handleChange}
                                        placeholder="Ex: Sommerschield"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="city">Cidade</label>
                                <select
                                    id="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="Maputo">Maputo</option>
                                    <option value="Matola">Matola</option>
                                    <option value="Beira">Beira</option>
                                    <option value="Nampula">Nampula</option>
                                    <option value="Tete">Tete</option>
                                    <option value="Quelimane">Quelimane</option>
                                    <option value="Chimoio">Chimoio</option>
                                    <option value="Nacala">Nacala</option>
                                    <option value="Pemba">Pemba</option>
                                    <option value="Inhambane">Inhambane</option>
                                    <option value="Xai-Xai">Xai-Xai</option>
                                    <option value="Lichinga">Lichinga</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Telefone</label>
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
                                <label htmlFor="password">Senha</label>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    minLength={6}
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
                            <div className="form-group password-field">
                                <label htmlFor="confirmPassword">Confirmar Senha</label>
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ marginTop: '20px' }}
                        >
                            {loading ? 'A criar conta...' : 'Criar Conta'}
                        </button>
                    </form>

                    <div className="register-footer">
                        <p>Já tem uma conta? <Link to="/">Entrar</Link></p>
                    </div>
                </div>
            </div>

            <div className="register-right">
                <img
                    src="/image/register.jpg"
                    alt="Restaurant"
                    className="responsive-image"
                />
            </div>

            <style>{`
                .register-layout { display: flex; min-height: 100vh; font-family: 'Inter', sans-serif; }
                .register-left { flex: 1; padding: 40px; display: flex; justify-content: center; align-items: center; overflow-y: auto; background-color: #f8fafc; }
                .register-card { width: 100%; max-width: 550px; background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                .register-right { flex: 1; display: none; }
                .register-header { margin-bottom: 30px; text-align: center; }
                .register-header h1 { font-size: 1.8rem; color: #1e293b; margin-bottom: 8px; }
                .register-header p { color: #64748b; }
                
                .form-section { margin-bottom: 24px; text-align: left; background: #fff; }
                .form-section h3 { font-size: 0.95rem; font-weight: 600; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
                
                .form-group { margin-bottom: 16px; }
                .form-group label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 0.875rem; color: #475569; }
                .form-group input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; transition: border-color 0.2s; }
                .form-group input:focus { outline: none; border-color: #2563eb; ring: 2px solid #2563eb33; }
                
                .btn-primary { width: 100%; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600; transition: background 0.2s; }
                .btn-primary:hover { background: #1d4ed8; }
                .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
                
                .register-footer { margin-top: 24px; text-align: center; font-size: 0.9rem; color: #64748b; }
                .register-footer a { color: #2563eb; text-decoration: none; font-weight: 600; }
                .error-message { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; border: 1px solid #fecaca; }
                
                .responsive-image { width: 100%; height: 100%; object-fit: cover; }

                /* Avatar Upload Styles */
                .center-upload { display: flex; justify-content: center; margin-bottom: 24px; }
                .avatar-upload-label { cursor: pointer; transition: transform 0.2s; }
                .avatar-upload-label:hover { transform: scale(1.05); }
                .avatar-placeholder { width: 100px; height: 100px; border-radius: 50%; background: #f1f5f9; border: 2px dashed #cbd5e1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #64748b; }
                .avatar-placeholder span { font-size: 24px; margin-bottom: 4px; }
                .avatar-preview { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 2px solid #2563eb; }
                .hidden-input { display: none; }
                
                /* Form row for side-by-side inputs */
                .form-row { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; }
               .form-row .form-group { margin-bottom: 0; }
                .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; background: white; cursor: pointer; transition: border-color 0.2s; }
                .form-group select:focus { outline: none; border-color: #2563eb; ring: 2px solid #2563eb33; }

                @media(min-width: 900px) {
                    .register-right { display: block; }
                }
            `}</style>
        </div>
    );
}
