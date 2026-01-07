import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { menuAPI, categoryAPI, subcategoryAPI, uploadAPI } from '../services/api';
import { Plus, Edit, Trash2, X, Image as ImageIcon } from 'lucide-react';
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
                            <div className="form-group">
                                <label>{t('cost_price')}</label>
                                <input
                                    type="number"
                                    value={formData.costPrice}
                                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                    min="0"
                                />
                            </div>

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

                                <div className="checkbox-row">
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={formData.stockControlled}
                                            onChange={(e) => setFormData({ ...formData, stockControlled: e.target.checked })}
                                        />
                                        {t('stock_controlled')}
                                    </label>
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
