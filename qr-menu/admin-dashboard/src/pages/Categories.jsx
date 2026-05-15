import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { categoryAPI } from '../services/api';
import { Plus, Edit2, Trash2, GripVertical, FolderOpen, Package, Archive, Layout } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import './Categories.css';

const KpiCard = ({ title, value, icon: Icon, iconClass, className }) => (
    <div className={`glass-card kpi-card ${className}`}>
        <div className="kpi-info">
            <p>{title}</p>
            <h3 className="kpi-value">{value}</h3>
        </div>
        <div className={`kpi-icon-container ${iconClass}`}>
            <Icon size={28} strokeWidth={2.5} />
        </div>
    </div>
);

export default function Categories() {
    const { t } = useTranslation();
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
            const { data } = await categoryAPI.getAll(restaurantId);
            setCategories(data.categories || []);
        } catch (error) {
            console.error('Failed to load categories:', error);
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
        if (!confirm(t('confirm_delete_category') || 'Deseja eliminar esta categoria?')) return;
        try {
            await categoryAPI.delete(id);
            fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    const totalItems = categories.reduce((sum, cat) => sum + (cat.itemsCount || 0), 0);
    const activeCategoriesCount = categories.filter(cat => cat.isActive).length;

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <LoadingSpinner size={48} />
        </div>
    );

    return (
        <div className="categories-page animate-fade-in">
            {/* Header */}
            <header className="categories-header">
                <div className="categories-title-section">
                    <h1>{t('categories') || 'Categorias'}</h1>
                    <p>{t('categories_desc') || 'Organize os itens do seu menu por categorias'}</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCategory(null);
                        setFormData({ name: '', description: '', displayOrder: categories.length });
                        setShowModal(true);
                    }}
                    className="btn-modern-primary"
                >
                    <Plus size={20} />
                    {t('new_category_btn') || 'Nova Categoria'}
                </button>
            </header>

            {/* KPI Cards */}
            <div className="categories-kpi-grid">
                <KpiCard
                    title={t('total_categories', 'Total de Categorias')}
                    value={categories.length}
                    icon={FolderOpen}
                    iconClass="icon-total"
                />
                <KpiCard
                    title={t('active_categories', 'Categorias Activas')}
                    value={activeCategoriesCount}
                    icon={Package}
                    iconClass="icon-free"
                />
                <KpiCard
                    title={t('total_items', 'Total de Itens')}
                    value={totalItems}
                    icon={Archive}
                    iconClass="icon-featured"
                />
            </div>

            {/* Categories List */}
            <div className="categories-table-card animate-slide-up">
                <div className="table-header-row">
                    <h3>{t('all_categories', 'Todas as Categorias')}</h3>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="categories-table">
                        <thead>
                            <tr>
                                <th className="grip-cell"></th>
                                <th>{t('name', 'Nome')}</th>
                                <th>{t('description', 'Descrição')}</th>
                                <th className="text-center">{t('items', 'Itens')}</th>
                                <th className="text-center">{t('order', 'Ordem')}</th>
                                <th className="text-center">{t('status', 'Estado')}</th>
                                <th className="text-right">{t('actions', 'Acções')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {categories.map((category) => (
                                    <motion.tr 
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        key={category._id} 
                                        className="category-row"
                                    >
                                        <td className="grip-cell">
                                            <GripVertical size={16} />
                                        </td>
                                        <td className="category-name">{category.name}</td>
                                        <td className="category-desc">{category.description || '-'}</td>
                                        <td className="text-center font-800">{category.itemsCount || 0}</td>
                                        <td className="text-center font-800">{category.displayOrder}</td>
                                        <td className="text-center">
                                            <span className={`badge-status ${category.isActive ? 'badge-active' : 'badge-inactive'}`}>
                                                {category.isActive ? t('active', 'Activo') : t('inactive', 'Inactivo')}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="action-group">
                                                <button onClick={() => handleEdit(category)} className="btn-icon btn-edit">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(category._id)} className="btn-icon btn-delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                            {categories.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="text-center py-12 text-gray-400 font-700">
                                        {t('no_categories_found', 'Nenhuma categoria encontrada.')}
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
                    <div className="modal-content glass-panel animate-slide-up">
                        <h2 className="text-2xl font-900 text-gray-900 mb-6">
                            {editingCategory ? t('edit_category') : t('new_category')}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-5">
                                <label className="block text-sm font-800 text-gray-600 mb-2">
                                    {t('name', 'Nome')} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="modern-input"
                                    placeholder={t('category_name_placeholder', 'Ex: Pratos Principais')}
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-800 text-gray-600 mb-2">
                                    {t('description', 'Descrição')}
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="modern-input resize-none"
                                    placeholder={t('description_placeholder', 'Descrição opcional')}
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-modern-outline"
                                >
                                    {t('cancel', 'Cancelar')}
                                </button>
                                <button
                                    type="submit"
                                    className="btn-modern-primary"
                                >
                                    {editingCategory ? t('update', 'Actualizar') : t('create', 'Criar')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
