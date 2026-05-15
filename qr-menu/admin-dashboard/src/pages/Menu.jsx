import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { menuAPI, categoryAPI, subcategoryAPI, uploadAPI } from '../services/api';
import { Plus, Edit, Trash2, X, Image as ImageIcon, Package, AlertTriangle, CheckCircle, DollarSign, ChevronDown, ChevronRight, Archive, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ImageUpload from '../components/ImageUpload';
import { getCurrencySymbol } from '../utils/currencyUtils';
import { motion, AnimatePresence } from 'framer-motion';
import './Menu.css';

export default function Menu() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filter, setFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [supportedCurrencies, setSupportedCurrencies] = useState([]);
    const [collapsedSections, setCollapsedSections] = useState({});

    const restaurantId = user?.restaurant?._id || user?.restaurant;

    useEffect(() => {
        if (restaurantId) {
            fetchMenu();
            fetchCategories();
            fetchSupportedCurrencies();
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

    const fetchSupportedCurrencies = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/currency/supported`);
            const data = await res.json();
            setSupportedCurrencies(data.currencies || []);
        } catch (error) {
            console.error('Failed to fetch supported currencies:', error);
            setSupportedCurrencies(['MZN', 'USD', 'EUR', 'ZAR', 'GBP', 'BRL', 'MXN']);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm(t('confirm_delete') || 'Deseja eliminar este item?')) return false;
        const originalItems = [...items];
        setItems(items.filter(item => item._id !== id));
        try {
            await menuAPI.delete(id);
            return true;
        } catch (error) {
            setItems(originalItems);
            return false;
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
            fetchMenu();
        }
    };

    const openModal = (item = null) => {
        setEditItem(item);
        setShowModal(true);
    };

    const toggleSection = (categoryId) => {
        setCollapsedSections(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    const getGroupedItems = () => {
        if (filter !== 'all') {
            return [{
                category: categories.find(c => c._id === filter) || { name: t('filtered_items'), _id: 'filtered' },
                items: items
            }];
        }
        const grouped = categories.map(cat => ({
            category: cat,
            items: items.filter(item => (item.category?._id || item.category) === cat._id)
        })).filter(group => group.items.length > 0);
        
        const otherItems = items.filter(item => {
            const itemCatId = item.category?._id || item.category;
            return !categories.find(c => c._id === itemCatId);
        });
        if (otherItems.length > 0) {
            grouped.push({ category: { name: t('others', 'Outros'), _id: 'others' }, items: otherItems });
        }
        return grouped;
    };

    return (
        <div className="menu-page animate-fade-in">
            <header className="menu-header">
                <div className="menu-title-section">
                    <h1>{t('manage_menu', 'Gerir Menu')}</h1>
                    <p>{t('manage_menu_desc', 'Gestão de itens e categorias do menu')}</p>
                </div>
                <button onClick={() => openModal()} className="btn-modern-primary">
                    <Plus size={20} />
                    {t('add_item', 'Adicionar Item')}
                </button>
            </header>

            <div className="filters-container">
                <button
                    onClick={() => {
                        const allCollapsed = Object.keys(collapsedSections).length === categories.length + 1 && Object.values(collapsedSections).every(Boolean);
                        const nextState = !allCollapsed;
                        const newState = {};
                        categories.forEach(c => newState[c._id] = nextState);
                        newState['others'] = nextState;
                        setCollapsedSections(newState);
                    }}
                    className="tab-btn tab-btn-outline"
                >
                    {Object.values(collapsedSections).some(Boolean) ? t('expand_all', 'Expandir Tudo') : t('collapse_all', 'Recolher Tudo')}
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
                >
                    {t('all_items', 'Todos os Itens')}
                </button>
                {categories.map(cat => (
                    <button
                        key={cat._id}
                        onClick={() => setFilter(cat._id)}
                        className={`tab-btn ${filter === cat._id ? 'active' : ''}`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <LoadingSpinner size={48} />
                </div>
            ) : (
                <div className="menu-sections">
                    <AnimatePresence mode="popLayout">
                        {getGroupedItems().map(group => (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={group.category._id} 
                                className="menu-category-section"
                            >
                                <div 
                                    className="category-header"
                                    onClick={() => toggleSection(group.category._id)}
                                >
                                    <div className="category-header-info">
                                        {collapsedSections[group.category._id] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                                        <h3>{group.category.name}</h3>
                                        <span className="item-count-badge">{group.items.length} {t('items', 'itens')}</span>
                                    </div>
                                </div>
                                
                                {!collapsedSections[group.category._id] && (
                                    <div className="menu-grid">
                                        {group.items.map(item => (
                                            <motion.div 
                                                layout
                                                key={item._id} 
                                                className={`menu-item-card ${!item.available ? 'unavailable' : ''}`}
                                            >
                                                <div className="card-img-wrapper">
                                                    {(item.imageUrl || item.photo) ? (
                                                        <img src={item.imageUrl || item.photo} alt={item.name} />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full text-gray-200">
                                                            <ImageIcon size={48} />
                                                        </div>
                                                    )}
                                                    {!item.available && <div className="card-status-overlay">{t('unavailable', 'Indisponível')}</div>}
                                                </div>
                                                
                                                <div className="card-body">
                                                    <div className="card-main-info">
                                                        <h4>{item.name}</h4>
                                                        <span className="card-price">
                                                            {item.price} {getCurrencySymbol(user?.restaurant?.settings?.currency || item.currency)}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="card-stock-status">
                                                        {item.stockControlled ? (
                                                            <span className={`stock-label ${item.stock === 0 ? 'danger' : 'success'}`}>
                                                                <Package size={14} />
                                                                {item.stock} {item.unit || t('unit_short', 'Unid.')}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-800 text-gray-400">{t('unlimited', 'Ilimitado')}</span>
                                                        )}
                                                        
                                                        <label className="toggle-switch scale-75 origin-right">
                                                            <input
                                                                type="checkbox"
                                                                checked={item.available}
                                                                onChange={() => handleToggleAvailability(item)}
                                                            />
                                                            <span className="slider"></span>
                                                        </label>
                                                    </div>
                                                    
                                                    <div className="card-footer">
                                                        <div className="flex gap-1">
                                                            {item.featured && <Star size={14} fill="#f59e0b" color="#f59e0b" />}
                                                        </div>
                                                        <div className="card-actions">
                                                            <button onClick={() => openModal(item)} className="btn-item-action btn-item-edit">
                                                                <Edit size={18} />
                                                            </button>
                                                            <button onClick={() => handleDelete(item._id)} className="btn-item-action btn-item-delete">
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {items.length === 0 && !loading && (
                <div className="text-center py-20 text-gray-400 font-800">
                    <Archive size={48} className="mx-auto mb-4 opacity-20" />
                    <p>{t('no_items', 'Nenhum item encontrado.')}</p>
                </div>
            )}

            {showModal && (
                <MenuItemModal
                    item={editItem}
                    user={user}
                    t={t}
                    restaurantId={restaurantId}
                    categories={categories}
                    supportedCurrencies={supportedCurrencies}
                    onClose={() => {
                        setShowModal(false);
                        setEditItem(null);
                    }}
                    onSave={(savedItem) => {
                        setItems(prev => {
                            const exists = prev.find(i => i._id === savedItem._id);
                            if (exists) return prev.map(i => i._id === savedItem._id ? savedItem : i);
                            return [savedItem, ...prev];
                        });
                        setShowModal(false);
                        setEditItem(null);
                    }}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}

const LoadingSpinner = ({ size = 24 }) => (
    <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        style={{ width: size, height: size }}
        className="text-blue-600"
    >
        <Plus size={size} />
    </motion.div>
);


// Menu Item Modal Component
function MenuItemModal({ item, user, onClose, onSave, onDelete, t, restaurantId, categories, supportedCurrencies = [] }) {
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
        currency: user?.restaurant?.settings?.currency || item?.currency || 'MZN',
        seasonal: item?.seasonal || '',
        tags: item?.tags?.join(', ') || ''
    });

    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const allergenOptions = ['Gluten', 'Lactose', 'Peanuts', 'Seafood', 'Soy', 'Eggs'];

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

    const handleImageUpload = async (file) => {
        setUploadingImage(true);
        try {
            const previewUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, imageUrl: previewUrl }));
            const response = await uploadAPI.uploadImage(file);
            const { imageUrl, imagePublicId } = response.data;
            setFormData(prev => ({ ...prev, imageUrl, imagePublicId }));
        } catch (error) {
            alert(t('image_upload_failed', 'Erro no upload da imagem'));
            setFormData(prev => ({ ...prev, imageUrl: item?.imageUrl || item?.photo || '' }));
        } finally {
            setUploadingImage(false);
        }
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({ ...prev, imageUrl: '', imagePublicId: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (uploadingImage) return alert(t('wait_image_upload', 'Aguarde o upload da imagem'));
        setLoading(true);
        try {
            const submitData = {
                ...formData,
                restaurant: restaurantId,
                ingredients: formData.ingredients.split(',').map(s => s.trim()).filter(Boolean),
                tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
                subcategory: formData.subcategory || null,
                currency: user?.restaurant?.settings?.currency || formData.currency || 'MZN'
            };

            let response = item 
                ? await menuAPI.update(item._id, submitData)
                : await menuAPI.create(submitData);

            onSave(response.data.menuItem);
        } catch (error) {
            alert(error.response?.data?.message || 'Erro ao gravar item');
        } finally {
            setLoading(false);
        }
    };

    const handleAllergenChange = (allergen) => {
        setFormData(prev => {
            const current = prev.allergens || [];
            if (current.includes(allergen)) return { ...prev, allergens: current.filter(a => a !== allergen) };
            return { ...prev, allergens: [...current, allergen] };
        });
    };

    return (
        <div className="modal-overlay animate-fade-in" onClick={onClose}>
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="premium-modal" 
                onClick={(e) => e.stopPropagation()} 
                style={{ maxWidth: '900px', width: '95%' }}
            >
                <div className="modal-header">
                    <h3>{item ? t('edit_item', 'Editar Item') : t('add_item', 'Adicionar Item')}</h3>
                    <button onClick={onClose} className="close-btn">
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-tabs">
                    {['general', 'details', 'business'].map(tab => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`modal-tab-btn ${activeTab === tab ? 'active' : ''}`}
                        >
                            {t(tab)}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="modal-body scrollable-content">
                    {activeTab === 'general' && (
                        <div className="form-grid">
                            <div className="form-group span-2">
                                <label className="premium-label">{t('product_image', 'Imagem do Produto')}</label>
                                <div className="image-upload-wrapper">
                                    <label htmlFor="modal-image-upload" className="image-upload-label">
                                        {formData.imageUrl ? (
                                            <div className="image-preview-container">
                                                <img src={formData.imageUrl} alt="Preview" />
                                                <button type="button" onClick={(e) => { e.preventDefault(); handleRemoveImage(); }} className="remove-img-btn">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="image-placeholder">
                                                <ImageIcon size={32} />
                                                <span>{t('upload_photo', 'Upload Foto')}</span>
                                            </div>
                                        )}
                                        <input id="modal-image-upload" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                                    </label>
                                </div>
                            </div>

                            <div className="form-group span-2">
                                <label className="premium-label">{t('name_required', 'Nome *')}</label>
                                <input className="premium-input" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            </div>

                            <div className="form-group">
                                <label className="premium-label">{t('category_required', 'Categoria *')}</label>
                                <select className="premium-select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })} required>
                                    <option value="">{t('select_category', 'Seleccione Categoria')}</option>
                                    {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="premium-label">{t('subcategory', 'Subcategoria')}</label>
                                <select className="premium-select" value={formData.subcategory} onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })} disabled={!formData.category || subcategories.length === 0}>
                                    <option value="">{t('none', 'Nenhuma')}</option>
                                    {subcategories.map(sub => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group span-2">
                                <div className="stock-control-card">
                                    <div className="stock-toggle-header">
                                        <div className="flex items-center gap-3">
                                            <Package size={20} className="text-blue-500" />
                                            <div>
                                                <p className="font-900 text-sm">{t('stock_control', 'Controlo de Stock')}</p>
                                                <p className="text-[10px] text-gray-400 font-700">{t('stock_control_desc', 'Gerir quantidades e alertas de stock baixo')}</p>
                                            </div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" checked={formData.stockControlled} onChange={(e) => setFormData({ ...formData, stockControlled: e.target.checked })} />
                                            <span className="slider"></span>
                                        </label>
                                    </div>

                                    {formData.stockControlled && (
                                        <div className="stock-fields-grid mt-4">
                                            <div className="form-group">
                                                <label className="premium-label-sm">{t('unit_cost', 'Custo Unit.')}</label>
                                                <input className="premium-input-sm" type="number" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} min="0" />
                                            </div>
                                            <div className="form-group">
                                                <label className="premium-label-sm">{t('available_quantity', 'Qtd. Disp.')}</label>
                                                <input className="premium-input-sm" type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: Math.max(0, parseInt(e.target.value) || 0) })} min="0" />
                                            </div>
                                            <div className="form-group">
                                                <label className="premium-label-sm">{t('minimum_stock', 'Stock Mín.')}</label>
                                                <input className="premium-input-sm" type="number" value={formData.stockMin} onChange={(e) => setFormData({ ...formData, stockMin: Math.max(0, parseInt(e.target.value) || 0) })} min="0" />
                                            </div>
                                            <div className="form-group">
                                                <label className="premium-label-sm">{t('unit', 'Unidade')}</label>
                                                <select className="premium-select-sm" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
                                                    <option value="Unidade">Unidade</option>
                                                    <option value="Garrafa">Garrafa</option>
                                                    <option value="Kg">Kg</option>
                                                    <option value="Litro">Litro</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="premium-label">{t('price_required', 'Preço *')}</label>
                                <div className="price-input-wrapper">
                                    <input className="premium-input" type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required min="0" />
                                    <span className="currency-suffix">{getCurrencySymbol(user?.restaurant?.settings?.currency || formData.currency || 'MZN')}</span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="premium-label">{t('sku', 'SKU / Código')}</label>
                                <input className="premium-input" type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder="Ex: BEV-001" />
                            </div>

                            <div className="form-group span-2">
                                <label className="premium-label">{t('description', 'Descrição')}</label>
                                <textarea className="premium-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows="3" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'details' && (
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="premium-label">{t('prep_time', 'Tempo de Prep. (min)')}</label>
                                <input className="premium-input" type="number" value={formData.prepTime} onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })} min="0" />
                            </div>
                            <div className="form-group">
                                <label className="premium-label">{t('portion_size', 'Tamanho da Porção')}</label>
                                <select className="premium-select" value={formData.portionSize} onChange={(e) => setFormData({ ...formData, portionSize: e.target.value })}>
                                    <option value="">Seleccione...</option>
                                    <option value="Small">Pequeno</option>
                                    <option value="Medium">Médio</option>
                                    <option value="Large">Grande</option>
                                </select>
                            </div>
                            <div className="form-group span-2">
                                <label className="premium-label">{t('ingredients', 'Ingredientes')}</label>
                                <textarea className="premium-textarea" value={formData.ingredients} onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })} placeholder="Tomate, Queijo, Manjericão..." rows="2" />
                            </div>
                            <div className="form-group span-2">
                                <label className="premium-label">{t('allergens', 'Alérgenos')}</label>
                                <div className="allergen-grid">
                                    {allergenOptions.map(allergen => (
                                        <label key={allergen} className="allergen-item">
                                            <input type="checkbox" checked={formData.allergens.includes(allergen)} onChange={() => handleAllergenChange(allergen)} />
                                            <span>{allergen}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'business' && (
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="premium-label">{t('seasonal', 'Sazonalidade')}</label>
                                <input className="premium-input" type="text" value={formData.seasonal} onChange={(e) => setFormData({ ...formData, seasonal: e.target.value })} placeholder="Ex: Apenas Verão" />
                            </div>
                            <div className="form-group span-2 flex flex-col gap-4">
                                <label className="checkbox-item-premium">
                                    <input type="checkbox" checked={formData.available} onChange={(e) => setFormData({ ...formData, available: e.target.checked })} />
                                    <span>{t('available', 'Disponível para Venda')}</span>
                                </label>
                                <label className="checkbox-item-premium">
                                    <input type="checkbox" checked={formData.featured} onChange={(e) => setFormData({ ...formData, featured: e.target.checked })} />
                                    <span>{t('featured', 'Destaque (Recomendação do Chef)')}</span>
                                </label>
                                <label className="checkbox-item-premium">
                                    <input type="checkbox" checked={formData.variablePrice} onChange={(e) => setFormData({ ...formData, variablePrice: e.target.checked })} />
                                    <span>{t('variable_price', 'Preço Variável')}</span>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="modal-footer mt-8">
                        {item && (
                            <button type="button" onClick={() => onDelete(item._id)} className="btn-modern-danger">
                                <Trash2 size={18} />
                                {t('delete', 'Eliminar')}
                            </button>
                        )}
                        <div className="flex gap-3 ml-auto">
                            <button type="button" onClick={onClose} className="btn-modern-secondary">{t('cancel', 'Cancelar')}</button>
                            <button type="submit" className="btn-modern-primary" disabled={loading || uploadingImage}>
                                {loading ? t('saving', 'Gravando...') : t('save', 'Gravar Item')}
                            </button>
                        </div>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
