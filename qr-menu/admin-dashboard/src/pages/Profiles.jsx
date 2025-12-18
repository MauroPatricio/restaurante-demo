import { useState, useEffect } from 'react';
import { rolesAPI } from '../services/api';
import { Plus, Edit, Trash2, X, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Profiles() {
    const { t } = useTranslation();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editRole, setEditRole] = useState(null);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const response = await rolesAPI.getAll();
            setRoles(response.data.roles || []);
        } catch (error) {
            console.error('Failed to fetch roles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (role) => {
        if (role.isSystem) return alert(t('delete_system_role_error'));
        if (!confirm(`${t('delete_profile_confirm')} "${role.name}"?`)) return;

        try {
            await rolesAPI.delete(role._id);
            fetchRoles();
        } catch (error) {
            alert(error.response?.data?.error || t('delete_role_error'));
        }
    };

    const openModal = (role = null) => {
        setEditRole(role);
        setShowModal(true);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h2>{t('access_profiles') || 'Access Profiles'}</h2>
                    <p>{t('profiles_desc') || 'Manage user access levels and permissions'}</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary">
                    <Plus size={18} />
                    {t('add_profile') || 'Add Profile'}
                </button>
            </div>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="grid-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {roles.map(role => (
                        <div key={role._id} className="card-simple" style={{ padding: '20px', border: '1px solid #eee', borderRadius: '8px', background: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Shield size={24} color={role.isSystem ? '#2563eb' : '#666'} />
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{role.name}</h3>
                                        {role.isSystem && <span style={{ fontSize: '0.8rem', color: '#2563eb', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>{t('system_role')}</span>}
                                    </div>
                                </div>
                                <div className="actions" style={{ display: 'flex', gap: '5px' }}>
                                    {!role.isSystem && (
                                        <>
                                            <button onClick={() => openModal(role)} className="icon-btn">
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(role)}
                                                className="icon-btn danger"
                                                disabled={role.userCount > 0}
                                                title={role.userCount > 0 ? t('role_has_users_error') : t('delete')}
                                                style={role.userCount > 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                    {role.isSystem && (
                                        <button onClick={() => openModal(role)} className="icon-btn" title="View permissions">
                                            <Edit size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px', minHeight: '40px' }}>
                                {role.description || t('no_description')}
                            </p>

                            <div style={{ borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#444' }}>{t('permissions_label')} ({role.permissions.length})</h4>
                                    {role.userCount > 0 && (
                                        <span style={{ fontSize: '0.75rem', color: '#666', background: '#f3f4f6', padding: '2px 8px', borderRadius: '10px' }}>
                                            {role.userCount} {t('users_count')}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {role.permissions.slice(0, 3).map(p => (
                                        <span key={p} className="badge" style={{ fontSize: '0.75rem' }}>{t(p)}</span>
                                    ))}
                                    {role.permissions.length > 3 && (
                                        <span className="badge" style={{ background: '#f3f4f6' }}>+{role.permissions.length - 3} {t('more_items')}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <RoleModal
                    role={editRole}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        fetchRoles();
                        setShowModal(false);
                    }}
                    t={t}
                />
            )}
        </div>
    );
}

function RoleModal({ role, onClose, onSave, t }) {
    const [name, setName] = useState(role?.name || '');
    const [description, setDescription] = useState(role?.description || '');
    const [permissions, setPermissions] = useState(role?.permissions || []);
    const [loading, setLoading] = useState(false);

    // Provide a list of available permissions to toggle
    const availablePermissions = [
        'manage_menu', 'manage_tables', 'manage_orders',
        'manage_staff', 'manage_settings', 'view_reports',
        'take_orders', 'update_order_status',
        'view_delivery_orders', 'update_delivery_status'
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (role) {
                await rolesAPI.update(role._id, { name, description, permissions });
            } else {
                await rolesAPI.create({ name, description, permissions });
            }
            onSave();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to save profile');
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = (perm) => {
        if (permissions.includes(perm)) {
            setPermissions(permissions.filter(p => p !== perm));
        } else {
            setPermissions([...permissions, perm]);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{role ? (role.isSystem ? t('view_profile') : t('edit_profile')) : t('new_profile')}</h3>
                    <button onClick={onClose} className="icon-btn"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>{t('profile_name')} *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            disabled={role?.isSystem}
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('description_label')}</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows="2"
                            disabled={role?.isSystem}
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('permissions_label')}</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                            {availablePermissions.map(perm => (
                                <label key={perm} className="checkbox-row" style={{ justifyContent: 'flex-start', cursor: role?.isSystem ? 'not-allowed' : 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={permissions.includes(perm) || permissions.includes('all')}
                                        onChange={() => togglePermission(perm)}
                                        disabled={role?.isSystem}
                                    />
                                    {t(perm)}
                                </label>
                            ))}
                        </div>
                    </div>
                    {!role?.isSystem && (
                        <div className="modal-actions">
                            <button type="button" onClick={onClose} className="btn-secondary">{t('cancel')}</button>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? t('saving') : t('save_profile')}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
