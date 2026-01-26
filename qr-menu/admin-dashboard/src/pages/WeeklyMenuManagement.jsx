import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { weeklyMenuAPI, menuAPI } from '../services/api';
import { Calendar, Plus, Edit, Trash2, Power, PowerOff, RefreshCw } from 'lucide-react';
import './WeeklyMenuManagement.css';

const WeeklyMenuManagement = () => {
    const { t } = useTranslation();
    const [menus, setMenus] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMenu, setEditingMenu] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        selectedItems: []
    });

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const restaurant = user.restaurant;

    useEffect(() => {
        if (restaurant?._id || restaurant) {
            fetchMenus();
            fetchMenuItems();
        }
    }, [restaurant]);

    const fetchMenus = async () => {
        try {
            setLoading(true);
            const restaurantId = restaurant._id || restaurant;
            const { data } = await weeklyMenuAPI.getAll(restaurantId);
            setMenus(data.menus || []);
        } catch (error) {
            console.error('Failed to fetch weekly menus:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMenuItems = async () => {
        try {
            const restaurantId = restaurant._id || restaurant;
            const { data } = await menuAPI.getAll(restaurantId);
            setMenuItems(data || []);
        } catch (error) {
            console.error('Failed to fetch menu items:', error);
        }
    };

    const handleCreate = () => {
        setEditingMenu(null);
        setFormData({
            name: '',
            description: '',
            startDate: '',
            endDate: '',
            selectedItems: []
        });
        setShowModal(true);
    };

    const handleEdit = (menu) => {
        setEditingMenu(menu);
        setFormData({
            name: menu.name,
            description: menu.description || '',
            startDate: menu.startDate.split('T')[0],
            endDate: menu.endDate.split('T')[0],
            selectedItems: menu.items.map(i => i.menuItem._id || i.menuItem)
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            const restaurantId = restaurant._id || restaurant;
            const payload = {
                restaurant: restaurantId,
                name: formData.name,
                description: formData.description,
                startDate: formData.startDate,
                endDate: formData.endDate,
                items: formData.selectedItems.map(id => ({ menuItem: id }))
            };

            if (editingMenu) {
                await weeklyMenuAPI.update(editingMenu._id, payload);
            } else {
                await weeklyMenuAPI.create(payload);
            }

            setShowModal(false);
            fetchMenus();
        } catch (error) {
            console.error('Failed to save menu:', error);
            alert('Erro ao salvar menu');
        }
    };

    const handleActivate = async (menuId) => {
        if (!confirm('Ativar este menu semanal? Outros menus serão desativados.')) return;

        try {
            await weeklyMenuAPI.activate(menuId);
            fetchMenus();
        } catch (error) {
            console.error('Failed to activate menu:', error);
        }
    };

    const handleDeactivate = async (menuId) => {
        try {
            await weeklyMenuAPI.deactivate(menuId);
            fetchMenus();
        } catch (error) {
            console.error('Failed to deactivate menu:', error);
        }
    };

    const handleArchive = async (menuId) => {
        if (!confirm('Arquivar este menu?')) return;

        try {
            await weeklyMenuAPI.archive(menuId);
            fetchMenus();
        } catch (error) {
            console.error('Failed to archive menu:', error);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            active: { text: 'Ativo', class: 'status-active' },
            draft: { text: 'Rascunho', class: 'status-draft' },
            expired: { text: 'Expirado', class: 'status-expired' },
            archived: { text: 'Arquivado', class: 'status-archived' }
        };
        const badge = badges[status] || badges.draft;
        return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
    };

    if (loading) {
        return <div className="loading">Carregando...</div>;
    }

    return (
        <div className="weekly-menu-container">
            <div className="menu-header">
                <div>
                    <h1><Calendar size={28} /> Gestão de Menus Semanais</h1>
                    <p>Crie e gerencie menus dinâmicos por período</p>
                </div>
                <div className="header-actions">
                    <button onClick={fetchMenus} className="btn-refresh">
                        <RefreshCw size={18} /> Atualizar
                    </button>
                    <button onClick={handleCreate} className="btn-primary">
                        <Plus size={18} /> Novo Menu Semanal
                    </button>
                </div>
            </div>

            <div className="menus-grid">
                {menus.map(menu => (
                    <div key={menu._id} className={`menu-card ${menu.status}`}>
                        <div className="menu-card-header">
                            <div>
                                <h3>{menu.name}</h3>
                                {getStatusBadge(menu.status)}
                            </div>
                        </div>

                        <p className="menu-description">{menu.description || 'Sem descrição'}</p>

                        <div className="menu-dates">
                            <div className="date-item">
                                <span className="label">Início:</span>
                                <span>{new Date(menu.startDate).toLocaleDateString('pt-PT')}</span>
                            </div>
                            <div className="date-item">
                                <span className="label">Fim:</span>
                                <span>{new Date(menu.endDate).toLocaleDateString('pt-PT')}</span>
                            </div>
                        </div>

                        <div className="menu-items-count">
                            {menu.items?.length || 0} itens no menu
                        </div>

                        <div className="menu-actions">
                            {menu.status === 'draft' && (
                                <>
                                    <button onClick={() => handleActivate(menu._id)} className="btn-activate">
                                        <Power size={16} /> Ativar
                                    </button>
                                    <button onClick={() => handleEdit(menu)} className="btn-edit">
                                        <Edit size={16} />
                                    </button>
                                </>
                            )}
                            {menu.status === 'active' && (
                                <button onClick={() => handleDeactivate(menu._id)} className="btn-deactivate">
                                    <PowerOff size={16} /> Desativar
                                </button>
                            )}
                            {(menu.status === 'draft' || menu.status === 'expired') && (
                                <button onClick={() => handleArchive(menu._id)} className="btn-delete">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {menus.length === 0 && (
                    <div className="empty-state">
                        <Calendar size={64} />
                        <p>Nenhum menu semanal criado</p>
                        <button onClick={handleCreate} className="btn-primary">Criar Primeiro Menu</button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{editingMenu ? 'Editar Menu' : 'Novo Menu Semanal'}</h2>

                        <div className="form-group">
                            <label>Nome do Menu *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Menu da Semana - Janeiro 2026"
                            />
                        </div>

                        <div className="form-group">
                            <label>Descrição</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descrição opcional"
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Data de Início *</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Data de Término *</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Itens do Menu ({formData.selectedItems.length} selecionados)</label>
                            <div className="items-selection">
                                {menuItems.map(item => (
                                    <label key={item._id} className="item-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={formData.selectedItems.includes(item._id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFormData({ ...formData, selectedItems: [...formData.selectedItems, item._id] });
                                                } else {
                                                    setFormData({ ...formData, selectedItems: formData.selectedItems.filter(id => id !== item._id) });
                                                }
                                            }}
                                        />
                                        <span>{item.name} - {item.price} MT</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button onClick={() => setShowModal(false)} className="btn-cancel">Cancelar</button>
                            <button onClick={handleSave} className="btn-save">Salvar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WeeklyMenuManagement;
