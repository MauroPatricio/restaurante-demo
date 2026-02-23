import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../config/api';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
const fmt = (n) => Number(n || 0).toFixed(2);

export default function RoomMenuPage() {
    const { restaurantId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const roomId = searchParams.get('room');
    const token = searchParams.get('token');

    /* ── State ── */
    const [phase, setPhase] = useState('validating'); // validating | menu | cart | confirming | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const [restaurant, setRestaurant] = useState(null);
    const [room, setRoom] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeCategory, setActiveCategory] = useState('__all__');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState([]); // [{ item, qty }]
    const [customerName, setCustomerName] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const searchRef = useRef(null);

    /* ── Step 1: Validate QR ── */
    useEffect(() => {
        if (!restaurantId || !roomId || !token) {
            setErrorMsg('QR Code inválido ou incompleto.');
            setPhase('error');
            return;
        }
        (async () => {
            try {
                const res = await fetch(
                    `${API_URL}/public/room/validate?r=${restaurantId}&room=${roomId}&token=${encodeURIComponent(token)}`
                );
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
    const addItem = (item) =>
        setCart(prev => {
            const ex = prev.find(c => c.item._id === item._id);
            if (ex) return prev.map(c => c.item._id === item._id ? { ...c, qty: c.qty + 1 } : c);
            return [...prev, { item, qty: 1 }];
        });
    const removeItem = (id) =>
        setCart(prev => {
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
                    paymentMethod: 'pending'
                })
            });
            const data = await res.json();
            if (!res.ok) { setErrorMsg(data.error || data.message || 'Erro ao enviar pedido'); setPhase('error'); return; }
            setOrderId(data.order._id);
            setPhase('success');
        } catch {
            alert('Sem ligação. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    /* ── Filtered items ── */
    const filtered = menuItems.filter(it => {
        const catId = typeof it.category === 'object' ? it.category?._id : it.category;
        const matchCat = activeCategory === '__all__' || catId === activeCategory;
        const matchSearch = !searchQuery || it.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
    });

    /* ────────────────── SCREENS ─────────────────────────────────────────── */

    /* Loading */
    if (phase === 'validating' || phase === 'loading-menu') {
        return (
            <div style={S.center}>
                <div style={S.spinner} />
                <p style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif', marginTop: 16 }}>
                    {phase === 'validating' ? 'A verificar QR Code…' : 'A carregar menu…'}
                </p>
                <style>{spinCSS}</style>
            </div>
        );
    }

    /* Error */
    if (phase === 'error') {
        return (
            <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff1f2', padding: 24, textAlign: 'center', fontFamily: 'sans-serif' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>⚠️</div>
                <h2 style={{ color: '#be123c', margin: '0 0 8px' }}>Erro</h2>
                <p style={{ color: '#64748b', marginBottom: 24, maxWidth: 320 }}>{errorMsg}</p>
                <button onClick={() => window.location.reload()} style={S.btnPrimary}>Tentar novamente</button>
            </div>
        );
    }

    /* Success */
    if (phase === 'success') {
        return (
            <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#064e3b,#065f46)', padding: 24, textAlign: 'center', fontFamily: 'sans-serif' }}>
                <div style={{ fontSize: '4rem', marginBottom: 12 }}>✅</div>
                <h2 style={{ color: 'white', margin: '0 0 8px', fontSize: '1.4rem' }}>Pedido Enviado!</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 32 }}>O seu pedido está a ser preparado para o Quarto {room?.number}.</p>
                <button
                    onClick={() => navigate(`/room/${restaurantId}/track/${orderId}?room=${roomId}&token=${encodeURIComponent(token)}`)}
                    style={{ ...S.btnWhite, marginBottom: 12, display: 'block', width: '100%', maxWidth: 320 }}
                >
                    📡 Seguir o pedido em tempo real
                </button>
                <button
                    onClick={() => { setCart([]); setNotes(''); setCustomerName(''); setPhase('menu'); }}
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 600, cursor: 'pointer', maxWidth: 320, width: '100%' }}
                >
                    Fazer mais um pedido
                </button>
            </div>
        );
    }

    /* ── MENU ── */
    if (phase === 'menu') {
        return (
            <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: "'Inter',sans-serif", paddingBottom: totalQty > 0 ? 90 : 40 }}>
                {/* Header */}
                <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', padding: '20px 20px 24px', position: 'sticky', top: 0, zIndex: 20 }}>
                    <p style={{ color: 'rgba(255,255,255,0.55)', margin: '0 0 2px', fontSize: '0.75rem' }}>🏨 {restaurant?.name}</p>
                    <h1 style={{ color: 'white', margin: '0 0 12px', fontSize: '1.2rem', fontWeight: 700 }}>🛏️ Quarto {room?.number}{room?.label ? ` · ${room.label}` : ''}</h1>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '1rem' }}>🔍</span>
                        <input
                            ref={searchRef}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Pesquisar...  "
                            style={{ width: '100%', padding: '10px 14px 10px 36px', borderRadius: 12, border: 'none', fontSize: '0.95rem', background: 'rgba(255,255,255,0.15)', color: 'white', outline: 'none', boxSizing: 'border-box' }}
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
                                {/* Image */}
                                <div style={{ width: 88, height: 88, borderRadius: 12, overflow: 'hidden', background: '#f1f5f9', flexShrink: 0 }}>
                                    {(item.imageUrl || item.image || item.photo)
                                        ? <img src={item.imageUrl || item.image || item.photo} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🍽️</div>
                                    }
                                </div>
                                {/* Info */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>{item.name}</h3>
                                        {item.description && <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: '#64748b', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{item.description}</p>}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                                        <span style={{ fontWeight: 800, color: '#312e81', fontSize: '1rem' }}>{fmt(item.price)} <span style={{ fontWeight: 500, fontSize: '0.75rem', color: '#94a3b8' }}>MT</span></span>
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
    }

    /* ── CART ── */
    if (phase === 'cart') {
        return (
            <div style={{ minHeight: '100svh', background: '#f8fafc', fontFamily: "'Inter',sans-serif" }}>
                <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', padding: 20 }}>
                    <button onClick={() => setPhase('menu')} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 10, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, marginBottom: 10 }}>← Voltar ao menu</button>
                    <h1 style={{ color: 'white', margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>🛒 Carrinho</h1>
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

                    {/* Name & Notes */}
                    <div style={{ background: 'white', borderRadius: 14, padding: 16, marginTop: 8 }}>
                        <label style={S.label}>O seu nome (opcional)</label>
                        <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder={`Quarto ${room?.number}`} style={S.input} />
                        <label style={S.label}>Notas / Alergias</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ex: sem glúten, sem cebola..." rows={3} style={{ ...S.input, resize: 'none' }} />
                    </div>

                    {/* Total */}
                    <div style={{ background: 'linear-gradient(135deg,#312e81,#1e1b4b)', borderRadius: 14, padding: 16, marginTop: 12, color: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
                            <span>Total</span><span>{fmt(totalPrice)} MT</span>
                        </div>
                        <p style={{ opacity: 0.55, fontSize: '0.78rem', margin: '6px 0 0' }}>💳 Faturação ao quarto · Pague no check-out</p>
                    </div>

                    <button
                        onClick={submitOrder}
                        disabled={submitting || cart.length === 0}
                        style={{ width: '100%', marginTop: 14, padding: 16, background: submitting ? '#94a3b8' : 'linear-gradient(135deg,#10b981,#059669)', color: 'white', border: 'none', borderRadius: 16, fontWeight: 700, fontSize: '1.05rem', cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}
                    >
                        {submitting ? '⏳ A enviar...' : '🛎️ Confirmar Pedido'}
                    </button>
                </div>
            </div>
        );
    }

    return null;
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const S = {
    center: { minHeight: '100svh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1e1b4b,#312e81)' },
    spinner: { width: 44, height: 44, border: '4px solid rgba(255,255,255,0.2)', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin .8s linear infinite' },
    btnPrimary: { padding: '12px 28px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, cursor: 'pointer', fontSize: '1rem' },
    btnWhite: { padding: '14px 20px', background: 'white', color: '#065f46', border: 'none', borderRadius: 14, fontWeight: 700, cursor: 'pointer', fontSize: '1rem' },
    btnAdd: { background: '#312e81', color: 'white', border: 'none', borderRadius: 8, padding: '5px 11px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' },
    btnMinus: { background: '#f1f5f9', color: '#1e293b', border: 'none', borderRadius: 8, padding: '5px 11px', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' },
    label: { display: 'block', fontWeight: 600, color: '#1e293b', marginBottom: 6, fontSize: '0.88rem', marginTop: 12 },
    input: { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.95rem', boxSizing: 'border-box' },
};
const spinCSS = `@keyframes spin{to{transform:rotate(360deg)}}`;
