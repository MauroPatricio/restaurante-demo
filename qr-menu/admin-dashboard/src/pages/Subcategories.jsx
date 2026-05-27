import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subcategoryAPI, categoryAPI } from '../services/api';
import { Plus, Edit2, Trash2, FolderOpen, Package, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import './Subcategories.css';

export default function Subcategories() {
    const { user } = useAuth();
    const { t } = useTranslation();
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
        <div className="subcategories-page animate-fade-in">

            <header className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">
                        {t('subcategories')}
                    </h1>
                    <p className="page-subtitle">
                        {t('subcategories_desc')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchSubcategories} className="btn-modern-outline" title={t('refresh')}>
                        <RefreshCcw size={20} />
                    </button>
                    <button
                        onClick={() => {
                            setEditingSubcategory(null);
                            setFormData({ name: '', description: '', categoryId: '' });
                            setShowModal(true);
                        }}
                        className="btn-modern-primary"
                    >
                        <Plus size={20} /> {t('new_subcategory_btn')}
                    </button>
                </div>
            </header>

            {/* Filter */}
            <div className="glass-card filter-card">
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                    {t('filter_by_category')}
                </label>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="filter-select"
                    style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '14px',
                        color: '#1e293b',
                        background: '#f8fafc'
                    }}
                >
                    <option value="all">{t('all_categories_filter')}</option>
                    {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                </select>
            </div>

            {/* Subcategories List */}
            <div className="glass-card subcategories-table-card mt-6">
                <h3 className="table-title">
                    {t('all_subcategories')} ({filteredSubcategories.length})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table className="subcategories-table">
                        <thead>
                            <tr>
                                <th>{t('name_label', 'Name')}</th>
                                <th>{t('category_required', 'Category')}</th>
                                <th>{t('description_label', 'Description')}</th>
                                <th style={{ textAlign: 'center' }}>{t('items_label', 'Items')}</th>
                                <th style={{ textAlign: 'right' }}>{t('actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSubcategories.map((subcategory) => (
                                <tr key={subcategory._id}>
                                    <td className="category-name">
                                        {subcategory.name}
                                    </td>
                                    <td>
                                        <span className="category-badge">
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
                                        <div className="action-group" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => handleEdit(subcategory)} className="btn-outline-icon" title="Edit">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(subcategory._id)} className="btn-outline-icon danger" title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredSubcategories.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <FolderOpen size={48} color="#cbd5e1" />
                                            <p style={{ fontSize: '16px', fontWeight: '500' }}>
                                                {t('no_subcategories_found')}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content glass-panel animate-slide-up" style={{ width: '90%', maxWidth: '500px', padding: '32px' }}>
                        <h2 className="text-2xl font-900 text-gray-900 mb-6">
                            {editingSubcategory ? t('edit_subcategory') : t('new_subcategory_btn')}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                        {t('category_required', 'Category *')}
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
                                        <option value="">{t('select_category')}</option>
                                        {categories.map(cat => (
                                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                        {t('name_required', 'Name *')}
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder={t('name_placeholder')}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '8px',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                                        {t('description_label', 'Description')}
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder={t('description_placeholder')}
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
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-modern-outline"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="btn-modern-primary"
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
