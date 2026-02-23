import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../config/api';

/* ─── Helpers ─────────────────────────────────────────── */
const fmt = (n) => Number(n || 0).toFixed(2);
const HISTORY_KEY = (restaurantId, roomId) => `rs_orders_${restaurantId}_${roomId}`;

function saveOrderToHistory(restaurantId, roomId, order) {
    try {
        const key = HISTORY_KEY(restaurantId, roomId);
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        // avoid duplicates
        if (!existing.find(o => o.id === order.id)) {
            existing.unshift(order); // newest first
            localStorage.setItem(key, JSON.stringify(existing.slice(0, 20)));
        }
    } catch { }
}

function loadHistory(restaurantId, roomId) {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY(restaurantId, roomId)) || '[]');
    } catch { return []; }
}

const STATUS_LABEL = {
    pending: { label: 'Recebido', color: '#f59e0b', icon: '📋' },
    confirmed: { label: 'Confirmado', color: '#3b82f6', icon: '✅' },
    preparing: { label: 'Em Preparação', color: '#8b5cf6', icon: '👨‍🍳' },
    ready: { label: 'A Caminho', color: '#10b981', icon: '🚀' },
    served: { label: 'Entregue', color: '#10b981', icon: '🎉' },
    completed: { label: 'Concluído', color: '#64748b', icon: '✔️' },
    cancelled: { label: 'Cancelado', color: '#ef4444', icon: '❌' },
};

/* ─── Order History Screen ──────────────────────────────── */
function OrderHistoryScreen({ restaurantId, roomId, token, orders, onBack, navigate }) {
    const [liveOrders, setLiveOrders] = useState(orders);

    useEffect(() => {
        let alive = true;
        (async () => {
            const updated = await Promise.all(
                orders.map(async (o) => {
                    try {
                        const res = await fetch(`${API_URL}/public/room/order/${o.id}`);
                        if (!res.ok) return o;
                        const data = await res.json();
                        return { ...o, status: data.order.status, total: data.order.total };
                    } catch { return o; }
                })
            );
            if (alive) setLiveOrders(updated);
        })();
        return () => { alive = false; };
    }, [orders]);

    return (
        <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: "'Inter',sans-serif" }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', padding: 20 }}>
                <button onClick={onBack} style={S.backBtn}>← Voltar ao menu</button>
                <h1 style={{ color: 'white', margin: '10px 0 0', fontSize: '1.2rem', fontWeight: 700 }}>📦 Meus Pedidos</h1>
                <p style={{ color: 'rgba(255,255,255,0.55)', margin: '4px 0 0', fontSize: '0.8rem' }}>Quarto {roomId ? '…' : ''}</p>
            </div>

            <div style={{ padding: 16 }}>
                {liveOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
                        <p style={{ fontWeight: 600 }}>Ainda não fez nenhum pedido</p>
                        <button onClick={onBack} style={{ ...S.btnAdd, marginTop: 12, padding: '10px 24px', borderRadius: 12, fontSize: '0.9rem' }}>
                            Ver Menu
                        </button>
                    </div>
                ) : liveOrders.map((order) => {
                    const meta = STATUS_LABEL[order.status] || STATUS_LABEL.pending;
                    const isDone = ['served', 'completed', 'cancelled'].includes(order.status);
                    return (
                        <div key={order.id} style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `2px solid ${meta.color}22` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <div>
                                    <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>
                                        {meta.icon} {order.itemsSummary}
                                    </p>
                                    <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                                        {new Date(order.placedAt).toLocaleTimeString('pt', { hour: '2-digit', minute: '2-digit' })} · {fmt(order.total)} MT
                                    </p>
                                </div>
                                <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: meta.color + '15', color: meta.color, whiteSpace: 'nowrap' }}>
                                    {meta.label}
                                </span>
                            </div>
                            {!isDone && (
                                <button
                                    onClick={() => navigate(`/room/${restaurantId}/track/${order.id}?room=${roomId}&token=${encodeURIComponent(token)}`)}
                                    style={{ width: '100%', padding: '9px', background: 'linear-gradient(135deg,#312e81,#7c3aed)', color: 'white', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                                >
                                    📡 Seguir pedido em tempo real
                                </button>
                            )}
                            {isDone && (
                                <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                                    {order.status === 'cancelled' ? '⚠️ Pedido cancelado — contacte a receção' : '✅ Pedido concluído'}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════ */
export default function RoomMenuPage() {
    const { restaurantId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const roomId = searchParams.get('room');
    const token = searchParams.get('token');

    const [phase, setPhase] = useState('validating');
    const [errorMsg, setErrorMsg] = useState('');
    const [restaurant, setRestaurant] = useState(null);
    const [room, setRoom] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('__all__');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('room_account');
    const [submitting, setSubmitting] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [history, setHistory] = useState([]);
    const [waiterCalling, setWaiterCalling] = useState(false);
    const [waiterCalled, setWaiterCalled] = useState(false);
    const searchRef = useRef(null);

    /* ── Step 1: Validate QR ── */
    useEffect(() => {
        if (!restaurantId || !roomId || !token) {
            setErrorMsg('QR Code inválido ou incompleto.');
            setPhase('error');
            return;
        }
        setHistory(loadHistory(restaurantId, roomId));
        (async () => {
            try {
                const res = await fetch(
                    `${API_URL}/public/room/validate?r=${restaurantId}&room=${roomId}&token=${encodeURIComponent(token)}`
                );
                const data = await res.json();
                if (!res.ok || !data.valid) { setErrorMsg(data.message || 'QR Code inválido.'); setPhase('error'); return; }
                setRestaurant(data.restaurant);
                setRoom(data.room);
                setPhase('loading-menu');
            } catch {
                setErrorMsg('Sem ligação ao servidor. Tente novamente.');
                setPhase('error');
            }
        })();
    }, [restaurantId, roomId, token]);

    /* ── Step 2: Load Menu ── */
    useEffect(() => {
        if (phase !== 'loading-menu') return;
        (async () => {
            try {
                const res = await fetch(
                    `${API_URL}/public/room/menu/${restaurantId}?room=${roomId}&token=${encodeURIComponent(token)}`
                );
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Erro ao carregar menu');
                setMenuItems(data.items || []);
                setCategories(data.categories || []);
                setPhase('menu');
            } catch (e) {
                setErrorMsg(e.message || 'Erro ao carregar o menu.');
                setPhase('error');
            }
        })();
    }, [phase, restaurantId, roomId, token]);

    /* ── Cart helpers ── */
    const addItem = (item) => setCart(prev => {
        const ex = prev.find(c => c.item._id === item._id);
        if (ex) return prev.map(c => c.item._id === item._id ? { ...c, qty: c.qty + 1 } : c);
        return [...prev, { item, qty: 1 }];
    });
    const removeItem = (id) => setCart(prev => {
        const ex = prev.find(c => c.item._id === id);
        if (!ex) return prev;
        if (ex.qty === 1) return prev.filter(c => c.item._id !== id);
        return prev.map(c => c.item._id === id ? { ...c, qty: c.qty - 1 } : c);
    });
    const getQty = (id) => cart.find(c => c.item._id === id)?.qty || 0;
    const totalQty = cart.reduce((s, c) => s + c.qty, 0);
    const totalPrice = cart.reduce((s, c) => s + c.qty * (c.item.price || 0), 0);

    /* ── Submit order ── */
    const submitOrder = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/public/room/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    restaurantId, roomId, token,
                    items: cart.map(c => ({ item: c.item._id, qty: c.qty })),
                    customerName: customerName.trim() || `Quarto ${room?.number}`,
                    notes,
                    paymentMethod
                })
            });
            const data = await res.json();
            if (!res.ok) { setErrorMsg(data.error || data.message || 'Erro ao enviar pedido'); setPhase('error'); return; }

            // ── Save to history ──
            const newEntry = {
                id: data.order._id,
                status: data.order.status || 'pending',
                total: data.order.total,
                itemsSummary: cart.map(c => `${c.qty}× ${c.item.name}`).join(', '),
                placedAt: new Date().toISOString(),
            };
            saveOrderToHistory(restaurantId, roomId, newEntry);
            setHistory(loadHistory(restaurantId, roomId));
            setOrderId(data.order._id);
            setPhase('success');
        } catch {
            alert('Sem ligação. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Waiter Call ── */
    const callWaiter = async () => {
        if (waiterCalling || waiterCalled) return;
        setWaiterCalling(true);
        try {
            await fetch(`${API_URL}/public/room/waiter-call`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId, roomId, token, roomNumber: room?.number })
            });
            setWaiterCalled(true);
            setTimeout(() => setWaiterCalled(false), 30000); // reset after 30s
        } catch {
            alert('Não foi possível chamar o garçom. Tente novamente.');
        } finally {
            setWaiterCalling(false);
        }
    };

    /* ── Filtered items ── */
    const filtered = menuItems.filter(it => {
        const catId = typeof it.category === 'object' ? it.category?._id : it.category;
        const matchCat = activeCategory === '__all__' || catId === activeCategory;
        const matchSearch = !searchQuery || it.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
    });

    /* ────────────────── SCREENS ─── */

    if (phase === 'validating' || phase === 'loading-menu') return (
        <div style={S.center}>
            <div style={S.spinner} />
            <p style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif', marginTop: 16 }}>
                {phase === 'validating' ? 'A verificar QR Code…' : 'A carregar menu…'}
            </p>
            <style>{spinCSS}</style>
        </div>
    );

    if (phase === 'error') return (
        <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff1f2', padding: 24, textAlign: 'center', fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: '#be123c', margin: '0 0 8px' }}>Erro</h2>
            <p style={{ color: '#64748b', marginBottom: 24, maxWidth: 320 }}>{errorMsg}</p>
            <button onClick={() => window.location.reload()} style={S.btnPrimary}>Tentar novamente</button>
        </div>
    );

    if (phase === 'success') return (
        <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#064e3b,#065f46)', padding: 24, textAlign: 'center', fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: '4rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ color: 'white', margin: '0 0 8px', fontSize: '1.4rem' }}>Pedido Enviado!</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 28 }}>O seu pedido está a ser preparado para o Quarto {room?.number}.</p>
            <button
                onClick={() => navigate(`/room/${restaurantId}/track/${orderId}?room=${roomId}&token=${encodeURIComponent(token)}`)}
                style={{ ...S.btnWhite, marginBottom: 10, display: 'block', width: '100%', maxWidth: 320 }}
            >📡 Seguir o pedido em tempo real</button>
            <button
                onClick={() => { setPhase('history'); }}
                style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 14, padding: '12px 24px', fontWeight: 600, cursor: 'pointer', maxWidth: 320, width: '100%', marginBottom: 10 }}
            >📦 Ver todos os meus pedidos</button>
            <button
                onClick={() => { setCart([]); setNotes(''); setCustomerName(''); setPhase('menu'); }}
                style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: 'none', borderRadius: 12, padding: '10px 24px', fontWeight: 500, cursor: 'pointer', maxWidth: 320, width: '100%', fontSize: '0.9rem' }}
            >+ Fazer mais um pedido</button>
        </div>
    );

    if (phase === 'history') return (
        <OrderHistoryScreen
            restaurantId={restaurantId}
            roomId={roomId}
            token={token}
            orders={history}
            onBack={() => setPhase('menu')}
            navigate={navigate}
        />
    );

    /* ── MENU ── */
    if (phase === 'menu') return (
        <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: "'Inter',sans-serif", paddingBottom: totalQty > 0 ? 90 : 40 }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', padding: '16px 16px 20px', position: 'sticky', top: 0, zIndex: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                        <p style={{ color: 'rgba(255,255,255,0.55)', margin: '0 0 2px', fontSize: '0.72rem' }}>🏨 {restaurant?.name}</p>
                        <h1 style={{ color: 'white', margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>🛏️ Quarto {room?.number}{room?.label ? ` · ${room.label}` : ''}</h1>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'flex-start' }}>
                        {/* Waiter call button */}
                        <button
                            onClick={callWaiter}
                            disabled={waiterCalling}
                            style={{ background: waiterCalled ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.15)', border: waiterCalled ? '1px solid rgba(16,185,129,0.5)' : 'none', borderRadius: 12, padding: '8px 12px', color: 'white', cursor: waiterCalling ? 'wait' : 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                            {waiterCalling ? '⏳' : waiterCalled ? '✅ Chamado!' : '🔔 Garçom'}
                        </button>
                        {/* History button */}
                        <button
                            onClick={() => setPhase('history')}
                            style={{ position: 'relative', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 12, padding: '8px 12px', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            📦 Pedidos
                            {history.length > 0 && (
                                <span style={{ background: '#f59e0b', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: -6, right: -6 }}>
                                    {history.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '1rem' }}>🔍</span>
                    <input
                        ref={searchRef}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar…"
                        style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 12, border: 'none', fontSize: '0.93rem', background: 'rgba(255,255,255,0.15)', color: 'white', outline: 'none', boxSizing: 'border-box' }}
                    />
                </div>
            </div>

            {/* Categories */}
            <div style={{ background: 'white', borderBottom: '1px solid #f1f5f9', padding: '10px 16px', overflowX: 'auto', display: 'flex', gap: 8, scrollbarWidth: 'none' }}>
                {[{ _id: '__all__', name: '🍴 Tudo' }, ...categories].map(cat => (
                    <button key={cat._id} onClick={() => setActiveCategory(cat._id)} style={{
                        padding: '6px 16px', borderRadius: 99, border: 'none', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', transition: 'all .15s',
                        background: activeCategory === cat._id ? '#312e81' : '#f1f5f9',
                        color: activeCategory === cat._id ? 'white' : '#475569'
                    }}>
                        {cat.name || cat.label || '•'}
                    </button>
                ))}
            </div>

            {/* Items */}
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔍</div>
                        <p style={{ fontWeight: 600 }}>Nenhum item encontrado</p>
                    </div>
                )}
                {filtered.map(item => {
                    const qty = getQty(item._id);
                    return (
                        <div key={item._id} style={{ background: 'white', borderRadius: 16, display: 'flex', gap: 12, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `2px solid ${qty > 0 ? '#312e81' : 'transparent'}`, transition: 'border .15s' }}>
                            <div style={{ width: 88, height: 88, borderRadius: 12, overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
                                {(item.imageUrl || item.image || item.photo)
                                    ? <img src={item.imageUrl || item.image || item.photo} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🍽️</div>
                                }
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                                <div>
                                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{item.name}</h3>
                                    {item.description && <p style={{ margin: '3px 0 0', fontSize: '0.74rem', color: '#64748b', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{item.description}</p>}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                                    <span style={{ fontWeight: 800, color: '#312e81', fontSize: '1rem' }}>{fmt(item.price)} <span style={{ fontWeight: 500, fontSize: '0.72rem', color: '#94a3b8' }}>MT</span></span>
                                    {qty === 0 ? (
                                        <button onClick={() => addItem(item)} style={S.btnAdd}>+</button>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <button onClick={() => removeItem(item._id)} style={S.btnMinus}>−</button>
                                            <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center', color: '#312e81' }}>{qty}</span>
                                            <button onClick={() => addItem(item)} style={S.btnAdd}>+</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Floating Cart */}
            {totalQty > 0 && (
                <div style={{ position: 'fixed', bottom: 16, left: 16, right: 16, zIndex: 50 }}>
                    <button onClick={() => setPhase('cart')} style={{ width: '100%', padding: '15px 20px', background: 'linear-gradient(135deg,#312e81,#7c3aed)', color: 'white', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(124,58,237,0.4)' }}>
                        <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '2px 10px' }}>{totalQty}</span>
                        <span>Ver Carrinho</span>
                        <span>{fmt(totalPrice)} MT</span>
                    </button>
                </div>
            )}
        </div>
    );

    /* ── CART ── */
    if (phase === 'cart') return (
        <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: "'Inter',sans-serif" }}>
            <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', padding: 20 }}>
                <button onClick={() => setPhase('menu')} style={S.backBtn}>← Voltar ao menu</button>
                <h1 style={{ color: 'white', margin: '10px 0 0', fontSize: '1.2rem', fontWeight: 700 }}>🛒 Carrinho</h1>
                <p style={{ color: 'rgba(255,255,255,0.55)', margin: '4px 0 0', fontSize: '0.82rem' }}>Quarto {room?.number}</p>
            </div>

            <div style={{ padding: 16 }}>
                {cart.map(c => (
                    <div key={c.item._id} style={{ background: 'white', borderRadius: 14, padding: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 700, color: '#1e293b', fontSize: '0.95rem' }}>{c.item.name}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>{fmt(c.item.price)} MT cada</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button onClick={() => removeItem(c.item._id)} style={S.btnMinus}>−</button>
                            <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center', color: '#312e81' }}>{c.qty}</span>
                            <button onClick={() => addItem(c.item)} style={S.btnAdd}>+</button>
                        </div>
                        <span style={{ fontWeight: 700, color: '#312e81', minWidth: 70, textAlign: 'right', fontSize: '0.9rem' }}>{fmt(c.qty * c.item.price)} MT</span>
                    </div>
                ))}

                {/* Payment Method Picker */}
                <div style={{ background: 'white', borderRadius: 14, padding: 16, marginTop: 10 }}>
                    <label style={{ ...S.label, marginTop: 0 }}>💳 Forma de Pagamento</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                        {[
                            { id: 'room_account', icon: '🛏️', label: 'Quarto' },
                            { id: 'cash', icon: '💵', label: 'Dinheiro' },
                            { id: 'mpesa', icon: '📱', label: 'M-Pesa' },
                            { id: 'emola', icon: '📲', label: 'e-Mola' },
                            { id: 'visa', icon: '💳', label: 'Cartão' },
                        ].map(m => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setPaymentMethod(m.id)}
                                style={{
                                    padding: '12px 8px',
                                    borderRadius: 12,
                                    border: `2px solid ${paymentMethod === m.id ? '#10b981' : '#e2e8f0'}`,
                                    background: paymentMethod === m.id ? '#f0fdf4' : '#f8fafc',
                                    color: paymentMethod === m.id ? '#059669' : '#64748b',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4,
                                    transition: 'all 0.2s',
                                    boxShadow: paymentMethod === m.id ? '0 4px 12px rgba(16,185,129,0.15)' : 'none'
                                }}
                            >
                                <span style={{ fontSize: '1.3rem' }}>{m.icon}</span>
                                {m.label}
                                {paymentMethod === m.id && <span style={{ fontSize: '0.65rem', color: '#10b981' }}>✓ Selecionado</span>}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ background: 'white', borderRadius: 14, padding: 16, marginTop: 8 }}>
                    <label style={S.label}>O seu nome (opcional)</label>
                    <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={`Quarto ${room?.number}`} style={S.input} />
                    <label style={S.label}>Notas / Alergias</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ex: sem glúten, sem cebola..." rows={3} style={{ ...S.input, resize: 'none' }} />
                </div>

                <div style={{ background: 'linear-gradient(135deg,#312e81,#1e1b4b)', borderRadius: 14, padding: 16, marginTop: 12, color: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
                        <span>Total</span><span>{fmt(totalPrice)} MT</span>
                    </div>
                    <p style={{ opacity: 0.55, fontSize: '0.78rem', margin: '6px 0 0' }}>
                        {paymentMethod === 'room_account' ? '🛏️ Faturação ao quarto · Pague no check-out' :
                            paymentMethod === 'cash' ? '💵 Pagamento em dinheiro na entrega' :
                                paymentMethod === 'mpesa' ? '📱 Pagamento via M-Pesa na entrega' :
                                    paymentMethod === 'emola' ? '📲 Pagamento via e-Mola na entrega' :
                                        '💳 Pagamento com cartão na entrega'}
                    </p>
                </div>

                <button
                    onClick={submitOrder}
                    disabled={submitting || cart.length === 0}
                    style={{ width: '100%', marginTop: 14, marginBottom: 24, padding: 16, background: submitting ? '#94a3b8' : 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: '1.05rem', cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}
                >
                    {submitting ? '⏳ A enviar...' : '🛎️ Confirmar Pedido'}
                </button>
            </div>
        </div>
    );

    return null;
}

/* ─── Styles ─── */
const S = {
    center: { minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1e1b4b,#312e81)' },
    spinner: { width: 44, height: 44, border: '4px solid rgba(255,255,255,0.2)', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin .8s linear infinite' },
    btnPrimary: { padding: '12px 28px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: '1rem' },
    btnWhite: { padding: '14px 20px', background: 'white', color: '#065f46', border: 'none', borderRadius: 14, fontWeight: 700, cursor: 'pointer', fontSize: '1rem' },
    btnAdd: { background: '#312e81', color: 'white', border: 'none', borderRadius: 8, padding: '5px 11px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' },
    btnMinus: { background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: 8, padding: '5px 11px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' },
    label: { display: 'block', fontWeight: 600, color: '#1e293b', marginBottom: 6, fontSize: '0.88rem', marginTop: 12 },
    input: { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.95rem', boxSizing: 'border-box' },
    backBtn: { background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontWeight: 600 },
};
const spinCSS = `@keyframes spin{to{transform:rotate(360deg)}}`;
