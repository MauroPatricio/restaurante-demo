import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { menuAPI } from '../services/api';
import { Plus, Edit, Trash2, X } from 'lucide-react';

export default function Menu() {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filter, setFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.restaurant) {
            fetchMenu();
            fetchCategories();
        }
    }, [user, filter]);

    const fetchMenu = async () => {
        try {
            const params = filter !== 'all' ? { category: filter } : {};
            const response = await menuAPI.getAll(user.restaurant._id || user.restaurant, params);
            setItems(response.data.items || []);
        } catch (error) {
            console.error('Failed to fetch menu:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await menuAPI.getCategories(user.restaurant._id || user.restaurant);
            setCategories(response.data.categories || []);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            await menuAPI.delete(id);
            fetchMenu();
        } catch (error) {
            alert('Failed to delete item');
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
                    <h2>Menu Management</h2>
                    <p>Manage your restaurant menu items</p>
                </div>
                <button onClick={() => openModal()} className="btn-primary">
                    <Plus size={18} />
                    Add Item
                </button>
            </div>

            {/* Filters */}
            <div className="filters">
                <button
                    onClick={() => setFilter('all')}
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                >
                    All
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`filter-btn ${filter === cat ? 'active' : ''}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Menu Grid */}
            {loading ? (
                <div className="loading">Loading menu...</div>
            ) : (
                <div className="menu-grid">
                    {items.map(item => (
                        <div key={item._id} className="menu-card">
                            {item.photo && (
                                <div className="menu-card-image">
                                    <img src={item.photo} alt={item.name} />
                                </div>
                            )}
                            <div className="menu-card-content">
                                <div className="menu-card-header">
                                    <h3>{item.name}</h3>
                                    <span className="menu-card-price">{item.price} MT</span>
                                </div>
                                <p className="menu-card-description">{item.description}</p>
                                <div className="menu-card-meta">
                                    <span className="badge">{item.category}</span>
                                    <span className={`status-badge ${item.available ? 'green' : 'red'}`}>
                                        {item.available ? 'Available' : 'Unavailable'}
                                    </span>
                                </div>
                                <div className="menu-card-actions">
                                    <button onClick={() => openModal(item)} className="btn-small btn-secondary">
                                        <Edit size={16} />
                                        Edit
                                    </button>
                                    <button onClick={() => handleDelete(item._id)} className="btn-small btn-danger">
                                        <Trash2 size={16} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {items.length === 0 && !loading && (
                <div className="empty-state">
                    <p>No menu items found. Add your first item to get started!</p>
                </div>
            )}

            {/* Modal for Add/Edit */}
            {showModal && (
                <MenuItemModal
                    item={editItem}
                    onClose={() => {
                        setShowModal(false);
                        setEditItem(null);
                    }}
                    onSave={() => {
                        fetchMenu();
                        setShowModal(false);
                        setEditItem(null);
                    }}
                />
            )}
        </div>
    );
}

// Menu Item Modal Component
function MenuItemModal({ item, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: item?.name || '',
        description: item?.description || '',
        category: item?.category || '',
        price: item?.price || '',
        photo: item?.photo || '',
        available: item?.available ?? true,
        eta: item?.eta || 15
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (item) {
                await menuAPI.update(item._id, formData);
            } else {
                await menuAPI.create(formData);
            }
            onSave();
        } catch (error) {
            alert('Failed to save menu item');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{item ? 'Edit Menu Item' : 'Add New Menu Item'}</h3>
                    <button onClick={onClose} className="icon-btn">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-grid">
                        <div className="form-group">
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
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                required
                            />
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
                            <label>Prep Time (minutes)</label>
                            <input
                                type="number"
                                value={formData.eta}
                                onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                                min="1"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows="3"
                        />
                    </div>

                    <div className="form-group">
                        <label>Photo URL</label>
                        <input
                            type="url"
                            value={formData.photo}
                            onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                            placeholder="https://example.com/image.jpg"
                        />
                    </div>

                    <div className="form-group-checkbox">
                        <label>
                            <input
                                type="checkbox"
                                checked={formData.available}
                                onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                            />
                            <span>Available for orders</span>
                        </label>
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
