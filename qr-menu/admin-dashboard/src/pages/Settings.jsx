import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { restaurantAPI } from '../services/api';
import { Save, Upload, Building, Phone, Mail, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Settings() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [restaurant, setRestaurant] = useState(null);
    const [preview, setPreview] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        image: null // File object
    });

    useEffect(() => {
        if (user?.restaurant) {
            fetchRestaurant();
        }
    }, [user]);

    const fetchRestaurant = async () => {
        try {
            const restId = user.restaurant._id || user.restaurant;
            const res = await restaurantAPI.get(restId);
            const data = res.data.restaurant;
            setRestaurant(data);
            setFormData({
                name: data.name || '',
                address: data.address || '',
                phone: data.phone || '',
                email: data.email || '',
                image: null
            });
            // If existing logo, set as initial preview (logic handled in render)
        } catch (error) {
            console.error('Failed to fetch restaurant:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, image: file });
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const restId = user.restaurant._id || user.restaurant;

            // Create FormData
            const payload = new FormData();
            payload.append('name', formData.name);
            payload.append('address', formData.address);
            payload.append('phone', formData.phone);
            payload.append('email', formData.email);
            if (formData.image) {
                payload.append('image', formData.image);
            }

            const res = await restaurantAPI.update(restId, payload);
            setRestaurant(res.data.restaurant);
            alert(t('save_success') || 'Settings saved successfully');

            // Should prompt a refresh of global context if logo changed?
            // For now, page refresh or context polling handles it.
            // window.location.reload(); // Simple brute force update for Sidebar

        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading">{t('loading')}</div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h2>{t('restaurant_settings') || 'Restaurant Settings'}</h2>
                    <p>{t('restaurant_settings_desc') || 'Manage your restaurant profile and branding'}</p>
                </div>
            </div>

            <div className="card-simple" style={{ maxWidth: '800px', margin: '0 auto', padding: '30px' }}>
                <form onSubmit={handleSubmit}>

                    {/* Logo Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
                        <div style={{
                            width: '150px',
                            height: '150px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '4px solid #f3f4f6',
                            marginBottom: '15px',
                            position: 'relative',
                            background: '#eee'
                        }}>
                            {(preview || restaurant?.logo) ? (
                                <img
                                    src={preview || restaurant.logo}
                                    alt="Logo"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>
                                    <Building size={48} />
                                </div>
                            )}
                        </div>

                        <label className="btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Upload size={16} />
                            {t('upload_logo') || 'Upload Logo'}
                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </label>
                        <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                            JPG, PNG or WebP. Max 5MB.
                        </p>
                    </div>

                    <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        {/* Name */}
                        <div className="form-group">
                            <label>{t('restaurant_name') || 'Restaurant Name'}</label>
                            <div className="input-with-icon">
                                <Building size={18} color="#666" style={{ position: 'absolute', top: '12px', left: '10px' }} />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    style={{ paddingLeft: '35px' }}
                                    required
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="form-group">
                            <label>{t('phone')}</label>
                            <div className="input-with-icon">
                                <Phone size={18} color="#666" style={{ position: 'absolute', top: '12px', left: '10px' }} />
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    style={{ paddingLeft: '35px' }}
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label>{t('email')}</label>
                            <div className="input-with-icon">
                                <Mail size={18} color="#666" style={{ position: 'absolute', top: '12px', left: '10px' }} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    style={{ paddingLeft: '35px' }}
                                    required
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="form-group">
                            <label>{t('address')}</label>
                            <div className="input-with-icon">
                                <MapPin size={18} color="#666" style={{ position: 'absolute', top: '12px', left: '10px' }} />
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    style={{ paddingLeft: '35px' }}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            <Save size={18} />
                            {saving ? t('saving') : t('save_changes')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
