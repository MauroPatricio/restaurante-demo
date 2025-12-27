import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI, rolesAPI } from '../services/api';
import {
    Users, Plus, Search, MoreVertical, Mail, Phone, Shield,
    CheckCircle, XCircle, Trash2, Edit2, Key, Power
} from 'lucide-react';

// Modern styles matching Kitchen.jsx
const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.02)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const statCardStyle = {
    ...cardStyle,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: '200px'
};

const iconBoxStyle = (color, bg) => ({
    padding: '12px',
    borderRadius: '12px',
    color: color,
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
});

export default function UserManagement() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        roleId: '',
        password: 'temp123'
    });

    const restaurantId = user?.restaurant?._id || user?.restaurant;

    useEffect(() => {
        if (restaurantId) {
            fetchData();
        }
    }, [restaurantId]);

    const fetchData = async () => {
        try {
            const [usersRes, rolesRes] = await Promise.all([
                usersAPI.getByRestaurant(restaurantId),
                rolesAPI.getAll()
            ]);
            setUsers(usersRes.data.users || []);
            setRoles(rolesRes.data.roles || rolesRes.data || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await usersAPI.createForRestaurant(restaurantId, formData);
            setShowModal(false);
            fetchData();
            setFormData({ name: '', email: '', phone: '', roleId: '', password: 'temp123' });
        } catch (error) {
            console.error('Failed to add user', error);
            alert(error.response?.data?.error || 'Failed to add user');
        }
    };

    const handleToggleActive = async (userId) => {
        setTogglingId(userId);
        try {
            await usersAPI.toggleActive(userId);
            fetchData();
        } catch (error) {
            console.error('Failed to toggle user status:', error);
            alert('Failed to toggle user status');
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async (userId) => {
        if (window.confirm('Are you sure you want to remove this user from the restaurant?')) {
            try {
                await usersAPI.delete(userId);
                fetchData();
            } catch (error) {
                console.error(error);
                alert('Failed to delete user');
            }
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #e5e7eb',
                    borderTop: '4px solid #6366f1',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }}></div>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: '100vw', minHeight: 'calc(100vh - 64px)', backgroundColor: '#f8fafc' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                        Team Management
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '16px' }}>
                        Manage access and roles for your restaurant staff
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        background: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = '#4338ca';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = '#4f46e5';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    <Plus size={20} />
                    Add Team Member
                </button>
            </div>

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div style={statCardStyle}>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Total Members
                        </p>
                        <h3 style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                            {users.length}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#3b82f6', '#eff6ff')}>
                        <Users size={24} />
                    </div>
                </div>

                <div style={statCardStyle}>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Managers
                        </p>
                        <h3 style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                            {users.filter(u => u.role?.name === 'Manager').length}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#8b5cf6', '#f5f3ff')}>
                        <Shield size={24} />
                    </div>
                </div>

                <div style={statCardStyle}>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                            Waiters
                        </p>
                        <h3 style={{ fontSize: '36px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                            {users.filter(u => u.role?.name === 'Waiter').length}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#10b981', '#ecfdf5')}>
                        <Users size={24} />
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div style={cardStyle}>
                <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                        Staff Members
                    </h3>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>User</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Role</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Contact</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((member) => (
                                <tr key={member._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s ease' }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                background: '#eef2ff',
                                                color: '#4f46e5',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: '700',
                                                fontSize: '16px'
                                            }}>
                                                {member.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600', color: '#1e293b' }}>{member.name}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>{member.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            backgroundColor: member.role?.name === 'Owner' ? '#f5f3ff' : member.role?.name === 'Manager' ? '#eff6ff' : '#ecfdf5',
                                            color: member.role?.name === 'Owner' ? '#7c3aed' : member.role?.name === 'Manager' ? '#3b82f6' : '#059669',
                                            border: `1px solid ${member.role?.name === 'Owner' ? '#e9d5ff' : member.role?.name === 'Manager' ? '#dbeafe' : '#d1fae5'}`
                                        }}>
                                            {member.role?.name || 'Member'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', color: '#64748b', fontSize: '14px' }}>
                                        {member.phone || '-'}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: member.active ? '#059669' : '#64748b'
                                        }}>
                                            {member.active ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                            {member.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                            <button
                                                onClick={() => handleToggleActive(member._id)}
                                                disabled={togglingId === member._id}
                                                style={{
                                                    padding: '8px',
                                                    background: member.active ? '#fef2f2' : '#ecfdf5',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    color: member.active ? '#dc2626' : '#059669',
                                                    cursor: togglingId === member._id ? 'not-allowed' : 'pointer',
                                                    opacity: togglingId === member._id ? 0.5 : 1
                                                }}
                                                title={member.active ? 'Deactivate' : 'Activate'}
                                            >
                                                <Power size={18} className={togglingId === member._id ? 'spinning' : ''} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(member._id)}
                                                style={{
                                                    padding: '8px',
                                                    background: '#fef2f2',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    color: '#dc2626',
                                                    cursor: 'pointer'
                                                }}
                                                title="Remove from Restaurant"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {users.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#94a3b8' }}>
                        <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                        <p>No team members found. Add your first member!</p>
                    </div>
                )}
            </div>

            {/* Add User Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    padding: '16px'
                }}>
                    <div style={{
                        background: 'white',
                        width: '100%',
                        maxWidth: '500px',
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                Add Team Member
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748b',
                                    cursor: 'pointer'
                                }}
                            >
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                    Role
                                </label>
                                <select
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        background: 'white'
                                    }}
                                    value={formData.roleId}
                                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                                >
                                    <option value="">Select a role</option>
                                    {roles.map(role => (
                                        <option key={role._id} value={role._id}>{role.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                    Initial Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Temporary password"
                                />
                                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                    User will be prompted to change on first login
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '10px 16px',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        background: 'white',
                                        color: '#475569',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1,
                                        padding: '10px 16px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        background: '#4f46e5',
                                        color: 'white',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Add Member
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spinning {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
}
