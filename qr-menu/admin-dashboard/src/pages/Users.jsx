import { useState, useEffect } from 'react';
import { usersAPI, rolesAPI } from '../services/api';
import { Plus, Edit, Trash2, X, RefreshCw, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export default function Users() {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await usersAPI.getAll();
            setUsers(response.data.users || []);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (user) => {
        if (user._id === currentUser._id) return alert(t('delete_self_error'));
        if (!confirm(`${t('delete_user_confirm')} "${user.name}"?`)) return;

        try {
            await usersAPI.delete(user._id);
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.error || t('delete_role_error')); // Reuse or new key if strict
        }
    };

    const handleResetPassword = async (user) => {
        if (!confirm(`${t('reset_password_confirm')} "${user.name}"?`)) return;

        try {
            const response = await usersAPI.resetPassword(user._id);
            alert(response.data.message);
        } catch (error) {
            alert(t('reset_password_error'));
        }
    };

    const openModal = (user = null) => {
        setEditUser(user);
        setShowModal(true);
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h2>{t('manage_users') || 'Manage Users'}</h2>
                    <p>{t('users_desc') || 'Create and manage system users'}</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary">
                    <Plus size={18} />
                    {t('add_user') || 'Add User'}
                </button>
            </div>

            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{t('user') || 'Name'}</th>
                                <th>Email</th>
                                <th>{t('role')}</th>
                                <th>{t('status')}</th>
                                <th>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user._id}>
                                    <td>
                                        <div style={{ fontWeight: '500', color: '#1e293b' }}>{user.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{user.phone}</div>
                                    </td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className="badge" style={{ background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd' }}>
                                            {user.role?.name || t('unknown_role')}
                                        </span>
                                    </td>
                                    <td>
                                        {user.active ? (
                                            <span className="status-badge" style={{ color: '#166534', background: '#dcfce7', border: '1px solid #bbf7d0' }}>{t('active')}</span>
                                        ) : (
                                            <span className="status-badge" style={{ color: '#991b1b', background: '#fee2e2', border: '1px solid #fecaca' }}>{t('inactive')}</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="actions" style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => openModal(user)} className="icon-btn" title={t('edit')}>
                                                <Edit size={18} color="#64748b" />
                                            </button>
                                            <button onClick={() => handleResetPassword(user)} className="icon-btn" title="Reset Password">
                                                <Key size={18} color="#f59e0b" />
                                            </button>
                                            <button onClick={() => handleDelete(user)} className="icon-btn" title={t('delete')} disabled={user._id === currentUser._id}>
                                                <Trash2 size={18} color="#ef4444" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <UserModal
                    user={editUser}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        fetchUsers();
                        setShowModal(false);
                    }}
                    t={t}
                />
            )}
        </div>
    );
}

function UserModal({ user, onClose, onSave, t }) {
    const [roles, setRoles] = useState([]);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        roleId: user?.role?._id || '',
        password: '',
        active: user?.active ?? true
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const response = await rolesAPI.getAll();
                setRoles(response.data.roles || []);
                // If creating new user and no role selected, select first one
                if (!user && !formData.roleId && response.data.roles?.length > 0) {
                    setFormData(prev => ({ ...prev, roleId: response.data.roles[0]._id }));
                }
            } catch (error) {
                console.error('Failed to fetch roles');
            }
        };
        fetchRoles();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (user) {
                await usersAPI.update(user._id, formData);
            } else {
                await usersAPI.create(formData);
            }
            onSave();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to save user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{user ? t('edit_user') : t('new_user')}</h3>
                    <button onClick={onClose} className="icon-btn"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>{t('name_label')} *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('email_label')} *</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('phone_label')} *</label>
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>{t('role_label')} *</label>
                        <select
                            value={formData.roleId}
                            onChange={e => setFormData({ ...formData, roleId: e.target.value })}
                            required
                        >
                            <option value="">{t('select_role_placeholder')}</option>
                            {roles.map(role => (
                                <option key={role._id} value={role._id}>{role.name}</option>
                            ))}
                        </select>
                    </div>

                    {!user && (
                        <div className="form-group">
                            <label>{t('initial_password_label')} *</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                required={!user}
                                placeholder={t('min_chars_placeholder')}
                            />
                        </div>
                    )}

                    {user && (
                        <div className="form-group">
                            <label className="checkbox-row">
                                <input
                                    type="checkbox"
                                    checked={formData.active}
                                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                />
                                {t('active_account_label')}
                            </label>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">{t('cancel')}</button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? t('saving') : t('save_user')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
