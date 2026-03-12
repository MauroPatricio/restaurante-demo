import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { menuAPI, categoryAPI, subcategoryAPI, uploadAPI } from '../services/api';
import { Plus, Edit, Trash2, X, Image as ImageIcon, Package, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ImageUpload from '../components/ImageUpload';

export default function Menu() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filter, setFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [loading, setLoading] = useState(true);

    const restaurantId = user?.restaurant?._id || user?.restaurant;

    useEffect(() => {
        if (restaurantId) {
            fetchMenu();
            fetchCategories();
        }
    }, [restaurantId, filter]);

    const fetchMenu = async () => {
        try {
            const params = filter !== 'all' ? { category: filter } : {};
            const response = await menuAPI.getAll(restaurantId, params);
            setItems(response.data.items || []);
        } catch (error) {
            console.error('Failed to fetch menu:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await categoryAPI.getAll(restaurantId);
            setCategories(response.data.categories || []);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const handleDelete = async (id) => {
        console.log(`🗑️ UI: Requesting delete for item ID: ${id}`);
        if (!confirm(t('confirm_delete') || 'Are you sure?')) {
            console.log('❌ UI: Delete cancelled by user');
            return false;
        }

        // Optimistic UI update: remove item immediately
        const originalItems = [...items];
        setItems(items.filter(item => item._id !== id));

        try {
            await menuAPI.delete(id);
            console.log(`✅ UI: Item ${id} deleted successfully from server`);
            // Don't fetch menu again - rely on optimistic update
            return true;
        } catch (error) {
            console.error('Delete error:', error);

            // Handle 404 - item already deleted
            if (error.response?.status === 404) {
                // Item already deleted, keep it removed from UI
                console.log('Item already deleted on server, cleaning up UI...');
                return true;
            } else {
                // Restore items on other errors
                setItems(originalItems);
                alert(error.response?.data?.message || 'Failed to delete item');
                return false;
            }
        }
    };

    const handleToggleAvailability = async (item) => {
        try {
            const updatedItems = items.map(i =>
                i._id === item._id ? { ...i, available: !i.available } : i
            );
            setItems(updatedItems);

            await menuAPI.update(item._id, { available: !item.available });
        } catch (error) {
            console.error('Failed to toggle availability:', error);
            alert('Failed to update status');
            fetchMenu();
        }
    };

    const openModal = (item = null) => {
        setEditItem(item);
        setShowModal(true);
    };

    return (
        <div className="menu-page">
            <div className="page-header">
                <div>
                    <h2>{t('manage_menu')}</h2>
                    <p>{t('manage_menu_desc')}</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary">
                    <Plus size={18} />
                    {t('add_item')}
                </button>
            </div>

            {/* Filters */}
            <div className="filters-scroll-container">
                <div className="filters">
                    <button
                        onClick={() => setFilter('all')}
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    >
                        {t('all_items')}
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat._id}
                            onClick={() => setFilter(cat._id)}
                            className={`filter-btn ${filter === cat._id ? 'active' : ''}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Menu Grid */}
            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="menu-grid">
                    {items.map(item => (
                        <div key={item._id} className={`menu-card ${!item.available ? 'unavailable' : ''}`}>
                            <div className="menu-card-image">
                                {(item.imageUrl || item.photo) ? (
                                    <img src={item.imageUrl || item.photo} alt={item.name} />
                                ) : (
                                    <div className="placeholder-image">
                                        <ImageIcon size={48} color="#cbd5e1" />
                                    </div>
                                )}
                                {!item.available && <div className="overlay">{t('unavailable')}</div>}
                            </div>
                            <div className="menu-card-content">
                                <div className="menu-card-header">
                                    <h3>{item.name}</h3>
                                    <span className="menu-card-price">{item.price} MT</span>
                                </div>
                                <p className="menu-card-description">{item.description}</p>
                                <div className="menu-card-meta" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                        <span className="badge">
                                            {typeof item.category === 'object' ? item.category.name : (categories.find(c => c._id === item.category)?.name || item.category)}
                                        </span>
                                        {item.subcategory && (
                                            <span className="badge" style={{ background: '#e0f2fe', fontSize: '0.75rem', fontWeight: '500' }}>
                                                {typeof item.subcategory === 'object'
                                                    ? item.subcategory.name
                                                    : (categories.flatMap(c => c.subcategories || []).find(s => s._id === item.subcategory)?.name || 'Subcategoria')}
                                            </span>
                                        )}
                                        {item.featured && <span className="badge" style={{ background: '#ffeb3b', color: '#000' }}>{t('featured')}</span>}
                                        {item.seasonal && <span className="badge" style={{ background: '#e0f2fe', color: '#000' }}>{item.seasonal}</span>}
                                        {item.tags && item.tags.slice(0, 2).map(tag => (
                                            <span key={tag} className="badge" style={{ background: '#f3f4f6', color: '#666' }}>{tag}</span>
                                        ))}
                                    </div>

                                    {/* Stock Badge */}
                                    {item.stockControlled && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {item.stock === 0 ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700', background: '#fee2e2', color: '#dc2626', padding: '3px 8px', borderRadius: '20px' }}>
                                                    <AlertTriangle size={12} /> ESGOTADO
                                                </span>
                                            ) : item.stockMin && item.stock <= item.stockMin ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700', background: '#fef3c7', color: '#d97706', padding: '3px 8px', borderRadius: '20px' }}>
                                                    <AlertTriangle size={12} /> Stock Baixo: {item.stock} {item.unit || 'Un.'}
                                                </span>
                                            ) : (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '600', background: '#dcfce7', color: '#16a34a', padding: '3px 8px', borderRadius: '20px' }}>
                                                    <CheckCircle size={12} /> {item.stock} {item.unit || 'Un.'}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                            {item.portionSize && `${item.portionSize} • `}
                                            {item.prepTime} min
                                        </span>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={item.available}
                                                onChange={() => handleToggleAvailability(item)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </div>
                                </div>
                                <div className="menu-card-actions">
                                    <button onClick={() => openModal(item)} className="btn-small btn-secondary">
                                        <Edit size={16} />
                                        {t('edit')}
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(item._id);
                                        }}
                                        className="btn-small btn-danger"
                                        title={t('delete') || 'Delete'}
                                        style={{ padding: '8px' }}
                                    >
                                        <Trash2 size={16} color="#dc2626" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {items.length === 0 && !loading && (
                <div className="empty-state">
                    <p>{t('no_items') || 'No items found.'}</p>
                </div>
            )}

            {/* Modal for Add/Edit */}
            {showModal && (
                <MenuItemModal
                    item={editItem}
                    t={t}
                    restaurantId={restaurantId}
                    categories={categories}
                    onClose={() => {
                        setShowModal(false);
                        setEditItem(null);
                    }}
                    onSave={() => {
                        fetchMenu();
                        setShowModal(false);
                        setEditItem(null);
                    }}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}

// Menu Item Modal Component
function MenuItemModal({ item, onClose, onSave, onDelete, t, restaurantId, categories }) {
    const [activeTab, setActiveTab] = useState('general');
    const [subcategories, setSubcategories] = useState([]);
    const [formData, setFormData] = useState({
        name: item?.name || '',
        description: item?.description || '',
        category: item?.category?._id || item?.category || '',
        subcategory: item?.subcategory?._id || item?.subcategory || '',
        price: item?.price || '',
        imageUrl: item?.imageUrl || item?.photo || '',
        imagePublicId: item?.imagePublicId || '',
        available: item?.available ?? true,
        sku: item?.sku || '',
        ingredients: item?.ingredients?.join(', ') || '',
        allergens: item?.allergens || [],
        prepTime: item?.prepTime || 15,
        portionSize: item?.portionSize || '',
        featured: item?.featured || false,
        variablePrice: item?.variablePrice || false,
        costPrice: item?.costPrice || 0,
        stockControlled: item?.stockControlled || false,
        stock: item?.stock ?? 0,
        stockMin: item?.stockMin ?? 0,
        unit: item?.unit || 'Unidade',
        seasonal: item?.seasonal || '',
        tags: item?.tags?.join(', ') || ''
    });
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const allergenOptions = ['Gluten', 'Lactose', 'Peanuts', 'Seafood', 'Soy', 'Eggs'];

    // Fetch subcategories when category changes
    useEffect(() => {
        if (formData.category) {
            fetchSubcategories(formData.category);
        } else {
            setSubcategories([]);
        }
    }, [formData.category]);

    const fetchSubcategories = async (categoryId) => {
        try {
            const { data } = await subcategoryAPI.getByCategory(categoryId);
            setSubcategories(data.subcategories || []);
        } catch (error) {
            console.error('Failed to fetch subcategories:', error);
        }
    };

    const [imageFile, setImageFile] = useState(null);

    const handleImageUpload = async (file) => {
        setUploadingImage(true);
        try {
            // Local preview for immediate feedback
            const previewUrl = URL.createObjectURL(file);
            setFormData(prev => ({
                ...prev,
                imageUrl: previewUrl
            }));

            // Actual upload
            console.log('📤 Uploading image to Cloudinary...');
            const response = await uploadAPI.uploadImage(file);
            const { imageUrl, imagePublicId } = response.data;

            console.log('✅ Image uploaded successfully:', imageUrl);

            setFormData(prev => ({
                ...prev,
                imageUrl,
                imagePublicId
            }));
            setImageFile(null); // Clear local file state as it's now on the server
        } catch (error) {
            console.error('Failed to upload image:', error);
            alert('Falha ao carregar imagem. Por favor, tente novamente.');
            // Revert preview on failure
            setFormData(prev => ({
                ...prev,
                imageUrl: item?.imageUrl || item?.photo || ''
            }));
        } finally {
            setUploadingImage(false);
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({
            ...prev,
            imageUrl: '',
            imagePublicId: ''
        }));
        setImageFile(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (uploadingImage) {
            alert('Aguarde o carregamento da imagem...');
            return;
        }
        setLoading(true);

        try {
            // Since image is already uploaded to Cloudinary, we can send a clean JSON object
            const submitData = {
                ...formData,
                restaurant: restaurantId,
                ingredients: formData.ingredients.split(',').map(s => s.trim()).filter(Boolean),
                tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
                // Ensure subcategory is null if empty string to avoid Mongoose errors
                subcategory: formData.subcategory || null
            };

            let response;
            if (item) {
                response = await menuAPI.update(item._id, submitData);
                console.log('✅ Menu Item Updated:', response.data.menuItem);
            } else {
                response = await menuAPI.create(submitData);
                console.log('✅ Menu Item Created:', response.data.menuItem);
            }

            if (response.data.menuItem?.imageUrl) {
                console.log('🔗 Saved Image URL:', response.data.menuItem.imageUrl);
            }

            console.log('📦 Saved Object Summary:');
            console.table({
                ID: response.data.menuItem._id,
                Nome: response.data.menuItem.name,
                Preço: response.data.menuItem.price,
                Categoria: response.data.menuItem.category?.name || response.data.menuItem.category,
                URL_Imagem: response.data.menuItem.imageUrl ? response.data.menuItem.imageUrl.substring(0, 50) + '...' : 'N/A'
            });

            // "Apresentar o item gravado" - Show success toast/alert
            alert(`✅ Item "${response.data.menuItem.name}" gravado com sucesso!`);

            onSave();
        } catch (error) {
            console.error('Save error:', error);
            alert(error.response?.data?.message || 'Failed to save menu item');
        } finally {
            setLoading(false);
        }
    };

    const handleAllergenChange = (allergen) => {
        setFormData(prev => {
            const current = prev.allergens || [];
            if (current.includes(allergen)) {
                return { ...prev, allergens: current.filter(a => a !== allergen) };
            }
            return { ...prev, allergens: [...current, allergen] };
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%' }}>
                <div className="modal-header">
                    <h3>{item ? t('edit') : t('add_item')}</h3>
                    <button onClick={onClose} className="icon-btn">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
                    {['general', 'details', 'business'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                flex: 1,
                                padding: '10px',
                                background: activeTab === tab ? '#eee' : 'transparent',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid blue' : 'none',
                                fontWeight: activeTab === tab ? 'bold' : 'normal',
                                cursor: 'pointer'
                            }}
                        >
                            {t(tab)}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="modal-form" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

                    {/* GENERAL TAB */}
                    {activeTab === 'general' && (
                        <div className="form-grid">
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Product Image</label>
                                {/* Register.jsx Philosophy: Direct Image Input & Preview */}
                                <div className="center-upload" style={{ justifyContent: 'flex-start' }}>
                                    <label htmlFor="image-upload" className="avatar-upload-label" style={{ display: 'block', width: 'fit-content' }}>
                                        {imageFile ? (
                                            <img
                                                src={URL.createObjectURL(imageFile)}
                                                alt="Preview"
                                                className="avatar-preview"
                                                style={{ width: '150px', height: '150px', borderRadius: '12px', objectFit: 'cover', border: '2px solid #2563eb' }}
                                            />
                                        ) : formData.imageUrl ? (
                                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                                <img
                                                    src={formData.imageUrl}
                                                    alt="Current"
                                                    className="avatar-preview"
                                                    style={{ width: '150px', height: '150px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleRemoveImage();
                                                    }}
                                                    style={{
                                                        position: 'absolute',
                                                        top: '-5px',
                                                        right: '-5px',
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '50%',
                                                        width: '24px',
                                                        height: '24px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="avatar-placeholder" style={{
                                                width: '150px',
                                                height: '150px',
                                                borderRadius: '12px',
                                                background: '#f1f5f9',
                                                border: '2px dashed #cbd5e1',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#64748b',
                                                cursor: 'pointer'
                                            }}>
                                                <ImageIcon size={32} />
                                                <small style={{ marginTop: '8px' }}>Upload Photo</small>
                                            </div>
                                        )}
                                        <input
                                            id="image-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden-input"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    handleImageUpload(e.target.files[0]);
                                                }
                                            }}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Category *</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                                    required
                                >
                                    <option value="">Select a category</option>
                                    {categories.map(cat => (
                                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>{t('subcategory')}</label>
                                <select
                                    value={formData.subcategory}
                                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                                    disabled={!formData.category || subcategories.length === 0}
                                >
                                    <option value="">None</option>
                                    {subcategories.map(sub => (
                                        <option key={sub._id} value={sub._id}>{sub.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* ──────────────────────────────────────────────── */}
                            {/* STOCK MANAGEMENT SECTION (Moved here)             */}
                            {/* ──────────────────────────────────────────────── */}
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <div style={{
                                    background: '#f8fafc',
                                    border: '1.5px solid #e2e8f0',
                                    borderRadius: '16px',
                                    padding: '20px',
                                    marginTop: '4px'
                                }}>
                                    {/* Toggle */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: formData.stockControlled ? '20px' : '0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Package size={18} style={{ color: '#6366f1' }} />
                                            <div>
                                                <p style={{ margin: 0, fontWeight: '700', fontSize: '14px', color: '#1e293b' }}>Controlo de Stock</p>
                                                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Activar para gerir quantidades disponíveis</p>
                                            </div>
                                        </div >
                                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.stockControlled}
                                                onChange={(e) => setFormData({ ...formData, stockControlled: e.target.checked })}
                                                style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: formData.stockControlled ? '#6366f1' : '#94a3b8' }}>
                                                {formData.stockControlled ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </label>
                                    </div>

                                    {/* Stock Fields – shown only when stockControlled = true */}
                                    {formData.stockControlled && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                            {/* Custo Unitário (Reposidioned here) */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Custo Unitário (Compra)
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="number"
                                                        value={formData.costPrice}
                                                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                                        min="0"
                                                        placeholder="Ex: 50.00"
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 14px',
                                                            border: '1.5px solid #e2e8f0',
                                                            borderRadius: '10px',
                                                            fontSize: '14px',
                                                            fontWeight: '700',
                                                            color: '#1e293b',
                                                            background: 'white',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />
                                                </div>
                                                <small style={{ color: '#94a3b8', fontSize: '11px' }}>Preço de custo para cálculo de margem</small>
                                            </div>

                                            {/* Quantidade Disponível */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Quantidade Disponível *
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="number"
                                                        value={formData.stock}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setFormData({ ...formData, stock: v === '' ? '' : Math.max(0, parseInt(v) || 0) });
                                                        }}
                                                        onFocus={(e) => e.target.select()}
                                                        onBlur={(e) => {
                                                            if (e.target.value === '') setFormData(prev => ({ ...prev, stock: 0 }));
                                                        }}
                                                        min="0"
                                                        step="1"
                                                        placeholder="Ex: 100"
                                                        style={{
                                                            width: '100%',
                                                            padding: '10px 14px',
                                                            border: '1.5px solid #e2e8f0',
                                                            borderRadius: '10px',
                                                            fontSize: '14px',
                                                            fontWeight: '700',
                                                            color: '#1e293b',
                                                            background: 'white',
                                                            boxSizing: 'border-box'
                                                        }}
                                                    />
                                                </div>
                                                <small style={{ color: '#94a3b8', fontSize: '11px' }}>Unidades actuais em stock</small>
                                            </div>

                                            {/* Stock Mínimo */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Stock Mínimo
                                                </label>
                                                <input
                                                    type="number"
                                                    value={formData.stockMin}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setFormData({ ...formData, stockMin: v === '' ? '' : Math.max(0, parseInt(v) || 0) });
                                                    }}
                                                    onFocus={(e) => e.target.select()}
                                                    onBlur={(e) => {
                                                        if (e.target.value === '') setFormData(prev => ({ ...prev, stockMin: 0 }));
                                                    }}
                                                    min="0"
                                                    step="1"
                                                    placeholder="Ex: 10"
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 14px',
                                                        border: '1.5px solid #e2e8f0',
                                                        borderRadius: '10px',
                                                        fontSize: '14px',
                                                        fontWeight: '700',
                                                        color: '#1e293b',
                                                        background: 'white',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                                <small style={{ color: '#94a3b8', fontSize: '11px' }}>Alerta quando stock ≤ este valor</small>
                                            </div>

                                            {/* Unidade de Medida */}
                                            <div>
                                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Unidade de Medida
                                                </label>
                                                <select
                                                    value={formData.unit}
                                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 14px',
                                                        border: '1.5px solid #e2e8f0',
                                                        borderRadius: '10px',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        color: '#1e293b',
                                                        background: 'white',
                                                        boxSizing: 'border-box'
                                                    }}
                                                >
                                                    <option value="Unidade">Unidade</option>
                                                    <option value="Garrafa">Garrafa</option>
                                                    <option value="Kg">Kg</option>
                                                    <option value="Litro">Litro</option>
                                                    <option value="Caixa">Caixa</option>
                                                    <option value="Pacote">Pacote</option>
                                                    <option value="Porção">Porção</option>
                                                </select>
                                                <small style={{ color: '#94a3b8', fontSize: '11px' }}>Ex: Garrafa, Kg, Litro</small>
                                            </div>

                                            {/* Live status preview */}
                                            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                                                <div style={{
                                                    flex: 1,
                                                    padding: '12px 16px',
                                                    borderRadius: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    background: formData.stock === 0
                                                        ? '#fee2e2'
                                                        : formData.stockMin && formData.stock <= formData.stockMin
                                                            ? '#fef3c7'
                                                            : '#dcfce7',
                                                    border: `1.5px solid ${formData.stock === 0 ? '#fca5a5' : formData.stockMin && formData.stock <= formData.stockMin ? '#fde68a' : '#86efac'}`
                                                }}>
                                                    {formData.stock === 0
                                                        ? <AlertTriangle size={16} style={{ color: '#dc2626' }} />
                                                        : formData.stockMin && formData.stock <= formData.stockMin
                                                            ? <AlertTriangle size={16} style={{ color: '#d97706' }} />
                                                            : <CheckCircle size={16} style={{ color: '#16a34a' }} />
                                                    }
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: formData.stock === 0 ? '#dc2626' : formData.stockMin && formData.stock <= formData.stockMin ? '#92400e' : '#166534' }}>
                                                        {formData.stock === 0
                                                            ? '⚠ Produto esgotado'
                                                            : formData.stockMin && formData.stock <= formData.stockMin
                                                                ? `⚠ Stock baixo – ${formData.stock} ${formData.unit} restantes`
                                                                : `✓ Stock OK – ${formData.stock} ${formData.unit} disponível`
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                            {formData.price > 0 && formData.costPrice > 0 && (
                                                <div style={{ gridColumn: 'span 3', marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                                                    <div style={{
                                                        fontSize: '14px',
                                                        padding: '10px 20px',
                                                        background: ((formData.price - formData.costPrice) / formData.price) > 0.5 ? '#ecfdf5' : (((formData.price - formData.costPrice) / formData.price) > 0.2 ? '#fffbeb' : '#fef2f2'),
                                                        color: ((formData.price - formData.costPrice) / formData.price) > 0.5 ? '#10b981' : (((formData.price - formData.costPrice) / formData.price) > 0.2 ? '#f59e0b' : '#ef4444'),
                                                        borderRadius: '12px',
                                                        fontWeight: '800',
                                                        border: `1.5px solid ${((formData.price - formData.costPrice) / formData.price) > 0.5 ? '#86efac' : (((formData.price - formData.costPrice) / formData.price) > 0.2 ? '#fde68a' : '#fca5a5')}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '12px'
                                                    }}>
                                                        <DollarSign size={18} />
                                                        Margem de Lucro: {(((formData.price - formData.costPrice) / formData.price) * 100).toFixed(1)}% ({(formData.price - formData.costPrice).toLocaleString()} MT por item)
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Price (MT) *</label>
                                <input
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    required
                                    min="0"
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('sku')}</label>
                                <input
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    placeholder="e.g. BEV-001"
                                />
                            </div>

                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows="3"
                                />
                            </div>

                        </div>
                    )}

                    {/* DETAILS TAB */}
                    {activeTab === 'details' && (
                        <div className="form-grid">
                            <div className="form-group">
                                <label>{t('prep_time')}</label>
                                <input
                                    type="number"
                                    value={formData.prepTime}
                                    onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
                                    min="0"
                                />
                            </div>

                            <div className="form-group">
                                <label>{t('portion_size')}</label>
                                <select
                                    value={formData.portionSize}
                                    onChange={(e) => setFormData({ ...formData, portionSize: e.target.value })}
                                >
                                    <option value="">Select...</option>
                                    <option value="Small">Small</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Large">Large</option>
                                    <option value="Sharing">Sharing</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>{t('ingredients')} (comma separated)</label>
                                <textarea
                                    value={formData.ingredients}
                                    onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                                    placeholder="Tomatoes, Basil, Garlic..."
                                    rows="2"
                                />
                            </div>

                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>{t('tags')} (comma separated)</label>
                                <input
                                    type="text"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    placeholder="Vegan, Spicy, New..."
                                />
                            </div>

                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>{t('allergens')}</label>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {allergenOptions.map(allergen => (
                                        <label key={allergen} style={{ display: 'flex', gap: '5px', alignItems: 'center', background: '#f5f5f5', padding: '5px 10px', borderRadius: '15px' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.allergens.includes(allergen)}
                                                onChange={() => handleAllergenChange(allergen)}
                                            />
                                            {allergen}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BUSINESS TAB */}
                    {activeTab === 'business' && (
                        <div className="form-grid">
                            {/* Removed costPrice from here as it moved to Stock section */}

                            <div className="form-group">
                                <label>{t('seasonal')}</label>
                                <input
                                    type="text"
                                    value={formData.seasonal}
                                    onChange={(e) => setFormData({ ...formData, seasonal: e.target.value })}
                                    placeholder="e.g. Summer Only"
                                />
                            </div>

                            <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                                <div className="checkbox-row">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={formData.available}
                                            onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                                        />
                                        {t('available')}
                                    </label>
                                </div>

                                <div className="checkbox-row">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={formData.featured}
                                            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                                        />
                                        {t('featured')} (Chef's Recommendation)
                                    </label>
                                </div>

                                <div className="checkbox-row">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={formData.variablePrice}
                                            onChange={(e) => setFormData({ ...formData, variablePrice: e.target.checked })}
                                        />
                                        {t('variable_price')}
                                    </label>
                                </div>

                                {/* Note: stockControlled moved to General tab */}
                                <div style={{ padding: '10px 14px', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#0369a1', fontWeight: '600' }}>
                                        ℹ O controlo de stock (quantidade, stock mínimo e unidade) está disponível no separador <strong>Geral</strong>.
                                    </p>
                                </div>

                            </div>
                        </div>
                    )}


                    <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {item && (
                            <button
                                type="button"
                                onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const success = await onDelete(item._id);
                                    if (success) onClose();
                                }}
                                className="btn-danger"
                                style={{ marginRight: 'auto' }}
                            >
                                <Trash2 size={16} style={{ marginRight: '5px' }} />
                                {t('remove') || 'Remover'}
                            </button>
                        )}
                        <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                            <button type="button" onClick={onClose} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary" disabled={loading || uploadingImage}>
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
