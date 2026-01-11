import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { restaurantAPI, usersAPI, roleAPI, analyticsAPI } from '../services/api';
import {
    Settings, Users, Activity, Palette, Shield, Share2,
    Save, Upload, Building, Phone, Mail, MapPin,
    Globe, Clock, Coins, ChevronRight, Lock, Bell,
    Trash2, UserPlus, ShieldCheck, Printer, Cpu, Code,
    X, Key, Power, CheckCircle, XCircle, Search, Timer,
    Sun, Moon, Layout, Eye, EyeOff, Sparkles, ShoppingBag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminHub() {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [restaurant, setRestaurant] = useState(null);
    const [preview, setPreview] = useState(null);
    const [logoFile, setLogoFile] = useState(null);

    // User Management State
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [togglingId, setTogglingId] = useState(null);
    const [userFormData, setUserFormData] = useState({
        name: '',
        email: '',
        phone: '',
        roleId: '',
        password: 'password123'
    });
    const [userSearchTerm, setUserSearchTerm] = useState('');

    // Customers State
    const [customers, setCustomers] = useState([]);
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');

    // Form State for Restaurant
    const [formData, setFormData] = useState({
        general: {
            name: '',
            email: '',
            phone: '',
            address: '',
            language: 'pt',
            timezone: 'Africa/Maputo',
            currency: 'MT'
        },
        visual: {
            primaryColor: '#6366f1',
            darkMode: false,
            qrMenuTheme: 'modern'
        },
        flows: {
            autoResetTableOnPayment: true,
            orderDelayAlertMinutes: 15,
            autoResolveWaiterCalls: false
        }
    });

    const restaurantId = user?.restaurant?._id || user?.restaurant;

    useEffect(() => {
        if (restaurantId) {
            fetchRestaurant();
            fetchUsersAndRoles();
        }
    }, [restaurantId]);

    useEffect(() => {
        if (activeTab === 'customers' && restaurantId) {
            fetchCustomers();
        }
    }, [activeTab, restaurantId]);

    const fetchCustomers = async () => {
        setCustomerLoading(true);
        try {
            const res = await analyticsAPI.getCustomers(restaurantId);
            setCustomers(res.data.customers || res.data || []);
        } catch (error) {
            console.error('Failed to fetch customers:', error);
        } finally {
            setCustomerLoading(false);
        }
    };

    const fetchRestaurant = async () => {
        try {
            const res = await restaurantAPI.get(restaurantId);
            const data = res.data.restaurant;
            setRestaurant(data);

            // Map data to form state
            setFormData({
                general: {
                    name: data.name || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    address: typeof data.address === 'string' ? data.address : (data.address?.street || ''),
                    language: data.settings?.language || 'pt',
                    timezone: data.settings?.timezone || 'Africa/Maputo',
                    currency: data.settings?.currency || 'MT'
                },
                visual: {
                    primaryColor: data.settings?.theme?.primaryColor || '#6366f1',
                    darkMode: data.settings?.theme?.darkMode || false,
                    qrMenuTheme: data.settings?.theme?.qrMenuTheme || 'modern'
                },
                flows: {
                    autoResetTableOnPayment: data.settings?.automationRules?.autoResetTableOnPayment ?? true,
                    orderDelayAlertMinutes: data.settings?.automationRules?.orderDelayAlertMinutes || 15,
                    autoResolveWaiterCalls: data.settings?.automationRules?.autoResolveWaiterCalls || false
                }
            });
        } catch (error) {
            console.error('Failed to fetch restaurant settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsersAndRoles = async () => {
        try {
            const [usersRes, rolesRes] = await Promise.all([
                usersAPI.getByRestaurant(restaurantId),
                roleAPI.getAll()
            ]);
            setUsers(usersRes.data.users || []);
            setRoles(rolesRes.data.roles || rolesRes.data || []);
        } catch (error) {
            console.error('Failed to fetch users/roles:', error);
        }
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (section) => {
        setSaving(true);
        try {
            const restId = restaurantId;
            let payload;

            if (section === 'general' && logoFile) {
                // Use FormData for logo upload
                payload = new FormData();
                payload.append('name', formData.general.name);
                payload.append('email', formData.general.email);
                payload.append('phone', formData.general.phone);
                payload.append('address.street', formData.general.address);
                payload.append('settings.language', formData.general.language);
                payload.append('settings.timezone', formData.general.timezone);
                payload.append('settings.currency', formData.general.currency);
                payload.append('image', logoFile);
            } else {
                // Use JSON for other updates
                payload = {};
                if (section === 'general') {
                    payload = {
                        name: formData.general.name,
                        email: formData.general.email,
                        phone: formData.general.phone,
                        address: { street: formData.general.address },
                        'settings.language': formData.general.language,
                        'settings.timezone': formData.general.timezone,
                        'settings.currency': formData.general.currency
                    };
                } else if (section === 'visual') {
                    payload = {
                        'settings.theme.primaryColor': formData.visual.primaryColor,
                        'settings.theme.darkMode': formData.visual.darkMode,
                        'settings.theme.qrMenuTheme': formData.visual.qrMenuTheme
                    };
                } else if (section === 'flows') {
                    payload = {
                        'settings.automationRules.autoResetTableOnPayment': formData.flows.autoResetTableOnPayment,
                        'settings.automationRules.orderDelayAlertMinutes': formData.flows.orderDelayAlertMinutes,
                        'settings.automationRules.autoResolveWaiterCalls': formData.flows.autoResolveWaiterCalls
                    };
                }
            }

            await restaurantAPI.update(restId, payload);
            alert(t('settings_updated') || 'Configurações atualizadas com sucesso!');
            if (logoFile) {
                window.location.reload(); // Refresh to update logo globally
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Falha ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await usersAPI.createForRestaurant(restaurantId, userFormData);
            setShowUserModal(false);
            fetchUsersAndRoles();
            setUserFormData({ name: '', email: '', phone: '', roleId: '', password: 'password123' });
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to add user');
        }
    };

    const handleToggleUserStatus = async (userId) => {
        setTogglingId(userId);
        try {
            await usersAPI.update(userId, { active: !users.find(u => u._id === userId).active });
            fetchUsersAndRoles();
        } catch (error) {
            console.error('Failed to toggle status:', error);
        } finally {
            setTogglingId(null);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Remover este utilizador do restaurante?')) return;
        try {
            await usersAPI.delete(userId);
            fetchUsersAndRoles();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    if (loading) return <LoadingSpinner />;

    const tabs = [
        { id: 'general', label: 'Geral', icon: Building, color: '#3b82f6', gradient: 'from-blue-500/10 to-transparent' },
        { id: 'users', label: 'Utilizadores', icon: Users, color: '#8b5cf6', gradient: 'from-purple-500/10 to-transparent' },
        { id: 'customers', label: 'Clientes', icon: UserPlus, color: '#ec4899', gradient: 'from-pink-500/10 to-transparent' },
        { id: 'flows', label: 'Fluxos & Regras', icon: Activity, color: '#10b981', gradient: 'from-emerald-500/10 to-transparent' },
        { id: 'visual', label: 'Personalização', icon: Palette, color: '#f59e0b', gradient: 'from-amber-500/10 to-transparent' },
        { id: 'security', label: 'Segurança & Logs', icon: Shield, color: '#ef4444', gradient: 'from-red-500/10 to-transparent' },
        { id: 'integrations', label: 'Integrações', icon: Share2, color: '#6366f1', gradient: 'from-indigo-500/10 to-transparent' },
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc] p-8 font-sans selection:bg-primary selection:text-white">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <div style={{ padding: '8px', background: 'white', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', borderRadius: '12px', color: '#6366f1' }}>
                                <Sparkles size={20} />
                            </div>
                            <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#4f46e5' }}>Admin Control Center</span>
                        </div>
                        <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.05em', lineHeight: 1.1 }}>
                            Administração <span style={{ color: '#6366f1' }}>do Sistema</span>
                        </h1>
                        <p style={{ color: '#94a3b8', fontWeight: '700', fontSize: '14px', margin: 0 }}>
                            Configure o núcleo operacional, visual e de segurança da sua unidade
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '40px' }}>
                    {/* Sidebar Tabs */}
                    <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.4)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '40px',
                            padding: '16px 16px 24px 16px',
                            border: '1px solid rgba(255, 255, 255, 0.6)',
                            boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.05)'
                        }}>
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '16px 24px',
                                        borderRadius: '24px',
                                        fontWeight: '900',
                                        transition: 'all 0.5s ease',
                                        border: activeTab === tab.id ? '1px solid #f1f5f9' : 'none',
                                        background: activeTab === tab.id ? 'white' : 'transparent',
                                        color: activeTab === tab.id ? '#1e293b' : '#94a3b8',
                                        cursor: 'pointer',
                                        boxShadow: activeTab === tab.id ? '0 32px 64px -16px rgba(0, 0, 0, 0.1)' : 'none',
                                        transform: activeTab === tab.id ? 'scale(1.05)' : 'scale(1)'
                                    }}
                                    className="group"
                                >
                                    <div style={{
                                        padding: '10px',
                                        borderRadius: '12px',
                                        transition: 'all 0.5s ease',
                                        background: activeTab === tab.id ? '#f8fafc' : 'transparent',
                                        color: tab.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <tab.icon size={22} className={activeTab === tab.id ? 'animate-bounce-subtle' : ''} />
                                    </div>
                                    <span style={{ fontSize: '13px', letterSpacing: '-0.02em' }}>{tab.label}</span>
                                    {activeTab === tab.id && (
                                        <div style={{
                                            marginLeft: 'auto',
                                            width: '6px',
                                            height: '24px',
                                            background: '#6366f1',
                                            borderRadius: '99px'
                                        }} />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div style={{
                            padding: '32px',
                            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                            borderRadius: '40px',
                            color: 'white',
                            boxShadow: '0 32px 64px -16px rgba(15, 23, 42, 0.2)',
                            position: 'relative',
                            overflow: 'hidden'
                        }} className="group">
                            <div style={{
                                position: 'absolute', top: 0, right: 0, width: '128px', height: '128px',
                                background: 'rgba(99, 102, 241, 0.2)', borderRadius: '50%',
                                filter: 'blur(48px)', marginRight: '-64px', marginTop: '-64px',
                                transition: 'all 0.7s ease'
                            }} />
                            <h4 style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#94a3b8', marginBottom: '8px' }}>Estado da Unidade</h4>
                            <p style={{ fontSize: '18px', fontWeight: '700', lineHeight: 1.2, margin: 0 }}>Sistema Totalmente Operacional</p>
                            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', background: '#34d399', borderRadius: '50%' }} className="animate-pulse" />
                                <span style={{ fontSize: '10px', fontWeight: '900', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Sincronizado</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div style={{
                        flex: 1,
                        background: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(30px)',
                        borderRadius: '56px',
                        boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.08)',
                        border: '1px solid white',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '750px',
                        transition: 'all 0.7s ease'
                    }}>

                        {/* Tab Content Header */}
                        <div style={{
                            padding: '40px 48px',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.3)'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '30px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.05em', margin: 0 }}>
                                    {tabs.find(t => t.id === activeTab)?.label}
                                </h2>
                                <div style={{
                                    color: '#94a3b8',
                                    fontSize: '10px',
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.2em',
                                    marginTop: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <div style={{ width: '4px', height: '4px', background: '#6366f1', borderRadius: '50%' }} />
                                    Configuração Profissional de {activeTab}
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                {activeTab !== 'users' && activeTab !== 'customers' && activeTab !== 'security' && activeTab !== 'integrations' && (
                                    <button
                                        onClick={() => handleSave(activeTab)}
                                        disabled={saving}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '16px 40px',
                                            background: '#0f172a',
                                            color: 'white',
                                            borderRadius: '24px',
                                            fontWeight: '900',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            border: 'none',
                                            boxShadow: '0 20px 40px -8px rgba(15, 23, 42, 0.2)',
                                            opacity: saving ? 0.5 : 1
                                        }}
                                        className="hover-btn-black group"
                                    >
                                        {saving ? <LoadingSpinner size="sm" color="white" /> : <Save size={20} />}
                                        Salvar Alterações
                                    </button>
                                )}
                                {activeTab === 'users' && (
                                    <button
                                        onClick={() => setShowUserModal(true)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '16px 40px',
                                            background: '#6366f1',
                                            color: 'white',
                                            borderRadius: '24px',
                                            fontWeight: '900',
                                            fontSize: '14px',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            border: 'none',
                                            boxShadow: '0 20px 40px -8px rgba(99, 102, 241, 0.3)'
                                        }}
                                        className="hover-scale group"
                                    >
                                        <UserPlus size={20} />
                                        Novo Especialista
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Tab Content Body */}
                        <div className="p-12 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                            {activeTab === 'general' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    <div style={{ display: 'flex', gap: '64px', alignItems: 'start', flexWrap: 'wrap' }}>
                                        {/* Logo Column */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }} className="group">
                                            <div style={{ position: 'relative' }}>
                                                <div style={{
                                                    width: '208px',
                                                    height: '208px',
                                                    borderRadius: '56px',
                                                    background: '#f8fafc',
                                                    border: '6px solid white',
                                                    overflow: 'hidden',
                                                    shadow: '0 20px 40px -12px rgba(0,0,0,0.1)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.7s ease'
                                                }} className="group-hover:scale-105 group-hover:rotate-2">
                                                    {(preview || restaurant?.logo) ? (
                                                        <img
                                                            src={preview || restaurant.logo}
                                                            alt="Logo"
                                                            style={{ width: '100%', height: '100%', objectCover: 'cover' }}
                                                        />
                                                    ) : (
                                                        <Building size={64} style={{ color: '#f1f5f9' }} />
                                                    )}
                                                </div>
                                                <label style={{
                                                    position: 'absolute', bottom: '-16px', right: '-16px', padding: '16px',
                                                    background: 'white', boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                                                    borderRadius: '24px', color: '#6366f1', cursor: 'pointer',
                                                    transition: 'all 0.5s ease', border: '1px solid #f1f5f9'
                                                }} className="hover:scale-110 active:scale-90">
                                                    <Upload size={24} />
                                                    <input type="file" hidden accept="image/*" onChange={handleLogoChange} />
                                                </label>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: '10px', fontWeight: '900', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>
                                                    Identidade Visual
                                                </p>
                                                <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginTop: '4px', margin: 0 }}>
                                                    PNG ou JPG (Máx. 2MB)
                                                </p>
                                            </div>
                                        </div>

                                        {/* Fields Column */}
                                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '16px' }}>Nome do Negócio</label>
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="group">
                                                    <Building style={{ position: 'absolute', left: '24px', color: '#cbd5e1' }} size={20} />
                                                    <input
                                                        type="text"
                                                        value={formData.general.name}
                                                        onChange={e => setFormData({ ...formData, general: { ...formData.general, name: e.target.value } })}
                                                        style={{
                                                            width: '100%',
                                                            padding: '20px 24px 20px 64px',
                                                            background: '#f8fafc',
                                                            border: '2px solid transparent',
                                                            borderRadius: '24px',
                                                            fontWeight: '700',
                                                            color: '#1e293b',
                                                            fontSize: '14px',
                                                            transition: 'all 0.3s',
                                                            outline: 'none'
                                                        }}
                                                        placeholder="Ex: Restaurante Gourmet"
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '16px' }}>E-mail Corporativo</label>
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="group">
                                                    <Mail style={{ position: 'absolute', left: '24px', color: '#cbd5e1' }} size={20} />
                                                    <input
                                                        type="email"
                                                        value={formData.general.email}
                                                        onChange={e => setFormData({ ...formData, general: { ...formData.general, email: e.target.value } })}
                                                        style={{
                                                            width: '100%',
                                                            padding: '20px 24px 20px 64px',
                                                            background: '#f8fafc',
                                                            border: '2px solid transparent',
                                                            borderRadius: '24px',
                                                            fontWeight: '700',
                                                            color: '#1e293b',
                                                            fontSize: '14px',
                                                            transition: 'all 0.3s',
                                                            outline: 'none'
                                                        }}
                                                        placeholder="contato@restaurante.com"
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '16px' }}>Contato Telefónico</label>
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="group">
                                                    <Phone style={{ position: 'absolute', left: '24px', color: '#cbd5e1' }} size={20} />
                                                    <input
                                                        type="text"
                                                        value={formData.general.phone}
                                                        onChange={e => setFormData({ ...formData, general: { ...formData.general, phone: e.target.value } })}
                                                        style={{
                                                            width: '100%',
                                                            padding: '20px 24px 20px 64px',
                                                            background: '#f8fafc',
                                                            border: '2px solid transparent',
                                                            borderRadius: '24px',
                                                            fontWeight: '700',
                                                            color: '#1e293b',
                                                            fontSize: '14px',
                                                            transition: 'all 0.3s',
                                                            outline: 'none'
                                                        }}
                                                        placeholder="+258 8X XXX XXXX"
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '16px' }}>Endereço Físico</label>
                                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} className="group">
                                                    <MapPin style={{ position: 'absolute', left: '24px', color: '#cbd5e1' }} size={20} />
                                                    <input
                                                        type="text"
                                                        value={formData.general.address}
                                                        onChange={e => setFormData({ ...formData, general: { ...formData.general, address: e.target.value } })}
                                                        style={{
                                                            width: '100%',
                                                            padding: '20px 24px 20px 64px',
                                                            background: '#f8fafc',
                                                            border: '2px solid transparent',
                                                            borderRadius: '24px',
                                                            fontWeight: '700',
                                                            color: '#1e293b',
                                                            fontSize: '14px',
                                                            transition: 'all 0.3s',
                                                            outline: 'none'
                                                        }}
                                                        placeholder="Av. Julius Nyerere, Maputo"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px', paddingTop: '48px', borderTop: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Globe size={14} /> Idioma Operacional
                                            </label>
                                            <select
                                                style={{
                                                    width: '100%', padding: '20px 32px', background: '#f8fafc', border: '2px solid transparent',
                                                    borderRadius: '24px', fontWeight: '700', color: '#1e293b', appearance: 'none',
                                                    transition: 'all 0.3s', outline: 'none', cursor: 'pointer'
                                                }}
                                                value={formData.general.language}
                                                onChange={e => setFormData({ ...formData, general: { ...formData.general, language: e.target.value } })}
                                            >
                                                <option value="pt">Português (Moçambique)</option>
                                                <option value="en">English (International)</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Clock size={14} /> Fuso Horário
                                            </label>
                                            <select
                                                style={{
                                                    width: '100%', padding: '20px 32px', background: '#f8fafc', border: '2px solid transparent',
                                                    borderRadius: '24px', fontWeight: '700', color: '#1e293b', appearance: 'none',
                                                    transition: 'all 0.3s', outline: 'none', cursor: 'pointer'
                                                }}
                                                value={formData.general.timezone}
                                                onChange={e => setFormData({ ...formData, general: { ...formData.general, timezone: e.target.value } })}
                                            >
                                                <option value="Africa/Maputo">Maputo (GMT+2)</option>
                                                <option value="Europe/Lisbon">Lisboa (GMT+0)</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Coins size={14} /> Moeda Local
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <select
                                                    style={{
                                                        width: '100%', padding: '20px 32px', background: '#f8fafc', border: '2px solid transparent',
                                                        borderRadius: '24px', fontWeight: '700', color: '#1e293b', appearance: 'none',
                                                        transition: 'all 0.3s', outline: 'none', cursor: 'pointer'
                                                    }}
                                                    value={formData.general.currency}
                                                    onChange={e => setFormData({ ...formData, general: { ...formData.general, currency: e.target.value } })}
                                                >
                                                    <option value="MT">Metical (MT)</option>
                                                    <option value="USD">Dólar Americano ($)</option>
                                                    <option value="EUR">Euro (€)</option>
                                                </select>
                                                <ChevronRight style={{ position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: '#94a3b8', pointerEvents: 'none' }} size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'users' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, minWidth: '300px', maxWidth: '600px', position: 'relative' }} className="group">
                                            <Search style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', transition: 'colors 0.3s' }} size={20} />
                                            <input
                                                type="text"
                                                placeholder="Procurar especialistas por nome, e-mail ou cargo..."
                                                value={userSearchTerm}
                                                onChange={e => setUserSearchTerm(e.target.value)}
                                                style={{
                                                    width: '100%', padding: '20px 32px 20px 64px', background: '#f8fafc', border: '2px solid transparent',
                                                    borderRadius: '32px', fontSize: '14px', fontWeight: '700', color: '#1e293b', outline: 'none', transition: 'all 0.3s'
                                                }}
                                            />
                                        </div>
                                        <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                                            <span>Total: {users.filter(u =>
                                                u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                                u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                                u.role?.name?.toLowerCase().includes(userSearchTerm.toLowerCase())
                                            ).length} Colaboradores</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
                                        {users.filter(u =>
                                            u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                            u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                            u.role?.name?.toLowerCase().includes(userSearchTerm.toLowerCase())
                                        ).map(u => (
                                            <div key={u._id} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '32px',
                                                background: 'white', border: '1px solid #f1f5f9', borderRadius: '40px',
                                                transition: 'all 0.5s ease', position: 'relative', overflow: 'hidden'
                                            }} className="hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.1)] group">
                                                <div style={{ position: 'absolute', top: 0, right: 0, width: '128px', height: '128px', background: '#f8fafc', borderRadius: '50%', filter: 'blur(48px)', marginRight: '-64px', marginTop: '-64px', opacity: 0, transition: 'opacity 0.7s' }} className="group-hover:opacity-100" />

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 10 }}>
                                                    <div style={{
                                                        width: '64px', height: '64px', borderRadius: '24px', background: '#0f172a', color: 'white',
                                                        display: 'flex', alignItems: 'center', justify: 'center', fontWeight: '900', fontSize: '24px',
                                                        boxShadow: '0 20px 40px -8px rgba(15, 23, 42, 0.2)', transition: 'all 0.5s ease',
                                                        textAlign: 'center'
                                                    }} className="group-hover:scale-110 group-hover:-rotate-3">
                                                        <div style={{ width: '100%' }}>{u.name.charAt(0)}</div>
                                                    </div>
                                                    <div>
                                                        <h4 style={{ fontWeight: '900', color: '#1e293b', fontSize: '18px', letterSpacing: '-0.02em', margin: 0 }}>{u.name}</h4>
                                                        <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700', marginTop: '2px', margin: 0 }}>{u.email}</p>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '16px', position: 'relative', zIndex: 10 }}>
                                                    <span style={{
                                                        padding: '8px 20px', borderRadius: '16px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase',
                                                        letterSpacing: '0.05em', border: '1px solid',
                                                        background: u.role?.name === 'Owner' ? '#f5f3ff' : u.role?.name === 'Manager' ? '#eff6ff' : '#ecfdf5',
                                                        color: u.role?.name === 'Owner' ? '#7c3aed' : u.role?.name === 'Manager' ? '#2563eb' : '#059669',
                                                        borderColor: u.role?.name === 'Owner' ? '#ddd6fe' : u.role?.name === 'Manager' ? '#bfdbfe' : '#a7f3d0'
                                                    }}>
                                                        {u.role?.name || 'Membro'}
                                                    </span>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <button
                                                            onClick={() => handleToggleUserStatus(u._id)}
                                                            style={{
                                                                padding: '12px', borderRadius: '16px', transition: 'all 0.5s ease', border: 'none', cursor: 'pointer',
                                                                background: u.active ? '#fef2f2' : '#ecfdf5',
                                                                color: u.active ? '#ef4444' : '#10b981'
                                                            }}
                                                            className="hover:scale-110"
                                                            title={u.active ? 'Desativar' : 'Ativar'}
                                                        >
                                                            {togglingId === u._id ? <LoadingSpinner size="sm" /> : <Power size={18} />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(u._id)}
                                                            style={{
                                                                padding: '12px', borderRadius: '16px', transition: 'all 0.5s ease', border: 'none', cursor: 'pointer',
                                                                background: '#f8fafc', color: '#94a3b8'
                                                            }}
                                                            className="hover:bg-red-600 hover:text-white"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'customers' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, minWidth: '300px', maxWidth: '600px', position: 'relative' }} className="group">
                                            <Search style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} size={20} />
                                            <input
                                                type="text"
                                                placeholder="Filtrar base de clientes..."
                                                value={customerSearchTerm}
                                                onChange={e => setCustomerSearchTerm(e.target.value)}
                                                style={{
                                                    width: '100%', padding: '20px 32px 20px 64px', background: '#f8fafc', border: '2px solid transparent',
                                                    borderRadius: '32px', fontSize: '14px', fontWeight: '700', color: '#1e293b', outline: 'none', transition: 'all 0.3s'
                                                }}
                                            />
                                        </div>
                                        <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                                            <span>Base de Dados: {customers.filter(c =>
                                                (c.name || '').toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                                (c._id || '').toLowerCase().includes(customerSearchTerm.toLowerCase())
                                            ).length} Clientes</span>
                                        </div>
                                    </div>

                                    {customerLoading ? (
                                        <div style={{ padding: '96px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                            <LoadingSpinner />
                                            <p style={{ color: '#94a3b8', fontWeight: '700' }} className="animate-pulse">Cruzando dados de vendas...</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {customers.length === 0 ? (
                                                <div style={{ padding: '96px 0', textAlign: 'center', border: '4px dashed #f1f5f9', borderRadius: '48px' }}>
                                                    <Users size={48} style={{ color: '#e2e8f0', marginBottom: '16px' }} />
                                                    <p style={{ color: '#94a3b8', fontWeight: '700', margin: 0 }}>Nenhum cliente registado ainda.</p>
                                                </div>
                                            ) : (
                                                <div style={{ background: 'white', borderRadius: '40px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', padding: '24px 40px', background: 'rgba(248, 250, 252, 0.5)', borderBottom: '1px solid #f1f5f9' }}>
                                                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Identificação</span>
                                                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Volume de Pedidos</span>
                                                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Investimento Total</span>
                                                        <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'right' }}>Última Visita</span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        {customers.filter(c =>
                                                            (c.name || '').toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                                            (c._id || '').toLowerCase().includes(customerSearchTerm.toLowerCase())
                                                        ).map((c, i) => (
                                                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', padding: '32px 40px', alignItems: 'center', borderBottom: '1px solid #f8fafc' }} className="hover:bg-slate-50/50 transition-colors group">
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px' }}>
                                                                        {c.name ? c.name.charAt(0) : '#'}
                                                                    </div>
                                                                    <div>
                                                                        <p style={{ fontWeight: '900', color: '#1e293b', letterSpacing: '-0.02em', margin: 0 }}>{c.name || 'Cliente Mistério'}</p>
                                                                        <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', margin: 0 }}>{c._id || 'Sem Telefone'}</p>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <ShoppingBag size={14} />
                                                                    </div>
                                                                    <span style={{ fontWeight: '900', color: '#334155' }}>{c.orderCount} <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Visitas</span></span>
                                                                </div>
                                                                <div>
                                                                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>{new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(c.totalSpent)}</span>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <span style={{ padding: '8px 16px', background: '#f1f5f9', borderRadius: '12px', fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                                        {new Date(c.lastVisit).toLocaleDateString('pt-PT')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'visual' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '48px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '8px' }}>
                                                <div style={{ padding: '8px', background: '#fef3c7', color: '#d97706', borderRadius: '12px' }}>
                                                    <Palette size={20} />
                                                </div>
                                                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.02em', margin: 0 }}>Cores & Experiência</h3>
                                            </div>

                                            <div style={{ padding: '40px', background: 'rgba(248, 250, 252, 0.5)', borderRadius: '48px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '16px' }}>Cor Dominante</label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                                                        <div style={{ position: 'relative' }}>
                                                            <input
                                                                type="color"
                                                                value={formData.visual.primaryColor}
                                                                onChange={e => setFormData({ ...formData, visual: { ...formData.visual, primaryColor: e.target.value } })}
                                                                style={{
                                                                    width: '80px', height: '80px', borderRadius: '24px', border: '6px solid white', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                                                                    cursor: 'pointer', transition: 'transform 0.3s', background: 'transparent'
                                                                }}
                                                                className="hover:scale-110 active:scale-95"
                                                            />
                                                        </div>
                                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <input
                                                                type="text"
                                                                value={formData.visual.primaryColor}
                                                                onChange={e => setFormData({ ...formData, visual: { ...formData.visual, primaryColor: e.target.value } })}
                                                                style={{
                                                                    width: '100%', px: '24px', py: '16px', background: 'white', border: '1px solid #f1f5f9',
                                                                    borderRadius: '16px', fontWeight: '900', color: '#334155', shadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                                                    textTransform: 'uppercase', outline: 'none'
                                                                }}
                                                                className="focus:ring-2 focus:ring-primary/20"
                                                            />
                                                            <p style={{ fontSize: '10px', font: 'bold', color: '#94a3b8', marginLeft: '16px', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Código Hexadecimal</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', background: 'white', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div style={{ padding: '12px', borderRadius: '16px', background: formData.visual.darkMode ? '#0f172a' : '#fef3c7', color: formData.visual.darkMode ? '#fbbf24' : '#d97706' }}>
                                                            {formData.visual.darkMode ? <Moon size={22} /> : <Sun size={22} />}
                                                        </div>
                                                        <div>
                                                            <p style={{ fontWeight: '900', color: '#1e293b', fontSize: '14px', margin: 0 }}>Modo Imersivo</p>
                                                            <p style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Contrast Dashboard</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setFormData({ ...formData, visual: { ...formData.visual, darkMode: !formData.visual.darkMode } })}
                                                        style={{
                                                            width: '64px', height: '40px', borderRadius: '9999px', transition: 'all 0.5s', position: 'relative', border: 'none', cursor: 'pointer',
                                                            background: formData.visual.darkMode ? '#0f172a' : '#e2e8f0'
                                                        }}
                                                    >
                                                        <div style={{
                                                            position: 'absolute', top: '4px', width: '32px', height: '32px', borderRadius: '50%', background: 'white',
                                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', transition: 'all 0.5s',
                                                            left: formData.visual.darkMode ? '28px' : '4px'
                                                        }} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '8px' }}>
                                                <div style={{ padding: '8px', background: '#dbeafe', color: '#2563eb', borderRadius: '12px' }}>
                                                    <Layout size={20} />
                                                </div>
                                                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.02em', margin: 0 }}>Layout do Cardápio QR</h3>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                {['modern', 'classic'].map(theme => (
                                                    <button
                                                        key={theme}
                                                        onClick={() => setFormData({ ...formData, visual: { ...formData.visual, qrMenuTheme: theme } })}
                                                        style={{
                                                            padding: '32px', borderRadius: '40px', border: '2px solid', transition: 'all 0.5s', textAlign: 'left',
                                                            display: 'flex', alignItems: 'center', gap: '24px', cursor: 'pointer',
                                                            background: formData.visual.qrMenuTheme === theme ? 'rgba(var(--primary-rgb), 0.05)' : 'white',
                                                            borderColor: formData.visual.qrMenuTheme === theme ? 'var(--primary-color)' : '#f1f5f9',
                                                        }}
                                                        className="group"
                                                    >
                                                        <div style={{
                                                            width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            transition: 'all 0.5s', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                            background: formData.visual.qrMenuTheme === theme ? 'var(--primary-color)' : '#f8fafc',
                                                            color: formData.visual.qrMenuTheme === theme ? 'white' : '#cbd5e1'
                                                        }} className="group-hover:scale-110">
                                                            {theme === 'modern' ? <Sparkles size={28} /> : <Layout size={28} />}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                <p style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.2em', margin: 0, color: formData.visual.qrMenuTheme === theme ? 'var(--primary-color)' : '#94a3b8' }}>Estilo {theme}</p>
                                                                {formData.visual.qrMenuTheme === theme && <CheckCircle size={20} style={{ color: 'var(--primary-color)' }} />}
                                                            </div>
                                                            <p style={{ color: '#1e293b', fontWeight: '900', fontSize: '18px', margin: 0 }}>{theme === 'modern' ? 'Minimalista & Fluído' : 'Estrutura tradicional'}</p>
                                                            <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700', margin: 0 }}>Ideal para {theme === 'modern' ? 'restaurantes contemporâneos' : 'cafés e padarias'}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'flows' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }} className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '48px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '8px' }}>
                                                <div style={{ padding: '8px', background: '#dcfce7', color: '#059669', borderRadius: '12px' }}>
                                                    <Activity size={20} />
                                                </div>
                                                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.02em', margin: 0 }}>Inteligência Operacional</h3>
                                            </div>

                                            <div style={{ padding: '40px', background: 'rgba(248, 250, 252, 0.5)', borderRadius: '48px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #f8fafc', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }} className="group hover:shadow-xl transition-all duration-500">
                                                    <div>
                                                        <p style={{ fontWeight: '900', color: '#1e293b', margin: 0 }}>Auto-Reset de Mesas</p>
                                                        <p style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '4px', margin: 0 }}>Libertar após pagamento</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setFormData({ ...formData, flows: { ...formData.flows, autoResetTableOnPayment: !formData.flows.autoResetTableOnPayment } })}
                                                        style={{
                                                            width: '64px', height: '40px', borderRadius: '9999px', transition: 'all 0.5s', position: 'relative', border: 'none', cursor: 'pointer',
                                                            background: formData.flows.autoResetTableOnPayment ? 'var(--primary-color)' : '#e2e8f0'
                                                        }}
                                                    >
                                                        <div style={{
                                                            position: 'absolute', top: '4px', width: '32px', height: '32px', borderRadius: '50%', background: 'white',
                                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', transition: 'all 0.5s',
                                                            left: formData.flows.autoResetTableOnPayment ? '28px' : '4px'
                                                        }} />
                                                    </button>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '32px', background: 'white', borderRadius: '32px', border: '1px solid #f8fafc', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', opacity: 0.5, cursor: 'not-allowed' }}>
                                                    <div>
                                                        <p style={{ fontWeight: '900', color: '#1e293b', margin: 0 }}>Cálculo Automático de Taxas</p>
                                                        <p style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '4px', margin: 0 }}>Sugerir gorjeta 10%</p>
                                                    </div>
                                                    <div style={{ width: '64px', height: '40px', borderRadius: '9999px', background: '#f1f5f9', position: 'relative' }}>
                                                        <div style={{ position: 'absolute', top: '4px', left: '4px', width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '8px' }}>
                                                <div style={{ padding: '8px', background: '#e0e7ff', color: '#4f46e5', borderRadius: '12px' }}>
                                                    <Clock size={20} />
                                                </div>
                                                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.02em', margin: 0 }}>Padrões de Serviço (SLA)</h3>
                                            </div>

                                            <div style={{ padding: '40px', background: 'rgba(248, 250, 252, 0.5)', borderRadius: '48px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '16px' }}>Monitor de Ociosidade</label>
                                                    <div style={{ position: 'relative' }} className="group">
                                                        <Timer style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} size={24} className="group-focus-within:text-primary" />
                                                        <input
                                                            type="number"
                                                            value={formData.flows.orderDelayAlertMinutes}
                                                            onChange={e => setFormData({ ...formData, flows: { ...formData.flows, orderDelayAlertMinutes: parseInt(e.target.value) } })}
                                                            style={{
                                                                width: '100%', padding: '24px 96px 24px 64px', background: 'white', border: '1px solid #f1f5f9',
                                                                borderRadius: '24px', fontWeight: '900', fontSize: '24px', color: '#1e293b', outline: 'none'
                                                            }}
                                                            className="focus:ring-4 focus:ring-primary/5 shadow-sm"
                                                        />
                                                        <span style={{ position: 'absolute', right: '32px', top: '50%', transform: 'translateY(-50%)', fontWeight: '900', color: '#cbd5e1', fontSize: '10px', letterSpacing: '0.2em' }}>MINUTOS</span>
                                                    </div>
                                                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', marginLeft: '16px', maxWidth: '320px', margin: 0 }}>Tempo máximo de espera antes de disparar alerta crítico no dashboard do garçom.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(activeTab === 'security' || activeTab === 'integrations') && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 0' }} className="animate-in zoom-in duration-700">
                                    <div style={{ width: '128px', height: '128px', background: '#f8fafc', color: '#e2e8f0', borderRadius: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '40px', border: '4px dashed #f1f5f9' }} className="group">
                                        <Code size={56} style={{ transition: 'transform 0.7s' }} className="group-hover:rotate-12" />
                                    </div>
                                    <h3 style={{ color: '#1e293b', fontWeight: '900', fontSize: '30px', letterSpacing: '-0.02em', margin: 0 }}>Recurso Ultra-Premium</h3>
                                    <p style={{ color: '#94a3b8', font: 'bold', maxWidth: '448px', textAlign: 'center', marginTop: '16px', lineHeight: '1.6', fontSize: '18px', margin: 0 }}>
                                        A nossa equipa está a desenvolver o motor de {activeTab} para suportar operações de larga escala.
                                    </p>
                                    <div style={{ marginTop: '40px', padding: '8px 24px', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary-color)', borderRadius: '9999px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                                        Disponível em breve no Q1 2026
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Notification */}
                        <div style={{ padding: '32px 48px', background: '#0f172a', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', inset: 0, background: 'var(--primary-color)', opacity: 0.05 }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', position: 'relative', zIndex: 10 }}>
                                <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.1)', color: 'white', borderRadius: '16px', backdropFilter: 'blur(12px)' }}>
                                    <Shield size={20} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <p style={{ fontSize: '13px', color: 'white', fontWeight: '900', letterSpacing: '-0.01em', margin: 0 }}>Operação Segura via SSL 256-bit</p>
                                    <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Apenas Administradores de Nível 1 podem alterar estas configurações.</p>
                                </div>
                            </div>
                            <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '8px', height: '8px', background: '#34d399', borderRadius: '50%' }} className="animate-pulse" />
                                <span style={{ fontSize: '10px', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Ambiente Seguro</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Create Modal */}
            {showUserModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(16px)' }} className="animate-in fade-in duration-500">
                    <div style={{ background: 'white', borderRadius: '64px', boxShadow: '0 64px 128px -32px rgba(0, 0, 0, 0.5)', width: '100%', maxWidth: '672px', overflow: 'hidden', border: '1px solid white' }} className="animate-in zoom-in duration-500">
                        <div style={{ padding: '48px 64px', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(248, 250, 252, 0.3)' }}>
                            <div>
                                <h2 style={{ fontSize: '36px', fontWeight: '900', color: '#1e293b', letterSpacing: '-0.05em', margin: 0 }}>Novo Especialista</h2>
                                <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>Adicionar Colaborador à Unidade</p>
                            </div>
                            <button onClick={() => setShowUserModal(false)} style={{ border: 'none', background: 'transparent', padding: '16px', color: '#cbd5e1', cursor: 'pointer', transition: 'all 0.3s' }} className="hover:text-slate-900 hover:scale-110 active:scale-90"><X size={32} /></button>
                        </div>
                        <form onSubmit={handleCreateUser} style={{ padding: '64px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '16px' }}>Nome Completo</label>
                                <input
                                    required
                                    style={{
                                        width: '100%', padding: '24px 32px', background: '#f8fafc', border: '2px solid transparent',
                                        borderRadius: '40px', fontWeight: '700', fontSize: '18px', color: '#1e293b', outline: 'none', transition: 'all 0.3s'
                                    }}
                                    className="focus:bg-white focus:border-primary/20 shadow-sm"
                                    value={userFormData.name}
                                    placeholder="Ex: João Mavila"
                                    onChange={e => setUserFormData({ ...userFormData, name: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '16px' }}>E-mail de Acesso</label>
                                    <input
                                        type="email" required
                                        style={{
                                            width: '100%', padding: '24px 32px', background: '#f8fafc', border: '2px solid transparent',
                                            borderRadius: '40px', fontWeight: '700', color: '#1e293b', outline: 'none', transition: 'all 0.3s'
                                        }}
                                        className="focus:bg-white focus:border-primary/20 shadow-sm"
                                        placeholder="exemplo@restaurante.com"
                                        value={userFormData.email}
                                        onChange={e => setUserFormData({ ...userFormData, email: e.target.value })}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '16px' }}>Perfil de Acesso (Papel)</label>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            required
                                            style={{
                                                width: '100%', padding: '24px 32px', background: '#f8fafc', border: '2px solid transparent',
                                                borderRadius: '40px', fontWeight: '700', color: '#1e293b', appearance: 'none', outline: 'none', transition: 'all 0.3s', cursor: 'pointer'
                                            }}
                                            className="focus:bg-white focus:border-primary/20 shadow-sm"
                                            value={userFormData.roleId}
                                            onChange={e => setUserFormData({ ...userFormData, roleId: e.target.value })}
                                        >
                                            <option value="">Selecionar Perfil...</option>
                                            {roles.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                                        </select>
                                        <ChevronRight style={{ position: 'absolute', right: '32px', top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: '#94a3b8', pointerEvents: 'none' }} size={24} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em', marginLeft: '16px' }}>Credencial Temporária</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock style={{ position: 'absolute', left: '32px', top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1' }} size={24} />
                                    <input
                                        type="password" required
                                        style={{
                                            width: '100%', padding: '24px 32px 24px 80px', background: '#f8fafc', border: '2px solid transparent',
                                            borderRadius: '40px', fontWeight: '700', color: '#1e293b', outline: 'none', transition: 'all 0.3s'
                                        }}
                                        className="focus:bg-white focus:border-primary/20 shadow-sm"
                                        value={userFormData.password}
                                        onChange={e => setUserFormData({ ...userFormData, password: e.target.value })}
                                    />
                                </div>
                                <p style={{ fontSize: '10px', font: 'bold', color: '#94a3b8', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '16px', margin: 0 }}>O colaborador deverá trocar a senha no primeiro acesso.</p>
                            </div>

                            <button type="submit" style={{
                                width: '100%', padding: '24px', marginTop: '16px', background: '#0f172a', color: 'white', borderRadius: '40px',
                                fontWeight: '900', fontSize: '20px', border: 'none', outline: 'none', cursor: 'pointer', transition: 'all 0.5s',
                                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.3)'
                            }} className="hover-scale active-scale hover-bg-slate-800">
                                Confirmar e Criar Conta
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s infinite ease-in-out;
                }
                :root {
                    --primary-color: ${formData.visual.primaryColor};
                    --primary-rgb: ${(() => {
                    const hex = formData.visual.primaryColor.replace('#', '');
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    return `${r}, ${g}, ${b}`;
                })()};
                }
                .bg-primary { background-color: var(--primary-color); }
                .text-primary { color: var(--primary-color); }
                .border-primary { border-color: var(--primary-color); }
                
                .focus\\:bg-white:focus { background-color: white !important; }
                .focus\\:border-primary\\/20:focus { border-color: rgba(var(--primary-rgb), 0.2) !important; }
                .focus\\:ring-primary\\/5:focus { box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.05) !important; }
                .focus\\:ring-primary\\/20:focus { box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.2) !important; }
                
                .hover-scale:hover { transform: scale(1.02); }
                .active-scale:active { transform: scale(0.98); }
                
                .hover-bg-slate-50:hover { background-color: #f8fafc !important; }
                .hover-bg-slate-800:hover { background-color: #1e293b !important; }
                
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}
