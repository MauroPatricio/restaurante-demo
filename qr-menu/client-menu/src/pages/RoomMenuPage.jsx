import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../config/api';

const CATEGORY_ICONS = {
    'bebidas': '🥤', 'drinks': '🥤',
    'entradas': '🥗', 'starters': '🥗',
    'pratos': '🍽️', 'main': '🍽️',
    'sobremesas': '🍰', 'desserts': '🍰',
    'pequeno-almoço': '🍳', 'breakfast': '🍳',
    'snacks': '🍟', 'default': '🍴'
};
const getCategoryIcon = (cat = '') => {
    const k = cat.toLowerCase();
    return Object.keys(CATEGORY_ICONS).find(key => k.includes(key))
        ? CATEGORY_ICONS[Object.keys(CATEGORY_ICONS).find(key => k.includes(key))]
        : CATEGORY_ICONS.default;
};

export default function RoomMenuPage() {
    const { restaurantId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const roomId = searchParams.get('room');
    const token = searchParams.get('token');

    const [phase, setPhase] = useState('validating'); // validating | menu | cart | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const [restaurant, setRestaurant] = useState(null);
    const [room, setRoom] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');
    const [cart, setCart] = useState([]); // [{ item, qty }]
    const [notes, setNotes] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [orderId, setOrderId] = useState(null);

    // 1. Validate QR
    useEffect(() => {
        if (!restaurantId || !roomId || !token) {
            setErrorMsg('QR Code inválido ou incompleto.');
            setPhase('error');
            return;
        }
        (async () => {
            try {
                const res = await fetch(`${API_URL}/public/room/validate?r=${restaurantId}&room=${roomId}&token=${token}`);
                const data = await res.json();
                if (!res.ok || !data.valid) {
                    setErrorMsg(data.message || 'QR Code inválido.');
                    setPhase('error');
                    return;
                }
                setRestaurant(data.restaurant);
                setRoom(data.room);
                setPhase('loading-menu');
            } catch {
                setErrorMsg('Sem ligação ao servidor. Tente novamente.');
                setPhase('error');
            }
        })();
    }, [restaurantId, roomId, token]);

    // 2. Fetch menu
    useEffect(() => {
        if (phase !== 'loading-menu') return;
        (async () => {
            try {
                const res = await fetch(`${API_URL}/public/menu/${restaurantId}`);
                const data = await res.json();
                const items = data.menu || data.items || data || [];
                setMenuItems(items.filter(i => i.available !== false));
                const cats = ['all', ...new Set(items.map(i => i.category).filter(Boolean))];
                setCategories(cats);
                setPhase('menu');
            } catch {
                setErrorMsg('Erro ao carregar o menu.');
                setPhase('error');
            }
        })();
    }, [phase, restaurantId]);

    const addToCart = (item) => {
        setCart(prev => {
            const ex = prev.find(c => c.item._id === item._id);
            if (ex) return prev.map(c => c.item._id === item._id ? { ...c, qty: c.qty + 1 } : c);
            return [...prev, { item, qty: 1 }];
        });
    };
    const removeFromCart = (itemId) => {
        setCart(prev => {
            const ex = prev.find(c => c.item._id === itemId);
            if (ex?.qty === 1) return prev.filter(c => c.item._id !== itemId);
            return prev.map(c => c.item._id === itemId ? { ...c, qty: c.qty - 1 } : c);
        });
    };
    const getQty = (itemId) => cart.find(c => c.item._id === itemId)?.qty || 0;
    const totalItems = cart.reduce((s, c) => s + c.qty, 0);
    const totalPrice = cart.reduce((s, c) => s + c.qty * c.item.price, 0);

    const submitOrder = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/public/room/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId,
                    roomId,
                    token,
                    items: cart.map(c => ({ item: c.item._id, qty: c.qty })),
                    customerName: customerName || `Quarto ${room?.number}`,
                    notes,
                    paymentMethod: 'room_account'
                })
            });
            const data = await res.json();
            if (!res.ok) {
                setErrorMsg(data.error || data.message || 'Erro ao enviar pedido');
                setPhase('error');
                return;
            }
            setOrderId(data.order._id);
            setPhase('success');
        } catch {
            setErrorMsg('Sem ligação. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = activeCategory === 'all'
        ? menuItems
        : menuItems.filter(i => i.category === activeCategory);

    // ─── Screens ─────────────────────────────────────────────────────────────

    if (phase === 'validating' || phase === 'loading-menu') {
        return (
            <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1e1b4b, #312e81)', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.2)', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: 'rgba(255,255,255,0.8)', fontFamily: 'sans-serif' }}>
                    {phase === 'validating' ? 'A verificar QR Code...' : 'A carregar menu...'}
                </p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (phase === 'error') {
        return (
            <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff1f2', padding: '24px', fontFamily: 'sans-serif', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
                <h2 style={{ color: '#be123c', fontSize: '1.3rem', marginBottom: '8px' }}>QR Code Inválido</h2>
                <p style={{ color: '#64748b', marginBottom: '24px' }}>{errorMsg}</p>
                <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', fontSize: '1rem' }}>
                    Tentar novamente
                </button>
            </div>
        );
    }

    if (phase === 'success') {
        return (
            <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #064e3b, #065f46)', padding: '24px', fontFamily: 'sans-serif', textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '16px', animation: 'bounce 0.6s ease' }}>✅</div>
                <h2 style={{ color: 'white', fontSize: '1.5rem', margin: '0 0 8px' }}>Pedido enviado!</h2>
                <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '32px' }}>O seu pedido está a ser preparado para o Quarto {room?.number}.</p>
                <button
                    onClick={() => navigate(`/room/${restaurantId}/track/${orderId}?room=${roomId}&token=${token}`)}
                    style={{ padding: '14px 28px', background: 'white', color: '#065f46', border: 'none', borderRadius: '14px', fontWeight: '700', cursor: 'pointer', fontSize: '1.05rem', marginBottom: '12px', width: '100%', maxWidth: '320px' }}
                >
                    📡 Seguir o pedido
                </button>
                <button
                    onClick={() => { setCart([]); setNotes(''); setPhase('menu'); }}
                    style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem' }}
                >
                    Fazer mais um pedido
                </button>
                <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }`}</style>
            </div>
        );
    }

    // ─── MENU PAGE ─────────────────────────────────────────────────────────────
    if (phase === 'menu') {
        return (
            <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: "'Inter', sans-serif", paddingBottom: totalItems > 0 ? '90px' : '0' }}>
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', padding: '20px 20px 28px', position: 'sticky', top: 0, zIndex: 10 }}>
                    <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0 0 4px', fontSize: '0.8rem' }}>
                        🏨 {restaurant?.name}
                    </p>
                    <h1 style={{ color: 'white', margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>
                        🛏️ Quarto {room?.number} {room?.label ? `· ${room.label}` : ''}
                    </h1>
                </div>

                {/* Categories */}
                <div style={{ display: 'flex', gap: '8px', padding: '16px 16px 8px', overflowX: 'auto', scrollbarWidth: 'none', background: 'white', borderBottom: '1px solid #f1f5f9' }}>
                    {categories.map(cat => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                            padding: '7px 16px', borderRadius: '99px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap', transition: 'all 0.15s',
                            background: activeCategory === cat ? '#312e81' : '#f1f5f9',
                            color: activeCategory === cat ? 'white' : '#475569'
                        }}>
                            {cat === 'all' ? '🍴 Tudo' : `${getCategoryIcon(cat)} ${cat}`}
                        </button>
                    ))}
                </div>

                {/* Items Grid */}
                <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                    {filtered.map(item => {
                        const qty = getQty(item._id);
                        return (
                            <div key={item._id} style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: qty > 0 ? '2px solid #312e81' : '2px solid transparent', transition: 'border 0.15s' }}>
                                {item.imageUrl || item.image ? (
                                    <img src={item.imageUrl || item.image} alt={item.name} style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>
                                        {getCategoryIcon(item.category)}
                                    </div>
                                )}
                                <div style={{ padding: '10px' }}>
                                    <h3 style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{item.name}</h3>
                                    {item.description && <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#64748b', lineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{item.description}</p>}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: '700', color: '#312e81', fontSize: '0.9rem' }}>{item.price?.toFixed(2)} MT</span>
                                        {qty === 0 ? (
                                            <button onClick={() => addToCart(item)} style={{ background: '#312e81', color: 'white', border: 'none', borderRadius: '8px', padding: '5px 12px', fontWeight: '700', cursor: 'pointer', fontSize: '1rem' }}>+</button>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <button onClick={() => removeFromCart(item._id)} style={{ background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: '8px', padding: '4px 10px', fontWeight: '700', cursor: 'pointer' }}>−</button>
                                                <span style={{ fontWeight: '700', minWidth: '20px', textAlign: 'center', color: '#312e81' }}>{qty}</span>
                                                <button onClick={() => addToCart(item)} style={{ background: '#312e81', color: 'white', border: 'none', borderRadius: '8px', padding: '4px 10px', fontWeight: '700', cursor: 'pointer' }}>+</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Floating Cart */}
                {totalItems > 0 && (
                    <div style={{ position: 'fixed', bottom: '16px', left: '16px', right: '16px', zIndex: 50 }}>
                        <button
                            onClick={() => setPhase('cart')}
                            style={{ width: '100%', padding: '16px 20px', background: 'linear-gradient(135deg, #312e81, #7c3aed)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '700', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' }}
                        >
                            <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '2px 10px' }}>{totalItems}</span>
                            <span>Ver Carrinho</span>
                            <span>{totalPrice.toFixed(2)} MT</span>
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // ─── CART PAGE ─────────────────────────────────────────────────────────────
    if (phase === 'cart') {
        return (
            <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
                <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', padding: '20px' }}>
                    <button onClick={() => setPhase('menu')} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', fontWeight: '600', marginBottom: '12px' }}>← Voltar</button>
                    <h1 style={{ color: 'white', margin: 0, fontSize: '1.3rem', fontWeight: '700' }}>🛒 Carrinho</h1>
                    <p style={{ color: 'rgba(255,255,255,0.6)', margin: '4px 0 0', fontSize: '0.85rem' }}>Quarto {room?.number}</p>
                </div>

                <div style={{ padding: '20px' }}>
                    {cart.map(c => (
                        <div key={c.item._id} style={{ background: 'white', borderRadius: '12px', padding: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontWeight: '700', color: '#1e293b' }}>{c.item.name}</p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>{c.item.price?.toFixed(2)} MT cada</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button onClick={() => removeFromCart(c.item._id)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '4px 12px', fontWeight: '700', cursor: 'pointer', color: '#1e293b' }}>−</button>
                                <span style={{ fontWeight: '700', minWidth: '20px', textAlign: 'center', color: '#312e81' }}>{c.qty}</span>
                                <button onClick={() => addToCart(c.item)} style={{ background: '#312e81', border: 'none', borderRadius: '8px', padding: '4px 12px', fontWeight: '700', cursor: 'pointer', color: 'white' }}>+</button>
                            </div>
                            <span style={{ fontWeight: '700', color: '#312e81', marginLeft: '12px', minWidth: '80px', textAlign: 'right' }}>{(c.qty * c.item.price).toFixed(2)} MT</span>
                        </div>
                    ))}

                    <div style={{ background: 'white', borderRadius: '14px', padding: '16px', marginTop: '16px' }}>
                        <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', marginBottom: '6px', fontSize: '0.9rem' }}>O seu nome (opcional)</label>
                        <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={`Quarto ${room?.number}`} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '14px' }} />
                        <label style={{ display: 'block', fontWeight: '600', color: '#1e293b', marginBottom: '6px', fontSize: '0.9rem' }}>Notas / Alergias (opcional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ex: sem cebola, alergia a marisco..." rows={3} style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.95rem', boxSizing: 'border-box', resize: 'none' }} />
                    </div>

                    <div style={{ background: 'linear-gradient(135deg, #312e81, #1e1b4b)', borderRadius: '14px', padding: '16px', marginTop: '16px', color: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', opacity: 0.7, fontSize: '0.9rem' }}>
                            <span>Subtotal</span><span>{totalPrice.toFixed(2)} MT</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '1.1rem', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '8px', marginTop: '8px' }}>
                            <span>Total</span><span>{totalPrice.toFixed(2)} MT</span>
                        </div>
                        <p style={{ opacity: 0.6, fontSize: '0.8rem', margin: '8px 0 0' }}>💳 Faturação ao quarto · Pague no check-out</p>
                    </div>

                    <button
                        onClick={submitOrder}
                        disabled={submitting || cart.length === 0}
                        style={{ width: '100%', marginTop: '16px', padding: '16px', background: submitting ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '16px', fontWeight: '700', fontSize: '1.05rem', cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}
                    >
                        {submitting ? '⏳ A enviar...' : '🛎️ Confirmar Pedido'}
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
