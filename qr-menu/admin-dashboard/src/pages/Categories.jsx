import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { categoryAPI } from '../services/api';
import { Plus, Edit2, Trash2, GripVertical, FolderOpen, Package } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

// Modern Card Styles
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
    cursor: 'pointer',
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

export default function Categories() {
    const { user } = useAuth();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        displayOrder: 0
    });

    const restaurantId = user?.restaurant?._id || user?.restaurant;

    useEffect(() => {
        if (restaurantId) {
            fetchCategories();
        }
    }, [restaurantId]);

    const fetchCategories = async () => {
        try {
            setLoading(true);

            if (!restaurantId) {

                alert('Restaurant ID not found. Please refresh the page.');
                return;
            }

            const { data } = await categoryAPI.getAll(restaurantId);

            setCategories(data.categories || []);
        } catch (error) {

            alert('Failed to load categories: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingCategory) {
                await categoryAPI.update(editingCategory._id, formData);
            } else {
                await categoryAPI.create(formData);
            }

            setShowModal(false);
            setEditingCategory(null);
            setFormData({ name: '', description: '', displayOrder: 0 });
            fetchCategories();
        } catch (error) {
            console.error('Error saving category:', error);
            alert(error.response?.data?.message || 'Failed to save category');
        }
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            description: category.description || '',
            displayOrder: category.displayOrder
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this category?')) return;

        try {
            await categoryAPI.delete(id);
            fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            alert(error.response?.data?.message || 'Failed to delete category');
        }
    };

    const totalItems = categories.reduce((sum, cat) => sum + (cat.itemsCount || 0), 0);
    const activeCategories = categories.filter(cat => cat.isActive).length;

    if (loading) return (
        <div style={{ padding: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', minHeight: '50vh' }}>
            <LoadingSpinner size={48} />
            <span style={{ color: '#64748b', fontSize: '14px' }}>Loading...</span>
        </div>
    );

    return (
        <div style={{ padding: '32px', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                        Categories
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '14px' }}>
                        Organize your menu items by categories
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingCategory(null);
                        setFormData({ name: '', description: '', displayOrder: categories.length });
                        setShowModal(true);
                    }}
                    style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                        transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <Plus size={20} /> New Category
                </button>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', width: '100%' }}>
                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Total Categories
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {categories.length}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#3b82f6', '#eff6ff')}>
                        <FolderOpen size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Active Categories
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {activeCategories}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#10b981', '#ecfdf5')}>
                        <Package size={24} strokeWidth={2.5} />
                    </div>
                </div>

                <div style={statCardStyle} onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.05)';
                }}>
                    <div>
                        <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Total Items
                        </p>
                        <h3 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: '8px 0 0 0' }}>
                            {totalItems}
                        </h3>
                    </div>
                    <div style={iconBoxStyle('#f59e0b', '#fffbeb')}>
                        <Package size={24} strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {/* Categories List */}
            <div style={cardStyle}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>
                    All Categories
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', textAlign: 'left' }}>
                        <thead style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '12px 24px', width: '40px' }}></th>
                                <th style={{ padding: '12px 24px' }}>Name</th>
                                <th style={{ padding: '12px 24px' }}>Description</th>
                                <th style={{ padding: '12px 24px', textAlign: 'center' }}>Items</th>
                                <th style={{ padding: '12px 24px', textAlign: 'center' }}>Order</th>
                                <th style={{ padding: '12px 24px', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((category) => (
                                <tr key={category._id} style={{ background: 'white', borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    <td style={{ padding: '16px 24px' }}>
                                        <GripVertical size={16} color="#cbd5e1" style={{ cursor: 'grab' }} />
                                    </td>
                                    <td style={{ padding: '16px 24px', fontWeight: '600', color: '#1e293b' }}>
                                        {category.name}
                                    </td>
                                    <td style={{ padding: '16px 24px', color: '#64748b' }}>
                                        {category.description || '-'}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                        {category.itemsCount || 0}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                        {category.displayOrder}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            padding: '4px 12px',
                                            borderRadius: '9999px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            background: category.isActive ? '#ecfdf5' : '#fef2f2',
                                            color: category.isActive ? '#10b981' : '#ef4444'
                                        }}>
                                            {category.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleEdit(category)}
                                                style={{
                                                    background: '#eff6ff',
                                                    color: '#3b82f6',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category._id)}
                                                style={{
                                                    background: '#fef2f2',
                                                    color: '#ef4444',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>
                                        No categories found. Create your first category to get started!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '32px',
                        width: '90%',
                        maxWidth: '500px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    }}>
                        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '24px' }}>
                            {editingCategory ? 'Edit Category' : 'New Category'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    placeholder="e.g. Main Course"
                                />
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        resize: 'vertical'
                                    }}
                                    placeholder="Optional description"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    style={{
                                        padding: '12px 24px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        background: 'white',
                                        color: '#64748b',
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
                                        padding: '12px 24px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        color: 'white',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {editingCategory ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
