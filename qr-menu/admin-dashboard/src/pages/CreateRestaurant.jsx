import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import LanguageSwitcher from '../components/LanguageSwitcher';

// Compress image to JPEG, max 800px wide, quality 0.8 (~< 300KB for most photos)
const compressImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
                    'image/jpeg',
                    quality
                );
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

export default function CreateRestaurant() {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: '',
        street: '',
        number: '',
        neighborhood: '',
        country: 'Moçambique',
        province: '',
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
            // Construct full address from parts
            const addressParts = [
                formData.street,
                formData.number,
                formData.neighborhood,
                formData.province,
                formData.country
            ].filter(Boolean);
            const fullAddress = addressParts.join(', ');

            const data = new FormData();
            data.append('name', formData.name);
            data.append('address', fullAddress);
            data.append('phone', formData.phone);
            data.append('email', formData.email);

            if (image) {
                // Compress before uploading to stay well under server limits
                const compressed = await compressImage(image);
                data.append('image', compressed);
            }

            // POST to /restaurants using authenticated api instance
            const response = await api.post('/restaurants', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data) {
                // Success! Redirect back to selection which will fetch the new list
                alert(t('cr_success_msg'));
                navigate('/select-restaurant');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || t('cr_error_msg'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-layout">
            {/* Left Content */}
            <div className="create-left">
                <div className="create-card">
                    <div className="create-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ textAlign: 'left' }}>
                            <h1 style={{ marginBottom: '8px', fontSize: '1.5rem', color: '#1e293b' }}>{t('cr_title')}</h1>
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{t('cr_subtitle')}</p>
                        </div>
                        <LanguageSwitcher />
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
                                        <small>{t('cr_logo')}</small>
                                    </div>
                                )}
                                <input
                                    id="image"
                                    type="file"
                                    accept="image/*"
                                    className="hidden-input"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        if (file.size > 10 * 1024 * 1024) {
                                            setError(t('cr_img_size_error'));
                                            return;
                                        }
                                        setError('');
                                        setImage(file);
                                    }}
                                />
                            </label>
                        </div>

                        <div className="form-group">
                            <label htmlFor="name">{t('cr_name')}</label>
                            <input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder={t('cr_name_placeholder')}
                            />
                        </div>

                        {/* Address Fields - Detailed */}
                        <div className="form-group">
                            <label htmlFor="street">{t('cr_street')}</label>
                            <input
                                id="street"
                                type="text"
                                value={formData.street || ''}
                                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                required
                                placeholder={t('cr_street_placeholder')}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="number">{t('cr_number')}</label>
                                <input
                                    id="number"
                                    type="text"
                                    value={formData.number || ''}
                                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                    placeholder={t('cr_number_placeholder')}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="neighborhood">{t('cr_neighborhood')}</label>
                                <input
                                    id="neighborhood"
                                    type="text"
                                    value={formData.neighborhood || ''}
                                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                                    placeholder={t('cr_neighborhood_placeholder')}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="country">{t('cr_country')}</label>
                            <select
                                id="country"
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value, province: '' })}
                                required
                            >
                                <option value="Moçambique">Moçambique</option>
                                <option value="Angola">Angola</option>
                                <option value="África do Sul">África do Sul</option>
                                <option value="Brasil">Brasil</option>
                                <option value="Cabo Verde">Cabo Verde</option>
                                <option value="Espanha">Espanha</option>
                                <option value="Estados Unidos">Estados Unidos</option>
                                <option value="França">França</option>
                                <option value="Guiné-Bissau">Guiné-Bissau</option>
                                <option value="Portugal">Portugal</option>
                                <option value="Reino Unido">Reino Unido</option>
                                <option value="São Tomé e Príncipe">São Tomé e Príncipe</option>
                                <option value="Outro">{t('cr_other')}</option>
                            </select>
                        </div>

                        {formData.country === 'Moçambique' && (
                            <div className="form-group">
                                <label htmlFor="province">{t('cr_province')}</label>
                                <select
                                    id="province"
                                    value={formData.province}
                                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                    required
                                >
                                    <option value="" disabled>{t('cr_select_province')}</option>
                                    <option value="Maputo Cidade">Maputo Cidade</option>
                                    <option value="Maputo Província">Maputo Província</option>
                                    <option value="Gaza">Gaza</option>
                                    <option value="Inhambane">Inhambane</option>
                                    <option value="Sofala">Sofala</option>
                                    <option value="Manica">Manica</option>
                                    <option value="Zambézia">Zambézia</option>
                                    <option value="Tete">Tete</option>
                                    <option value="Nampula">Nampula</option>
                                    <option value="Cabo Delgado">Cabo Delgado</option>
                                    <option value="Niassa">Niassa</option>
                                </select>
                            </div>
                        )}
                        <div className="form-group">
                            <label htmlFor="phone">{t('cr_phone')}</label>
                            <input
                                id="phone"
                                type="text"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+258 84 ..."
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">{t('cr_email')}</label>
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
                                {t('cr_cancel')}
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <LoadingSpinner size={18} color="white" />
                                        <span>{t('cr_creating')}</span>
                                    </div>
                                ) : t('cr_submit')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Side - Image */}
            <div className="create-right">
                <div className="image-overlay"></div>
                <div className="image-content">
                    <h2>{t('expand_empire_title')}</h2>
                    <p>{t('expand_empire_desc')}</p>
                </div>
                <img
                    src="/image/register.jpg"
                    alt="Restaurant Interior"
                    className="responsive-image"
                />
            </div>

            <style>{`
                .create-layout { display: flex; min-height: 100vh; font-family: 'Inter', sans-serif; }
                
                /* Left Side */
                .create-left { flex: 1; padding: 40px; display: flex; justify-content: center; align-items: center; overflow-y: auto; background-color: #f8fafc; }
                .create-card { width: 100%; max-width: 500px; background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
                
                .create-header { margin-bottom: 30px; }
                
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
                .image-content h2 { font-size: 2.5rem; font-weight: 700; line-height: 1.1; margin-bottom: 16px; color: white; }
                
                /* Form row for side-by-side inputs */
                .form-row { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; }
                .form-row .form-group { margin-bottom: 0; }
                .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem; background: white; cursor: pointer; transition: border-color 0.2s; }
                .form-group select:focus { outline: none; border-color: #2563eb; ring: 2px solid #2563eb33; }
                .image-content p { font-size: 1.1rem; color: #ffffff; }

                @media(min-width: 900px) {
                    .create-right { display: block; }
                }
            `}</style>
        </div>
    );
}
