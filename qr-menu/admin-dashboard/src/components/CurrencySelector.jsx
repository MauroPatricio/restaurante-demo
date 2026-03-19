import React, { useState, useEffect } from 'react';
import { Check, ChevronDown, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { restaurantAPI } from '../services/api';
import { ALL_CURRENCIES } from '../utils/currenciesList';
import LoadingSpinner from './LoadingSpinner';

export default function CurrencySelector({ currentCurrency, onSaved, restaurantId }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);

    // Provide the rich currency object based on current code
    const selected = ALL_CURRENCIES.find(c => c.code === currentCurrency) || { code: currentCurrency, name: currentCurrency };

    const filtered = ALL_CURRENCIES.filter(
        (c) =>
            c.code.toLowerCase().includes(search.toLowerCase()) ||
            c.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = async (currency) => {
        setOpen(false);
        setSearch("");
        
        // Skip if same
        if (currency.code === currentCurrency) return;

        setSaving(true);
        try {
            await restaurantAPI.update(restaurantId, {
                'settings.currency': currency.code
            });
            if (onSaved) onSaved(currency.code);
        } catch (error) {
            console.error('Failed to update currency:', error);
            alert('Falha ao atualizar moeda');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '448px', margin: '0 auto', width: '100%' }}>
            <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
                <div style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#0f172a' }}>
                        {t('currencies_title', 'Moedas')}
                    </h2>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                        Selecione a moeda base para todo o sistema (preços, menus, faturas e relatórios).
                    </p>

                    {/* Selected Currency */}
                    <div style={{ marginBottom: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Moeda atual</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <p style={{ fontSize: '18px', fontWeight: '500', color: '#0f172a', margin: 0 }}>
                                    {selected.code} - {selected.name}
                                </p>
                                {saving && <LoadingSpinner size={16} color="#6366f1" />}
                            </div>
                        </div>
                    </div>

                    {/* Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setOpen(!open)}
                            style={{
                                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white',
                                cursor: 'pointer', color: '#0f172a', fontWeight: '500', fontSize: '14px'
                            }}
                            className="hover:bg-slate-50 transition-colors"
                        >
                            Selecionar moeda
                            <ChevronDown size={18} color="#64748b" />
                        </button>

                        {open && (
                            <div style={{ position: 'absolute', width: '100%', marginTop: '8px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 10 }}>
                                <div style={{ padding: '8px' }}>
                                    <input
                                        type="text"
                                        placeholder="Pesquisar moeda..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        style={{
                                            width: '100%', padding: '12px', borderRadius: '8px',
                                            border: '1px solid #e2e8f0', outline: 'none',
                                            background: '#f8fafc', fontSize: '14px'
                                        }}
                                        autoFocus
                                    />
                                </div>

                                <div style={{ maxHeight: '240px', overflowY: 'auto' }} className="custom-scrollbar">
                                    {filtered.map((c) => (
                                        <div
                                            key={c.code}
                                            onClick={() => handleSelect(c)}
                                            style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '12px 16px', cursor: 'pointer', transition: 'background 0.2s',
                                                background: selected.code === c.code ? '#eff6ff' : 'transparent'
                                            }}
                                            className="hover:bg-slate-50"
                                        >
                                            <span style={{ fontSize: '14px', color: '#334155', fontWeight: selected.code === c.code ? '600' : '400' }}>
                                                {c.code} - {c.name}
                                            </span>
                                            {selected.code === c.code && <Check size={16} color="#3b82f6" />}
                                        </div>
                                    ))}
                                    {filtered.length === 0 && (
                                        <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                                            Nenhuma moeda encontrada
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
