import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { roomServiceAPI } from '../services/api';
import {
    BedDouble, Plus, Trash2, RefreshCw, Download,
    ToggleLeft, ToggleRight, QrCode, ChevronDown, ChevronUp,
    Building2, AlertCircle, Pencil, X, Check
} from 'lucide-react';

export default function RoomServiceManagement() {
    const { user } = useAuth();
    const restaurantId = user?.restaurant?._id || user?.restaurant;

    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [selectedQR, setSelectedQR] = useState(null); // { room }
    const [form, setForm] = useState({ number: '', floor: '1', label: '', notes: '' });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    const fetchRooms = async () => {
        if (!restaurantId) return;
        try {
            setLoading(true);
            const res = await roomServiceAPI.getRooms(restaurantId);
            setRooms(res.data.rooms || []);
        } catch (e) {
            setError('Erro ao carregar quartos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRooms(); }, [restaurantId]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.number) return;
        setCreating(true);
        try {
            await roomServiceAPI.createRoom({ restaurant: restaurantId, ...form });
            setForm({ number: '', floor: '1', label: '', notes: '' });
            setShowCreate(false);
            fetchRooms();
        } catch (e) {
            setError(e.response?.data?.error || 'Erro ao criar quarto');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Eliminar quarto? Esta ação não pode ser revertida.')) return;
        try {
            await roomServiceAPI.deleteRoom(id);
            setRooms(prev => prev.filter(r => r._id !== id));
        } catch (e) {
            setError('Erro ao eliminar quarto');
        }
    };

    const handleToggleActive = async (room) => {
        try {
            await roomServiceAPI.updateRoom(room._id, { active: !room.active });
            setRooms(prev => prev.map(r => r._id === room._id ? { ...r, active: !r.active } : r));
        } catch (e) {
            setError('Erro ao atualizar quarto');
        }
    };

    const handleRegenerateQR = async (room) => {
        if (!confirm(`Regenerar QR do Quarto ${room.number}? O QR anterior ficará inválido.`)) return;
        try {
            const res = await roomServiceAPI.regenerateQR(room._id);
            setRooms(prev => prev.map(r => r._id === room._id ? { ...r, qrCode: res.data.qrCode } : r));
            if (selectedQR?._id === room._id) {
                setSelectedQR(prev => ({ ...prev, qrCode: res.data.qrCode }));
            }
        } catch (e) {
            setError('Erro ao regenerar QR');
        }
    };

    const downloadQR = (room) => {
        const link = document.createElement('a');
        link.download = `quarto-${room.number}-qr.png`;
        link.href = room.qrCode;
        link.click();
    };

    const floorGroups = rooms.reduce((acc, r) => {
        const f = r.floor || '1';
        if (!acc[f]) acc[f] = [];
        acc[f].push(r);
        return acc;
    }, {});

    return (
        <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BedDouble size={24} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                            Gestão de Quartos
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                            {rooms.length} quartos registados • Room Service por QR Code
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 18px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                        color: 'white', border: 'none', borderRadius: '10px',
                        fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem'
                    }}
                >
                    <Plus size={18} />
                    Novo Quarto
                </button>
            </div>

            {error && (
                <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} /> {error}
                    <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                </div>
            )}

            {/* Create Form */}
            {showCreate && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 16px', fontWeight: '600', color: 'var(--text-primary)' }}>➕ Criar Novo Quarto</h3>
                    <form onSubmit={handleCreate}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                            {[
                                { id: 'number', label: 'Nº do Quarto *', placeholder: 'ex: 101' },
                                { id: 'floor', label: 'Andar', placeholder: 'ex: 1' },
                                { id: 'label', label: 'Categoria', placeholder: 'ex: Suíte Dupla' },
                                { id: 'notes', label: 'Notas internas', placeholder: 'opcional' }
                            ].map(f => (
                                <div key={f.id}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>{f.label}</label>
                                    <input
                                        value={form[f.id]}
                                        onChange={e => setForm(p => ({ ...p, [f.id]: e.target.value }))}
                                        placeholder={f.placeholder}
                                        required={f.id === 'number'}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.9rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="submit" disabled={creating} style={{ padding: '10px 20px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                                {creating ? 'A criar...' : '✓ Criar Quarto'}
                            </button>
                            <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '10px 20px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* QR Modal */}
            {selectedQR && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedQR(null)}>
                    <div style={{ background: 'white', borderRadius: '20px', padding: '32px', maxWidth: '360px', width: '90%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 4px', color: '#1e293b', fontWeight: '700' }}>🏨 Quarto {selectedQR.number}</h3>
                        {selectedQR.label && <p style={{ color: '#64748b', margin: '0 0 20px', fontSize: '0.9rem' }}>{selectedQR.label}</p>}
                        {selectedQR.qrCode ? (
                            <img src={selectedQR.qrCode} alt="QR Code" style={{ width: '220px', height: '220px', border: '4px solid #7c3aed', borderRadius: '12px' }} />
                        ) : (
                            <p style={{ color: '#94a3b8' }}>QR Code não disponível</p>
                        )}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                            <button onClick={() => downloadQR(selectedQR)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
                                <Download size={16} /> Download
                            </button>
                            <button onClick={() => handleRegenerateQR(selectedQR)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>
                                <RefreshCw size={16} /> Regenerar
                            </button>
                            <button onClick={() => setSelectedQR(null)} style={{ padding: '10px 14px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', cursor: 'pointer' }}>
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rooms grouped by floor */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>A carregar quartos...</div>
            ) : rooms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: 'var(--bg-card)', borderRadius: '14px', border: '2px dashed var(--border-color)' }}>
                    <BedDouble size={48} style={{ color: 'var(--text-secondary)', marginBottom: '12px' }} />
                    <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px' }}>Nenhum quarto registado</h3>
                    <p style={{ color: 'var(--text-secondary)', margin: '0 0 20px' }}>Crie quartos para gerar QR Codes e ativar o Room Service</p>
                    <button onClick={() => setShowCreate(true)} style={{ padding: '10px 20px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>+ Criar Primeiro Quarto</button>
                </div>
            ) : (
                Object.entries(floorGroups).sort(([a], [b]) => a.localeCompare(b)).map(([floor, floorRooms]) => (
                    <div key={floor} style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <Building2 size={16} style={{ color: 'var(--text-secondary)' }} />
                            <span style={{ fontWeight: '700', color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Andar {floor}</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)', marginLeft: '4px' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                            {floorRooms.map(room => (
                                <div key={room._id} style={{
                                    background: 'var(--bg-card)', border: `1.5px solid ${room.active ? 'rgba(124,58,237,0.3)' : 'var(--border-color)'}`,
                                    borderRadius: '14px', padding: '16px', position: 'relative',
                                    opacity: room.active ? 1 : 0.65, transition: 'all 0.2s'
                                }}>
                                    {/* Active Badge */}
                                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                        <span style={{ padding: '3px 9px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: '700', background: room.active ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: room.active ? '#10b981' : '#94a3b8' }}>
                                            {room.active ? 'ATIVO' : 'INATIVO'}
                                        </span>
                                    </div>

                                    <div style={{ marginBottom: '12px' }}>
                                        <h3 style={{ margin: '0 0 2px', fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                            🛏️ Quarto {room.number}
                                        </h3>
                                        {room.label && <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{room.label}</p>}
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        <button onClick={() => setSelectedQR(room)} title="Ver QR Code" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>
                                            <QrCode size={14} /> QR Code
                                        </button>
                                        <button onClick={() => handleToggleActive(room)} title={room.active ? 'Desativar' : 'Ativar'} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: room.active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: room.active ? '#ef4444' : '#10b981', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>
                                            {room.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                            {room.active ? 'Desativar' : 'Ativar'}
                                        </button>
                                        <button onClick={() => handleDelete(room._id)} title="Eliminar" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: 'none', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
