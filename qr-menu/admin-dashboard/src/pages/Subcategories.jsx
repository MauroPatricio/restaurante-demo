import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subcategoryAPI, categoryAPI } from '../services/api';
import { Plus, Edit2, Trash2, FolderOpen, Package } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const cardStyle = {
    background: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.02)',
};

export default function Subcategories() {
    const { user } = useAuth();
    const [subcategories, setSubcategories] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSubcategory, setEditingSubcategory] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        categoryId: ''
    });

    const restaurantId = user?.restaurant?._id || user?.restaurant;

    useEffect(() => {
        if (restaurantId) {
            fetchCategories();
            fetchSubcategories();
        }
    }, [restaurantId]);

    const fetchCategories = async () => {
        try {
            const { data } = await categoryAPI.getAll(restaurantId);
            setCategories(data.categories || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchSubcategories = async () => {
        try {
            setLoading(true);

            if (!restaurantId) {
                console.error('No restaurantId found');
                alert('Restaurant ID not found. Please refresh the page.');
                return;
            }
            const { data } = await subcategoryAPI.getByRestaurant(restaurantId);

            setSubcategories(data.subcategories || []);
        } catch (error) {
            console.error('Error fetching subcategories:', error);
            console.error('Error response:', error.response);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingSubcategory) {
                await subcategoryAPI.update(editingSubcategory._id, formData);
            } else {
                await subcategoryAPI.create(formData);
            }

            setShowModal(false);
            setEditingSubcategory(null);
            setFormData({ name: '', description: '', categoryId: '' });
            fetchSubcategories();
        } catch (error) {
            console.error('Error saving subcategory:', error);
            alert(error.response?.data?.message || 'Failed to save subcategory');
        }
    };

    const handleEdit = (subcategory) => {
        setEditingSubcategory(subcategory);
        setFormData({
            name: subcategory.name,
            description: subcategory.description || '',
            categoryId: subcategory.category._id || subcategory.category
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this subcategory?')) return;

        try {
            await subcategoryAPI.delete(id);
            fetchSubcategories();
        } catch (error) {
            console.error('Error deleting subcategory:', error);
            alert(error.response?.data?.message || 'Failed to delete subcategory');
        }
    };

    const filteredSubcategories = selectedCategory
        ? subcategories.filter(sub => sub.category._id === selectedCategory)
        : subcategories;

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', gap: '16px', minHeight: '80vh' }}>
            <LoadingSpinner size={48} />
            <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Loading Subcategories...</span>
        </div>
    );

    return (
        <div style={{ padding: '32px', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '24px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                        Subcategories
                    </h1>
                    <p style={{ color: '#64748b', marginTop: '8px', fontSize: '14px' }}>
                        Organize items within categories
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingSubcategory(null);
                        setFormData({ name: '', description: '', categoryId: '' });
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
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}
                >
                    <Plus size={20} /> New Subcategory
                </button>
            </div>

            {/* Filter */}
            <div style={cardStyle}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                    Filter by Category
                </label>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                        width: '100%',
                        maxWidth: '300px',
                        padding: '12px 16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px'
                    }}
                >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                </select>
            </div>

            {/* Subcategories List */}
            <div style={cardStyle}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '16px' }}>
                    All Subcategories ({filteredSubcategories.length})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', fontSize: '14px', textAlign: 'left' }}>
                        <thead style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '12px 24px' }}>Name</th>
                                <th style={{ padding: '12px 24px' }}>Category</th>
                                <th style={{ padding: '12px 24px' }}>Description</th>
                                <th style={{ padding: '12px 24px', textAlign: 'center' }}>Items</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSubcategories.map((subcategory) => (
                                <tr key={subcategory._id} style={{ background: 'white', borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    <td style={{ padding: '16px 24px', fontWeight: '600', color: '#1e293b' }}>
                                        {subcategory.name}
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            padding: '4px 12px',
                                            borderRadius: '9999px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            background: '#eff6ff',
                                            color: '#3b82f6'
                                        }}>
                                            {subcategory.category?.name || 'N/A'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px', color: '#64748b' }}>
                                        {subcategory.description || '-'}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                        {subcategory.itemsCount || 0}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleEdit(subcategory)}
                                                style={{
                                                    background: '#eff6ff',
                                                    color: '#3b82f6',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '8px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(subcategory._id)}
                                                style={{
                                                    background: '#fef2f2',
                                                    color: '#ef4444',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '8px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredSubcategories.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>
                                        No subcategories found
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
                            {editingSubcategory ? 'Edit Subcategory' : 'New Subcategory'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                    Category *
                                </label>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                >
                                    <option value="">Select a category</option>
                                    {categories.map(cat => (
                                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
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
                                    placeholder="e.g. Pasta"
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
                                    {editingSubcategory ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
