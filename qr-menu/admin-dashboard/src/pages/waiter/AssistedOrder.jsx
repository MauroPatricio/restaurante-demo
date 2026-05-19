import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    Search,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CheckCircle,
    UtensilsCrossed
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import api, { tableAPI, menuAPI, categoryAPI } from '../../services/api';
import { useCurrency } from '../../contexts/CurrencyContext';
import './AssistedOrder.css';

const AssistedOrder = () => {
    const { tableId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { convertAndFormat } = useCurrency();

    const [restaurantId, setRestaurantId] = useState(null);
    const [table, setTable]               = useState(null);
    const [categories, setCategories]     = useState([]);
    const [menuItems, setMenuItems]       = useState([]);
    const [loading, setLoading]           = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery]   = useState('');
    const [cart, setCart]                 = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showMobileCart, setShowMobileCart] = useState(false);

    /* ── Init ── */
    useEffect(() => {
        const init = async () => {
            try {
                let rId = null;
                try {
                    const { data } = await tableAPI.get(tableId);
                    const ft = data.table;
                    setTable(ft);
                    rId = ft.restaurant._id || ft.restaurant;
                    setRestaurantId(rId);
                } catch {
                    setTable({ _id: tableId, number: '?', status: 'occupied' });
                    const stored = localStorage.getItem('user');
                    if (stored) {
                        const u = JSON.parse(stored);
                        rId = u.restaurantId || u.restaurant;
                        setRestaurantId(rId);
                    }
                }
                if (rId) {
                    const [menuRes, catRes] = await Promise.all([
                        menuAPI.getAll(rId, { available: true }),
                        categoryAPI.getAll(rId),
                    ]);
                    setMenuItems(menuRes.data.items || []);
                    setCategories(['All', ...(catRes.data.categories || [])]);
                }
            } catch (err) {
                console.error(err);
                toast.error(t('failed_load_data', 'Erro ao carregar dados'));
            } finally {
                setLoading(false);
            }
        };
        if (tableId) init();
    }, [tableId, t]);

    /* ── Cart helpers ── */
    const addToCart = (item) =>
        setCart(prev => {
            const idx = prev.findIndex(i => i._id === item._id);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
                return next;
            }
            return [...prev, { ...item, qty: 1 }];
        });

    const removeFromCart = (item) =>
        setCart(prev => {
            const idx = prev.findIndex(i => i._id === item._id);
            if (idx < 0) return prev;
            const next = [...prev];
            if (next[idx].qty <= 1) next.splice(idx, 1);
            else next[idx] = { ...next[idx], qty: next[idx].qty - 1 };
            return next;
        });

    const deleteFromCart = (item) =>
        setCart(prev => prev.filter(i => i._id !== item._id));

    const clearCart = () => {
        if (window.confirm(t('confirm_clear_cart', 'Limpar carrinho?'))) setCart([]);
    };

    const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
    const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

    /* ── Submit ── */
    const handleSubmit = async () => {
        if (!cart.length) return;
        setIsSubmitting(true);
        try {
            await api.post('/orders', {
                restaurant: restaurantId,
                table: tableId,
                items: cart.map(i => ({ item: i._id, qty: i.qty })),
                customerName: `Garçom Mesa ${table?.number || tableId}`,
                phone: '000000000',
                orderType: 'dine-in',
                source: 'waiter',
            });
            toast.success(t('order_created_success', 'Pedido criado com sucesso!'));
            navigate('/dashboard/waiter');
        } catch (err) {
            toast.error(err.response?.data?.message || t('order_create_error', 'Falha ao criar pedido'));
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ── Filter ── */
    const filteredItems = useMemo(() =>
        menuItems.filter(item => {
            const catMatch = activeCategory === 'All'
                || (typeof item.category === 'object'
                    ? item.category?._id === activeCategory
                    : item.category === activeCategory);
            const q = searchQuery.toLowerCase();
            return catMatch &&
                ((item.name || '').toLowerCase().includes(q) ||
                 (item.description || '').toLowerCase().includes(q));
        }),
    [menuItems, activeCategory, searchQuery]);

    /* ── Loading ── */
    if (loading) return (
        <div className="ao-loader">
            <div className="ao-spinner" />
        </div>
    );

    /* ── Cart panel (reused in sidebar + drawer) ── */
    const CartPanel = () => (
        <div className="ao-cart-panel">
            <div className="ao-cart-header">
                <div>
                    <h2 className="ao-cart-title">
                        <ShoppingCart size={16} strokeWidth={2} />
                        {t('order_summary', 'Resumo do Pedido')}
                    </h2>
                    {cartCount > 0 && (
                        <span className="ao-cart-subtitle">
                            {cartCount} {cartCount === 1 ? t('item', 'item') : t('items', 'itens')}
                        </span>
                    )}
                </div>
                {cart.length > 0 && (
                    <button className="ao-icon-btn danger" onClick={clearCart} title={t('clear_cart', 'Limpar carrinho')}>
                        <Trash2 size={17} strokeWidth={2} />
                    </button>
                )}
            </div>

            <div className="ao-cart-items">
                {cart.length === 0 ? (
                    <div className="ao-cart-empty">
                        <ShoppingCart size={40} strokeWidth={1.5} />
                        <p className="ao-cart-empty-title">{t('cart_empty', 'Carrinho vazio')}</p>
                        <p className="ao-cart-empty-sub">{t('cart_empty_desc', 'Adicione itens do menu')}</p>
                    </div>
                ) : (
                    cart.map((item, i) => (
                        <div key={i} className="ao-cart-row">
                            <div className="ao-cart-row-info">
                                <p className="ao-cart-row-name">{item.name}</p>
                                <p className="ao-cart-row-price">{convertAndFormat(item.price * item.qty)}</p>
                            </div>
                            <div className="ao-cart-row-ctrl">
                                <button className="ao-icon-btn sm" onClick={() => removeFromCart(item)} aria-label="Remover 1">
                                    <Minus size={13} strokeWidth={2.5} />
                                </button>
                                <span className="ao-cart-qty">{item.qty}</span>
                                <button className="ao-icon-btn sm primary" onClick={() => addToCart(item)} aria-label="Adicionar 1">
                                    <Plus size={13} strokeWidth={2.5} />
                                </button>
                                <button className="ao-icon-btn sm danger-ghost" onClick={() => deleteFromCart(item)} aria-label="Remover item">
                                    <Trash2 size={13} strokeWidth={2} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="ao-cart-footer">
                <div className="ao-cart-total-row">
                    <span className="ao-cart-total-label">{t('total', 'Total')}</span>
                    <span className="ao-cart-total-value">{convertAndFormat(cartTotal)}</span>
                </div>
                <button
                    className="ao-confirm-btn"
                    onClick={handleSubmit}
                    disabled={isSubmitting || cart.length === 0}
                >
                    {isSubmitting
                        ? <span className="ao-spinner small" />
                        : <><CheckCircle size={18} strokeWidth={2} /> {t('confirm_order', 'Confirmar Pedido')}</>
                    }
                </button>
            </div>
        </div>
    );

    /* ── Render ── */
    return (
        <div className="ao-root">

            {/* Header */}
            <header className="ao-header">
                <button className="ao-back-btn" onClick={() => navigate('/dashboard/waiter')} aria-label="Voltar">
                    <ArrowLeft size={20} strokeWidth={2} />
                </button>

                <div className="ao-header-title">
                    <span className="ao-table-name">{t('table', 'Mesa')} {table?.number || '?'}</span>
                    <span className={`ao-status-badge ${table?.status === 'free' ? 'free' : 'occupied'}`}>
                        {table?.status === 'free' ? t('free', 'Livre') : t('occupied', 'Ocupada')}
                    </span>
                </div>

                {/* Mobile cart button */}
                <button
                    className="ao-mobile-cart-toggle"
                    onClick={() => setShowMobileCart(true)}
                    aria-label="Ver pedido"
                >
                    <ShoppingCart size={20} strokeWidth={2} />
                    {cartCount > 0 && <span className="ao-cart-badge">{cartCount}</span>}
                </button>
            </header>

            {/* Body */}
            <div className="ao-body">

                {/* ── Menu ── */}
                <div className="ao-menu-col">
                    {/* Filters */}
                    <div className="ao-filters">
                        <div className="ao-search-wrap">
                            <Search size={16} className="ao-search-icon" />
                            <input
                                className="ao-search"
                                placeholder={t('search_placeholder', 'Buscar itens...')}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="ao-cats">
                            {categories.map(cat => {
                                const name = typeof cat === 'string' ? cat : cat.name;
                                const id   = typeof cat === 'string' ? cat : cat._id;
                                return (
                                    <button
                                        key={id}
                                        className={`ao-cat-btn ${activeCategory === id ? 'active' : ''}`}
                                        onClick={() => setActiveCategory(id)}
                                    >
                                        {name === 'All' ? t('all', 'Todos') : name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="ao-grid">
                        {filteredItems.map(item => {
                            const cartItem = cart.find(c => c._id === item._id);
                            const qty = cartItem?.qty ?? 0;

                            return (
                                <div key={item._id} className={`ao-card ${qty > 0 ? 'in-cart' : ''}`}>
                                    {/* Thumbnail */}
                                    <div className="ao-card-img">
                                        {(item.imageUrl || item.image)
                                            ? <img src={item.imageUrl || item.image} alt={item.name} loading="lazy" />
                                            : <div className="ao-card-img-placeholder">
                                                <UtensilsCrossed size={26} strokeWidth={1.5} />
                                              </div>
                                        }
                                    </div>

                                    {/* Details */}
                                    <div className="ao-card-info">
                                        <div className="ao-card-texts">
                                            <p className="ao-card-name">{item.name}</p>
                                            {item.description && (
                                                <p className="ao-card-desc">{item.description}</p>
                                            )}
                                        </div>

                                        <div className="ao-card-bottom">
                                            <span className="ao-card-price">{convertAndFormat(item.price)}</span>

                                            <div className="ao-qty-ctrl">
                                                <button
                                                    className="ao-qty-btn minus"
                                                    onClick={() => removeFromCart(item)}
                                                    disabled={qty === 0}
                                                    aria-label="Remover"
                                                >
                                                    <Minus size={14} strokeWidth={2.5} />
                                                </button>
                                                <span className="ao-qty-num">{qty}</span>
                                                <button
                                                    className="ao-qty-btn plus"
                                                    onClick={() => addToCart(item)}
                                                    aria-label="Adicionar"
                                                >
                                                    <Plus size={14} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredItems.length === 0 && (
                            <div className="ao-empty-menu">
                                <Search size={32} strokeWidth={1.5} />
                                <p>{t('no_items_found', 'Nenhum item encontrado')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Cart sidebar (desktop) ── */}
                <aside className="ao-cart-col">
                    <CartPanel />
                </aside>
            </div>

            {/* Mobile sticky bar */}
            {cartCount > 0 && !showMobileCart && (
                <div className="ao-mobile-bar">
                    <button className="ao-mobile-bar-btn" onClick={() => setShowMobileCart(true)}>
                        <span className="ao-mobile-bar-left">
                            <ShoppingCart size={18} strokeWidth={2} />
                            <span className="ao-mobile-bar-count">{cartCount} {cartCount === 1 ? t('item', 'item') : t('items', 'itens')}</span>
                        </span>
                        <span>{convertAndFormat(cartTotal)}</span>
                    </button>
                </div>
            )}

            {/* Mobile cart drawer */}
            {showMobileCart && (
                <div className="ao-drawer-overlay" onClick={() => setShowMobileCart(false)}>
                    <div className="ao-drawer" onClick={e => e.stopPropagation()}>
                        <div className="ao-drawer-header">
                            <div className="ao-drawer-handle" />
                            <button className="ao-icon-btn" onClick={() => setShowMobileCart(false)} aria-label="Fechar">
                                <ArrowLeft size={18} strokeWidth={2} />
                            </button>
                        </div>
                        <CartPanel />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssistedOrder;
